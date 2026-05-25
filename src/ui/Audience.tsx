type AudienceProps = {
  /** True while a contestant's audio is playing - audience bobs faster
   *  and the phone flashlights brighten. */
  cheering: boolean;
};

type RowSpec = {
  count: number;
  y: number;
  scale: number;
  fill: string;
  /** Pixel offset added to (i * spacing) so adjacent rows don't perfectly stack. */
  offset: number;
  /** Every Nth head in this row also lights a phone flashlight. */
  flashlightEvery: number;
};

const VIEWBOX_W = 1000;
const VIEWBOX_H = 130;

const ROWS: RowSpec[] = [
  { count: 30, y: 38,  scale: 0.55, fill: '#0a0d18', offset: 0,  flashlightEvery: 5 },
  { count: 22, y: 66,  scale: 0.78, fill: '#050709', offset: 16, flashlightEvery: 6 },
  { count: 18, y: 96,  scale: 1.05, fill: '#020304', offset: 8,  flashlightEvery: 5 },
];

/**
 * Stadium audience rendered as three SVG tiers receding into the distance.
 * A reusable `<symbol>` provides the head-and-shoulders silhouette;
 * each row instances it via `<use>` so the SVG payload stays tiny.
 *
 * Phone-flashlight `<circle>`s are sprinkled on every Nth head per row.
 * Twinkle and sway are pure CSS keyframes - the React side just toggles
 * the `is-cheering` class when audio is playing.
 */
export function Audience({ cheering }: AudienceProps) {
  return (
    <svg
      className={`audience${cheering ? ' is-cheering' : ''}`}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <symbol id="audience-head" viewBox="0 0 40 50">
          <ellipse cx="20" cy="15" rx="10" ry="12" />
          <path d="M 2 28 Q 20 18 38 28 L 38 50 L 2 50 Z" />
        </symbol>
      </defs>

      {ROWS.map((row, ri) => {
        const spacing = (VIEWBOX_W - row.offset * 2) / row.count;
        const headW = 40 * row.scale;
        const headH = 50 * row.scale;
        return (
          <g key={ri} className={`audience-row audience-row-${ri}`}>
            {Array.from({ length: row.count }, (_, i) => {
              const x = row.offset + i * spacing + spacing / 2 - headW / 2;
              const litFlashlight = i > 0 && i % row.flashlightEvery === 0;
              return (
                <g
                  key={`${ri}-${i}`}
                  className="audience-head"
                  style={{
                    animationDelay: `${((i * 137) % 400) / 100}s`,
                  }}
                >
                  <use
                    href="#audience-head"
                    x={x}
                    y={row.y - headH}
                    width={headW}
                    height={headH}
                    fill={row.fill}
                  />
                  {litFlashlight && (
                    <circle
                      className="phone-flashlight"
                      cx={x + headW / 2}
                      cy={row.y - headH - 4}
                      r={2.6}
                      fill="#ffe6a3"
                      style={{
                        animationDelay: `${((i * 211) % 300) / 100}s`,
                      }}
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
