import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setCSSOptimizationModalOpen } from '../../store/uiSlice';
import { CSSOptimizer } from '../../utils/cssOptimizer';
import { cssClassGenerator } from '../../utils/cssClassGenerator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
import { 
  Copy, 
  Download, 
  X, 
  Zap, 
  Layers, 
  Package, 
  Target,
  TrendingUp,
  Code,
  FileText 
} from 'lucide-react';

const CSSOptimizationModal: React.FC = () => {
  const dispatch = useDispatch();
  const { project } = useSelector((state: RootState) => state.canvas);
  const { isCSSOptimizationModalOpen } = useSelector((state: RootState) => state.ui);
  
  const [activeTab, setActiveTab] = useState('overview');

  const optimizationData = useMemo(() => {
    const optimizer = new CSSOptimizer();
    const optimizedCSS = optimizer.optimizeCSS(project.elements);
    const optimizedOutput = optimizer.generateOptimizedCSS(optimizedCSS);
    
    // Calculate optimization metrics
    const totalElements = Object.keys(project.elements).length;
    const elementsWithStyles = Object.values(project.elements).filter(el => 
      el.styles && Object.keys(el.styles).length > 0
    ).length;
    
    const totalStyleProperties = Object.values(project.elements).reduce((acc, el) => 
      acc + (el.styles ? Object.keys(el.styles).length : 0), 0
    );
    
    const utilityClassesSaved = optimizedCSS.utilities.reduce((acc, util) => 
      acc + util.elementIds.length, 0
    );
    
    const componentClassesSaved = optimizedCSS.components.reduce((acc, comp) => 
      acc + comp.elementIds.length, 0
    );
    
    // Estimate size reduction
    const originalEstimatedSize = totalStyleProperties * 25; // ~25 chars per property
    const optimizedEstimatedSize = optimizedOutput.length;
    const sizeSaving = Math.max(0, Math.round(((originalEstimatedSize - optimizedEstimatedSize) / originalEstimatedSize) * 100));
    
    return {
      optimizedCSS,
      optimizedOutput,
      metrics: {
        totalElements,
        elementsWithStyles,
        totalStyleProperties,
        utilityClasses: optimizedCSS.utilities.length,
        componentClasses: optimizedCSS.components.length,
        layoutClasses: optimizedCSS.layout.length,
        criticalCSS: optimizedCSS.critical.length,
        utilityClassesSaved,
        componentClassesSaved,
        sizeSaving,
        originalSize: originalEstimatedSize,
        optimizedSize: optimizedEstimatedSize
      }
    };
  }, [project.elements]);

  const handleClose = () => {
    dispatch(setCSSOptimizationModalOpen(false));
  };

  const handleCopyCSS = () => {
    navigator.clipboard.writeText(optimizationData.optimizedOutput).then(() => {
      console.log('Optimized CSS copied to clipboard');
    });
  };

  const handleDownloadCSS = () => {
    const blob = new Blob([optimizationData.optimizedOutput], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'optimized-styles.css';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeElement = (elementId: string) => {
    const element = project.elements[elementId];
    if (element) {
      return cssClassGenerator.analyzeElementForOptimization(element);
    }
    return null;
  };

  if (!isCSSOptimizationModalOpen) return null;

  return (
    <Dialog open={isCSSOptimizationModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            CSS Optimization Analysis
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="utilities">Utilities</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="output">CSS Output</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4 space-y-4 overflow-y-auto max-h-96">
            <div className="grid grid-cols-2 gap-4">
              {/* Metrics Cards */}
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Size Optimization</h3>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {optimizationData.metrics.sizeSaving}%
                </div>
                <div className="text-sm text-blue-600">
                  {optimizationData.metrics.originalSize - optimizationData.metrics.optimizedSize} bytes saved
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${optimizationData.metrics.sizeSaving}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-green-600" />
                  <h3 className="font-medium text-green-900">Reusable Classes</h3>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {optimizationData.metrics.utilityClasses + optimizationData.metrics.componentClasses}
                </div>
                <div className="text-sm text-green-600">
                  {optimizationData.metrics.utilityClassesSaved + optimizationData.metrics.componentClassesSaved} element instances optimized
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <h3 className="font-medium text-purple-900">Element Coverage</h3>
                </div>
                <div className="text-2xl font-bold text-purple-700">
                  {Math.round((optimizationData.metrics.elementsWithStyles / optimizationData.metrics.totalElements) * 100)}%
                </div>
                <div className="text-sm text-purple-600">
                  {optimizationData.metrics.elementsWithStyles} of {optimizationData.metrics.totalElements} elements styled
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-orange-600" />
                  <h3 className="font-medium text-orange-900">Critical CSS</h3>
                </div>
                <div className="text-2xl font-bold text-orange-700">
                  {optimizationData.metrics.criticalCSS}
                </div>
                <div className="text-sm text-orange-600">
                  Above-the-fold classes identified
                </div>
              </div>
            </div>
            
            {/* Optimization Benefits */}
            <div className="space-y-3">
              <h3 className="font-medium">Optimization Benefits</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    <strong>{optimizationData.metrics.utilityClasses}</strong> utility classes for common patterns
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">
                    <strong>{optimizationData.metrics.componentClasses}</strong> component classes for complex patterns
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">
                    <strong>{optimizationData.metrics.layoutClasses}</strong> layout classes for common structures
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">
                    CSS properties sorted for optimal rendering performance
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="utilities" className="mt-4 overflow-y-auto max-h-96">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Utility Classes</h3>
                <Badge variant="secondary">{optimizationData.metrics.utilityClasses} classes</Badge>
              </div>
              
              {optimizationData.optimizedCSS.utilities.map((utility, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {utility.selector}
                    </code>
                    <Badge variant="outline">
                      Used by {utility.elementIds.length} elements
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {Object.entries(utility.properties).map(([prop, value]) => (
                      <div key={prop} className="font-mono text-xs">
                        {prop}: {value};
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {optimizationData.optimizedCSS.utilities.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No utility classes found. Try adding more elements with similar styles.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="components" className="mt-4 overflow-y-auto max-h-96">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Component Classes</h3>
                <Badge variant="secondary">{optimizationData.metrics.componentClasses} classes</Badge>
              </div>
              
              {optimizationData.optimizedCSS.components.map((component, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {component.selector}
                    </code>
                    <Badge variant="outline">
                      Used by {component.elementIds.length} elements
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                    {Object.entries(component.properties).map(([prop, value]) => (
                      <div key={prop} className="font-mono text-xs">
                        {prop}: {value};
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {optimizationData.optimizedCSS.components.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No component classes found. Complex style patterns will create component classes automatically.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="output" className="mt-4 overflow-y-auto max-h-96">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Optimized CSS Output</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyCSS}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                  <Button
                    onClick={handleDownloadCSS}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-80">
                  <code>{optimizationData.optimizedOutput}</code>
                </pre>
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <div>✓ CSS properties ordered for optimal rendering</div>
                <div>✓ Duplicate styles eliminated through utility classes</div>
                <div>✓ CSS variables included for consistent theming</div>
                <div>✓ Modern CSS reset applied</div>
                <div>✓ Responsive breakpoints structured</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSSOptimizationModal;