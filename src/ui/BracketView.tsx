import { useMemo } from 'react';
import { renderAvatar } from '../talent/avatar';
import type { BracketState, Match } from '../talent/bracket';

export function BracketView({ state }: { state: BracketState }) {
  const rounds = useMemo(() => {
    const out: Match[][] = [];
    for (let r = 1; r <= state.rounds; r++) {
      out.push(state.matches.filter((m) => m.round === r));
    }
    return out;
  }, [state]);

  const eliminatedIds = new Set(
    state.matches
      .filter((m) => m.loserId)
      .map((m) => m.loserId as string),
  );

  const roundNames = (r: number, total: number) => {
    if (r === total) return 'Final';
    if (r === total - 1) return 'Semis';
    if (r === total - 2) return 'Quarters';
    return `Round ${r}`;
  };

  return (
    <div className="panel bracket-strip">
      <h2 style={{ margin: '0 0 10px' }}>Bracket</h2>
      <div className="bracket-rounds">
        {rounds.map((matches, ri) => (
          <div key={ri} className="bracket-round">
            <div className="bracket-round-label">
              {roundNames(ri + 1, state.rounds)}
            </div>
            <div className="bracket-round-matches">
              {matches.map((m) => (
                <div key={m.id} className="bracket-match">
                  {[m.a, m.b].map((c, i) =>
                    c ? (
                      <div
                        key={c.id}
                        className={[
                          'bracket-node',
                          eliminatedIds.has(c.id) ? 'eliminated' : '',
                          state.champion?.id === c.id ? 'champion-node' : '',
                          m.winnerId === c.id ? 'advanced' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={c.label}
                      >
                        <div
                          className="bracket-avatar"
                          dangerouslySetInnerHTML={{
                            __html: renderAvatar(c.avatarSeed, 'smile'),
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        key={`empty-${m.id}-${i}`}
                        className="bracket-node placeholder"
                        aria-hidden="true"
                      >
                        <div className="bracket-avatar placeholder-dot" />
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
