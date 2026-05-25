/**
 * Pure ranking logic for the Leaderboard view.
 *
 * No DOM, no IndexedDB — takes the array of persisted likes plus a roster
 * and returns the full roster sorted into competition order. UI lives in
 * src/ui/Leaderboard.tsx; this file is the only thing the test file needs.
 */

import type { Like } from '../memory/taste';
import { CHARACTERS, type Character } from './characters';

export type RankedEntry = {
  character: Character;
  wins: number;
  /** Timestamp (ms) of this character's most recent championship, or null
   *  if they have no wins. Used as the first tiebreaker after wins. */
  latestWinAt: number | null;
};

/**
 * Sort the full roster into competition order:
 * 1) wins desc — more championships ranks higher
 * 2) latestWinAt desc — recent winners outrank stale winners on a wins-tie
 * 3) character.name asc — stable alphabetical fallback (handles 0-win ties
 *    where there's no recency to compare on)
 *
 * Every character in `roster` appears in the result exactly once, even if
 * they have zero wins. Likes that reference an unknown character id (e.g.
 * a roster member that was removed) contribute nothing — they're skipped.
 */
export function rankRoster(
  likes: Like[],
  roster: Character[] = CHARACTERS,
): RankedEntry[] {
  // character.id → running aggregate
  const stats = new Map<string, { wins: number; latestWinAt: number }>();
  for (const like of likes) {
    const charId = like.tournament?.champion_character_id;
    if (!charId) continue;
    const existing = stats.get(charId);
    if (existing) {
      existing.wins += 1;
      if (like.liked_at > existing.latestWinAt) {
        existing.latestWinAt = like.liked_at;
      }
    } else {
      stats.set(charId, { wins: 1, latestWinAt: like.liked_at });
    }
  }

  const entries: RankedEntry[] = roster.map((character) => {
    const s = stats.get(character.id);
    return {
      character,
      wins: s?.wins ?? 0,
      latestWinAt: s?.latestWinAt ?? null,
    };
  });

  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    // Both at 0 wins have null latestWinAt — fall through to alphabetical.
    if (a.latestWinAt !== null && b.latestWinAt !== null) {
      if (b.latestWinAt !== a.latestWinAt) return b.latestWinAt - a.latestWinAt;
    } else if (a.latestWinAt !== b.latestWinAt) {
      // One has wins, the other doesn't — non-null wins (shouldn't happen
      // when wins are tied, but defends against bad input).
      return a.latestWinAt === null ? 1 : -1;
    }
    return a.character.name.localeCompare(b.character.name);
  });

  return entries;
}
