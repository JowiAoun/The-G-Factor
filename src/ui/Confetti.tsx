import { useMemo } from 'react';

const COLORS = [
  '#4f7cff',
  '#ff6b9b',
  '#d4b34a',
  '#1f9b6b',
  '#9b59b6',
  '#e74c3c',
  '#21d4fd',
];

type Piece = {
  key: number;
  color: string;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
};

/**
 * DOM/CSS confetti. Each piece is an absolute-positioned `<div>` that falls
 * from the top, drifting sideways and rotating. The wrapper is `pointer-
 * events: none` so it never blocks clicks on the champion below it.
 */
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        color: COLORS[i % COLORS.length],
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 3 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 240,
        rotate: Math.random() * 720 - 360,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.key}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // CSS custom properties consumed by the @keyframes.
            ['--drift' as string]: `${p.drift}px`,
            ['--rotate' as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
