import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectUIState } from '../../store/selectors';
import { setSelectedTool, toggleComponentPanel, toggleDOMTreePanel } from '../../store/uiSlice';
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
  Minus
} from 'lucide-react';

const Toolbar: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedTool, isComponentPanelVisible, isDOMTreePanelVisible } = useSelector(selectUIState);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  // Essential tools shown by default
  const essentialTools: Array<{ 
    id: Tool; 
    icon: React.ComponentType<any>; 
    label: string; 
    shortcut?: string;
  }> = [
    { id: 'select', icon: MousePointer, label: t('elements.select'), shortcut: 'V' },
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
        { id: 'select', icon: ChevronDown, label: t('elements.selectDropdown') },
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

  const handleComponentToggle = () => {
    dispatch(toggleComponentPanel());
  };

  const handleDOMTreeToggle = () => {
    dispatch(toggleDOMTreePanel());
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <aside 
      className="absolute left-0 top-12 bottom-20 w-12 bg-white border-r border-gray-200 flex flex-col py-2 gap-1 z-40"
      data-testid="toolbar-main"
    >
      {/* Essential Tools */}
      {essentialTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = selectedTool === tool.id;
        
        return (
          <button
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            className={`
              w-10 h-10 mx-1 rounded-lg flex items-center justify-center transition-colors group relative
              ${isActive 
                ? 'bg-primary text-white' 
                : 'hover:bg-gray-100 text-gray-600'
              }
            `}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            data-testid={`button-tool-${tool.id}`}
          >
            <Icon className="w-4 h-4" />
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
              {tool.label}
              {tool.shortcut && <span className="ml-1 text-gray-400">({tool.shortcut})</span>}
            </div>
          </button>
        );
      })}
      
      {/* Divider */}
      <div className="w-6 h-px bg-gray-200 mx-auto my-2" data-testid="toolbar-divider" />
      
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
                w-10 h-10 mx-1 rounded-lg flex items-center justify-center transition-colors group relative
                ${isExpanded
                  ? 'bg-blue-100 text-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
                }
              `}
              title={category.label}
              data-testid={`button-category-${category.id}`}
            >
              <CategoryIcon className="w-4 h-4" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                {category.label}
              </div>
            </button>
            
            {/* Expanded Tools */}
            {isExpanded && (
              <div className="absolute left-full top-0 ml-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-50">
                <div className="text-xs text-gray-500 px-2 py-1 font-medium border-b border-gray-100 mb-1">
                  {category.label}
                </div>
                <div className="flex flex-col gap-1">
                  {category.tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isActive = selectedTool === tool.id;
                    
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          handleToolSelect(tool.id);
                          setExpandedCategory(null);
                        }}
                        className={`
                          w-10 h-8 rounded flex items-center justify-center transition-colors
                          ${isActive 
                            ? 'bg-primary text-white' 
                            : 'hover:bg-gray-100 text-gray-600'
                          }
                        `}
                        title={tool.label}
                        data-testid={`button-tool-${tool.id}`}
                      >
                        <ToolIcon className="w-3 h-3" />
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
      <div className="w-6 h-px bg-gray-200 mx-auto my-2" data-testid="toolbar-divider-bottom" />
      
      {/* Element Tree Toggle */}
      <button
        onClick={handleDOMTreeToggle}
        className={`
          w-10 h-10 mx-1 rounded-lg flex items-center justify-center transition-colors group relative
          ${isDOMTreePanelVisible 
            ? 'bg-primary text-white' 
            : 'hover:bg-gray-100 text-gray-600'
          }
        `}
        title={t('toolbar.elementTree')}
        data-testid="button-toggle-dom-tree"
      >
        <List className="w-4 h-4" />
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
{t('toolbar.elementTree')}
        </div>
      </button>

      {/* Component Panel Toggle */}
      <button
        onClick={handleComponentToggle}
        className={`
          w-10 h-10 mx-1 rounded-lg flex items-center justify-center transition-colors group relative
          ${isComponentPanelVisible 
            ? 'bg-primary text-white' 
            : 'hover:bg-gray-100 text-gray-600'
          }
        `}
        title="Components (C)"
        data-testid="button-toggle-components"
      >
        <Package className="w-4 h-4" />
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
{t('toolbar.components')} <span className="ml-1 text-gray-400">(C)</span>
        </div>
      </button>
    </aside>
  );
};

export default Toolbar;
