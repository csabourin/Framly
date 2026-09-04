import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box, CheckSquare, Circle, Code, FileText, FormInput, Hand, Heading,
  Image, Layout, Link, List, Minus, MousePointer, MousePointer2, Navigation,
  Search, Square, TextCursorInput, Type, Video, Volume2, ChevronDown,
} from 'lucide-react';
import { selectUIState } from '../../store/selectors';
import { setSelectedTool } from '../../store/uiSlice';
import { Tool } from '../../types/canvas';
import DOMTreePanel from './DOMTreePanel';

interface ToolbarProps {
  onShowKeyboardShortcuts?: () => void;
}

type ToolItem = {
  id: Tool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tag: string;
  shortcut?: string;
};

const Toolbar: React.FC<ToolbarProps> = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedTool } = useSelector(selectUIState);
  const [view, setView] = useState<'insert' | 'layers'>('insert');
  const [query, setQuery] = useState('');

  const toolGroups = useMemo<Array<{ id: string; label: string; tools: ToolItem[] }>>(() => [
    {
      id: 'common', label: 'Common', tools: [
        { id: 'text', icon: Type, label: t('elements.text'), tag: 'p', shortcut: 'T' },
        { id: 'heading', icon: Heading, label: t('elements.heading'), tag: 'h2', shortcut: 'Shift+H' },
        { id: 'button', icon: MousePointer2, label: t('elements.button'), tag: 'button', shortcut: 'B' },
        { id: 'image', icon: Image, label: t('elements.image'), tag: 'img', shortcut: 'I' },
        { id: 'rectangle', icon: Square, label: 'Box', tag: 'div', shortcut: 'R' },
        { id: 'list', icon: List, label: t('elements.list'), tag: 'ul' },
      ],
    },
    {
      id: 'structure', label: t('elements.structure'), tools: [
        { id: 'section', icon: Box, label: t('elements.section'), tag: 'section' },
        { id: 'nav', icon: Navigation, label: t('elements.navigation'), tag: 'nav' },
        { id: 'header', icon: Layout, label: t('elements.header'), tag: 'header' },
        { id: 'footer', icon: Layout, label: t('elements.footer'), tag: 'footer' },
        { id: 'article', icon: FileText, label: t('elements.article'), tag: 'article' },
      ],
    },
    {
      id: 'forms', label: t('elements.formElements'), tools: [
        { id: 'input', icon: FormInput, label: t('elements.inputField'), tag: 'input' },
        { id: 'textarea', icon: TextCursorInput, label: t('elements.textArea'), tag: 'textarea' },
        { id: 'checkbox', icon: CheckSquare, label: t('elements.checkbox'), tag: 'checkbox' },
        { id: 'radio', icon: Circle, label: t('elements.radioButton'), tag: 'radio' },
        { id: 'select-dropdown', icon: ChevronDown, label: t('elements.selectDropdown'), tag: 'select' },
      ],
    },
    {
      id: 'content', label: t('elements.content'), tools: [
        { id: 'link', icon: Link, label: t('elements.link'), tag: 'a' },
        { id: 'code', icon: Code, label: t('elements.codeBlock'), tag: 'code' },
        { id: 'divider', icon: Minus, label: t('elements.divider'), tag: 'hr' },
      ],
    },
    {
      id: 'media', label: t('elements.media'), tools: [
        { id: 'video', icon: Video, label: t('elements.video'), tag: 'video' },
        { id: 'audio', icon: Volume2, label: t('elements.audio'), tag: 'audio' },
      ],
    },
  ], [t]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = toolGroups
    .map((group) => ({ ...group, tools: group.tools.filter((tool) => `${tool.label} ${tool.tag}`.toLowerCase().includes(normalizedQuery)) }))
    .filter((group) => group.tools.length > 0);

  const handleDragStart = (event: React.DragEvent, tool: Tool) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'toolbar-element', elementType: tool }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const utilityTools: ToolItem[] = [
    { id: 'pointer', icon: MousePointer, label: t('elements.pointer'), tag: 'V' },
    { id: 'hand', icon: Hand, label: t('elements.hand'), tag: 'H' },
  ];

  return (
    <aside className="framly-left-panel" data-testid="toolbar-main" aria-label="Insert elements and layers">
      <div className="framly-panel-tabs" role="tablist" aria-label="Left panel">
        <button className={view === 'insert' ? 'is-active' : ''} onClick={() => setView('insert')} role="tab" aria-selected={view === 'insert'}>Insert</button>
        <button className={view === 'layers' ? 'is-active' : ''} onClick={() => setView('layers')} role="tab" aria-selected={view === 'layers'}>Layers</button>
      </div>

      {view === 'layers' ? <DOMTreePanel embedded /> : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="framly-tool-utilities">
            {utilityTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button key={tool.id} onClick={() => dispatch(setSelectedTool(tool.id))} className={selectedTool === tool.id ? 'is-active' : ''} data-testid={`button-tool-${tool.id}`}>
                  <Icon className="h-3.5 w-3.5" /><span>{tool.label}</span><kbd>{tool.tag}</kbd>
                </button>
              );
            })}
          </div>
          <label className="framly-search-field">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Search elements</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search elements" />
          </label>
          <div className="framly-insert-list">
            {filteredGroups.map((group) => (
              <section key={group.id} aria-labelledby={`tool-group-${group.id}`}>
                <h2 id={`tool-group-${group.id}`}>{group.label}</h2>
                {group.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      draggable
                      onClick={() => dispatch(setSelectedTool(tool.id))}
                      onDragStart={(event) => handleDragStart(event, tool.id)}
                      className={selectedTool === tool.id ? 'is-active' : ''}
                      title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                      data-testid={`button-tool-${tool.id}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tool.label}</span>
                      <code>{tool.tag}</code>
                    </button>
                  );
                })}
              </section>
            ))}
            {filteredGroups.length === 0 && <p className="px-3 py-8 text-center text-xs text-[var(--ink-3)]">No matching elements</p>}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Toolbar;
