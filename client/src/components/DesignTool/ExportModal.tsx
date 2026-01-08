import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        const activeTabId = project.activeTabId;
        const activeTab = project.tabs[activeTabId];
        const tabName = activeTab ? activeTab.name : 'index';
        const cssFileName = `${project.name.replace(/\s+/g, '-').toLowerCase()}.css`;
        const htmlFileName = `${tabName.replace(/\s+/g, '-').toLowerCase()}.html`;

        // Create ZIP file with HTML/CSS
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const cssBlob = new Blob([css], { type: 'text/css' });

        // For demo purposes, download HTML file
        const htmlUrl = URL.createObjectURL(htmlBlob);
        const htmlLink = document.createElement('a');
        htmlLink.href = htmlUrl;
        htmlLink.download = htmlFileName;
        htmlLink.click();

        // Download CSS file with project name
        const cssUrl = URL.createObjectURL(cssBlob);
        const cssLink = document.createElement('a');
        cssLink.href = cssUrl;
        cssLink.download = cssFileName;
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
      title: t('export.htmlCssPackage'),
      description: t('export.productionReady'),
      color: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'png',
      icon: Image,
      title: t('export.pngImage'),
      description: t('export.staticImageExport'),
      color: 'bg-green-50 text-green-600',
    },
    {
      id: 'pdf',
      icon: FileText,
      title: t('export.pdfDocument'),
      description: t('export.printableLayout'),
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <Dialog open={isExportModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200/60 dark:border-gray-700/60 shadow-2xl rounded-2xl" data-testid="export-modal">
        <DialogHeader className="pb-6 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('export.exportProject')}</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 mt-1">
                {t('export.chooseFormatSettings')}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
              data-testid="button-close-export"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Export Options */}
        <div className="space-y-4 my-8" data-testid="export-options">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-4">Choose Export Format</h3>
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedFormat === option.id;

            return (
              <div
                key={option.id}
                onClick={() => setSelectedFormat(option.id as any)}
                className={`
                  p-5 border rounded-2xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md
                  ${isSelected
                    ? 'border-blue-300 dark:border-blue-600 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 scale-[1.02]'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }
                `}
                data-testid={`export-option-${option.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isSelected ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : option.color
                    }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{option.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Export Settings */}
        {selectedFormat === 'html' && (
          <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border border-gray-200/60 dark:border-gray-700/60" data-testid="export-settings">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-lg">{t('export.exportSettings')}</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <Checkbox
                  id="includeResponsive"
                  checked={exportSettings.includeResponsive}
                  onCheckedChange={(checked) =>
                    setExportSettings(prev => ({ ...prev, includeResponsive: !!checked }))
                  }
                  data-testid="checkbox-responsive"
                  className="w-5 h-5"
                />
                <Label htmlFor="includeResponsive" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                  {t('export.includeResponsive')}
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <Checkbox
                  id="minifyCSS"
                  checked={exportSettings.minifyCSS}
                  onCheckedChange={(checked) =>
                    setExportSettings(prev => ({ ...prev, minifyCSS: !!checked }))
                  }
                  data-testid="checkbox-minify"
                  className="w-5 h-5"
                />
                <Label htmlFor="minifyCSS" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                  {t('export.minifyCSS')}
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <Checkbox
                  id="includeComments"
                  checked={exportSettings.includeComments}
                  onCheckedChange={(checked) =>
                    setExportSettings(prev => ({ ...prev, includeComments: !!checked }))
                  }
                  data-testid="checkbox-comments"
                  className="w-5 h-5"
                />
                <Label htmlFor="includeComments" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                  {t('export.includeComments')}
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60" data-testid="export-actions">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-12 rounded-xl border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 font-semibold"
            data-testid="button-cancel-export"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleExport}
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            data-testid="button-start-export"
          >
            <Download className="w-5 h-5 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
