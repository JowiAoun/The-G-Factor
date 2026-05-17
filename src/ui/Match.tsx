import { useEffect, useState } from 'react';
import { ContestantCard, type ContestantViewState } from './Contestant';
import type { Match } from '../talent/bracket';

export function MatchView({
  match,
  totalMatches,
  matchIndex,
  rounds,
  playingId,
  onPlay,
  onStop,
  onChoose,
}: {
  match: Match;
  totalMatches: number;
  matchIndex: number;
  rounds: number;
  playingId: string | null;
  onPlay: (contestantId: string, code: string) => void;
  onStop: () => void;
  onChoose: (contestantId: string) => void;
}) {
  // VS flash on every new match.
  const [showVs, setShowVs] = useState(true);
  useEffect(() => {
    setShowVs(true);
    const t = window.setTimeout(() => setShowVs(false), 900);
    return () => window.clearTimeout(t);
  }, [match.id]);

  if (!match.a || !match.b) {
    return (
      <div className="panel match-waiting">waiting for upstream match…</div>
    );
  }

  const a = match.a;
  const b = match.b;

  const stateFor = (cid: string): ContestantViewState => {
    if (match.winnerId === cid) return 'winner';
    if (match.loserId === cid) return 'loser';
    if (playingId === cid) return 'playing';
    return 'idle';
  };

  const roundName =
    match.round === rounds
      ? 'Final'
      : match.round === rounds - 1
        ? 'Semifinal'
        : `Round ${match.round}`;

  return (
    <div className="panel match-panel">
      <div className="match-label">
        {roundName} · Match {matchIndex + 1} of {totalMatches}
      </div>
      <div className="match-row">
        <ContestantCard
          contestant={a}
          state={stateFor(a.id)}
          side="left"
          onPlay={() => onPlay(a.id, a.code)}
          onStop={onStop}
          onChoose={match.winnerId ? undefined : () => onChoose(a.id)}
        />
        {showVs && (
          <div className="vs-flash" aria-hidden="true">
            VS
          </div>
        )}
        <ContestantCard
          contestant={b}
          state={stateFor(b.id)}
          side="right"
          onPlay={() => onPlay(b.id, b.code)}
          onStop={onStop}
          onChoose={match.winnerId ? undefined : () => onChoose(b.id)}
        />
      </div>
    </div>
  );
}
