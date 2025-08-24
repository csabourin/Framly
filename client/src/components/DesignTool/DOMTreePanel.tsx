import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement } from '../../store/canvasSlice';
import { selectCurrentElements, selectSelectedElementId } from '../../store/selectors';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { CanvasElement } from '../../types/canvas';
import { ChevronRight, ChevronDown, Eye, EyeOff, Square, Type, Image as ImageIcon, Box } from 'lucide-react';

interface DOMTreeNodeProps {
  element: CanvasElement;
  level: number;
  selectedElementId: string | null;
  allElements: Record<string, CanvasElement>;
}

const DOMTreeNode: React.FC<DOMTreeNodeProps> = ({ element, level, selectedElementId, allElements }) => {
  const dispatch = useDispatch();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const hasChildren = element.children && element.children.length > 0;
  const indentLevel = level * 16;
  
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'container':
        return <Box className="w-4 h-4 text-blue-500" />;
      case 'rectangle':
        return <Square className="w-4 h-4 text-green-500" />;
      case 'text':
        return <Type className="w-4 h-4 text-purple-500" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-orange-500" />;
      default:
        return <Box className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getElementLabel = (element: CanvasElement) => {
    if (element.type === 'text' && element.content) {
      const truncated = element.content.length > 20 ? element.content.substring(0, 20) + '...' : element.content;
      return `Text: "${truncated}"`;
    }
    if (element.id === 'root') return 'Root Container';
    return `${element.type.charAt(0).toUpperCase() + element.type.slice(1)} ${element.id.split('-').pop()}`;
  };
  
  const handleClick = () => {
    dispatch(selectElement(element.id));
  };
  
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const isVisible = element.styles?.display !== 'none' && element.styles?.opacity !== 0;
  
  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded text-sm ${
          element.id === selectedElementId ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
        }`}
        style={{ paddingLeft: `${8 + indentLevel}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            onClick={toggleExpanded}
            className="mr-1 p-0.5 hover:bg-gray-200 rounded"
            data-testid={`toggle-${element.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4 mr-1" />}
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getElementIcon(element.type)}
          <span className="truncate flex-1" data-testid={`element-${element.id}`}>
            {getElementLabel(element)}
          </span>
          {!isVisible && (
            <EyeOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
          )}
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {element.children?.map(childId => {
            const child = allElements[childId];
            return child ? (
              <DOMTreeNode
                key={child.id}
                element={child}
                level={level + 1}
                selectedElementId={selectedElementId}
                allElements={allElements}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

const DOMTreePanel: React.FC = () => {
  // Use new selectors for tab-based data
  const rawElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  
  // CRITICAL: Use expanded elements to show component instance children in Element Tree
  const currentElements = useExpandedElements(rawElements);
  const rootElement = currentElements.root;
  
  return (
    <div className="absolute left-16 top-12 bottom-8 w-64 bg-white border-r border-gray-200 overflow-y-auto z-40" data-testid="dom-tree-panel">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900 text-sm">Element Tree</h3>
        <p className="text-xs text-gray-500 mt-1">Click to select elements</p>
      </div>
      
      <div className="p-2">
        {rootElement && (
          <DOMTreeNode
            element={rootElement}
            level={0}
            selectedElementId={selectedElementId || null}
            allElements={currentElements}
          />
        )}
      </div>
    </div>
  );
};

export default DOMTreePanel;