import { useMemo } from 'react';

const COLORS = [
  '#ffd86b',   // theatre gold
  '#f1d27c',   // light brass
  '#ffe6a3',   // candle warm
  '#e74c3c',   // curtain red
  '#ff9a3c',   // amber footlight
  '#f6e9c8',   // parchment cream
  '#c9b06e',   // antique gold
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
