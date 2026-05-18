import { SYSTEM_PROMPT } from '../model/prompts';
import { personaSystemPromptFragment } from './persona';

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

const TURN_SCHEMA_RULE = `Always respond with STRICT JSON in this exact shape — no prose, no markdown fences, no explanations:

{
  "new_mix_code": "<the FULL new Strudel code after applying the user's request — never a diff, never partial, always the complete pattern>",
  "assistant_message": "<one or two short sentences in character, no markdown>",
  "action_label": "<a 2-4 word tag like 'added kick', 'halved tempo', 'no-op'>"
}

If the user's request can't be satisfied musically, return the previous mix verbatim in new_mix_code and use action_label "no-op".`;

/**
 * How many prior turns of chat history get echoed back into the model.
 *
 * Six was picked empirically — enough for Bleep to maintain a coherent
 * thread ("you just added hats, now I'm asking for snare"), short enough
 * to keep the prompt budget comfortable on Gemma 4 E2B.
 */
export const HISTORY_DEPTH = 6;

function trimmedHistory(history: ChatTurn[]): ChatTurn[] {
  if (history.length <= HISTORY_DEPTH) return history;
  return history.slice(history.length - HISTORY_DEPTH);
}

function buildSystem(currentMix: string): string {
  const mixBlock = currentMix.trim()
    ? `CURRENT MIX (always preserve unless the user asks to change it):\n${currentMix.trim()}`
    : 'CURRENT MIX: <empty — there is no pattern yet>';
  return [
    SYSTEM_PROMPT,
    '',
    personaSystemPromptFragment,
    '',
    TURN_SCHEMA_RULE,
    '',
    mixBlock,
  ].join('\n');
}

/**
 * Build the message array passed to `generate()` for one studio chat turn.
 *
 * The model sees: the Strudel cheat sheet, Bleep's persona, the JSON rule,
 * the current mix code in the system message; then the last few real chat
 * turns; then the user's new message (with an optional retry hint when an
 * earlier attempt produced invalid Strudel).
 */
export function buildTurnPrompt(
  currentMix: string,
  history: ChatTurn[],
  userMessage: string,
  retryHint?: string,
): { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] } {
  const hint = retryHint
    ? `\n\n(Previous attempt was rejected: ${retryHint}. Produce different, syntactically valid Strudel JS.)`
    : '';
  return {
    messages: [
      { role: 'system', content: buildSystem(currentMix) },
      ...trimmedHistory(history).map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: `${userMessage}${hint}` },
    ],
  };
}
