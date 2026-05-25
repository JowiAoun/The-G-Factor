import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

const HALL_OF_FAME_IDX = VENUES.length - 1;
const LAMP_LENS_Y = 68; // matches `.stage-lamp-lens` vertical placement in styles.css
// Soft cap on cone rotation; covers wide buttons without going horizontal.
const CONE_MAX_TILT_DEG = 55;
const CURSOR_LERP_DAMPING = 0.30;
const LERP_STOP_THRESHOLD = 0.3;

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
 * A single stage lamp (`StageLamp`) hangs from the arch and parks over the
 * currently-selected venue at rest, swings to whichever door the user
 * hovers/focuses, and projects a cone of warm light that tilts toward the
 * cursor. Backstage lives in Hall of Fame's bottom-right corner (its cell
 * is its anchor) so the three main doors centre symmetrically and the
 * lamp doesn't waste a swing on a utility button.
 *
 * Per-pixel cone tracking runs through a rAF lerp loop that writes CSS
 * variables directly via `setProperty`; React state stays coarse (one
 * update per hover/focus change) so the cursor's motion never re-renders
 * the component.
 */
export function VenueMap({ mode, onSelect, onOpenSettings }: VenueMapProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const targetRef = useRef({ cursorX: 0, cursorY: 0 });
  const currentRef = useRef({ cursorX: 0, cursorY: 0 });
  const lampXRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const reducedMotionRef = useRef<boolean>(false);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const selectedIdx = useMemo(() => {
    const idx = VENUES.findIndex((v) => v.id === mode);
    return idx === -1 ? 0 : idx;
  }, [mode]);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const writeConeVars = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const dx = currentRef.current.cursorX - lampXRef.current;
    const dy = Math.max(20, currentRef.current.cursorY - LAMP_LENS_Y);
    // Negated: CSS rotate(+deg) is CW, and CW from straight-down in screen
    // coords (y-axis points down) moves the cone bottom to the LEFT. We
    // want bottom toward cursor, so flip the sign.
    const rawTilt = -((Math.atan2(dx, dy) * 180) / Math.PI);
    const tilt = Math.max(-CONE_MAX_TILT_DEG, Math.min(CONE_MAX_TILT_DEG, rawTilt));
    const length = Math.sqrt(dx * dx + dy * dy);
    nav.style.setProperty('--cone-rotation', `${tilt}deg`);
    nav.style.setProperty('--cone-length', `${length}px`);
  }, []);

  const tick = useCallback(() => {
    rafIdRef.current = null;
    const t = targetRef.current;
    const c = currentRef.current;
    c.cursorX += (t.cursorX - c.cursorX) * CURSOR_LERP_DAMPING;
    c.cursorY += (t.cursorY - c.cursorY) * CURSOR_LERP_DAMPING;
    writeConeVars();
    const dx = Math.abs(t.cursorX - c.cursorX);
    const dy = Math.abs(t.cursorY - c.cursorY);
    if (dx > LERP_STOP_THRESHOLD || dy > LERP_STOP_THRESHOLD) {
      rafIdRef.current = requestAnimationFrame(tick);
    } else {
      c.cursorX = t.cursorX;
      c.cursorY = t.cursorY;
      writeConeVars();
    }
  }, [writeConeVars]);

  const setLampX = useCallback((px: number) => {
    const nav = navRef.current;
    if (!nav) return;
    lampXRef.current = px;
    nav.style.setProperty('--lamp-x', `${px}px`);
  }, []);

  const handleEnter = (idx: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    setHoveredIdx(idx);
    const nav = navRef.current;
    const cell = cellRefs.current[idx];
    if (!nav || !cell) return;
    const navRect = nav.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    setLampX(cellRect.left + cellRect.width / 2 - navRect.left);
    targetRef.current.cursorX = e.clientX - navRect.left;
    targetRef.current.cursorY = e.clientY - navRect.top;
    // Snap on enter so the cone appears in the right place over the new
    // button rather than lerping across the gap from the previous one.
    currentRef.current.cursorX = targetRef.current.cursorX;
    currentRef.current.cursorY = targetRef.current.cursorY;
    writeConeVars();
  };

  const handleMove = (idx: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    const nav = navRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    targetRef.current.cursorX = e.clientX - navRect.left;
    targetRef.current.cursorY = e.clientY - navRect.top;
    if (reducedMotionRef.current) {
      currentRef.current.cursorX = targetRef.current.cursorX;
      currentRef.current.cursorY = targetRef.current.cursorY;
      writeConeVars();
      return;
    }
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
    void idx;
  };

  const handleLeave = () => {
    setHoveredIdx(null);
  };

  const handleFocus = (idx: number) => () => {
    setHoveredIdx(idx);
    const nav = navRef.current;
    const cell = cellRefs.current[idx];
    if (!nav || !cell) return;
    const navRect = nav.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const cx = cellRect.left + cellRect.width / 2 - navRect.left;
    const cy = cellRect.top + cellRect.height / 2 - navRect.top;
    setLampX(cx);
    targetRef.current.cursorX = cx;
    targetRef.current.cursorY = cy;
    currentRef.current.cursorX = cx;
    currentRef.current.cursorY = cy;
    writeConeVars();
  };

  const handleBlur = () => {
    setHoveredIdx(null);
  };

  // Park lamp over hovered button (if any) or the selected venue. Single
  // source of truth: this effect runs whenever the active button changes
  // or the nav resizes. Always writes a pixel value - never falls back to
  // the (broken) CSS percentage default. useLayoutEffect so the lamp is
  // positioned correctly before paint on mount and on mode switch.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const park = () => {
      const idx = hoveredIdx ?? selectedIdx;
      const cell = cellRefs.current[idx];
      if (!cell) return;
      const navRect = nav.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      setLampX(cellRect.left + cellRect.width / 2 - navRect.left);
    };
    park();
    const ro = new ResizeObserver(park);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [hoveredIdx, selectedIdx, setLampX]);

  // Toggle --lamp-active on the document element so body::after audience
  // dim picks it up alongside the nav-scoped cone fade and lens glow.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--lamp-active',
      hoveredIdx == null ? '0' : '1',
    );
  }, [hoveredIdx]);

  useEffect(() => () => {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    document.documentElement.style.removeProperty('--lamp-active');
  }, []);

  return (
    <nav
      ref={navRef}
      className="venue-map"
      role="tablist"
      aria-label="Venue"
    >
      <div className="venue-arch" aria-hidden="true" />
      <StageLamp active={hoveredIdx !== null} />
      <div className="venue-doors">
        {VENUES.map((v, i) => {
          const here = mode === v.id;
          const isHallOfFame = i === HALL_OF_FAME_IDX;
          return (
            <div
              key={v.id}
              ref={(el) => { cellRefs.current[i] = el; }}
              className="venue-door-cell"
              onMouseEnter={handleEnter(i)}
              onMouseMove={handleMove(i)}
              onMouseLeave={handleLeave}
            >
              <button
                type="button"
                role="tab"
                aria-selected={here}
                aria-label={v.label}
                className={`venue-door${here ? ' is-here' : ''}`}
                onClick={() => {
                  if (!here) onSelect(v.id);
                }}
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
              {isHallOfFame && (
                <button
                  type="button"
                  className="venue-stage-door"
                  onClick={onOpenSettings}
                  aria-label="Backstage (settings)"
                  title="Backstage: pick your engine"
                >
                  <span aria-hidden="true">🚪</span>
                  <span className="venue-stage-door-label">Backstage</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
