import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement, reorderElement } from '../../store/canvasSlice';
import { 
  setTreeDragActive, 
  setTreeDraggedElement, 
  setTreeHoveredElement, 
  setAutoExpandTimer 
} from '../../store/uiSlice';
import { selectCurrentElements, selectSelectedElementId } from '../../store/selectors';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { CanvasElement } from '../../types/canvas';
import { ChevronRight, ChevronDown, Eye, EyeOff, Square, Type, Image as ImageIcon, Box, GripVertical } from 'lucide-react';
import { 
  wouldCreateCircularDependency, 
  detectDropZone, 
  canAcceptChildren, 
  isValidDropTarget 
} from '../../utils/canvas';
import { historyManager } from '../../utils/historyManager';
import { useTranslation } from 'react-i18next';

interface DOMTreeNodeProps {
  element: CanvasElement;
  level: number;
  selectedElementId: string | null;
  allElements: Record<string, CanvasElement>;
  isExpanded: boolean;
  onToggleExpanded: (elementId: string) => void;
  treeDraggedElementId: string | null;
  treeHoveredElementId: string | null;
  treeHoveredZone: 'before' | 'after' | 'inside' | null;
  isTreeDragActive: boolean;
  expandedElements: Record<string, boolean>;
  t: any;
}

// Helper function to get element label (moved outside component for better performance)
function getElementLabel(element: CanvasElement, t: any) {
  if (element.type === 'text' && element.content) {
    const truncated = element.content.length > 20 ? element.content.substring(0, 20) + '...' : element.content;
    return t('elementTree.textElement', { content: truncated });
  }
  if (element.id === 'root') return t('elementTree.rootContainer');
  return `${element.type.charAt(0).toUpperCase() + element.type.slice(1)} ${element.id.split('-').pop()}`;
}

