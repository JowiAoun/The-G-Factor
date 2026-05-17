import type { GenerationResult } from '../remix/generate';

type Props = {
  result: GenerationResult;
  index: number;
  playing: boolean;
  liked: boolean;
  focused: boolean;
  onPlay: () => void;
  onStop: () => void;
  onLike: () => void;
};

export function VariationCard({
  result,
  index,
  playing,
  liked,
  focused,
  onPlay,
  onStop,
  onLike,
}: Props) {
  const v = result.variation;
  const failed = result.status !== 'valid';
  const lastErr = result.attempts.at(-1)?.error;

  return (
    <div className={`card${failed ? ' card-failed' : ''}${focused ? ' card-focused' : ''}`}>
      <div className="card-head">
        <span className="card-num">{index + 1}</span>
        {v ? (
          <span className="card-label">{v.transformation_label}</span>
        ) : (
          <span className="badge bad">{result.status.replace('_', ' ')}</span>
        )}
        <span className="card-time">{result.durationMs}ms</span>
      </div>
      <div className="card-code">{v?.variation_code ?? '(no valid output)'}</div>
      {v && <div className="card-expl">{v.explanation_one_line}</div>}
      {failed && lastErr && <div className="card-error">{lastErr}</div>}
      <div className="card-actions">
        <button
          className="primary"
          onClick={playing ? onStop : onPlay}
          disabled={failed}
        >
          {playing ? '⏹ Stop' : `▶ Play`}
        </button>
        <button
          className={liked ? 'liked' : 'muted'}
          onClick={onLike}
          disabled={failed}
          title="Save to taste memory"
        >
          {liked ? '♥ Liked' : '♡ Like'}
        </button>
      </div>
    </div>
  );
}
