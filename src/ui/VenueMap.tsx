import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { AppMode } from './App';
import { StageLamp } from './StageLamp';

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

const BACKSTAGE_IDX = VENUES.length;
const LAMP_LENS_Y = 68; // matches `.stage-lamp-lens` vertical placement in styles.css
const CONE_MAX_TILT_DEG = 22;

type VenueMapProps = {
  mode: AppMode;
  onSelect: (next: AppMode) => void;
  onOpenSettings: () => void;
};

/**
 * Theatrical lobby that replaces the flat tab strip. Each venue is rendered
 * as its own miniature proscenium: gold-trimmed arch, bulbs that chase
 * around the active door, brief sublabel below.
 *
 * A single stage lamp (`StageLamp`) hangs from the arch and tracks the
 * hovered/focused button: it swings horizontally to centre over the target
 * and projects a cone of warm light that tilts toward the cursor. All
 * motion is driven via CSS variables on `.venue-map` so React re-renders
 * stay coarse (one per hover / focus change) - the per-pixel mouse
 * movement only mutates style properties via rAF, never component state.
 */
export function VenueMap({ mode, onSelect, onOpenSettings }: VenueMapProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rafIdRef = useRef<number | null>(null);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [lampX, setLampX] = useState<number>(0);
  const [coneRotation, setConeRotation] = useState<number>(0);
  const [coneLength, setConeLength] = useState<number>(0);

  // Position the lamp at the centre of the nav at rest (and after resize).
  // We re-measure when the hovered button changes too, so a layout shift
  // between hover events doesn't strand the lamp on stale coordinates.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const recenter = () => {
      if (hoveredIdx == null) {
        setLampX(nav.getBoundingClientRect().width / 2);
      }
    };
    recenter();
    const ro = new ResizeObserver(recenter);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [hoveredIdx]);

  const measure = useCallback(
    (idx: number, cursorPageX: number | null, cursorPageY: number | null) => {
      const nav = navRef.current;
      const btn = buttonRefs.current[idx];
      if (!nav || !btn) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const targetLampX = btnRect.left + btnRect.width / 2 - navRect.left;
      const cursorX =
        cursorPageX != null ? cursorPageX - navRect.left : targetLampX;
      const cursorY =
        cursorPageY != null
          ? cursorPageY - navRect.top
          : btnRect.top + btnRect.height / 2 - navRect.top;
      const dx = cursorX - targetLampX;
      const dy = Math.max(20, cursorY - LAMP_LENS_Y);
      const rawTilt = (Math.atan2(dx, dy) * 180) / Math.PI;
      const tilt = Math.max(-CONE_MAX_TILT_DEG, Math.min(CONE_MAX_TILT_DEG, rawTilt));
      const length = Math.sqrt(dx * dx + dy * dy);
      setLampX(targetLampX);
      setConeRotation(tilt);
      setConeLength(length);
    },
    [],
  );

  const handleEnter = (idx: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    setHoveredIdx(idx);
    measure(idx, e.clientX, e.clientY);
  };

  const handleMove = (idx: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const cx = e.clientX;
    const cy = e.clientY;
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      measure(idx, cx, cy);
    });
  };

  const handleLeave = () => {
    setHoveredIdx(null);
  };

  const handleFocus = (idx: number) => () => {
    setHoveredIdx(idx);
    measure(idx, null, null);
  };

  const handleBlur = () => {
    setHoveredIdx(null);
  };

  useEffect(() => () => {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
  }, []);

  const lampActive = hoveredIdx !== null;
  const navStyle = {
    '--lamp-x': `${lampX}px`,
    '--lamp-active': lampActive ? 1 : 0,
    '--cone-rotation': `${coneRotation}deg`,
    '--cone-length': `${lampActive ? coneLength : 0}px`,
  } as CSSProperties;

  return (
    <nav
      ref={navRef}
      className="venue-map"
      role="tablist"
      aria-label="Venue"
      style={navStyle}
    >
      <div className="venue-arch" aria-hidden="true" />
      <div className="venue-swag" aria-hidden="true" />
      <StageLamp active={lampActive} />
      <div className="venue-doors">
        {VENUES.map((v, i) => {
          const here = mode === v.id;
          return (
            <button
              key={v.id}
              ref={(el) => { buttonRefs.current[i] = el; }}
              type="button"
              role="tab"
              aria-selected={here}
              aria-label={v.label}
              className={`venue-door${here ? ' is-here' : ''}`}
              onClick={() => {
                if (!here) onSelect(v.id);
              }}
              onMouseEnter={handleEnter(i)}
              onMouseMove={handleMove(i)}
              onMouseLeave={handleLeave}
              onFocus={handleFocus(i)}
              onBlur={handleBlur}
            >
              <span className="venue-door-bulbs" aria-hidden="true">
                {Array.from({ length: 9 }, (_, b) => (
                  <span
                    key={b}
                    className="venue-bulb"
                    style={{ animationDelay: `${b * 80}ms` }}
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
          ref={(el) => { buttonRefs.current[BACKSTAGE_IDX] = el; }}
          type="button"
          className="venue-stage-door"
          onClick={onOpenSettings}
          aria-label="Backstage (settings)"
          title="Backstage: pick your engine"
          onMouseEnter={handleEnter(BACKSTAGE_IDX)}
          onMouseMove={handleMove(BACKSTAGE_IDX)}
          onMouseLeave={handleLeave}
          onFocus={handleFocus(BACKSTAGE_IDX)}
          onBlur={handleBlur}
        >
          <span aria-hidden="true">🚪</span>
          <span className="venue-stage-door-label">Backstage</span>
        </button>
      </div>
    </nav>
  );
}
