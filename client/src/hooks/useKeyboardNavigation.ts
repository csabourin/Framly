import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setHoveredElement } from '../store/uiSlice';
import { CanvasElement } from '../types/canvas';
import { isValidDropTarget } from '../utils/canvas';

interface NavigationState {
  availableTargets: { elementId: string; zone: 'before' | 'after' | 'inside' }[];
  currentIndex: number;
}

export function useKeyboardNavigation() {
  const dispatch = useDispatch();
  const isDraggingForReorder = useSelector((state: RootState) => state.ui.isDraggingForReorder);
  const currentElements = useSelector((state: RootState) => {
    const activeTabId = state.canvas.project.activeTabId;
    return state.canvas.project.tabs[activeTabId]?.elements || {};
  });
  const [navigationState, setNavigationState] = useState<NavigationState>({
    availableTargets: [],
    currentIndex: -1
  });

  useEffect(() => {
    if (!isDraggingForReorder) {
      setNavigationState({ availableTargets: [], currentIndex: -1 });
      return;
    }

    // Generate available drop targets when drag starts
    const targets: { elementId: string; zone: 'before' | 'after' | 'inside' }[] = [];
    
    Object.values(currentElements).forEach((element) => {
      const canvasElement = element as CanvasElement;
      if (canvasElement.id === 'root') return;
      
      // Add before/after options for all elements
      targets.push(
        { elementId: canvasElement.id, zone: 'before' },
        { elementId: canvasElement.id, zone: 'after' }
      );
      
      // Add inside option for containers that can accept drops
      if (isValidDropTarget(canvasElement)) {
        targets.push({ elementId: canvasElement.id, zone: 'inside' });
      }
    });

    setNavigationState({ availableTargets: targets, currentIndex: -1 });
  }, [isDraggingForReorder, currentElements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDraggingForReorder || navigationState.availableTargets.length === 0) return;

      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setNavigationState(prev => {
            const newIndex = Math.min(prev.currentIndex + 1, prev.availableTargets.length - 1);
            const target = prev.availableTargets[newIndex];
            if (target) {
              dispatch(setHoveredElement({ elementId: target.elementId, zone: target.zone }));
            }
            return { ...prev, currentIndex: newIndex };
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setNavigationState(prev => {
            const newIndex = Math.max(prev.currentIndex - 1, 0);
            const target = prev.availableTargets[newIndex];
            if (target) {
              dispatch(setHoveredElement({ elementId: target.elementId, zone: target.zone }));
            }
            return { ...prev, currentIndex: newIndex };
          });
          break;

        case 'Enter':
          e.preventDefault();
          // Trigger drop at current target
          if (navigationState.currentIndex >= 0) {
            const target = navigationState.availableTargets[navigationState.currentIndex];
            if (target) {
              // Dispatch drop event
              const dropEvent = new CustomEvent('keyboardDrop', {
                detail: { elementId: target.elementId, zone: target.zone }
              });
              window.dispatchEvent(dropEvent);
            }
          }
          break;

        case 'Escape':
          e.preventDefault();
          // Cancel drag operation
          dispatch(setHoveredElement({ elementId: null, zone: null }));
          setNavigationState({ availableTargets: [], currentIndex: -1 });
          break;
      }
    };

    if (isDraggingForReorder) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDraggingForReorder, navigationState, dispatch]);

  return navigationState;
}