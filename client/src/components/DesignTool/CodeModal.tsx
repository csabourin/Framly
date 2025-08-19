import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setCodeModalOpen } from '../../store/uiSlice';
import { CodeGenerator } from '../../utils/codeGenerator';
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
  const { project } = useSelector((state: RootState) => state.canvas);
  const { isCodeModalOpen } = useSelector((state: RootState) => state.ui);
  
  const [activeTab, setActiveTab] = useState('html');

  const generatedCode = useMemo(() => {
    const generator = new CodeGenerator(project);
    return generator.exportProject();
  }, [project]);

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
    const filename = activeTab === 'html' ? 'index.html' : 
                    activeTab === 'css' ? 'styles.css' : 
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
      .replace(/\/\*(.*?)\*\//gs, '<span class="text-gray-500">/*$1*/</span>')
      .replace(/\/\/(.*?)$/gm, '<span class="text-gray-500">//$1</span>');
  };

  return (
    <Dialog open={isCodeModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col" data-testid="code-modal">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Generated Code</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-1"
              data-testid="button-close-code"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-4" data-testid="code-tabs">
              <TabsTrigger value="html" data-testid="tab-html">HTML</TabsTrigger>
              <TabsTrigger value="css" data-testid="tab-css">CSS</TabsTrigger>
              <TabsTrigger value="react" data-testid="tab-react">React</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="html" className="h-full">
                <div 
                  className="bg-gray-900 text-gray-100 p-4 rounded-lg h-full overflow-auto font-mono text-sm"
                  data-testid="code-content-html"
                >
                  <pre className="whitespace-pre-wrap">{generatedCode.html}</pre>
                </div>
              </TabsContent>
              
              <TabsContent value="css" className="h-full">
                <div 
                  className="bg-gray-900 text-gray-100 p-4 rounded-lg h-full overflow-auto font-mono text-sm"
                  data-testid="code-content-css"
                >
                  <pre className="whitespace-pre-wrap">{generatedCode.css}</pre>
                </div>
              </TabsContent>
              
              <TabsContent value="react" className="h-full">
                <div 
                  className="bg-gray-900 text-gray-100 p-4 rounded-lg h-full overflow-auto font-mono text-sm"
                  data-testid="code-content-react"
                >
                  <pre className="whitespace-pre-wrap">{generatedCode.react}</pre>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-4 flex-shrink-0" data-testid="code-actions">
          <Button
            variant="outline"
            onClick={handleCopyCode}
            className="flex-1"
            data-testid="button-copy-code"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Code
          </Button>
          <Button
            onClick={handleDownloadCode}
            className="flex-1 bg-primary text-white hover:bg-blue-600"
            data-testid="button-download-code"
          >
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodeModal;
