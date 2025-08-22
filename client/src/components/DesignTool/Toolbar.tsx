import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setSelectedTool, toggleComponentPanel } from '../../store/uiSlice';
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
  const dispatch = useDispatch();
  const { selectedTool, isComponentPanelVisible } = useSelector((state: RootState) => state.ui);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  // Essential tools shown by default
  const essentialTools: Array<{ 
    id: Tool; 
    icon: React.ComponentType<any>; 
    label: string; 
    shortcut?: string;
  }> = [
    { id: 'select', icon: MousePointer, label: 'Select', shortcut: 'V' },
    { id: 'hand', icon: Hand, label: 'Hand', shortcut: 'H' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'heading', icon: Heading, label: 'Heading', shortcut: 'Shift+H' },
    { id: 'button', icon: MousePointer2, label: 'Button', shortcut: 'B' },
    { id: 'image', icon: Image, label: 'Image', shortcut: 'I' },
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
      label: 'Form Elements',
      icon: FormInput,
      tools: [
        { id: 'input', icon: FormInput, label: 'Input Field' },
        { id: 'textarea', icon: TextCursorInput, label: 'Text Area' },
        { id: 'checkbox', icon: CheckSquare, label: 'Checkbox' },
        { id: 'radio', icon: Circle, label: 'Radio Button' },
        { id: 'select', icon: ChevronDown, label: 'Select Dropdown' },
      ]
    },
    {
      id: 'structure',
      label: 'Structure',
      icon: Box,
      tools: [
        { id: 'section', icon: Box, label: 'Section' },
        { id: 'nav', icon: Navigation, label: 'Navigation' },
        { id: 'header', icon: Layout, label: 'Header' },
        { id: 'footer', icon: AlignEndHorizontal, label: 'Footer' },
        { id: 'article', icon: FileText, label: 'Article' },
      ]
    },
    {
      id: 'content',
      label: 'Content',
      icon: List,
      tools: [
        { id: 'list', icon: List, label: 'List' },
        { id: 'code', icon: Code, label: 'Code Block' },
        { id: 'divider', icon: Minus, label: 'Divider' },
        { id: 'link', icon: Link, label: 'Link' },
      ]
    },
    {
      id: 'media',
      label: 'Media',
      icon: Video,
      tools: [
        { id: 'video', icon: Video, label: 'Video' },
        { id: 'audio', icon: Volume2, label: 'Audio' },
      ]
    },
  ];

  const handleToolSelect = (tool: Tool) => {
    dispatch(setSelectedTool(tool));
  };

  const handleComponentToggle = () => {
    dispatch(toggleComponentPanel());
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <aside 
      className="absolute left-0 top-12 bottom-8 w-12 bg-white border-r border-gray-200 flex flex-col py-2 gap-1 z-40"
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
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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
          Components <span className="ml-1 text-gray-400">(C)</span>
        </div>
      </button>
    </aside>
  );
};

export default Toolbar;
