import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectCanvasProject, selectCustomClasses, selectUIState } from '../../store/selectors';
import { setCodeModalOpen } from '../../store/uiSlice';
import { selectCurrentElements } from '../../store/selectors';
import { CodeGenerator } from '../../utils/codeGenerator';
import { useExpandedElements } from '../../hooks/useExpandedElements';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, X } from 'lucide-react';

const CodeModal: React.FC = () => {
  const dispatch = useDispatch();
  const project = useSelector(selectCanvasProject);
  const rawElements = useSelector(selectCurrentElements);
  const customClasses = useSelector(selectCustomClasses);
  const { isCodeModalOpen } = useSelector(selectUIState);
  
  // CRITICAL: Use expanded elements for proper component instance code generation
  const currentElements = useExpandedElements(rawElements);
  
  const [activeTab, setActiveTab] = useState('html');

  const generatedCode = useMemo(() => {
    // Only generate code if we have valid data
    if (!currentElements || Object.keys(currentElements).length === 0) {
      return {
        html: '<!-- No elements to generate -->',
        css: '/* No styles to generate */',
        react: '// No components to generate'
      };
    }
    
    try {
      // CRITICAL: Pass expanded elements to CodeGenerator for proper component instance code generation
      const projectForGeneration = {
        ...project,
        elements: rawElements // Use raw elements for project structure
      };
      const generator = new CodeGenerator(projectForGeneration, customClasses, currentElements);
      return generator.exportProject();
    } catch (error) {
      console.error('Error generating code:', error);
      return {
        html: '<!-- Error generating HTML -->',
        css: '/* Error generating CSS */',
        react: '// Error generating React component'
      };
    }
  }, [project, rawElements, currentElements, customClasses]);

  const handleClose = () => {
    dispatch(setCodeModalOpen(false));
  };

  const handleCopyCode = () => {
    const code = activeTab === 'html' ? generatedCode.html : 
                activeTab === 'css' ? generatedCode.css : 
                generatedCode.react;
    
    navigator.clipboard.writeText(code).then(() => {
      // Could show toast notification here
      console.log('Code copied to clipboard');
    });
  };

  const handleDownloadCode = () => {
    // Use project name for CSS filename (same as HTML link)
    const cssFilename = project.name ? `${project.name.replace(/\s+/g, '-').toLowerCase()}.css` : 'styles.css';
    
    const filename = activeTab === 'html' ? 'index.html' : 
                    activeTab === 'css' ? cssFilename : 
                    'Component.jsx';
    
    const code = activeTab === 'html' ? generatedCode.html : 
                activeTab === 'css' ? generatedCode.css : 
                generatedCode.react;
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCode = (code: string, language: string) => {
    // Basic syntax highlighting with classes
    return code
      .replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span class="text-blue-400">$1</span>')
      .replace(/(class|id|src|href)=/g, '<span class="text-green-400">$1</span>=')
      .replace(/"([^"]*)"/g, '<span class="text-yellow-400">"$1"</span>')
      .replace(/\/\*(.*?)\*\//g, '<span class="text-gray-500">/*$1*/</span>')
      .replace(/\/\/(.*?)$/gm, '<span class="text-gray-500">//$1</span>');
  };

  return (
    <Dialog open={isCodeModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col bg-white/95 backdrop-blur-md border-gray-200/60 shadow-2xl rounded-2xl" data-testid="code-modal">
        <DialogHeader className="flex-shrink-0 pb-6 border-b border-gray-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Copy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900">Generated Code</DialogTitle>
              <p className="text-gray-600 text-sm mt-1">Preview and export your design as code</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              data-testid="button-close-code"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-xl shadow-inner h-12" data-testid="code-tabs">
              <TabsTrigger 
                value="html" 
                data-testid="tab-html"
                className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200"
              >
                HTML
              </TabsTrigger>
              <TabsTrigger 
                value="css" 
                data-testid="tab-css"
                className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200"
              >
                CSS
              </TabsTrigger>
              <TabsTrigger 
                value="react" 
                data-testid="tab-react"
                className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200"
              >
                React
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="html" className="h-full">
                <div 
                  className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 rounded-2xl h-full overflow-auto font-mono text-sm shadow-2xl border border-gray-700/50"
                  data-testid="code-content-html"
                >
                  <pre className="whitespace-pre-wrap leading-relaxed">{generatedCode.html}</pre>
                </div>
              </TabsContent>
              
              <TabsContent value="css" className="h-full">
                <div 
                  className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 rounded-2xl h-full overflow-auto font-mono text-sm shadow-2xl border border-gray-700/50"
                  data-testid="code-content-css"
                >
                  <pre className="whitespace-pre-wrap leading-relaxed">{generatedCode.css}</pre>
                </div>
              </TabsContent>
              
              <TabsContent value="react" className="h-full">
                <div 
                  className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 rounded-2xl h-full overflow-auto font-mono text-sm shadow-2xl border border-gray-700/50"
                  data-testid="code-content-react"
                >
                  <pre className="whitespace-pre-wrap leading-relaxed">{generatedCode.react}</pre>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-200/60 flex-shrink-0" data-testid="code-actions">
          <Button
            variant="outline"
            onClick={handleCopyCode}
            className="flex-1 h-12 rounded-xl border-gray-300 hover:bg-gray-100 transition-all duration-200 font-semibold"
            data-testid="button-copy-code"
          >
            <Copy className="w-5 h-5 mr-2" />
            Copy Code
          </Button>
          <Button
            onClick={handleDownloadCode}
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            data-testid="button-download-code"
          >
            <Download className="w-5 h-5 mr-2" />
            Download File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodeModal;
