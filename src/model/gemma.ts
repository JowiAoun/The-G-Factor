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

// The transformers.js pipeline return type is a huge union TS can't represent —
// keep it loose internally and expose a tightly-typed `generate()` wrapper.
type Generator = (
  messages: unknown,
  opts?: Record<string, unknown>,
) => Promise<unknown>;

let generator: Generator | null = null;
let loadPromise: Promise<Generator> | null = null;
let loadedModelId: string | null = null;
let detectedDevice: 'webgpu' | 'wasm' | null = null;

async function hasWebGPU(): Promise<boolean> {
  const nav = navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } };
  if (!nav.gpu || typeof nav.gpu.requestAdapter !== 'function') return false;
  try {
    const adapter = await nav.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export function getDetectedDevice(): 'webgpu' | 'wasm' | null {
  return detectedDevice;
}

export async function loadModel(options: LoadOptions = {}): Promise<Generator> {
  const modelId = options.modelId ?? DEFAULT_MODEL_ID;
  if (generator && loadedModelId === modelId) return generator;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const tfs = (await import('@huggingface/transformers')) as {
      pipeline: (task: string, model: string, opts: Record<string, unknown>) => Promise<unknown>;
    };
    const device: 'webgpu' | 'wasm' = (await hasWebGPU()) ? 'webgpu' : 'wasm';
    detectedDevice = device;
    options.onProgress?.({ status: 'device-selected', name: device });
    const t0 = performance.now();
    const gen = (await tfs.pipeline('text-generation', modelId, {
      dtype: 'q4',
      device,
      progress_callback: (p: LoadProgress) => options.onProgress?.(p),
    })) as Generator;
    const ms = Math.round(performance.now() - t0);
    options.onProgress?.({ status: 'ready', name: `cold-load ${ms}ms` });
    generator = gen;
    loadedModelId = modelId;
    return gen;
  })();

  return loadPromise;
}

export type GenerateMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type GenerateOptions = {
  maxNewTokens?: number;
  temperature?: number;
  topP?: number;
};

export async function generate(
  messages: GenerateMessage[],
  options: GenerateOptions = {},
): Promise<string> {
  if (!generator) throw new Error('Model not loaded. Call loadModel() first.');
  const out = await generator(messages, {
    max_new_tokens: options.maxNewTokens ?? 256,
    temperature: options.temperature ?? 0.8,
    top_p: options.topP ?? 0.95,
    do_sample: true,
  } as unknown as Record<string, unknown>);
  const arr = out as Array<{ generated_text: unknown }>;
  const last = arr[0]?.generated_text;
  if (Array.isArray(last)) {
    const finalTurn = last.at(-1) as { content?: string } | undefined;
    return finalTurn?.content ?? '';
  }
  if (typeof last === 'string') return last;
  return '';
}
