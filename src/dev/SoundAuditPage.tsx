import { useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { play, stop } from '../strudel/engine';
import { SEED_GALLERY } from '../seeds/gallery';
import { SOUND_PALETTE } from '../studio/sounds';
import { VARIATION_AXES } from '../remix/axes';

// Dev-only audition surface. Lists every seed, sound chip, and axis
// exemplar with a click-to-play button so we can spot any unpleasant
// timbre before it ships. Imported only when `?audit=1` and
// `import.meta.env.DEV` is true, so the whole module is dead code in
// production builds.

type Entry = {
  key: string;
  label: string;
  subLabel?: string;
  code: string;
};

const seedEntries: Entry[] = SEED_GALLERY.map((s) => ({
  key: `seed:${s.id}`,
  label: s.label,
  subLabel: `${s.genre} · difficulty ${s.difficulty}`,
  code: s.code,
}));

const drumEntries: Entry[] = SOUND_PALETTE.filter((s) => s.kind === 'drum').map((s) => ({
  key: `sound:${s.name}`,
  label: s.label,
  subLabel: s.name,
  code: s.snippet,
}));

const synthEntries: Entry[] = SOUND_PALETTE.filter((s) => s.kind === 'synth').map((s) => ({
  key: `sound:${s.name}`,
  label: s.label,
  subLabel: s.name,
  code: s.snippet,
}));

const axisEntries: Entry[] = VARIATION_AXES.map((a) => ({
  key: `axis:${a.id}`,
  label: a.label,
  subLabel: `timbre: ${a.timbre}`,
  code: a.exemplar,
}));

function groupBy<T>(items: T[], pick: (t: T) => string): Record<string, T[]> {
  const acc: Record<string, T[]> = {};
  for (const item of items) {
    const k = pick(item);
    (acc[k] ||= []).push(item);
  }
  return acc;
}

const seedsByGenre = groupBy(SEED_GALLERY, (s) => s.genre);

function SoundAuditPage() {
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePlay(entry: Entry) {
    setError(null);
    stop();
    try {
      await play(entry.code);
      setActive(entry.key);
    } catch (err) {
      setError(`${entry.label}: ${err instanceof Error ? err.message : String(err)}`);
      setActive(null);
    }
  }

  function handleStop() {
    stop();
    setActive(null);
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.h1}>Sound Audit</h1>
          <p style={S.subtitle}>Dev-only · click any entry to audition · ?audit=1</p>
        </div>
        <button onClick={handleStop} style={S.stopButton}>
          ■ Stop
        </button>
      </header>

      {error && <div style={S.error}>{error}</div>}

      <Section title={`Sound palette · ${SOUND_PALETTE.length} chips`}>
        <Subhead>Drums ({drumEntries.length})</Subhead>
        <Grid>
          {drumEntries.map((e) => (
            <Card key={e.key} entry={e} active={active === e.key} onPlay={() => handlePlay(e)} />
          ))}
        </Grid>
        <Subhead>Synths ({synthEntries.length})</Subhead>
        <Grid>
          {synthEntries.map((e) => (
            <Card key={e.key} entry={e} active={active === e.key} onPlay={() => handlePlay(e)} />
          ))}
        </Grid>
      </Section>

      <Section title={`Seed gallery · ${SEED_GALLERY.length} seeds`}>
        {Object.entries(seedsByGenre).map(([genre, seeds]) => (
          <div key={genre}>
            <Subhead>
              {genre} ({seeds.length})
            </Subhead>
            <Grid>
              {seeds.map((s) => {
                const e = seedEntries.find((x) => x.key === `seed:${s.id}`)!;
                return (
                  <Card
                    key={e.key}
                    entry={e}
                    active={active === e.key}
                    onPlay={() => handlePlay(e)}
                  />
                );
              })}
            </Grid>
          </div>
        ))}
      </Section>

      <Section title={`Axis exemplars · ${VARIATION_AXES.length} axes`}>
        <Grid>
          {axisEntries.map((e) => (
            <Card key={e.key} entry={e} active={active === e.key} onPlay={() => handlePlay(e)} />
          ))}
        </Grid>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <h2 style={S.h2}>{title}</h2>
      {children}
    </section>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return <h3 style={S.h3}>{children}</h3>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={S.grid}>{children}</div>;
}

function Card({
  entry,
  active,
  onPlay,
}: {
  entry: Entry;
  active: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      style={{ ...S.card, ...(active ? S.cardActive : {}) }}
      title={entry.code}
    >
      <div style={S.cardHeader}>
        <strong style={S.cardTitle}>
          {active ? '▶ ' : ''}
          {entry.label}
        </strong>
        {entry.subLabel && <span style={S.muted}>{entry.subLabel}</span>}
      </div>
      <code style={S.code}>{entry.code}</code>
    </button>
  );
}

const S: Record<string, CSSProperties> = {
  page: {
    padding: 24,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#0d1117',
    color: '#e6edf3',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottom: '1px solid #30363d',
    paddingBottom: 16,
  },
  h1: { fontSize: 22, margin: 0 },
  subtitle: { fontSize: 12, color: '#8b949e', margin: '4px 0 0' },
  section: { marginTop: 32 },
  h2: {
    fontSize: 16,
    margin: '0 0 12px',
    color: '#c9d1d9',
    borderBottom: '1px solid #21262d',
    paddingBottom: 6,
  },
  h3: {
    fontSize: 11,
    margin: '20px 0 8px',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stopButton: {
    background: '#b8253a',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 8,
  },
  card: {
    padding: 12,
    background: '#161b22',
    border: '1px solid #30363d',
    color: '#e6edf3',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: 'inherit',
  },
  cardActive: {
    background: '#1c2a3a',
    borderColor: '#1f6feb',
    boxShadow: '0 0 0 1px #1f6feb',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  cardTitle: { fontSize: 14 },
  muted: { fontSize: 11, color: '#8b949e' },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: 11,
    color: '#79c0ff',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    lineHeight: 1.4,
  },
  error: {
    background: '#2d0f12',
    border: '1px solid #b8253a',
    padding: 12,
    borderRadius: 6,
    color: '#ffa198',
    marginBottom: 16,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
  },
};

export function mountAudit(el: HTMLElement): void {
  createRoot(el).render(<SoundAuditPage />);
}
