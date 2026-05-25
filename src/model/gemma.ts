import { getMode, getStoredApiKey, REMOTE_MODEL_ID } from './backend';
import { generateRemote } from './openrouter';

export type LoadProgress = {
  status: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

export type LoadOptions = {
  onProgress?: (p: LoadProgress) => void;
  modelId?: string;
};

export const DEFAULT_MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX';

/**
 * Make caching behaviour explicit. transformers.js uses these defaults
 * already in browser contexts, but pinning them protects against a future
 * dependency upgrade flipping them and silently re-downloading 1.5 GB.
 */
async function ensureCacheEnv(): Promise<void> {
  try {
    const mod = (await import('@huggingface/transformers')) as unknown as {
      env?: {
        useBrowserCache?: boolean;
        useFSCache?: boolean;
        useCustomCache?: boolean;
        allowRemoteModels?: boolean;
        allowLocalModels?: boolean;
      };
    };
    if (mod.env) {
      mod.env.useBrowserCache = true;
      mod.env.useFSCache = false;
      mod.env.allowRemoteModels = true;
      // We intentionally hit the HF hub for model weights, never the local
      // filesystem - disabling this avoids a wasted probe and a 404 in the
      // network tab on every load.
      mod.env.allowLocalModels = false;
    }
  } catch {
    // best-effort - if the env shape changes, the defaults still cover us
  }
}

// Loose internal types - transformers.js public types are accurate but verbose,
// and the model.generate / processor signatures are stable across v3→v4.
type Model = {
  generate: (args: Record<string, unknown>) => Promise<{
    slice: (...args: unknown[]) => unknown;
  }>;
};
type Processor = {
  apply_chat_template: (
    messages: unknown,
    opts?: Record<string, unknown>,
  ) => string;
  batch_decode: (tokens: unknown, opts?: Record<string, unknown>) => string[];
  tokenizer?: unknown;
  (text: string, image?: unknown, audio?: unknown, opts?: Record<string, unknown>):
    | Promise<{ input_ids: { dims: number[] } } & Record<string, unknown>>
    | { input_ids: { dims: number[] } } & Record<string, unknown>;
};

let model: Model | null = null;
let processor: Processor | null = null;
let loadPromise: Promise<void> | null = null;
let loadedModelId: string | null = null;
let detectedDevice: 'webgpu' | 'wasm' | null = null;

// Some hardware (notably Intel Iris/Xe and other integrated GPUs) loads the
// model on WebGPU but then loses the WGPUInstance during inference, surfacing
// as "Failed to execute 'mapAsync' on 'GPUBuffer': A valid external Instance
// reference no longer exists". Once we've seen that failure, persist it so
// the next page load skips WebGPU and goes straight to WASM, avoiding a
// guaranteed-broken first run for that browser/hardware combo.
const WEBGPU_BLACKLIST_KEY = 'strudel-tutor.model.webgpu-blacklisted';

function isWebGpuBlacklisted(): boolean {
  try {
    return localStorage.getItem(WEBGPU_BLACKLIST_KEY) === '1';
  } catch {
    return false;
  }
}

function blacklistWebGpu(): void {
  try {
    localStorage.setItem(WEBGPU_BLACKLIST_KEY, '1');
  } catch {
    // localStorage may be unavailable (private mode, storage quota); the
    // session simply won't remember the failure for next time.
  }
}

// Cheap probe - just checks if the `navigator.gpu` surface area exists.
// Intentionally does NOT call `requestAdapter()`: doing so and then dropping
// the adapter is a documented anti-pattern that can leave the underlying
// Dawn Instance reference stale, breaking subsequent ORT compute on some
// Chrome + integrated-GPU combinations. Real availability is decided by
// trying to load with `device: 'webgpu'` and falling back on failure.
function webGpuLikelyAvailable(): boolean {
  const nav = navigator as Navigator & {
    gpu?: { requestAdapter?: () => Promise<unknown> };
  };
  return !!nav.gpu && typeof nav.gpu.requestAdapter === 'function';
}

export function getDetectedDevice(): 'webgpu' | 'wasm' | null {
  return detectedDevice;
}

export async function loadModel(options: LoadOptions = {}): Promise<void> {
  // Remote mode has nothing to download - the OpenRouter API is always
  // ready. Report it as such so callers' progress UI flips to the
  // ready state without spinning on a phantom download.
  if (getMode() === 'remote') {
    options.onProgress?.({
      status: 'ready',
      name: `openrouter:${REMOTE_MODEL_ID}`,
    });
    return;
  }

  const modelId = options.modelId ?? DEFAULT_MODEL_ID;
  if (model && processor && loadedModelId === modelId) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await ensureCacheEnv();
    const tfs = (await import('@huggingface/transformers')) as unknown as {
      AutoProcessor: { from_pretrained: (id: string) => Promise<Processor> };
      Gemma4ForConditionalGeneration: {
        from_pretrained: (id: string, opts: Record<string, unknown>) => Promise<Model>;
      };
    };
    const wantWebGpu = webGpuLikelyAvailable() && !isWebGpuBlacklisted();
    const t0 = performance.now();
    processor = await tfs.AutoProcessor.from_pretrained(modelId);
    const buildOpts = (device: 'webgpu' | 'wasm') => ({
      dtype: 'q4f16',
      device,
      progress_callback: (p: LoadProgress) => options.onProgress?.(p),
    });
    if (wantWebGpu) {
      try {
        detectedDevice = 'webgpu';
        options.onProgress?.({ status: 'device-selected', name: 'webgpu' });
        model = await tfs.Gemma4ForConditionalGeneration.from_pretrained(
          modelId,
          buildOpts('webgpu'),
        );
      } catch (err) {
        // WebGPU init failed entirely. Persist that and fall through to WASM
        // so subsequent loads (and the rest of this load) skip WebGPU.
        blacklistWebGpu();
        options.onProgress?.({
          status: 'webgpu-failed',
          name: err instanceof Error ? err.message : String(err),
        });
        model = null;
      }
    }
    if (!model) {
      detectedDevice = 'wasm';
      options.onProgress?.({ status: 'device-selected', name: 'wasm' });
      model = await tfs.Gemma4ForConditionalGeneration.from_pretrained(
        modelId,
        buildOpts('wasm'),
      );
    }
    const ms = Math.round(performance.now() - t0);
    options.onProgress?.({ status: 'ready', name: `cold-load ${ms}ms` });
    loadedModelId = modelId;
  })();

  loadPromise.catch(() => {
    // Clear loadPromise on failure so the caller can retry instead of
    // permanently latching onto a rejected promise.
    loadPromise = null;
  });

  return loadPromise;
}

