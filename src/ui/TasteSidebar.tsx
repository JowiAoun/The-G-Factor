import { useCallback, useEffect, useState } from 'react';
import { getAllLikes, clearLikes, type Like } from '../memory/taste';

type Props = {
  version: number;
  onCleared?: () => void;
};

export function TasteSidebar({ version, onCleared }: Props) {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllLikes()
      .then((rows) => {
        if (!cancelled) setLikes(rows);
      })
      .catch(() => {
        if (!cancelled) setLikes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const handleClear = useCallback(async () => {
    if (!window.confirm('Clear all liked variations? This cannot be undone.')) return;
    await clearLikes();
    setLikes([]);
    onCleared?.();
  }, [onCleared]);

  return (
    <div className="panel taste-panel">
      <div className="taste-head">
        <h2 style={{ margin: 0 }}>
          Taste memory · {loading ? '…' : likes.length} like{likes.length === 1 ? '' : 's'}
        </h2>
        {likes.length > 0 && (
          <button className="muted" onClick={handleClear} aria-label="Clear taste">
            Clear
          </button>
        )}
      </div>
      {!loading && likes.length === 0 ? (
        <div style={{ color: '#9aa0a8', fontSize: '0.88rem', marginTop: 6 }}>
          Like variations to teach Gemma your style. Future remixes inject your top-3
          most-similar likes as few-shot exemplars — the model gets better the more you use it.
        </div>
      ) : (
        <ul className="taste-list">
          {likes.slice(0, 6).map((l) => (
            <li key={l.id}>
              <div className="taste-label">{l.transformation_label}</div>
              <div className="taste-code">{l.variation_code}</div>
              <div className="taste-seed">from {l.seed_code}</div>
            </li>
          ))}
          {likes.length > 6 && (
            <li className="taste-more">+ {likes.length - 6} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
