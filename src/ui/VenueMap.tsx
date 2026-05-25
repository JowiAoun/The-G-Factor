import { useCallback, useEffect, useRef, useState } from 'react';
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

const LAMP_LENS_Y = 68; // matches `.stage-lamp-lens` vertical placement in styles.css
// Soft cap on cone rotation. 55deg covers cursors at the far edges of a
// wide button comfortably; anything more becomes a near-horizontal beam.
// The previous 22deg cap was too tight - the cone bottom landed nowhere
// near the cursor at button edges, reading as "flipped/off-target".
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
 * A single stage lamp (`StageLamp`) hangs from the arch and tracks the
 * hovered/focused button: it swings horizontally to centre over the target
 * and projects a cone of warm light that tilts toward the cursor.
 *
 * Backstage lives in the top-right corner of the nav (outside the
 * proscenium) so it doesn't pull the three main doors off-centre, and the
 * lamp deliberately skips it - the lamp is for show destinations, not the
 * utility door out to settings.
 *
 * Per-pixel cone tracking runs through a rAF lerp loop that writes CSS
 * variables directly via `setProperty`; React state stays coarse (one
 * update per hover/focus change) so the cursor's motion never re-renders
 * the component. Self-terminates when the lerp converges so idle CPU
 * stays at zero.
 */
export function VenueMap({ mode, onSelect, onOpenSettings }: VenueMapProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const targetRef = useRef({ cursorX: 0, cursorY: 0 });
  const currentRef = useRef({ cursorX: 0, cursorY: 0 });
  const lampXRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const reducedMotionRef = useRef<boolean>(false);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
    const rawTilt = (Math.atan2(dx, dy) * 180) / Math.PI;
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
      // Snap to exact target so we don't leave sub-pixel drift on screen.
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

  const handleEnter = (idx: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    setHoveredIdx(idx);
    const nav = navRef.current;
    const btn = buttonRefs.current[idx];
    if (!nav || !btn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setLampX(btnRect.left + btnRect.width / 2 - navRect.left);
    targetRef.current.cursorX = e.clientX - navRect.left;
    targetRef.current.cursorY = e.clientY - navRect.top;
    // Snap on enter so the cone appears in the right place over the new
    // button rather than lerping across the gap from the previous one.
    currentRef.current.cursorX = targetRef.current.cursorX;
    currentRef.current.cursorY = targetRef.current.cursorY;
    writeConeVars();
  };

  const handleMove = (idx: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
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
    // Silence unused-param when idx isn't read directly here.
    void idx;
  };

  const handleLeave = () => {
    setHoveredIdx(null);
  };

  const handleFocus = (idx: number) => () => {
    setHoveredIdx(idx);
    const nav = navRef.current;
    const btn = buttonRefs.current[idx];
    if (!nav || !btn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const cx = btnRect.left + btnRect.width / 2 - navRect.left;
    const cy = btnRect.top + btnRect.height / 2 - navRect.top;
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

  // Re-centre the lamp on resize. While idle, drop the inline --lamp-x so
  // the CSS default (50%) takes over - that way the rest position adapts
  // to any width change without us tracking it.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onResize = () => {
      if (hoveredIdx == null) {
        nav.style.removeProperty('--lamp-x');
        lampXRef.current = nav.getBoundingClientRect().width / 2;
      } else {
        const btn = buttonRefs.current[hoveredIdx];
        if (btn) {
          const navRect = nav.getBoundingClientRect();
          const btnRect = btn.getBoundingClientRect();
          setLampX(btnRect.left + btnRect.width / 2 - navRect.left);
          writeConeVars();
        }
      }
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [hoveredIdx, setLampX, writeConeVars]);

  // Toggle --lamp-active on the document element so the body::after audience
  // dim picks it up alongside the nav-scoped cone fade and lens glow (CSS
  // var inheritance carries it down into .venue-map).
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--lamp-active',
      hoveredIdx == null ? '0' : '1',
    );
  }, [hoveredIdx]);

  // Cancel any in-flight rAF on unmount, and reset --lamp-active so the dim
  // doesn't stay stuck on after route changes that unmount the nav.
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
      </div>
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
    </nav>
  );
}
