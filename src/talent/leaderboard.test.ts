import { describe, expect, it } from 'vitest';
import type { Like } from '../memory/taste';
import { CHARACTERS } from './characters';
import { rankRoster } from './leaderboard';

function mkChampion(
  characterId: string,
  characterName: string,
  likedAt: number,
): Like {
  return {
    id: `like-${characterId}-${likedAt}`,
    seed_code: 's("bd*4")',
    variation_code: 's("bd*4").fast(2)',
    transformation_label: `${characterName} took it`,
    explanation_one_line: 'a winning run',
    liked_at: likedAt,
    avatar_seed: characterId,
    tournament: {
      size: 4,
      rounds_beaten: 2,
      defeated_labels: ['a', 'b'],
      champion_character_id: characterId,
      champion_character_name: characterName,
    },
  };
}

describe('rankRoster', () => {
  it('returns every character in the roster exactly once', () => {
    const ranked = rankRoster([], CHARACTERS);
    expect(ranked.length).toBe(CHARACTERS.length);
    const ids = ranked.map((r) => r.character.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('puts a champion above an untested rookie', () => {
    const ranked = rankRoster(
      [mkChampion('mira', 'Mira', 1000)],
      CHARACTERS,
    );
    expect(ranked[0].character.id).toBe('mira');
    expect(ranked[0].wins).toBe(1);
    // Some rookie sits below, with zero wins.
    expect(ranked[ranked.length - 1].wins).toBe(0);
  });

  it('ranks 2 wins above 1 win', () => {
    const likes = [
      mkChampion('mira', 'Mira', 1000),
      mkChampion('jaylen', 'Jaylen', 2000),
      mkChampion('jaylen', 'Jaylen', 3000),
    ];
    const ranked = rankRoster(likes, CHARACTERS);
    expect(ranked[0].character.id).toBe('jaylen');
    expect(ranked[0].wins).toBe(2);
    expect(ranked[1].character.id).toBe('mira');
    expect(ranked[1].wins).toBe(1);
  });

  it('breaks ties on win count by most recent win', () => {
    const likes = [
      mkChampion('mira', 'Mira', 1000), // older
      mkChampion('jaylen', 'Jaylen', 9999), // most recent
    ];
    const ranked = rankRoster(likes, CHARACTERS);
    expect(ranked[0].character.id).toBe('jaylen');
    expect(ranked[1].character.id).toBe('mira');
  });

  it('sorts 0-win characters alphabetically at the tail', () => {
    const ranked = rankRoster([], CHARACTERS);
    // All entries are tied at 0 wins → fully alphabetical.
    const names = ranked.map((r) => r.character.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('keeps 0-win characters strictly below any character with at least one win', () => {
    const likes = [mkChampion('mira', 'Mira', 1000)];
    const ranked = rankRoster(likes, CHARACTERS);
    const miraIdx = ranked.findIndex((r) => r.character.id === 'mira');
    for (let i = 0; i < ranked.length; i++) {
      if (i === miraIdx) continue;
      if (i < miraIdx) {
        expect(ranked[i].wins, ranked[i].character.id).toBeGreaterThan(0);
      } else {
        expect(ranked[i].wins, ranked[i].character.id).toBe(0);
      }
    }
  });

  it('ignores likes that reference an unknown character id', () => {
    const stray: Like = mkChampion('ghost-character', 'Ghost', 5000);
    const ranked = rankRoster([stray], CHARACTERS);
    // No real character earned a win - everyone is 0-win, fully alphabetical.
    expect(ranked.every((r) => r.wins === 0)).toBe(true);
  });

  it('ignores likes that have no tournament metadata (Studio likes)', () => {
    const studioLike: Like = {
      id: 'studio-1',
      seed_code: 's("bd")',
      variation_code: 's("bd*2")',
      transformation_label: 'doubled',
      explanation_one_line: 'twice as much',
      liked_at: 1000,
      // No avatar_seed, no tournament.
    };
    const ranked = rankRoster([studioLike], CHARACTERS);
    expect(ranked.every((r) => r.wins === 0)).toBe(true);
  });
});