const DOMTreeNode: React.FC<DOMTreeNodeProps> = ({ 
  element, 
  level, 
  selectedElementId, 
  allElements, 
  isExpanded, 
  onToggleExpanded,
  treeDraggedElementId,
  treeHoveredElementId,
  treeHoveredZone,
  isTreeDragActive,
  expandedElements,
  t
}) => {
  const dispatch = useDispatch();
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [dragCounter, setDragCounter] = useState(0);
  
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
  
  const handleClick = () => {
    dispatch(selectElement(element.id));
  };
  
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(element.id);
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Don't allow dragging the root element
    if (element.id === 'root') {
      e.preventDefault();
      return;
    }

    // Don't allow dragging component children
    if (element.isComponentChild) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', element.id);
    
    // Create ghost image
    const ghostElement = document.createElement('div');
    ghostElement.className = 'bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm text-blue-800';
    ghostElement.textContent = getElementLabel(element, t);
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    document.body.appendChild(ghostElement);
    e.dataTransfer.setDragImage(ghostElement, 10, 10);
    
    // Clean up ghost element after drag
    setTimeout(() => {
      document.body.removeChild(ghostElement);
    }, 0);

    dispatch(setTreeDragActive(true));
    dispatch(setTreeDraggedElement(element.id));
  }, [element, dispatch]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    dispatch(setTreeDragActive(false));
    dispatch(setTreeDraggedElement(null));
    dispatch(setTreeHoveredElement({ elementId: null, zone: null }));
    setDragCounter(0);
  }, [dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!treeDraggedElementId || treeDraggedElementId === element.id) {
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Detect drop zone based on mouse position
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const elementCanAcceptChildren = canAcceptChildren(element);
      const zone = detectDropZone(e.clientY, rect, elementCanAcceptChildren);
      
      // Validate the drop operation
      const draggedElement = allElements[treeDraggedElementId];
      
      // Check for circular dependency
      if (wouldCreateCircularDependency(treeDraggedElementId, element.id, allElements)) {
        return;
      }
      
      // For 'inside' drops, check if target can accept children
      if (zone === 'inside' && !elementCanAcceptChildren) {
        return;
      }
      
      // Check if it's a valid drop target for inside drops
      if (zone === 'inside' && !isValidDropTarget(element, draggedElement)) {
        return;
      }

      dispatch(setTreeHoveredElement({ elementId: element.id, zone }));
    }
  }, [treeDraggedElementId, element, allElements, dispatch]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!treeDraggedElementId || treeDraggedElementId === element.id) {
      return;
    }
    
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    
    // Auto-expand after 500ms if it's a container and not already expanded
    if (hasChildren && !isExpanded && canAcceptChildren(element)) {
      const timer = setTimeout(() => {
        onToggleExpanded(element.id);
      }, 500);
      
      dispatch(setAutoExpandTimer(timer));
    }
  }, [treeDraggedElementId, element, hasChildren, isExpanded, onToggleExpanded, dispatch]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter <= 0) {
        // Clear hover state when leaving element
        if (treeHoveredElementId === element.id) {
          dispatch(setTreeHoveredElement({ elementId: null, zone: null }));
        }
        // Clear auto-expand timer
        dispatch(setAutoExpandTimer(null));
      }
      return Math.max(0, newCounter);
    });
  }, [element.id, treeHoveredElementId, dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(0);
    
    if (!treeDraggedElementId || treeDraggedElementId === element.id) {
      return;
    }

    const draggedElementId = treeDraggedElementId;
    const draggedElement = allElements[draggedElementId];
    
    if (!draggedElement) {
      console.warn('Dragged element not found:', draggedElementId);
      return;
    }

    // Detect final drop zone
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const elementCanAcceptChildren = canAcceptChildren(element);
      const zone = detectDropZone(e.clientY, rect, elementCanAcceptChildren);
      
      // Final validation
      if (wouldCreateCircularDependency(draggedElementId, element.id, allElements)) {
        console.warn('Cannot drop: would create circular dependency');
        return;
      }
      
      if (zone === 'inside') {
        if (!elementCanAcceptChildren || !isValidDropTarget(element, draggedElement)) {
          console.warn('Cannot drop inside: invalid target');
          return;
        }
        
        // Drop inside the element
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: element.id,
          insertPosition: 'inside'
        }));
        
        historyManager.recordAction('reorder', `Moved ${getElementLabel(draggedElement, t)} inside ${getElementLabel(element, t)}`);
      } else {
        // Drop before or after the element (sibling position)
        const parentId = element.parent || 'root';
        
        dispatch(reorderElement({
          elementId: draggedElementId,
          newParentId: parentId,
          insertPosition: zone as 'before' | 'after',
          referenceElementId: element.id
        }));
        
        const positionText = zone === 'before' ? 'before' : 'after';
        historyManager.recordAction('reorder', `Moved ${getElementLabel(draggedElement, t)} ${positionText} ${getElementLabel(element, t)}`);
      }
    }
    
    // Clear drag state
    dispatch(setTreeHoveredElement({ elementId: null, zone: null }));
  }, [treeDraggedElementId, element, allElements, dispatch]);

  const isVisible = element.styles?.display !== 'none' && element.styles?.opacity !== 0;
  
  // Visual states
  const isDragging = treeDraggedElementId === element.id;
  const isHovered = treeHoveredElementId === element.id && isTreeDragActive;
  const showDropIndicator = isHovered && treeHoveredZone;
  const canBeDragged = element.id !== 'root' && !element.isComponentChild;
  
  return (
    <div className="select-none relative">
      {/* Drop indicator lines */}
      {showDropIndicator && treeHoveredZone === 'before' && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10"
          style={{ top: '-1px', marginLeft: `${8 + indentLevel}px` }}
        />
      )}
      
      <div
        ref={nodeRef}
        draggable={canBeDragged}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex items-center py-1 px-2 cursor-pointer rounded text-sm transition-colors relative
          ${element.id === selectedElementId ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}
          ${isDragging ? 'opacity-50 bg-gray-200' : ''}
          ${isHovered && treeHoveredZone === 'inside' ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''}
          ${!isDragging && !isHovered ? 'hover:bg-gray-100' : ''}
          ${canBeDragged ? 'group' : ''}
        `}
        style={{ paddingLeft: `${8 + indentLevel}px` }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={element.id === selectedElementId}
        aria-label={`${getElementLabel(element, t)}${hasChildren ? (isExpanded ? ', expanded' : ', collapsed') : ''}`}
        data-testid={`tree-node-${element.id}`}
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
          {/* Drag handle */}
          {canBeDragged && (
            <div 
              ref={dragHandleRef}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              aria-hidden="true"
            >
              <GripVertical className="w-3 h-3 text-gray-400" />
            </div>
          )}
          
          {getElementIcon(element.type)}
          <span className="truncate flex-1" data-testid={`element-${element.id}`}>
            {getElementLabel(element, t)}
          </span>
          {!isVisible && (
            <EyeOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
          )}
          
          {/* Component badge */}
          {element.componentRef && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded flex-shrink-0">
              Component
            </span>
          )}
        </div>
      </div>
      
      {/* Drop indicator lines */}
      {showDropIndicator && treeHoveredZone === 'after' && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10"
          style={{ bottom: '-1px', marginLeft: `${8 + indentLevel}px` }}
        />
      )}
      
      {hasChildren && isExpanded && (
        <div role="group">
          {element.children?.map(childId => {
            const child = allElements[childId];
            return child ? (
              <DOMTreeNode
                key={child.id}
                element={child}
                level={level + 1}
                selectedElementId={selectedElementId}
                allElements={allElements}
                isExpanded={expandedElements[child.id] ?? true}
                onToggleExpanded={onToggleExpanded}
                treeDraggedElementId={treeDraggedElementId}
                treeHoveredElementId={treeHoveredElementId}
                treeHoveredZone={treeHoveredZone}
                isTreeDragActive={isTreeDragActive}
                expandedElements={expandedElements}
                t={t}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

const DOMTreePanel: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Use new selectors for tab-based data
  const rawElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const { 
    isTreeDragActive, 
    treeDraggedElementId, 
    treeHoveredElementId, 
    treeHoveredZone 
  } = useSelector((state: RootState) => state.ui);
  
  // CRITICAL: Use expanded elements to show component instance children in Element Tree
  const currentElements = useExpandedElements(rawElements);
  const rootElement = currentElements.root;
  
  // Local state for expanded elements
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>(() => {
    // Initialize with all elements expanded by default
    const initialExpanded: Record<string, boolean> = {};
    Object.values(currentElements).forEach(element => {
      if (element.children && element.children.length > 0) {
        initialExpanded[element.id] = true;
      }
    });
    return initialExpanded;
  });
  
  const handleToggleExpanded = useCallback((elementId: string) => {
    setExpandedElements(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  }, []);
  
  // Auto-scroll when dragging near edges
  useEffect(() => {
    if (!isTreeDragActive || !panelRef.current) return;
    
    let scrollInterval: NodeJS.Timeout;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      
      const rect = panelRef.current.getBoundingClientRect();
      const scrollContainer = panelRef.current.querySelector('.overflow-y-auto');
      
      if (!scrollContainer) return;
      
      const threshold = 50; // pixels from edge to trigger scroll
      const scrollSpeed = 5;
      
      if (e.clientY < rect.top + threshold) {
        // Scroll up
        scrollInterval = setInterval(() => {
          scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - scrollSpeed);
        }, 16);
      } else if (e.clientY > rect.bottom - threshold) {
        // Scroll down
        scrollInterval = setInterval(() => {
          const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
          scrollContainer.scrollTop = Math.min(maxScroll, scrollContainer.scrollTop + scrollSpeed);
        }, 16);
      } else {
        clearInterval(scrollInterval);
      }
    };
    
    const handleMouseUp = () => {
      clearInterval(scrollInterval);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      clearInterval(scrollInterval);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTreeDragActive]);
  
  // Announce drag operations to screen readers
  useEffect(() => {
    if (isTreeDragActive && treeDraggedElementId) {
      const draggedElement = currentElements[treeDraggedElementId];
      if (draggedElement) {
        const announcement = `Dragging ${getElementLabel(draggedElement, t)}. Use arrow keys to navigate and drop on target element.`;
        // Create temporary announcement element
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'assertive');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.textContent = announcement;
        document.body.appendChild(announcer);
        
        setTimeout(() => {
          document.body.removeChild(announcer);
        }, 1000);
      }
    }
  }, [isTreeDragActive, treeDraggedElementId, currentElements]);
  
  return (
    <div 
      ref={panelRef}
      className="absolute left-16 top-12 bottom-20 w-64 bg-white border-r border-gray-200 z-30" 
      data-testid="dom-tree-panel"
      role="tree"
      aria-label="Element hierarchy tree"
    >
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900 text-sm">{t('elementTree.elementTree')}</h3>
        <p className="text-xs text-gray-500 mt-1">
          {isTreeDragActive ? t('elementTree.dropToReorder') : t('elementTree.dragToReorderClick')}
        </p>
      </div>
      
      <div className="p-2 overflow-y-auto max-h-full">
        {rootElement && (
          <DOMTreeNode
            element={rootElement}
            level={0}
            selectedElementId={selectedElementId || null}
            allElements={currentElements}
            isExpanded={expandedElements[rootElement.id] ?? true}
            onToggleExpanded={handleToggleExpanded}
            treeDraggedElementId={treeDraggedElementId}
            treeHoveredElementId={treeHoveredElementId}
            treeHoveredZone={treeHoveredZone}
            isTreeDragActive={isTreeDragActive}
            expandedElements={expandedElements}
            t={t}
          />
        )}
      </div>
      
      {/* Drag overlay */}
      {isTreeDragActive && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-blue-50/20" />
        </div>
      )}
    </div>
  );
};

export default DOMTreePanel;