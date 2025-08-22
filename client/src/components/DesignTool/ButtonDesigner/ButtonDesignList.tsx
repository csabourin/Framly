import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { 
  createButtonDesign, 
  selectButtonDesign, 
  deleteButtonDesign, 
  duplicateButtonDesign 
} from '../../../store/buttonSlice';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Plus, Copy, Trash2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';

const ButtonDesignList: React.FC = () => {
  const dispatch = useDispatch();
  const { designs, currentDesignId } = useSelector((state: RootState) => state.button);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const designsArray = Object.values(designs).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreateDesign = () => {
    if (newName.trim()) {
      dispatch(createButtonDesign({ name: newName.trim() }));
      setNewName('');
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateDesign();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
    }
  };

  const handleSelectDesign = (id: string) => {
    dispatch(selectButtonDesign(id));
  };

  const handleDuplicateDesign = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(duplicateButtonDesign(id));
  };

  const handleDeleteDesign = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this button design?')) {
      dispatch(deleteButtonDesign(id));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Button Designs</h3>
          <span className="text-xs text-gray-500">{designsArray.length} designs</span>
        </div>
        
        {isCreating ? (
          <div className="space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Button name..."
              className="text-sm"
              autoFocus
              data-testid="input-new-button-name"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleCreateDesign}
                className="text-xs"
                data-testid="button-create-confirm"
              >
                Create
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCreating(false)}
                className="text-xs"
                data-testid="button-create-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="w-full text-sm"
            data-testid="button-create-new"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Button
          </Button>
        )}
      </div>

      {/* Design List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {designsArray.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm">No button designs yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first button design</p>
          </div>
        ) : (
          designsArray.map((design) => (
            <div
              key={design.id}
              onClick={() => handleSelectDesign(design.id)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all group
                ${currentDesignId === design.id
                  ? 'border-blue-200 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
              data-testid={`design-item-${design.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {design.name}
                  </h4>
                  {design.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {design.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">
                      Updated {new Date(design.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`design-menu-${design.id}`}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => handleDuplicateDesign(design.id, e)}
                      data-testid={`design-duplicate-${design.id}`}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => handleDeleteDesign(design.id, e)}
                      className="text-red-600"
                      data-testid={`design-delete-${design.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Mini Preview */}
              <div className="mt-3 p-2 bg-white rounded border">
                <div
                  className="text-xs px-2 py-1 rounded text-center font-medium"
                  style={{
                    backgroundColor: design.states.default.styles.backgroundColor || '#3b82f6',
                    color: design.states.default.styles.color || '#ffffff',
                    borderRadius: design.states.default.styles.borderRadius || '6px',
                  }}
                >
                  {design.previewText}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ButtonDesignList;