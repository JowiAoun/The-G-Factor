import { useCallback, useEffect, useState } from 'react';
import {
  deleteSavedMix,
  listSavedMixes,
  type SavedMix,
} from '../studio/storage';

export function SavedMixes({
  version,
  onLoad,
  onReplay,
  onChange,
}: {
  version: number;
  onLoad: (mix: SavedMix) => void;
  onReplay?: (mix: SavedMix) => void;
  onChange?: () => void;
}) {
  const [mixes, setMixes] = useState<SavedMix[]>([]);

  useEffect(() => {
    setMixes(listSavedMixes());
  }, [version]);

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm('Delete this saved mix? This cannot be undone.')) return;
      deleteSavedMix(id);
      setMixes(listSavedMixes());
      onChange?.();
    },
    [onChange],
  );

  if (mixes.length === 0) {
    return (
      <div className="panel saved-mixes-panel">
        <h2 style={{ margin: 0 }}>📁 Saved mixes</h2>
        <div className="saved-mixes-empty">
          Nothing saved yet. Click <kbd>💾 Save as…</kbd> on a mix you like.
        </div>
      </div>
    );
  }

  return (
    <div className="panel saved-mixes-panel">
      <h2 style={{ margin: '0 0 10px' }}>📁 Saved mixes · {mixes.length}</h2>
      <ul className="saved-mix-list" aria-label="Saved mixes">
        {mixes.map((m) => (
          <li key={m.id} className="saved-mix-row">
            <button
              className="saved-mix-load"
              onClick={() => onLoad(m)}
              title={`Load "${m.name}"`}
              aria-label={`Load saved mix ${m.name}`}
            >
              <span className="saved-mix-name">♪ {m.name}</span>
              <span className="saved-mix-code">{m.mix_code}</span>
            </button>
            {onReplay && (
              <button
                className="muted saved-mix-replay"
                onClick={() => onReplay(m)}
                aria-label={`Replay ${m.name} as a cinematic`}
                title="Replay this mix turn-by-turn"
              >
                ▶
              </button>
            )}
            <button
              className="muted saved-mix-delete"
              onClick={() => handleDelete(m.id)}
              aria-label={`Delete saved mix ${m.name}`}
              title="Delete"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
