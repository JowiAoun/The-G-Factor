export type MixCanvasProps = {
  mixCode: string;
  playing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  onPlay: () => void;
  onStop: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveAs: () => void;
  onNewMix: () => void;
  onLike?: () => void;
  liked?: boolean;
};

export function MixCanvas({
  mixCode,
  playing,
  canUndo,
  canRedo,
  saving,
  onPlay,
  onStop,
  onUndo,
  onRedo,
  onSaveAs,
  onNewMix,
  onLike,
  liked,
}: MixCanvasProps) {
  const isEmpty = mixCode.trim().length === 0;
  return (
    <div className="mix-canvas">
      <div className="mix-canvas-head">
        <span className="mix-canvas-label">Now playing</span>
        {playing && <span className="mix-playing-pulse" aria-hidden="true" />}
      </div>
      <pre className={`mix-canvas-code${isEmpty ? ' empty' : ''}`}>
        {isEmpty ? '// empty — ask Bleep for something to start with' : mixCode}
      </pre>
      <div className="mix-canvas-controls">
        {playing ? (
          <button className="primary" onClick={onStop}>
            ⏹ Stop
          </button>
        ) : (
          <button className="primary" onClick={onPlay} disabled={isEmpty}>
            ▶ Play
          </button>
        )}
        <button onClick={onUndo} disabled={!canUndo} title="Undo last change">
          ↶ Undo
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo">
          ↷ Redo
        </button>
        <button
          onClick={onSaveAs}
          disabled={isEmpty || saving}
          title="Name and save to your library"
        >
          💾 Save as…
        </button>
        {onLike && (
          <button
            className={liked ? 'liked' : 'muted'}
            onClick={onLike}
            disabled={isEmpty}
            title="Save snapshot to taste memory"
          >
            {liked ? '♥' : '♡'}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="muted" onClick={onNewMix} title="Start a fresh mix">
          🗑 New
        </button>
      </div>
    </div>
  );
}
