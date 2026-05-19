import { renderAvatar } from '../talent/avatar';
import { PERSONA } from '../studio/persona';

export type ChatBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
  actionLabel?: string;
  /** When set, render a small "↶ Snapshot" button on assistant turns. */
  onRevert?: () => void;
};

export function ChatBubble({
  role,
  content,
  actionLabel,
  onRevert,
}: ChatBubbleProps) {
  const isAssistant = role === 'assistant';
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
            __html: renderAvatar(PERSONA.avatarSeed, 'smile'),
          }}
        />
      )}
      <div className="chat-bubble-body">
        {actionLabel && (
          <span className="action-chip" aria-hidden="true">▸ {actionLabel}</span>
        )}
        <div className="chat-bubble-content">{content}</div>
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
