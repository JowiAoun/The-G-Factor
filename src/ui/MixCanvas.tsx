import { CodeEditor } from './CodeEditor';

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
  /** Direct edits in the editor (typing, paste, etc.). */
  onCodeChange: (next: string) => void;
  /** Fires after a chip is dropped into the editor and inserted. */
  onDropSnippet?: (snippet: string) => void;
  onLike?: () => void;
  liked?: boolean;
  /** When provided, renders a "🎪 Bracket" button that hands the mix to the Talent Show. */
  onBracket?: () => void;
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
  onCodeChange,
  onDropSnippet,
  onLike,
  liked,
  onBracket,
}: MixCanvasProps) {
  const isEmpty = mixCode.trim().length === 0;
  return (
    <div className="mix-canvas">
      <div className="mix-canvas-head">
        <span className="mix-canvas-label">Now playing</span>
        {playing && <span className="mix-playing-pulse" aria-hidden="true" />}
        <span className="mix-canvas-hint">
          ⌘/Ctrl+Enter to play · Esc to stop · drag a sound below
        </span>
      </div>
      <CodeEditor
        value={mixCode}
        onChange={onCodeChange}
        onPlay={onPlay}
        onStop={onStop}
        onDropSnippet={onDropSnippet}
        placeholder='// empty - ask Gemma, type a pattern, or drag a sound'
      />
      <div className="mix-canvas-controls" role="toolbar" aria-label="Mix controls">
        {playing ? (
          <button className="primary" onClick={onStop} aria-label="Stop playback">
            ⏹ Stop
          </button>
        ) : (
          <button
            className="primary"
            onClick={onPlay}
            disabled={isEmpty}
            aria-label="Play the current mix"
          >
            ▶ Play
          </button>
        )}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last change"
          aria-label="Undo last change"
        >
          ↶ Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          aria-label="Redo"
        >
          ↷ Redo
        </button>
        <button
          onClick={onSaveAs}
          disabled={isEmpty || saving}
          title="Name and save to your library"
          aria-label="Save current mix to the library"
        >
          💾 Save as…
        </button>
        {onLike && (
          <button
            className={liked ? 'liked' : 'muted'}
            onClick={onLike}
            disabled={isEmpty}
            title="Save snapshot to taste memory"
            aria-label={liked ? 'Unlike this mix' : 'Like this mix and save to taste memory'}
            aria-pressed={liked}
          >
            {liked ? '♥' : '♡'}
          </button>
        )}
        {onBracket && (
          <button
            onClick={onBracket}
            disabled={isEmpty}
            title="Run this mix through a Talent Show bracket"
            aria-label="Send this mix to the Talent Show bracket"
          >
            🎪 Bracket
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          className="muted"
          onClick={onNewMix}
          title="Start a fresh mix"
          aria-label="Start a new mix"
        >
          🗑 New
        </button>
      </div>
    </div>
  );
}
