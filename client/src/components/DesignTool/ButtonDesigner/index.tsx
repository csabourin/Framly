import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { setTestingMode } from '../../../store/buttonSlice';
import { Button } from '../../ui/button';
import { X, TestTube } from 'lucide-react';
import ButtonDesignList from './ButtonDesignList';
import ButtonStateEditor from './ButtonStateEditor';
import ButtonPreview from './ButtonPreview';
import ButtonTestingMode from './ButtonTestingMode';

interface ButtonDesignerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ButtonDesigner: React.FC<ButtonDesignerProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { currentDesignId, isTestingMode } = useSelector((state: RootState) => state.button);

  if (!isOpen) return null;

  const handleToggleTestingMode = () => {
    dispatch(setTestingMode(!isTestingMode));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Button Designer</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              Design System
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleTestingMode}
              className={`${isTestingMode ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
              data-testid="button-toggle-testing-mode"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isTestingMode ? 'Exit Testing' : 'Test Mode'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              data-testid="button-close-designer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {isTestingMode ? (
            <ButtonTestingMode />
          ) : (
            <>
              {/* Left Sidebar - Design List */}
              <div className="w-80 border-r border-gray-200 flex flex-col">
                <ButtonDesignList />
              </div>

              {/* Main Content Area */}
              {currentDesignId ? (
                <div className="flex-1 flex">
                  {/* State Editor */}
                  <div className="flex-1 flex flex-col">
                    <ButtonStateEditor />
                  </div>

                  {/* Right Panel - Preview */}
                  <div className="w-80 border-l border-gray-200">
                    <ButtonPreview />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <TestTube className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Button Selected</h3>
                    <p className="text-gray-500 mb-4">
                      Create a new button design or select an existing one to start editing
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ButtonDesigner;