import type { ContestantViewState } from './Contestant';
import type { Match } from '../talent/bracket';
import { TalentStage } from './TalentStage';
import { Performer } from './Performer';

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

  const marquee = `🎤 ${roundName} · Match ${matchIndex + 1} of ${totalMatches}`;

  return (
    <>
      <TalentStage
        phase="showing"
        curtain="open"
        marquee={marquee}
        spotlightActive={!!playingId}
      >
        <div className="performer-row">
          <Performer
            contestant={a}
            state={stateFor(a.id)}
            side="left"
            onPlay={() => onPlay(a.id, a.code)}
            onStop={onStop}
            onChoose={match.winnerId ? undefined : () => onChoose(a.id)}
          />
          <div key={match.id} className="vs-sash" aria-hidden="true">
            VS
          </div>
          <Performer
            contestant={b}
            state={stateFor(b.id)}
            side="right"
            onPlay={() => onPlay(b.id, b.code)}
            onStop={onStop}
            onChoose={match.winnerId ? undefined : () => onChoose(b.id)}
          />
        </div>
      </TalentStage>

      <div className="match-code-strip">
        {[a, b].map((c) => (
          <div key={c.id} className="match-code-strip-col">
            <div className="label">
              {c.character.name} · {c.label}
            </div>
            {c.code && <pre>{c.code}</pre>}
            {c.explanation && <p className="expl">{c.explanation}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
