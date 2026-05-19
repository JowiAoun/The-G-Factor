import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

export function ChatInput({
  onSubmit,
  onCancel,
  disabled,
  placeholder = '> type what you want to add or change…',
}: {
  onSubmit: (text: string) => void;
  /** When provided + `disabled` is true, a Cancel button replaces Send. */
  onCancel?: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const wasDisabled = useRef(false);

  // Return focus to the textarea after a generation completes, so the user
  // can immediately type the next turn instead of having to click back.
  useEffect(() => {
    if (wasDisabled.current && !disabled) {
      textareaRef.current?.focus();
    }
    wasDisabled.current = !!disabled;
  }, [disabled]);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText('');
  }, [text, onSubmit, disabled]);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends, Shift+Enter inserts a newline (matches every chat UI).
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const showCancel = !!onCancel && !!disabled;

  return (
    <div className={`chat-input${disabled ? ' disabled' : ''}`}>
      <span className="prompt-caret" aria-hidden="true">
        ▸
      </span>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={1}
        spellCheck={false}
        disabled={disabled}
        aria-label="Studio chat input"
      />
      {showCancel ? (
        <button
          className="muted chat-cancel"
          onClick={onCancel}
          aria-label="Cancel generation"
        >
          ✕ Cancel
        </button>
      ) : (
        <button
          className="primary"
          onClick={submit}
          disabled={disabled || !text.trim()}
          aria-label="Send message to Bleep"
        >
          Send
        </button>
      )}
    </div>
  );
}