// Heuristic to recognize the specific runtime WebGPU failures that mean the
// device is gone (instance-released, mapAsync failures, OrtRun on the WebGPU
// EP). On those, blacklisting WebGPU and asking the user to reload is the
// only realistic recovery - the model state inside ORT is already wedged.
function isWebGpuRuntimeFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /webgpu/i.test(msg) &&
    (/mapAsync|Instance reference|OrtRun|buffer_manager/i.test(msg) ||
      /Failed to fetch/i.test(msg))
  );
}

export type GenerateMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type GenerateOptions = {
  maxNewTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
};

export async function generate(
  messages: GenerateMessage[],
  options: GenerateOptions = {},
): Promise<string> {
  if (getMode() === 'remote') {
    const key = getStoredApiKey();
    if (!key) {
      throw new Error(
        'Remote mode is on but no OpenRouter API key is configured. Open ⚙ Settings.',
      );
    }
    return generateRemote(messages, options, key, REMOTE_MODEL_ID);
  }

  if (!model || !processor) throw new Error('Model not loaded. Call loadModel() first.');

  // Gemma 4's chat template applies `| trim` to `messages[i]['content']`
  // expecting it to be a string. Passing the multimodal `[{type, text}]`
  // array shape trips the Jinja parser with `Unknown ArrayValue filter:
  // trim` and every generation fails. For text-only generation (no
  // images/audio) pass plain strings - the template branches into its
  // text-only path and the trim filter is happy.
  const wrapped = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const prompt = processor.apply_chat_template(wrapped, {
    add_generation_prompt: true,
    enable_thinking: false,
  });

  const inputs = (await processor(prompt, undefined, undefined, {
    add_special_tokens: false,
  })) as { input_ids: { dims: number[] } } & Record<string, unknown>;

  let outputs: Awaited<ReturnType<Model['generate']>>;
  try {
    outputs = await model.generate({
      ...(inputs as unknown as Record<string, unknown>),
      max_new_tokens: options.maxNewTokens ?? 256,
      do_sample: true,
      temperature: options.temperature ?? 1.0,
      top_p: options.topP ?? 0.95,
      top_k: options.topK ?? 64,
    });
  } catch (err) {
    if (detectedDevice === 'webgpu' && isWebGpuRuntimeFailure(err)) {
      // Inference-time WebGPU failure (device lost mid-OrtRun, mapAsync
      // released, etc.). The ORT session is wedged - the only safe recovery
      // is a fresh load on the WASM backend. Persist the blacklist so the
      // next page load skips WebGPU entirely, and reset module state so the
      // next loadModel() builds a fresh WASM session.
      blacklistWebGpu();
      model = null;
      processor = null;
      loadedModelId = null;
      loadPromise = null;
      detectedDevice = null;
      throw new Error(
        "WebGPU lost the inference session on this hardware. Reload the page - we'll use CPU (WASM) next time. For better performance, switch to Remote (OpenRouter) mode in Settings.",
      );
    }
    throw err;
  }

  // Slice off the prompt tokens, decode only what was generated.
  const promptLen = inputs.input_ids.dims.at(-1) ?? 0;
  const trimmed = (outputs as unknown as {
    slice: (a: unknown, b: unknown) => unknown;
  }).slice(null, [promptLen, null]);
  const decoded = processor.batch_decode(trimmed, { skip_special_tokens: true });
  return decoded[0] ?? '';
}
