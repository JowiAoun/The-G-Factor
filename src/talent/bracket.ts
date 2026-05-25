/**
 * Single-elimination tournament bracket.
 *
 * Pure logic - no React, no DOM, no IndexedDB. The UI mounts a render of the
 * state and calls `chooseWinner` when the user picks a contestant; this
 * module returns the next state. Idempotent: resolving an already-decided
 * match returns the same state object.
 *
 * Size must be a power of two ≥ 2. For the Strudel Tutor talent show, we use
 * 4 (3 matches) by default with an 8 (7 matches) advanced toggle.
 *
 * DNF contestants (generation failed → `status: 'dnf'`) are auto-eliminated
 * during `createBracket`: their opponent gets a bye into the next round.
 */

export type ContestantStatus = 'valid' | 'dnf';

import type { Character } from './characters';

export type Contestant = {
  /** Stable within one show. e.g. `c-0`, `c-1`. */
  id: string;
  /** From the generated variation's `transformation_label`. Used as the
   *  technique subtitle under the character's name on the card. */
  label: string;
  /** From the generated variation's `variation_code`. */
  code: string;
  /** From the generated variation's `explanation_one_line`. */
  explanation: string;
  /** Persistent character identity (name, tagline, pinned avatar options). */
  character: Character;
  /** Generation outcome - DNFs auto-lose. */
  status: ContestantStatus;
};

export type MatchId = string;

export type Match = {
  id: MatchId;
  /** 1-indexed round. */
  round: number;
  /** 1-indexed within its round. */
  matchInRound: number;
  /** `null` while waiting for an upstream match to resolve. */
  a: Contestant | null;
  b: Contestant | null;
  /** Contestant id of the winner once resolved, else `null`. */
  winnerId: string | null;
  loserId: string | null;
};

export type BracketState = {
  size: number;
  rounds: number;
  matches: Match[];
  contestants: Contestant[];
  /** Index into `matches` of the next match awaiting input, or `matches.length` when the bracket is fully resolved. */
  cursor: number;
  champion: Contestant | null;
};

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

/**
 * Build the bracket's match shells. Round-1 matches get both contestants;
 * later rounds get `a: null, b: null` until upstream winners propagate.
 */
export function createBracket(contestants: Contestant[]): BracketState {
  if (!isPowerOfTwo(contestants.length)) {
    throw new Error(
      `bracket size must be a power of two, got ${contestants.length}`,
    );
  }
  const size = contestants.length;
  const rounds = Math.log2(size);
  const matches: Match[] = [];

  // Round 1: pair (1v2), (3v4), ...
  for (let i = 0; i < size; i += 2) {
    matches.push({
      id: `r1-m${i / 2 + 1}`,
      round: 1,
      matchInRound: i / 2 + 1,
      a: contestants[i],
      b: contestants[i + 1],
      winnerId: null,
      loserId: null,
    });
  }
  // Rounds 2..N: empty shells.
  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let m = 1; m <= count; m++) {
      matches.push({
        id: `r${r}-m${m}`,
        round: r,
        matchInRound: m,
        a: null,
        b: null,
        winnerId: null,
        loserId: null,
      });
    }
  }

  let state: BracketState = {
    size,
    rounds,
    matches,
    contestants,
    cursor: 0,
    champion: null,
  };

  // Auto-advance any DNF round-1 contestants.
  for (const m of [...matches]) {
    if (m.round !== 1) continue;
    const a = m.a;
    const b = m.b;
    if (!a || !b) continue;
    if (a.status === 'dnf' && b.status === 'valid') {
      state = chooseWinner(state, m.id, b.id);
    } else if (b.status === 'dnf' && a.status === 'valid') {
      state = chooseWinner(state, m.id, a.id);
    } else if (a.status === 'dnf' && b.status === 'dnf') {
      // Both failed - pick `a` as the lesser-of-two and let it carry the DNF
      // status forward; the audience will see them lose the next match.
      state = chooseWinner(state, m.id, a.id);
    }
  }

  return state;
}

export function currentMatch(state: BracketState): Match | null {
  if (state.cursor >= state.matches.length) return null;
  return state.matches[state.cursor];
}

/**
 * Resolve a match. Returns a new state with the winner propagated into the
 * downstream match. Idempotent: returns the same state object if the match
 * is already resolved.
 */
export function chooseWinner(
  state: BracketState,
  matchId: MatchId,
  winnerId: string,
): BracketState {
  const idx = state.matches.findIndex((m) => m.id === matchId);
  if (idx < 0) return state;
  const match = state.matches[idx];
  if (match.winnerId) return state;
  if (!match.a || !match.b) return state;
  if (winnerId !== match.a.id && winnerId !== match.b.id) return state;

  const winner = winnerId === match.a.id ? match.a : match.b;
  const loser = winnerId === match.a.id ? match.b : match.a;

  const updatedMatch: Match = {
    ...match,
    winnerId: winner.id,
    loserId: loser.id,
  };

  const nextMatches = [...state.matches];
  nextMatches[idx] = updatedMatch;

  // Propagate winner into the next round's match.
  if (match.round < state.rounds) {
    const nextRound = match.round + 1;
    const nextMatchInRound = Math.ceil(match.matchInRound / 2);
    const nextIdx = nextMatches.findIndex(
      (m) => m.round === nextRound && m.matchInRound === nextMatchInRound,
    );
    if (nextIdx >= 0) {
      const isASlot = match.matchInRound % 2 === 1;
      const downstream = nextMatches[nextIdx];
      nextMatches[nextIdx] = {
        ...downstream,
        a: isASlot ? winner : downstream.a,
        b: isASlot ? downstream.b : winner,
      };
    }
  }

  // Advance cursor past every consecutively-resolved match.
  let cursor = state.cursor;
  while (cursor < nextMatches.length && nextMatches[cursor].winnerId) cursor++;

  const champion =
    cursor >= nextMatches.length
      ? // Last match's winner is the champion.
        winner
      : null;

  return {
    ...state,
    matches: nextMatches,
    cursor,
    champion,
  };
}

export function isResolved(state: BracketState): boolean {
  return state.cursor >= state.matches.length;
}
