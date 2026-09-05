import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** Keep the browser's caret and editing undo intact while saving each input. */
export default function TextBlockContent({ content, editable, width, onChange, onFinish }: {
  content: string;
  editable: boolean;
  width: React.CSSProperties['width'];
  onChange: (content: string) => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const original = useRef(content);
  const html = content.replace(/\n/g, '<br>');

  useLayoutEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html;
  }, [html]);

  useLayoutEffect(() => {
    if (editable) ref.current?.focus({ preventScroll: true });
  }, [editable]);

  return <div ref={ref}
    contentEditable={editable}
    suppressContentEditableWarning
    role={editable ? 'textbox' : undefined}
    aria-label={editable ? t('textEditing.label') : undefined}
    aria-multiline={editable ? true : undefined}
    className={`outline-none cursor-text ${editable ? 'text-editing' : 'text-element'}`}
    style={{ minHeight: '1em', padding: '4px', width, boxSizing: 'border-box' }}
    onFocus={() => { original.current = content; }}
    onInput={(event) => onChange(event.currentTarget.innerHTML)}
    onBlur={onFinish}
    onKeyDown={(event) => {
      // Text editing keys belong to the browser, not the canvas shortcuts.
      event.stopPropagation();
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) event.currentTarget.blur();
        else document.execCommand('insertLineBreak');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onChange(original.current);
        event.currentTarget.blur();
      }
    }}
  />;
}
