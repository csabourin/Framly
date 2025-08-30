import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Move, Plus, Type, Image, Square, Layout, Navigation, Section, Columns, FileText } from 'lucide-react';

// Constants for drop zones
const DROP_ZONES = {
  BEFORE: 'before',
  INSIDE: 'inside',
  AFTER: 'after'
};

// Threshold percentages for drop zones
const ZONE_THRESHOLDS = {
  TOP: 0.25,    // Top 25% = before
  BOTTOM: 0.75  // Bottom 25% = after
  // Middle 50% = inside (for valid containers)
};

// Valid container elements
const VALID_CONTAINERS = new Set(['div', 'section', 'nav', 'article', 'aside', 'header', 'footer', 'main']);

// Toolbar items for adding new elements
const TOOLBAR_ITEMS = [
  { type: 'div', icon: Square, label: 'Div' },
  { type: 'section', icon: Section, label: 'Section' },
  { type: 'nav', icon: Navigation, label: 'Nav' },
  { type: 'p', icon: Type, label: 'Paragraph' },
  { type: 'img', icon: Image, label: 'Image' },
  { type: 'header', icon: Layout, label: 'Header' },
  { type: 'article', icon: FileText, label: 'Article' },
];

// Generate unique IDs
let elementIdCounter = 0;
const generateId = () => `element-${++elementIdCounter}`;

// Create initial element structure
const createInitialElements = () => ({
  id: 'root',
  type: 'body',
  props: { className: 'canvas-body' },
  children: [
    {
      id: generateId(),
      type: 'header',
      props: { className: 'header-element' },
      children: [
        {
          id: generateId(),
          type: 'h1',
          props: {},
          children: ['Welcome to Visual Editor']
        }
      ]
    },
    {
      id: generateId(),
      type: 'section',
      props: { className: 'main-section' },
      children: [
        {
          id: generateId(),
          type: 'div',
          props: { className: 'content-div' },
          children: [
            {
              id: generateId(),
              type: 'p',
              props: {},
              children: ['This is a paragraph inside a div']
            }
          ]
        },
        {
          id: generateId(),
          type: 'p',
          props: {},
          children: ['This is a standalone paragraph']
        }
      ]
    },
    {
      id: generateId(),
      type: 'div',
      props: { className: 'footer-div' },
      children: [
        {
          id: generateId(),
          type: 'p',
          props: {},
          children: ['Footer content']
        }
      ]
    }
  ]
});

