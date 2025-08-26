import React from 'react';
import { useDispatch } from 'react-redux';
import { openComponentTab, deleteComponentDefinition } from '../../store/componentDefinitionsSlice';
import { deleteComponent } from '../../store/componentSlice';
import { deleteComponentDefinition as deleteFromDB } from '../../utils/componentPersistence';
import { deleteComponent as deleteFromLegacyDB } from '../../utils/persistence';
import { ComponentId, CustomComponent } from '../../types/canvas';
import { hasCircularDependency } from '../../utils/componentInstances';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { 
  Edit3, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Unlink,
  AlertTriangle
} from 'lucide-react';

interface ComponentContextMenuProps {
  component: CustomComponent;
  children: React.ReactNode;
}

/**
 * Context menu for component management with comprehensive operations
 */
const ComponentContextMenu: React.FC<ComponentContextMenuProps> = ({ 
  component, 
  children 
}) => {
  const dispatch = useDispatch();

  const handleEditComponent = () => {
    // Open component in tabbed editor
    dispatch(openComponentTab(component.id));
  };

  const handleDuplicateComponent = () => {
    // Create a copy of the component with new ID
    const duplicatedComponent: CustomComponent = {
      ...component,
      id: `${component.id}-copy-${Date.now()}`,
      name: `${component.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to legacy store for backward compatibility
    // In a full implementation, this would also create a new ComponentDef
  };

  const handleDeleteComponent = async () => {
    // Check if component is used in canvas
    // In a full implementation, this would check for component instances
    const isComponentInUse = false; // Placeholder check
    
    if (isComponentInUse) {
      const confirmDelete = window.confirm(
        `"${component.name}" is currently used in your design. Deleting it will remove all instances. Are you sure?`
      );
      
      if (!confirmDelete) return;
    } else {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete "${component.name}"? This action cannot be undone.`
      );
      
      if (!confirmDelete) return;
    }

    // Delete from both stores
    try {
      dispatch(deleteComponent(component.id));
      dispatch(deleteComponentDefinition(component.id));
      
      // Delete from IndexedDB
      await deleteFromLegacyDB(component.id);
      await deleteFromDB(component.id);
      
    } catch (error) {
      // Failed to delete component
    }
  };

  const handleRenameComponent = () => {
    const newName = window.prompt('Enter new component name:', component.name);
    
    if (newName && newName.trim() && newName.trim() !== component.name) {
      // Update component name
      // In full implementation, this would update both legacy and new stores
    }
  };

  const handleDetachInstances = () => {
    // Convert all instances back to regular elements
    const confirmDetach = window.confirm(
      `This will convert all instances of "${component.name}" back to regular elements. The component definition will remain intact. Continue?`
    );
    
    if (confirmDetach) {
      // In full implementation, this would find all instances and detach them
    }
  };

  const handlePropagateUpdates = () => {
    // Force update all component instances
    // In full implementation, this would trigger propagation system
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Primary Actions */}
        <ContextMenuItem 
          onClick={handleEditComponent}
          className="flex items-center gap-2"
          data-testid={`context-edit-component-${component.id}`}
        >
          <Edit3 size={16} />
          Edit Component
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={handleDuplicateComponent}
          className="flex items-center gap-2"
          data-testid={`context-duplicate-component-${component.id}`}
        >
          <Copy size={16} />
          Duplicate Component
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={handleRenameComponent}
          className="flex items-center gap-2"
          data-testid={`context-rename-component-${component.id}`}
        >
          <Edit3 size={16} />
          Rename Component
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Advanced Operations */}
        <ContextMenuItem 
          onClick={handlePropagateUpdates}
          className="flex items-center gap-2"
          data-testid={`context-propagate-${component.id}`}
        >
          <RefreshCw size={16} />
          Update All Instances
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={handleDetachInstances}
          className="flex items-center gap-2 text-warning hover:text-warning/80"
          data-testid={`context-detach-${component.id}`}
        >
          <Unlink size={16} />
          Detach All Instances
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Destructive Actions */}
        <ContextMenuItem 
          onClick={handleDeleteComponent}
          className="flex items-center gap-2 text-destructive hover:text-destructive/80 focus:text-destructive"
          data-testid={`context-delete-component-${component.id}`}
        >
          <Trash2 size={16} />
          Delete Component
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ComponentContextMenu;