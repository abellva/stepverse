import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';

interface PythonEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function PythonEditor({
  value,
  onChange,
  className = '',
  readOnly = false,
}: PythonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        EditorState.readOnly.of(readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
            fontFamily: "'JetBrains Mono', monospace",
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: '16px',
          },
          '.cm-content': {
            padding: '12px 6px',
            caretColor: '#38bdf8',
          },
          '.cm-gutters': {
            backgroundColor: '#0f172a',
            color: '#64748b',
            borderRight: '1px solid #1e293b',
            borderRadius: '16px 0 0 16px',
            paddingRight: '8px',
          },
          '.cm-activeLine': {
            backgroundColor: '#1e293b66',
          },
          '&.cm-focused': {
            outline: 'none',
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update doc if changed externally
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden border border-[#334155] rounded-2xl shadow-inner ${className}`}
      style={{ minHeight: '260px' }}
    />
  );
}
