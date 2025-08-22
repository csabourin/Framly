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
  MousePointer2
} from 'lucide-react';

const Toolbar: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedTool, isComponentPanelVisible } = useSelector((state: RootState) => state.ui);

  const tools: Array<{ id: Tool; icon: React.ComponentType<any>; label: string; shortcut?: string }> = [
    { id: 'select', icon: MousePointer, label: 'Select', shortcut: 'V' },
    { id: 'hand', icon: Hand, label: 'Hand', shortcut: 'H' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'heading', icon: Heading, label: 'Heading', shortcut: 'Shift+H' },
    { id: 'list', icon: List, label: 'List', shortcut: 'L' },
    { id: 'button', icon: MousePointer2, label: 'Button', shortcut: 'B' },
    { id: 'image', icon: Image, label: 'Image', shortcut: 'I' },
  ];

  const handleToolSelect = (tool: Tool) => {
    dispatch(setSelectedTool(tool));
  };

  const handleComponentToggle = () => {
    dispatch(toggleComponentPanel());
  };

  return (
    <aside 
      className="absolute left-0 top-12 bottom-8 w-12 bg-white border-r border-gray-200 flex flex-col py-2 gap-1 z-40"
      data-testid="toolbar-main"
    >
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = selectedTool === tool.id;
        
        return (
          <div key={tool.id}>
            <button
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
          </div>
        );
      })}
      
      {/* Divider */}
      <div className="w-6 h-px bg-gray-200 mx-auto my-2" data-testid="toolbar-divider" />
      
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
