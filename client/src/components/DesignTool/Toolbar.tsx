import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectUIState } from '../../store/selectors';
import { setSelectedTool, toggleComponentPanel, toggleDOMTreePanel, togglePropertiesPanel } from '../../store/uiSlice';
import { Tool } from '../../types/canvas';
import {
  MousePointer,
  Hand,
  Square,
  Type,
  Image,
  Package,
  Heading,
  List,
  MousePointer2,
  Settings,
  // Form elements
  FormInput,
  TextCursorInput,
  CheckSquare,
  Circle,
  ChevronDown,
  // Structural elements
  Box,
  Navigation,
  Layout,
  AlignEndHorizontal,
  FileText,
  // Media elements
  Video,
  Volume2,
  // Interactive elements
  Link,
  // Content elements
  Code,
  Minus,
  // Help
  Keyboard
} from 'lucide-react';

interface ToolbarProps {
  onShowKeyboardShortcuts?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onShowKeyboardShortcuts }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedTool, isComponentPanelVisible, isDOMTreePanelVisible, isPropertiesPanelVisible } = useSelector(selectUIState);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  // Essential tools shown by default
  const essentialTools: Array<{
    id: Tool;
    icon: React.ComponentType<any>;
    label: string;
    shortcut?: string;
  }> = [
      { id: 'pointer', icon: MousePointer, label: t('elements.pointer'), shortcut: 'V' },
      { id: 'hand', icon: Hand, label: t('elements.hand'), shortcut: 'H' },
      { id: 'rectangle', icon: Square, label: t('elements.rectangle'), shortcut: 'R' },
      { id: 'text', icon: Type, label: t('elements.text'), shortcut: 'T' },
      { id: 'heading', icon: Heading, label: t('elements.heading'), shortcut: 'Shift+H' },
      { id: 'button', icon: MousePointer2, label: t('elements.button'), shortcut: 'B' },
      { id: 'image', icon: Image, label: t('elements.image'), shortcut: 'I' },
    ];

  // Tool categories with their tools
  const toolCategories: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    tools: Array<{
      id: Tool;
      icon: React.ComponentType<any>;
      label: string;
    }>;
  }> = [
      {
        id: 'form',
        label: t('elements.formElements'),
        icon: FormInput,
        tools: [
          { id: 'input', icon: FormInput, label: t('elements.inputField') },
          { id: 'textarea', icon: TextCursorInput, label: t('elements.textArea') },
          { id: 'checkbox', icon: CheckSquare, label: t('elements.checkbox') },
          { id: 'radio', icon: Circle, label: t('elements.radioButton') },
          { id: 'select-dropdown', icon: ChevronDown, label: t('elements.selectDropdown') },
        ]
      },
      {
        id: 'structure',
        label: t('elements.structure'),
        icon: Box,
        tools: [
          { id: 'section', icon: Box, label: t('elements.section') },
          { id: 'nav', icon: Navigation, label: t('elements.navigation') },
          { id: 'header', icon: Layout, label: t('elements.header') },
          { id: 'footer', icon: AlignEndHorizontal, label: t('elements.footer') },
          { id: 'article', icon: FileText, label: t('elements.article') },
        ]
      },
      {
        id: 'content',
        label: t('elements.content'),
        icon: List,
        tools: [
          { id: 'list', icon: List, label: t('elements.list') },
          { id: 'code', icon: Code, label: t('elements.codeBlock') },
          { id: 'divider', icon: Minus, label: t('elements.divider') },
          { id: 'link', icon: Link, label: t('elements.link') },
        ]
      },
      {
        id: 'media',
        label: t('elements.media'),
        icon: Video,
        tools: [
          { id: 'video', icon: Video, label: t('elements.video') },
          { id: 'audio', icon: Volume2, label: t('elements.audio') },
        ]
      },
    ];

  const handleToolSelect = (tool: Tool) => {
    dispatch(setSelectedTool(tool));
  };

  const handleToolDragStart = (e: React.DragEvent, tool: Tool) => {
    // Set drag data for toolbar-to-canvas functionality
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'toolbar-element',
      elementType: tool
    }));
    e.dataTransfer.effectAllowed = 'copy';

    // Visual feedback - make the drag image semi-transparent
    const dragImage = (e.target as HTMLElement).cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.7';
    dragImage.style.transform = 'scale(0.9)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);

    // Clean up the drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleComponentToggle = () => {
    dispatch(toggleComponentPanel());
  };

  const handleDOMTreeToggle = () => {
    dispatch(toggleDOMTreePanel());
  };

  const handlePropertiesToggle = () => {
    dispatch(togglePropertiesPanel());
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <aside
      className="absolute left-0 top-16 bottom-0 w-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-gray-200/60 dark:border-gray-700/60 flex flex-col py-4 gap-2 z-40 shadow-lg"
      data-testid="toolbar-main"
    >
      {/* Essential Tools */}
      {essentialTools.map((tool) => {
        const isCreationTool = !['pointer', 'hand'].includes(tool.id);
        const Icon = tool.icon;
        const isActive = selectedTool === tool.id;

        return (
          <button
            key={tool.id}
            draggable={isCreationTool}
            onClick={() => handleToolSelect(tool.id)}
            onDragStart={(e) => isCreationTool && handleToolDragStart(e, tool.id)}
            className={`
              w-12 h-12 mx-2 rounded-xl flex items-center justify-center transition-all duration-200 group relative shadow-sm
              ${isActive
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:shadow-md hover:scale-105'
              }
            `}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''} - Click to select or drag to canvas`}
            data-testid={`button-tool-${tool.id}`}
          >
            <Icon className="w-4 h-4" />

            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white dark:text-gray-100 text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[100] shadow-xl border border-gray-700/50 dark:border-gray-600/50">
              <div className="font-medium">{tool.label}</div>
              {tool.shortcut && <div className="text-xs text-gray-300 dark:text-gray-400 mt-0.5">Press {tool.shortcut}</div>}
              {isCreationTool ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click to select or drag to canvas</div>
              ) : (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {tool.id === 'pointer' ? 'Select and move elements' : 'Pan around the canvas'}
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto my-3" data-testid="toolbar-divider" />

      {/* Tool Categories */}
      {toolCategories.map((category) => {
        const CategoryIcon = category.icon;
        const isExpanded = expandedCategory === category.id;

        return (
          <div key={category.id}>
            {/* Category Button */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={`
                w-12 h-12 mx-2 rounded-xl flex items-center justify-center transition-all duration-200 group relative shadow-sm
                ${isExpanded
                  ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 shadow-md scale-105 border border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:shadow-md hover:scale-105'
                }
              `}
              title={category.label}
              data-testid={`button-category-${category.id}`}
            >
              <CategoryIcon className="w-4 h-4" />

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                {category.label}
              </div>
            </button>

            {/* Expanded Tools */}
            {isExpanded && (
              <div className="absolute left-full top-0 ml-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 rounded-xl shadow-2xl p-3 z-50 min-w-[200px]">
                <div className="text-sm text-gray-700 dark:text-gray-300 px-1 py-2 font-semibold border-b border-gray-200/60 dark:border-gray-700/60 mb-3">
                  {category.label}
                </div>
                <div className="flex flex-col gap-1">
                  {category.tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isActive = selectedTool === tool.id;

                    return (
                      <button
                        key={tool.id}
                        draggable
                        onClick={() => {
                          handleToolSelect(tool.id);
                          setExpandedCategory(null);
                        }}
                        onDragStart={(e) => {
                          handleToolDragStart(e, tool.id);
                          setExpandedCategory(null);
                        }}
                        className={`
                          w-full h-10 rounded-lg flex items-center gap-3 px-3 transition-all duration-200 group/btn
                          ${isActive
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-sm'
                          }
                        `}
                        title={tool.label}
                        data-testid={`button-tool-${tool.id}`}
                      >
                        <ToolIcon className="w-4 h-4" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-none">{tool.label}</span>
                          <span className="text-[10px] text-white/60 mt-0.5 opacity-0 group-hover/btn:opacity-100 transition-opacity">Click to select or drag to canvas</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom divider */}
      <div className="flex-1" />
      <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto my-3" data-testid="toolbar-divider-bottom" />

      {/* Element Tree Toggle */}
      <button
        onClick={handleDOMTreeToggle}
        className={`
          w-12 h-12 mx-2 rounded-xl flex items-center justify-center transition-all duration-200 group relative shadow-sm
          ${isDOMTreePanelVisible
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:shadow-md hover:scale-105'
          }
        `}
        title={t('toolbar.elementTree')}
        data-testid="button-toggle-dom-tree"
      >
        <List className="w-4 h-4" />

        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white dark:text-gray-100 text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-xl border border-gray-700/50 dark:border-gray-600/50">
          <div className="font-medium">{t('toolbar.elementTree')}</div>
        </div>
      </button>

      {/* Component Panel Toggle */}
      <button
        onClick={handleComponentToggle}
        className={`
          w-12 h-12 mx-2 rounded-xl flex items-center justify-center transition-all duration-200 group relative shadow-sm
          ${isComponentPanelVisible
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:shadow-md hover:scale-105'
          }
        `}
        title="Components (C)"
        data-testid="button-toggle-components"
      >
        <Package className="w-4 h-4" />

        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white dark:text-gray-100 text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-xl border border-gray-700/50 dark:border-gray-600/50">
          <div className="font-medium">{t('toolbar.components')}</div>
          <div className="text-xs text-gray-300 mt-0.5">Press C</div>
        </div>
      </button>

      {/* Properties Panel Toggle */}
      <button
        onClick={handlePropertiesToggle}
        className={`
          w-12 h-12 mx-2 rounded-xl flex items-center justify-center transition-all duration-200 group relative shadow-sm
          ${isPropertiesPanelVisible
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:shadow-md hover:scale-105'
          }
        `}
        title="Properties (P)"
        data-testid="button-toggle-properties"
      >
        <Settings className="w-4 h-4" />

        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white dark:text-gray-100 text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-xl border border-gray-700/50 dark:border-gray-600/50">
          <div className="font-medium">Properties</div>
          <div className="text-xs text-gray-300 mt-0.5">Press P</div>
        </div>
      </button>

      {/* Keyboard Shortcuts Help */}
      <button
        onClick={onShowKeyboardShortcuts}
        className="w-12 h-12 mx-2 rounded-xl flex items-center justify-center transition-all duration-200 group relative hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:shadow-md hover:scale-105 shadow-sm"
        title="Keyboard Shortcuts (?)"
        data-testid="button-keyboard-shortcuts"
      >
        <Keyboard className="w-4 h-4" />

        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white dark:text-gray-100 text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-xl border border-gray-700/50 dark:border-gray-600/50">
          <div className="font-medium">Keyboard Shortcuts</div>
          <div className="text-xs text-gray-300 mt-0.5">Press ?</div>
        </div>
      </button>
    </aside>
  );
};

export default Toolbar;
