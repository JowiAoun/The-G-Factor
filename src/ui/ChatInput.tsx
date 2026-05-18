import { useCallback, useState, type KeyboardEvent } from 'react';

export function ChatInput({
  onSubmit,
  disabled,
  placeholder = '> type what you want to add or change…',
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState('');

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

  return (
    <div className={`chat-input${disabled ? ' disabled' : ''}`}>
      <span className="prompt-caret" aria-hidden="true">
        ▸
      </span>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={1}
        spellCheck={false}
        disabled={disabled}
        aria-label="Studio chat input"
      />
      <button
        className="primary"
        onClick={submit}
        disabled={disabled || !text.trim()}
      >
        Send
      </button>
    </div>
  );
}
