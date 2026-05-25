import { memo, useEffect, useMemo, useState } from 'react';
import { getAllLikes, type Like } from '../memory/taste';
import { renderAvatar } from '../talent/avatar';
import { CHARACTERS, type Character } from '../talent/characters';
import { rankRoster, type RankedEntry } from '../talent/leaderboard';

type Props = {
  /** Bumped by App.tsx whenever a champion is saved, so the leaderboard
   *  re-reads from IndexedDB and re-ranks without a manual refresh. */
  version: number;
};

const TIER_LABELS = ['1st', '2nd', '3rd'] as const;
const TIER_CLASSES = ['gold', 'silver', 'bronze'] as const;

function PodiumSpot({
  entry,
  tierIndex,
}: {
  entry: RankedEntry | null;
  tierIndex: 0 | 1 | 2;
}) {
  const tierClass = TIER_CLASSES[tierIndex];
  const tierLabel = TIER_LABELS[tierIndex];
  // Champion mouth = laugh → reads as celebration on the podium.
  const svg = entry
    ? renderAvatar(entry.character.id, 'laugh', entry.character.avatarOptions)
    : null;
  return (
    <div className={`podium-spot ${tierClass}${entry ? '' : ' is-empty'}`}>
      <div className="podium-rank">{tierLabel}</div>
      {svg ? (
        <div
          className="podium-avatar"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="podium-avatar podium-avatar-empty" aria-hidden="true" />
      )}
      {entry ? (
        <>
          <div className="podium-name">{entry.character.name}</div>
          <div className="podium-tagline">{entry.character.tagline}</div>
          <div className="podium-wins">🏆 ×{entry.wins}</div>
        </>
      ) : (
        <>
          <div className="podium-name podium-name-empty">Awaiting champion</div>
          <div className="podium-tagline">&nbsp;</div>
          <div className="podium-wins">&nbsp;</div>
        </>
      )}
      <div className={`podium-pedestal pedestal-${tierClass}`} aria-hidden="true" />
    </div>
  );
}

function RosterRow({
  entry,
  rank,
}: {
  entry: RankedEntry;
  rank: number;
}) {
  const isRookie = entry.wins === 0;
  const svg = renderAvatar(
    entry.character.id,
    'smile',
    entry.character.avatarOptions,
  );
  return (
    <li className={`roster-row${isRookie ? ' is-rookie' : ''}`}>
      <div className="roster-rank">#{rank}</div>
      <div
        className="roster-avatar"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="roster-body">
        <div className="roster-name">{entry.character.name}</div>
        <div className="roster-tagline">{entry.character.tagline}</div>
      </div>
      <div className="roster-wins">
        {isRookie ? (
          <span className="rookie-pill" title="No championships yet">
            untested
          </span>
        ) : (
          <>🏆 ×{entry.wins}</>
        )}
      </div>
    </li>
  );
}

function LeaderboardInner({ version }: Props) {
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

  const ranked = useMemo(() => rankRoster(likes, CHARACTERS), [likes]);
  const podium = useMemo<(RankedEntry | null)[]>(() => {
    // Show wins only on the podium - empty placeholders for 0-win slots
    // even if a rookie technically ranks third.
    return [0, 1, 2].map((i) => {
      const entry = ranked[i];
      return entry && entry.wins > 0 ? entry : null;
    });
  }, [ranked]);
  const rosterRest = ranked.slice(3);
  const totalWins = ranked.reduce((sum, e) => sum + e.wins, 0);
  const championedCount = ranked.filter((e) => e.wins > 0).length;

  return (
    <div className="panel leaderboard-panel hall-of-fame">
      <header className="leaderboard-head">
        <h2 className="hall-of-fame-title" style={{ margin: 0 }}>The Hall of Fame</h2>
        <div className="hall-of-fame-sub">every champion, every season</div>
        <div className="leaderboard-meta">
          {loading
            ? 'loading…'
            : `${totalWins} ovation${totalWins === 1 ? '' : 's'} · ${championedCount}/${ranked.length} stars have taken the stage`}
        </div>
      </header>

      {championedCount === 0 ? (
        <div className="hall-of-fame-empty" role="status">
          <div className="hall-of-fame-empty-mark" aria-hidden="true">🏆</div>
          <h3>No champions yet.</h3>
          <p>
            Hold a show on the Main Stage to crown your first ovation.
          </p>
        </div>
      ) : (
        <div
          className="podium-row"
          role="region"
          aria-label="Top three characters"
        >
          {/* Render in [silver, gold, bronze] order so the gold center spot
              sits visually between its neighbours regardless of the source
              ranking order (which is [gold, silver, bronze]). */}
          <PodiumSpot entry={podium[1]} tierIndex={1} />
          <PodiumSpot entry={podium[0]} tierIndex={0} />
          <PodiumSpot entry={podium[2]} tierIndex={2} />
        </div>
      )}

      {rosterRest.length > 0 && (
        <div className="leaderboard-roster">
          <h3 className="roster-heading">The Playbill</h3>
          <ul className="roster-list">
            {rosterRest.map((entry, i) => (
              <RosterRow
                key={entry.character.id}
                entry={entry}
                rank={i + 4}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const Leaderboard = memo(LeaderboardInner);

// Re-export so tests can locate the type without a deep import.
export type { Character };
