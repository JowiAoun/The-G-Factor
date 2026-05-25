import type { AppMode } from './App';

type Venue = {
  id: AppMode;
  label: string;
  sublabel: string;
  icon: string;
};

const VENUES: Venue[] = [
  { id: 'remix',       label: 'Rehearsal Room', sublabel: 'where the magic is made', icon: '🎹' },
  { id: 'talentshow',  label: 'Main Stage',     sublabel: "tonight's live show",      icon: '🎭' },
  { id: 'leaderboard', label: 'Hall of Fame',   sublabel: 'every champion, ever',     icon: '🏆' },
];

type VenueMapProps = {
  mode: AppMode;
  onSelect: (next: AppMode) => void;
  onOpenSettings: () => void;
};

/**
 * Theatrical lobby that replaces the flat tab strip. Each venue is rendered
 * as its own miniature proscenium — gold-trimmed arch, bulbs that chase
 * around the active door, brief sublabel below.
 *
 * Purely presentational: state lives in App.tsx; this component just emits
 * `onSelect(id)` on click.
 */
export function VenueMap({ mode, onSelect, onOpenSettings }: VenueMapProps) {
  return (
    <nav className="venue-map" role="tablist" aria-label="Venue">
      <div className="venue-arch" aria-hidden="true" />
      <div className="venue-swag" aria-hidden="true" />
      <div className="venue-doors">
        {VENUES.map((v) => {
          const here = mode === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={here}
              aria-label={v.label}
              className={`venue-door${here ? ' is-here' : ''}`}
              onClick={() => {
                if (!here) onSelect(v.id);
              }}
            >
              <span className="venue-door-bulbs" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => (
                  <span
                    key={i}
                    className="venue-bulb"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </span>
              <span className="venue-door-arch" aria-hidden="true" />
              <span className="venue-door-icon" aria-hidden="true">{v.icon}</span>
              <span className="venue-door-label">{v.label}</span>
              <span className="venue-door-sub">{v.sublabel}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="venue-stage-door"
          onClick={onOpenSettings}
          aria-label="Backstage (settings)"
          title="Backstage — pick your engine"
        >
          <span aria-hidden="true">🚪</span>
          <span className="venue-stage-door-label">Backstage</span>
        </button>
      </div>
    </nav>
  );
}
