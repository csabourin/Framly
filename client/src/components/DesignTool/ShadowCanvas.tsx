import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectElement } from '../../store/canvasSlice';
import { setSelectedTool } from '../../store/uiSlice';
import { selectCurrentElements, selectSelectedElementId, selectCanvasUIState } from '../../store/selectors';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import CanvasElement from './CanvasElement';

interface ShadowCanvasProps {
  canvasId?: string;
  importedCSS?: string;
}

export const ShadowCanvas: React.FC<ShadowCanvasProps> = ({ canvasId, importedCSS }) => {
  const dispatch = useDispatch();
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Get canvas data
  const rawElements = useSelector(selectCurrentElements);
  const selectedElementId = useSelector(selectSelectedElementId);
  const { selectedTool, zoomLevel, isGridVisible } = useSelector(selectCanvasUIState);
  const currentElements = useExpandedElements(rawElements);
  const rootElement = currentElements.root;

  // Canvas dimensions
  const currentBreakpoint = useSelector((state: RootState) => state.canvas.project.currentBreakpoint);
  const breakpoints = useSelector((state: RootState) => state.canvas.project.breakpoints);
  const canvasWidth = breakpoints[currentBreakpoint]?.width || rootElement?.width || 375;

  // Initialize Shadow DOM
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    console.log('🔧 SHADOW CANVAS: Initializing Shadow DOM');

    // Create shadow root
    const shadow = host.attachShadow({ mode: 'open' });
    shadowRef.current = shadow;

    // Create canvas wrapper with data attribute for CSS scoping
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-canvas', canvasId || 'default');
    wrapper.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background: white;
      overflow: auto;
    `;

    // Create React mount point
    const mountPoint = document.createElement('div');
    mountPoint.id = 'react-mount';
    mountPoint.style.cssText = 'width: 100%; height: 100%;';
    wrapper.appendChild(mountPoint);
    mountRef.current = mountPoint;

    // Add base styles for the canvas
    const baseCSS = `
      * { box-sizing: border-box; }
      
      /* Canvas base styles */
      [data-canvas] {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.5;
        color: #333;
      }
      
      /* Selection and editing styles */
      .canvas-element {
        position: relative;
        outline: none;
      }
      
      .canvas-element[data-state="selected"] {
        outline: 2px solid #3b82f6 !important;
        outline-offset: -2px;
      }
      
      .canvas-element[data-state="editing"] {
        outline: 2px solid #10b981 !important;
        outline-offset: -2px;
      }
      
      /* Selection handle */
      .selection-handle {
        position: absolute;
        top: -8px;
        left: -8px;
        width: 16px;
        height: 16px;
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 2px;
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      
      .selection-handle svg {
        width: 8px;
        height: 8px;
        color: white;
      }
      
      /* Resize handles */
      .resizer {
        position: absolute;
        background: #3b82f6;
        border: 1px solid white;
        border-radius: 50%;
        width: 8px;
        height: 8px;
        z-index: 1000;
      }
      
      .resizer.tl { top: -4px; left: -4px; cursor: nw-resize; }
      .resizer.tr { top: -4px; right: -4px; cursor: ne-resize; }
      .resizer.bl { bottom: -4px; left: -4px; cursor: sw-resize; }
      .resizer.br { bottom: -4px; right: -4px; cursor: se-resize; }
      
      /* Grid overlay */
      ${isGridVisible ? `
        [data-canvas]::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          z-index: 1;
        }
      ` : ''}
    `;

    // Create stylesheets
    const sheets: CSSStyleSheet[] = [];
    
    // Base stylesheet
    const baseSheet = new CSSStyleSheet();
    baseSheet.replaceSync(baseCSS);
    sheets.push(baseSheet);
    
    // Imported CSS stylesheet if provided
    if (importedCSS) {
      console.log('🎨 SHADOW CANVAS: Injecting imported CSS');
      const importedSheet = new CSSStyleSheet();
      importedSheet.replaceSync(importedCSS);
      sheets.push(importedSheet);
    }

    // Adopt stylesheets
    shadow.adoptedStyleSheets = sheets;

    // Mount wrapper
    shadow.appendChild(wrapper);
    
    console.log('✅ SHADOW CANVAS: Shadow DOM initialized successfully');

    return () => {
      shadowRef.current = null;
      mountRef.current = null;
    };
  }, [canvasId, importedCSS, isGridVisible]);

  // Handle canvas clicks
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking on an element
    const elementDiv = target.closest('[data-element-id]') as HTMLElement;
    if (elementDiv) {
      const elementId = elementDiv.dataset.elementId;
      if (elementId && selectedTool === 'select') {
        dispatch(selectElement(elementId));
        return;
      }
    }
    
    // Clear selection if clicking on canvas background
    if (selectedTool === 'select') {
      dispatch(selectElement(''));
    }
  }, [dispatch, selectedTool]);

  // Render React content into shadow DOM mount point
  useEffect(() => {
    const mountPoint = mountRef.current;
    if (!mountPoint || !rootElement) return;

    import('react-dom/client').then(({ createRoot }) => {
      // Clear mount point
      mountPoint.innerHTML = '';

      // Create React container
      const container = document.createElement('div');
      container.style.cssText = `
        width: ${canvasWidth}px;
        min-height: 100vh;
        margin: 0 auto;
        position: relative;
        transform: scale(${zoomLevel});
        transform-origin: top center;
      `;
      
      // Add data-canvas attribute for CSS scoping
      container.setAttribute('data-canvas', canvasId || 'default');
      
      container.addEventListener('click', (e) => {
        handleCanvasClick(e as any);
      });

      mountPoint.appendChild(container);

      // Create React root and render elements
      const root = createRoot(container);
      root.render(
        <>
          {(rootElement.children || []).map((childId: string) => {
            const element = currentElements[childId];
            if (!element) return null;
            
            return (
              <CanvasElement 
                key={element.id} 
                element={element}
                isSelected={element.id === selectedElementId}
                isHovered={false} // TODO: Implement hover state for Shadow DOM
                hoveredZone={null}
                expandedContainerId={null}
                currentElements={currentElements}
              />
            );
          })}
        </>
      );
      
      console.log('📋 SHADOW CANVAS: Rendered elements in Shadow DOM successfully');
      
      return () => {
        root.unmount();
        mountPoint.innerHTML = '';
      };
    });
  }, [rootElement, canvasWidth, zoomLevel, handleCanvasClick, currentElements, selectedElementId, canvasId]);

  return (
    <div 
      ref={hostRef} 
      className="shadow-canvas-host"
      style={{ 
        width: '100%', 
        height: '100%', 
        background: '#f5f5f5',
        position: 'relative'
      }}
    />
  );
};

export default ShadowCanvas;