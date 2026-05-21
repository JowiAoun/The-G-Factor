import { useMemo, useRef } from 'react';
import CodeMirror, {
  EditorView,
  Prec,
  keymap,
  type Text,
} from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { STRUDEL_SNIPPET_MIME } from '../studio/sounds';

export type CodeEditorProps = {
  value: string;
  onChange: (next: string) => void;
  /** Fired when Mod+Enter is pressed inside the editor. */
  onPlay?: () => void;
  /** Fired when Esc is pressed inside the editor. */
  onStop?: () => void;
  /** Fired after a chip is dropped onto the editor and inserted. */
  onDropSnippet?: (snippet: string) => void;
  placeholder?: string;
};

function needsLeadingSpace(doc: Text, pos: number): boolean {
  if (pos === 0) return false;
  const ch = doc.sliceString(pos - 1, pos);
  return /\S/.test(ch);
}

export function CodeEditor({
  value,
  onChange,
  onPlay,
  onStop,
  onDropSnippet,
  placeholder,
}: CodeEditorProps) {
  // Latest-callback refs so the CM6 extension array can stay stable for the
  // editor's lifetime instead of re-configuring on every prop change.
  const onPlayRef = useRef(onPlay);
  const onStopRef = useRef(onStop);
  const onDropRef = useRef(onDropSnippet);
  onPlayRef.current = onPlay;
  onStopRef.current = onStop;
  onDropRef.current = onDropSnippet;

  const extensions = useMemo(
    () => [
      javascript(),
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              onPlayRef.current?.();
              return true;
            },
            preventDefault: true,
          },
          {
            key: 'Escape',
            run: () => {
              onStopRef.current?.();
              return true;
            },
          },
        ]),
      ),
      EditorView.domEventHandlers({
        dragover(event) {
          // Marking the event as handled signals that this element will
          // accept the drop and switches the cursor to the "move" affordance.
          event.preventDefault();
          return false;
        },
        drop(event, view) {
          const dt = event.dataTransfer;
          if (!dt) return false;
          const snippet =
            dt.getData(STRUDEL_SNIPPET_MIME) || dt.getData('text/plain');
          if (!snippet) return false;
          event.preventDefault();
          const pos =
            view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
            view.state.selection.main.head;
          const padded = needsLeadingSpace(view.state.doc, pos)
            ? ' ' + snippet
            : snippet;
          // Notify the parent BEFORE the dispatch so it can record an undo
          // snapshot of the pre-drop mix. The onChange that fires from the
          // dispatch will then see the parent's drop-flag and skip its own
          // typing-debounce snapshot, avoiding a duplicate undo entry.
          onDropRef.current?.(snippet);
          view.dispatch({
            changes: { from: pos, insert: padded },
            selection: { anchor: pos + padded.length },
          });
          return true;
        },
      }),
    ],
    [],
  );

  return (
    <CodeMirror
      className="mix-code-editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      placeholder={placeholder}
      theme="dark"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        searchKeymap: false,
        tabSize: 2,
      }}
    />
  );
}