// Visual Editor Component
const VisualEditor = () => {
  const [elements, setElements] = useState(createInitialElements());
  const [draggedElement, setDraggedElement] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropZone, setDropZone] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [expandedElements, setExpandedElements] = useState(new Set(['root']));
  const [hoveredToolbarItem, setHoveredToolbarItem] = useState(null);
  const canvasRef = useRef(null);

  // Check if element is ancestor of another
  const isAncestor = (ancestorId, descendantId, tree) => {
    if (ancestorId === descendantId) return false; // An element is not its own ancestor
    
    const findInTree = (node, targetId) => {
      if (node.id === targetId) return true;
      if (node.children && Array.isArray(node.children)) {
        return node.children.some(child => 
          typeof child === 'object' ? findInTree(child, targetId) : false
        );
      }
      return false;
    };

    const findAncestorNode = (node) => {
      if (node.id === ancestorId) {
        // Found the potential ancestor, now check if descendant is in its subtree
        return findInTree(node, descendantId);
      }
      if (node.children && Array.isArray(node.children)) {
        return node.children.some(child => 
          typeof child === 'object' ? findAncestorNode(child) : false
        );
      }
      return false;
    };

    return findAncestorNode(tree);
  };

  // Find element in tree
  const findElement = (id, tree = elements) => {
    if (tree.id === id) return tree;
    if (tree.children && Array.isArray(tree.children)) {
      for (const child of tree.children) {
        if (typeof child === 'object') {
          const found = findElement(id, child);
          if (found) return found;
        }
      }
    }
    return null;
  };

  // Find parent of element
  const findParent = (id, tree = elements, parent = null) => {
    if (tree.id === id) return parent;
    if (tree.children && Array.isArray(tree.children)) {
      for (const child of tree.children) {
        if (typeof child === 'object') {
          const found = findParent(id, child, tree);
          if (found) return found;
        }
      }
    }
    return null;
  };

  // Remove element from tree
  const removeElement = (id, tree) => {
    if (tree.children && Array.isArray(tree.children)) {
      tree.children = tree.children.filter(child => {
        if (typeof child === 'object') {
          if (child.id === id) return false;
          removeElement(id, child);
        }
        return true;
      });
    }
    return tree;
  };

  // Insert element in tree
  const insertElement = (element, targetId, position, tree) => {
    if (tree.id === targetId) {
      if (position === DROP_ZONES.INSIDE) {
        if (!tree.children) tree.children = [];
        tree.children.push(element);
      }
      return tree;
    }

    if (tree.children && Array.isArray(tree.children)) {
      for (let i = 0; i < tree.children.length; i++) {
        const child = tree.children[i];
        if (typeof child === 'object') {
          if (child.id === targetId) {
            if (position === DROP_ZONES.BEFORE) {
              tree.children.splice(i, 0, element);
            } else if (position === DROP_ZONES.AFTER) {
              tree.children.splice(i + 1, 0, element);
            } else if (position === DROP_ZONES.INSIDE) {
              if (!child.children) child.children = [];
              child.children.push(element);
            }
            return tree;
          }
          insertElement(element, targetId, position, child);
        }
      }
    }
    return tree;
  };

  // Handle drag start
  const handleDragStart = (e, elementId) => {
    e.stopPropagation(); // Prevent parent elements from also starting drag
    const element = findElement(elementId);
    setDraggedElement(element);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
  };

  // Handle drag end - clear all drag states
  const handleDragEnd = (e) => {
    e.preventDefault();
    setDraggedElement(null);
    setDropTarget(null);
    setDropZone(null);
  };

  // Calculate drop zone based on mouse position
  const calculateDropZone = (e, elementId) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relativeY = y / rect.height;
    
    const element = findElement(elementId);
    const isContainer = VALID_CONTAINERS.has(element.type);
    
    if (relativeY < ZONE_THRESHOLDS.TOP) {
      return DROP_ZONES.BEFORE;
    } else if (relativeY > ZONE_THRESHOLDS.BOTTOM) {
      return DROP_ZONES.AFTER;
    } else if (isContainer) {
      return DROP_ZONES.INSIDE;
    } else {
      // For non-containers, prefer before/after based on which half
      return relativeY < 0.5 ? DROP_ZONES.BEFORE : DROP_ZONES.AFTER;
    }
  };

  // Handle drag over
  const handleDragOver = (e, elementId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedElement && !hoveredToolbarItem) return;
    
    const draggedId = draggedElement?.id || null;
    
    // Check if trying to drop on itself
    if (draggedId === elementId) {
      setDropTarget(null);
      setDropZone(null);
      return;
    }
    
    // Check if trying to drop an element into its own descendant
    if (draggedId) {
      const targetElement = findElement(elementId);
      // Check if the target is a descendant of the dragged element
      if (isAncestor(draggedId, elementId, elements)) {
        setDropTarget(null);
        setDropZone(null);
        return;
      }
    }
    
    const zone = calculateDropZone(e, elementId);
    setDropTarget(elementId);
    setDropZone(zone);
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropTarget(null);
    setDropZone(null);
  };

  // Handle drop
  const handleDrop = (e, elementId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!dropTarget || !dropZone) {
      // Clear states even if drop is invalid
      setDraggedElement(null);
      setDropTarget(null);
      setDropZone(null);
      setHoveredToolbarItem(null);
      return;
    }
    
    if (draggedElement) {
      // Moving existing element
      const newTree = JSON.parse(JSON.stringify(elements));
      const elementToMove = JSON.parse(JSON.stringify(draggedElement));
      
      removeElement(draggedElement.id, newTree);
      insertElement(elementToMove, dropTarget, dropZone, newTree);
      
      setElements(newTree);
    } else if (hoveredToolbarItem) {
      // Adding new element from toolbar
      const newElement = {
        id: generateId(),
        type: hoveredToolbarItem,
        props: {},
        children: VALID_CONTAINERS.has(hoveredToolbarItem) ? [] : [`New ${hoveredToolbarItem}`]
      };
      
      const newTree = JSON.parse(JSON.stringify(elements));
      insertElement(newElement, dropTarget, dropZone, newTree);
      setElements(newTree);
    }
    
    // Always clear all drag states after drop
    setDraggedElement(null);
    setDropTarget(null);
    setDropZone(null);
    setHoveredToolbarItem(null);
  };

  // Handle toolbar item drag
  const handleToolbarDragStart = (e, type) => {
    setHoveredToolbarItem(type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleToolbarDragEnd = () => {
    setHoveredToolbarItem(null);
    setDropTarget(null);
    setDropZone(null);
  };

  // Toggle element expansion in tree view
  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedElements);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedElements(newExpanded);
  };

  // Render element in canvas
  const renderCanvasElement = (element) => {
    if (!element) return null;
    
    const isContainer = VALID_CONTAINERS.has(element.type);
    const isDropTarget = dropTarget === element.id;
    const isDraggedElement = draggedElement?.id === element.id;
    
    // Check if this is an invalid target (trying to drop ancestor into its descendant)
    const isInvalidTarget = draggedElement && isAncestor(draggedElement.id, element.id, elements);
    
    // Determine drop indicator class
    let dropIndicatorClass = '';
    if (isDropTarget && !isInvalidTarget) {
      if (dropZone === DROP_ZONES.BEFORE) dropIndicatorClass = 'drop-before';
      else if (dropZone === DROP_ZONES.AFTER) dropIndicatorClass = 'drop-after';
      else if (dropZone === DROP_ZONES.INSIDE) dropIndicatorClass = 'drop-inside';
    }
    
    const ElementType = element.type;
    
    return (
      <ElementType
        key={element.id}
        {...element.props}
        className={`
          canvas-element
          ${element.props?.className || ''}
          ${isContainer ? 'container-element' : 'leaf-element'}
          ${selectedElement === element.id ? 'selected' : ''}
          ${isDraggedElement ? 'dragging' : ''}
          ${isInvalidTarget ? 'invalid-target' : ''}
          ${dropIndicatorClass}
        `}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, element.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, element.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, element.id)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedElement(element.id);
        }}
        data-element-id={element.id}
        data-element-type={element.type}
      >
        {element.children && element.children.map((child, index) => 
          typeof child === 'string' ? child : renderCanvasElement(child)
        )}
      </ElementType>
    );
  };

  // Render tree view
  const renderTreeElement = (element, depth = 0) => {
    if (!element) return null;
    
    const hasChildren = element.children && element.children.length > 0 && 
                       element.children.some(c => typeof c === 'object');
    const isExpanded = expandedElements.has(element.id);
    const isContainer = VALID_CONTAINERS.has(element.type);
    
    return (
      <div key={element.id} className="tree-item" style={{ paddingLeft: `${depth * 20}px` }}>
        <div 
          className={`tree-item-content ${selectedElement === element.id ? 'selected' : ''}`}
          onClick={() => setSelectedElement(element.id)}
        >
          {hasChildren && (
            <button
              className="expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(element.id);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <span className="no-expand" />}
          <span className={`element-tag ${isContainer ? 'container-tag' : 'leaf-tag'}`}>
            &lt;{element.type}&gt;
          </span>
          <span className="element-id">{element.id}</span>
        </div>
        {hasChildren && isExpanded && element.children.map((child) => 
          typeof child === 'object' ? renderTreeElement(child, depth + 1) : null
        )}
      </div>
    );
  };

  return (
    <div className="editor-container">
      <style>{`
        .editor-container {
          display: flex;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
        }

        /* Toolbar */
        .toolbar {
          width: 80px;
          background: #2c3e50;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }

        .toolbar-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: #34495e;
          border: 2px solid transparent;
          border-radius: 8px;
          color: white;
          cursor: move;
          transition: all 0.2s;
        }

        .toolbar-item:hover {
          background: #4a5f7a;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .toolbar-item.dragging {
          opacity: 0.5;
        }

        .toolbar-label {
          font-size: 10px;
          margin-top: 4px;
        }

        /* Tree View */
        .tree-view {
          width: 300px;
          background: white;
          border-right: 1px solid #e0e0e0;
          overflow-y: auto;
          padding: 20px 10px;
        }

        .tree-header {
          font-weight: 600;
          margin-bottom: 15px;
          padding: 0 10px;
          color: #2c3e50;
        }

        .tree-item {
          user-select: none;
        }

        .tree-item-content {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .tree-item-content:hover {
          background: #f0f0f0;
        }

        .tree-item-content.selected {
          background: #3498db;
          color: white;
        }

        .expand-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-right: 4px;
          color: inherit;
        }

        .no-expand {
          width: 18px;
          display: inline-block;
        }

        .element-tag {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          margin-right: 8px;
        }

        .container-tag {
          color: #27ae60;
        }

        .leaf-tag {
          color: #e74c3c;
        }

        .element-id {
          font-size: 11px;
          opacity: 0.6;
        }

        /* Canvas */
        .canvas-container {
          flex: 1;
          padding: 20px;
          overflow: auto;
        }

        .canvas {
          background: white;
          min-height: 100%;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border-radius: 8px;
        }

        /* Canvas Elements */
        .canvas-element {
          min-height: 30px;
          padding: 8px;
          margin: 4px 0;
          border: 2px solid transparent;
          border-radius: 4px;
          transition: all 0.2s;
          position: relative;
        }

        .canvas-element:hover {
          border-color: #bdc3c7;
        }

        .container-element {
          background: rgba(52, 152, 219, 0.05);
          min-height: 60px;
        }

        .leaf-element {
          background: rgba(231, 76, 60, 0.05);
        }

        .canvas-element.selected {
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }

        .canvas-element.dragging {
          opacity: 0.3;
        }

        .canvas-element.invalid-target {
          background: rgba(231, 76, 60, 0.1);
          border-color: #e74c3c;
          cursor: not-allowed;
        }

        /* Drop Indicators */
        .canvas-element.drop-before::before {
          content: '';
          position: absolute;
          top: -3px;
          left: 0;
          right: 0;
          height: 3px;
          background: #27ae60;
          border-radius: 2px;
          animation: pulse 0.5s ease-in-out infinite;
        }

        .canvas-element.drop-after::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          right: 0;
          height: 3px;
          background: #27ae60;
          border-radius: 2px;
          animation: pulse 0.5s ease-in-out infinite;
        }

        .canvas-element.drop-inside {
          background: rgba(39, 174, 96, 0.1);
          border-color: #27ae60;
          border-style: dashed;
          box-shadow: inset 0 0 10px rgba(39, 174, 96, 0.2);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Element specific styles */
        header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px !important;
          margin-bottom: 20px !important;
          border-radius: 8px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
        }

        section {
          margin: 20px 0;
        }

        .main-section {
          min-height: 200px;
        }

        .content-div {
          background: rgba(46, 204, 113, 0.05);
          padding: 15px !important;
          border-radius: 6px;
        }

        .footer-div {
          background: rgba(149, 165, 166, 0.1);
          padding: 15px !important;
          margin-top: 20px;
          border-radius: 6px;
        }

        p {
          margin: 10px 0;
          line-height: 1.6;
        }
      `}</style>

      <div className="toolbar">
        {TOOLBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              className={`toolbar-item ${hoveredToolbarItem === item.type ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleToolbarDragStart(e, item.type)}
              onDragEnd={handleToolbarDragEnd}
              title={`Add ${item.label}`}
            >
              <Icon size={20} />
              <span className="toolbar-label">{item.label}</span>
            </div>
          );
        })}
      </div>

      <div className="tree-view">
        <div className="tree-header">
          <Move size={16} style={{ display: 'inline', marginRight: 8 }} />
          DOM Tree
        </div>
        {renderTreeElement(elements)}
      </div>

      <div className="canvas-container">
        <div className="canvas" ref={canvasRef}>
          {elements.children && elements.children.map((child) => 
            typeof child === 'object' ? renderCanvasElement(child) : null
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualEditor;