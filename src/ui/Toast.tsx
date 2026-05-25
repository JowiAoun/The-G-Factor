import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastAction = { label: string; onClick: () => void };
export type ToastState = { message: string; action?: ToastAction } | null;

/**
 * Lightweight transient-notification hook. The Studio and Talent Show both
 * use it to surface a "remote backend needs an OpenRouter key" warning when
 * the user tries to start a turn without one.
 *
 * The timer ref + cleanup effect ensure no stray dismissal fires after the
 * host component unmounts (e.g. when the user tab-switches mid-toast).
 */
export function useToast(autoDismissMs = 4500) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, action?: ToastAction) => {
      clearTimer();
      setToast({ message, action });
      timer.current = window.setTimeout(() => {
        setToast(null);
        timer.current = null;
      }, autoDismissMs);
    },
    [autoDismissMs, clearTimer],
  );

  const dismissToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, showToast, dismissToast };
}

export function Toast({
  state,
  onDismiss,
}: {
  state: ToastState;
  onDismiss: () => void;
}) {
  if (!state) return null;
  return (
    <div className="toast-root" role="status" aria-live="polite">
      <div className="toast">
        <span className="toast-message">{state.message}</span>
        {state.action && (
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              state.action!.onClick();
              onDismiss();
            }}
          >
            {state.action.label}
          </button>
        )}
        <button
          type="button"
          className="toast-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
