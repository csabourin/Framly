import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectCanvasProject, selectCustomClasses, selectExportModalState, selectCurrentElements } from '../../store/selectors';
import { setExportModalOpen } from '../../store/uiSlice';
import { CodeGenerator } from '../../utils/codeGenerator';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Code, Image, FileText, Download, X } from 'lucide-react';

const ExportModal: React.FC = () => {
  const dispatch = useDispatch();
  const project = useSelector(selectCanvasProject);
  const rawElements = useSelector(selectCurrentElements);
  const customClasses = useSelector(selectCustomClasses);
  const { isExportModalOpen } = useSelector(selectExportModalState);
  
  // CRITICAL: Use expanded elements for proper component instance code generation
  const currentElements = useExpandedElements(rawElements);
  
  const [exportSettings, setExportSettings] = useState({
    includeResponsive: true,
    minifyCSS: true,
    includeComments: false,
  });

  const [selectedFormat, setSelectedFormat] = useState<'html' | 'png' | 'pdf'>('html');

  const handleClose = () => {
    dispatch(setExportModalOpen(false));
  };

  const handleExport = () => {
    // CRITICAL: Pass expanded elements to CodeGenerator for proper component instance export
    const projectForGeneration = {
      ...project,
      elements: rawElements // Use raw elements for project structure
    };
    const generator = new CodeGenerator(projectForGeneration, customClasses, currentElements);
    const { html, css, react } = generator.exportProject();
    
    switch (selectedFormat) {
      case 'html':
        // Create ZIP file with HTML/CSS
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const cssBlob = new Blob([css], { type: 'text/css' });
        
        // For demo purposes, download HTML file
        const htmlUrl = URL.createObjectURL(htmlBlob);
        const htmlLink = document.createElement('a');
        htmlLink.href = htmlUrl;
        htmlLink.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.html`;
        htmlLink.click();
        
        // Download CSS file with project name
        const cssUrl = URL.createObjectURL(cssBlob);
        const cssLink = document.createElement('a');
        cssLink.href = cssUrl;
        cssLink.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.css`;
        cssLink.click();
        
        URL.revokeObjectURL(htmlUrl);
        URL.revokeObjectURL(cssUrl);
        break;
        
      case 'png':
        // PNG export would require html-to-image library
        console.log('PNG export not implemented yet');
        break;
        
      case 'pdf':
        // PDF export would require jsPDF library
        console.log('PDF export not implemented yet');
        break;
    }
    
    handleClose();
  };

  const exportOptions = [
    {
      id: 'html',
      icon: Code,
      title: 'HTML/CSS Package',
      description: 'Production-ready code files',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'png',
      icon: Image,
      title: 'PNG Image',
      description: 'Static image export',
      color: 'bg-green-50 text-green-600',
    },
    {
      id: 'pdf',
      icon: FileText,
      title: 'PDF Document',
      description: 'Printable layout',
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <Dialog open={isExportModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="export-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Export Project</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-1"
              data-testid="button-close-export"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            Choose your export format and settings
          </DialogDescription>
        </DialogHeader>
        
        {/* Export Options */}
        <div className="space-y-3 mb-6" data-testid="export-options">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedFormat === option.id;
            
            return (
              <div
                key={option.id}
                onClick={() => setSelectedFormat(option.id as any)}
                className={`
                  p-4 border rounded-lg cursor-pointer transition-colors
                  ${isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-primary'
                  }
                `}
                data-testid={`export-option-${option.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${option.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{option.title}</h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Export Settings */}
        {selectedFormat === 'html' && (
          <div className="mb-6" data-testid="export-settings">
            <h3 className="font-medium text-gray-900 mb-3">Export Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeResponsive"
                  checked={exportSettings.includeResponsive}
                  onCheckedChange={(checked) =>
                    setExportSettings(prev => ({ ...prev, includeResponsive: !!checked }))
                  }
                  data-testid="checkbox-responsive"
                />
                <Label htmlFor="includeResponsive" className="text-sm">
                  Include responsive breakpoints
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="minifyCSS"
                  checked={exportSettings.minifyCSS}
                  onCheckedChange={(checked) =>
                    setExportSettings(prev => ({ ...prev, minifyCSS: !!checked }))
                  }
                  data-testid="checkbox-minify"
                />
                <Label htmlFor="minifyCSS" className="text-sm">
                  Minify CSS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeComments"
                  checked={exportSettings.includeComments}
                  onCheckedChange={(checked) =>
                    setExportSettings(prev => ({ ...prev, includeComments: !!checked }))
                  }
                  data-testid="checkbox-comments"
                />
                <Label htmlFor="includeComments" className="text-sm">
                  Include source comments
                </Label>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3" data-testid="export-actions">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="flex-1 bg-primary text-white hover:bg-blue-600"
            data-testid="button-start-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
