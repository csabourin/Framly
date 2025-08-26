import React from 'react';
import { useDispatch } from 'react-redux';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, Scissors, Clipboard, Trash2 } from 'lucide-react';
import { copyElement, cutElement, pasteElement, deleteElement, duplicateElement } from '../../store/canvasSlice';

interface ElementContextMenuProps {
  elementId: string;
  children: React.ReactNode;
}

const ElementContextMenu: React.FC<ElementContextMenuProps> = ({ elementId, children }) => {
  const dispatch = useDispatch();
  
  const handleCopy = () => {
    if (elementId && elementId !== 'root') {
      dispatch(copyElement(elementId));
    }
  };
  
  const handleCut = () => {
    if (elementId && elementId !== 'root') {
      dispatch(cutElement(elementId));
    }
  };
  
  const handlePaste = () => {
    dispatch(pasteElement());
  };
  
  const handleDuplicate = () => {
    if (elementId && elementId !== 'root') {
      dispatch(duplicateElement(elementId));
    }
  };
  
  const handleDelete = () => {
    if (elementId && elementId !== 'root') {
      dispatch(deleteElement(elementId));
    }
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem 
          onClick={handleCopy}
          disabled={!elementId || elementId === 'root'}
          data-testid={`context-copy-element-${elementId}`}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={handleCut}
          disabled={!elementId || elementId === 'root'}
          data-testid={`context-cut-element-${elementId}`}
        >
          <Scissors className="mr-2 h-4 w-4" />
          Cut
          <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={handlePaste}
          data-testid="context-paste-element"
        >
          <Clipboard className="mr-2 h-4 w-4" />
          Paste
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={handleDuplicate}
          disabled={!elementId || elementId === 'root'}
          data-testid={`context-duplicate-element-${elementId}`}
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={handleDelete}
          disabled={!elementId || elementId === 'root'}
          className="text-destructive focus:text-destructive"
          data-testid={`context-delete-element-${elementId}`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ElementContextMenu;