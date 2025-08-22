import React from 'react';
import { Button } from '../../ui/button';
import { X } from 'lucide-react';
import ButtonTestingMode from './ButtonTestingMode';

interface ButtonDesignerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ButtonDesigner: React.FC<ButtonDesignerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Button State Gallery</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              Design System
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            data-testid="button-close-gallery"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content - Preview Gallery Only */}
        <div className="flex flex-1 overflow-hidden">
          <ButtonTestingMode />
        </div>
      </div>
    </div>
  );
};

export default ButtonDesigner;