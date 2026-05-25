import { renderAvatar } from '../talent/avatar';
import { PERSONA } from '../studio/persona';
import { useStreamedText } from './useStreamedText';

export type ChatBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
  actionLabel?: string;
  /** When set, render a small "↶ Snapshot" button on assistant turns. */
  onRevert?: () => void;
  /** When true, reveal content progressively (typewriter effect). */
  stream?: boolean;
};

export function ChatBubble({
  role,
  content,
  actionLabel,
  onRevert,
  stream,
}: ChatBubbleProps) {
  const isAssistant = role === 'assistant';
  // Stream only when explicitly requested (Studio enables it on the newest
  // assistant turn). The hook returns `content` verbatim when disabled.
  const { revealed, done } = useStreamedText(content, !!stream);
  // Screen-reader prefix: the role + action-label give context the visual
  // styling carries silently for sighted users.
  const ariaLabel = isAssistant
    ? `${PERSONA.name} ${actionLabel ? `(${actionLabel}) ` : ''}said:`
    : 'You said:';
  return (
    <div className={`chat-bubble ${role}`} role="article" aria-label={ariaLabel}>
      {isAssistant && (
        <div
          className="mini-avatar"
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: renderAvatar(PERSONA.avatarSeed, 'smile', PERSONA.avatarOptions),
          }}
        />
      )}
      <div className="chat-bubble-body">
        {actionLabel && (
          <span className="action-chip" aria-hidden="true">▸ {actionLabel}</span>
        )}
        <div className="chat-bubble-content">
          {revealed}
          {stream && !done && (
            <span className="stream-caret" aria-hidden="true" />
          )}
        </div>
        {onRevert && (
          <button
            className="muted bubble-revert"
            onClick={onRevert}
            title="Snap mix back to this state"
            aria-label="Revert mix to this snapshot"
          >
            ↶ Revert
          </button>
        )}
      </div>
    </div>
  );
}
