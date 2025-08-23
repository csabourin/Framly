import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setSettingsMenuOpen, updateSettings } from '../../store/uiSlice';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { X } from 'lucide-react';

const SettingsMenu: React.FC = () => {
  const dispatch = useDispatch();
  const { isSettingsMenuOpen, settings } = useSelector((state: RootState) => state.ui);

  if (!isSettingsMenuOpen) return null;

  const handleClose = () => {
    dispatch(setSettingsMenuOpen(false));
  };

  const handleToggleHandToolDragging = (enabled: boolean) => {
    dispatch(updateSettings({ enableHandToolDragging: enabled }));
  };

  const handleToggleClickToMove = (enabled: boolean) => {
    dispatch(updateSettings({ enableClickToMove: enabled }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Settings Panel */}
      <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-80 m-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Settings
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
            data-testid="close-settings"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Hand Tool Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Hand Tool Behavior
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="hand-tool-dragging" className="text-sm font-normal">
                  Enable handle dragging
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Allow dragging elements from their drag handles
                </p>
              </div>
              <Switch
                id="hand-tool-dragging"
                checked={settings.enableHandToolDragging}
                onCheckedChange={handleToggleHandToolDragging}
                data-testid="hand-tool-dragging-toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="click-to-move" className="text-sm font-normal">
                  Enable click-to-move
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click element, then click destination to move
                </p>
              </div>
              <Switch
                id="click-to-move"
                checked={settings.enableClickToMove}
                onCheckedChange={handleToggleClickToMove}
                data-testid="click-to-move-toggle"
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Future settings sections can go here */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Interface
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              More interface settings coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;