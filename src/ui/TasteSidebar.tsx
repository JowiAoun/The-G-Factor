import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { getAllLikes, clearLikes, type Like } from '../memory/taste';
import { renderAvatar } from '../talent/avatar';
import { CHARACTERS, getCharacterById, type Character } from '../talent/characters';

type Props = {
  version: number;
  onCleared?: () => void;
};

type RosterEntry = {
  character: Character;
  wins: Like[];
  latestLabel: string;
  latestAt: number;
};

// Memoised: TasteSidebar only depends on `version` (bumped on like/clear/
// champion-saved) and `onCleared` (stable identity in App). The frequent
// model-download progress updates in the parent shouldn't trigger a
// `getAllLikes()` round-trip here.
function TasteSidebarInner({ version, onCleared }: Props) {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllLikes()
      .then((rows) => {
        if (!cancelled) setLikes(rows);
      })
      .catch(() => {
        if (!cancelled) setLikes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const handleClear = useCallback(async () => {
    if (!window.confirm('Clear all past winners? This cannot be undone.')) return;
    await clearLikes();
    setLikes([]);
    onCleared?.();
  }, [onCleared]);

  // Aggregate tournament wins by character. Legacy champions saved before
  // the character roster existed have no `champion_character_id` and are
  // silently dropped - they still live in IndexedDB and feed similarity.
  const roster = useMemo<RosterEntry[]>(() => {
    const byId = new Map<string, RosterEntry>();
    for (const like of likes) {
      const charId = like.tournament?.champion_character_id;
      if (!charId) continue;
      const character = getCharacterById(charId);
      if (!character) continue;
      const existing = byId.get(charId);
      if (existing) {
        existing.wins.push(like);
        if (like.liked_at > existing.latestAt) {
          existing.latestAt = like.liked_at;
          existing.latestLabel = like.transformation_label;
        }
      } else {
        byId.set(charId, {
          character,
          wins: [like],
          latestLabel: like.transformation_label,
          latestAt: like.liked_at,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (b.wins.length !== a.wins.length) return b.wins.length - a.wins.length;
      return b.latestAt - a.latestAt;
    });
  }, [likes]);

  const totalWins = roster.reduce((sum, r) => sum + r.wins.length, 0);
  const rosterRemaining = CHARACTERS.length - roster.length;

  return (
    <div className="panel taste-panel">
      <div className="taste-head">
        <h2 style={{ margin: 0 }}>
          Past winners · {loading ? '…' : totalWins}
        </h2>
        {totalWins > 0 && (
          <button className="muted" onClick={handleClear} aria-label="Clear past winners">
            Clear
          </button>
        )}
      </div>
      {!loading && roster.length === 0 ? (
        <div style={{ color: '#9aa0a8', fontSize: '0.88rem', marginTop: 6 }}>
          Run a talent show and crown a champion to fill this wall. Wins are
          tracked per character - the {CHARACTERS.length}-strong roster grows
          a track record with you over time, and Gemma uses your champions as
          few-shot exemplars for future brackets.
        </div>
      ) : (
        <>
          <ul className="taste-list">
            {roster.slice(0, 6).map((entry) => {
              const winCount = entry.wins.length;
              const defeated = entry.wins
                .flatMap((w) => w.tournament?.defeated_labels ?? [])
                .filter(Boolean);
              return (
                <li key={entry.character.id}>
                  <div
                    className="taste-avatar"
                    dangerouslySetInnerHTML={{
                      __html: renderAvatar(
                        entry.character.id,
                        'smile',
                        entry.character.avatarOptions,
                      ),
                    }}
                  />
                  <div className="taste-body">
                    <div className="taste-label">
                      {entry.character.name}
                      <span
                        className="taste-trophy"
                        title={
                          defeated.length
                            ? `Beat ${defeated.length} contestant${
                                defeated.length === 1 ? '' : 's'
                              }: ${defeated.join(', ')}`
                            : `${winCount} championship${winCount === 1 ? '' : 's'}`
                        }
                      >
                        🏆 ×{winCount}
                      </span>
                    </div>
                    <div className="taste-seed">{entry.character.tagline}</div>
                    <div className="taste-code">latest: {entry.latestLabel}</div>
                  </div>
                </li>
              );
            })}
            {roster.length > 6 && (
              <li className="taste-more">+ {roster.length - 6} more</li>
            )}
          </ul>
          {rosterRemaining > 0 ? (
            <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: 8 }}>
              {rosterRemaining} character{rosterRemaining === 1 ? '' : 's'} on
              the roster haven't won yet.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export const TasteSidebar = memo(TasteSidebarInner);
