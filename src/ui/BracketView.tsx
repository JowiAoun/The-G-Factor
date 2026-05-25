import { Fragment, useMemo } from 'react';
import { renderAvatar } from '../talent/avatar';
import type { BracketState, Contestant, Match } from '../talent/bracket';

function shortRoundName(r: number, total: number): string {
  if (r === total) return 'Final';
  if (r === total - 1) return 'Semis';
  if (r === total - 2) return 'Quarters';
  return `R${r}`;
}

function Thumb({
  contestant,
  isCurrent,
  isEliminated,
  isAdvanced,
  isChampion,
}: {
  contestant: Contestant | null;
  isCurrent: boolean;
  isEliminated: boolean;
  isAdvanced: boolean;
  isChampion: boolean;
}) {
  const classes = ['bracket-marquee-thumb'];
  if (isCurrent)    classes.push('is-current');
  if (isEliminated) classes.push('is-eliminated');
  if (isAdvanced)   classes.push('is-advanced');
  if (isChampion)   classes.push('is-champion');

  if (!contestant) {
    return (
      <div
        className={`${classes.join(' ')} is-placeholder`}
        aria-hidden="true"
        style={{ borderStyle: 'dashed', opacity: 0.3 }}
      />
    );
  }
  return (
    <div
      className={classes.join(' ')}
      title={`${contestant.character.name} - ${contestant.label}`}
      dangerouslySetInnerHTML={{
        __html: renderAvatar(
          contestant.character.id,
          'smile',
          contestant.character.avatarOptions,
        ),
      }}
    />
  );
}

export function BracketView({ state }: { state: BracketState }) {
  const rounds = useMemo(() => {
    const out: Match[][] = [];
    for (let r = 1; r <= state.rounds; r++) {
      out.push(state.matches.filter((m) => m.round === r));
    }
    return out;
  }, [state]);

  const currentMatchId = state.matches[state.cursor]?.id ?? null;
  const eliminatedIds = new Set(
    state.matches
      .filter((m) => m.loserId)
      .map((m) => m.loserId as string),
  );

  return (
    <div className="bracket-marquee" aria-label="Bracket progress">
      {rounds.map((matches, ri) => (
        <Fragment key={ri}>
          {ri > 0 && <span className="bracket-marquee-sep" aria-hidden="true">›</span>}
          <div className="bracket-marquee-round">
            <span className="bracket-marquee-round-label">
              {shortRoundName(ri + 1, state.rounds)}
            </span>
            {matches.map((m) => (
              <Fragment key={m.id}>
                <Thumb
                  contestant={m.a}
                  isCurrent={m.id === currentMatchId}
                  isEliminated={!!(m.a && eliminatedIds.has(m.a.id))}
                  isAdvanced={!!(m.a && m.winnerId === m.a.id)}
                  isChampion={!!(m.a && state.champion?.id === m.a.id)}
                />
                <span className="bracket-marquee-vs" aria-hidden="true">vs</span>
                <Thumb
                  contestant={m.b}
                  isCurrent={m.id === currentMatchId}
                  isEliminated={!!(m.b && eliminatedIds.has(m.b.id))}
                  isAdvanced={!!(m.b && m.winnerId === m.b.id)}
                  isChampion={!!(m.b && state.champion?.id === m.b.id)}
                />
              </Fragment>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
