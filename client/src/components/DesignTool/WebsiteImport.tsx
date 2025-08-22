import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Globe, AlertCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { addElement, updateElement } from '@/store/canvasSlice';
import { addCustomClass } from '@/store/classSlice';
import { indexedDBManager } from '@/utils/indexedDB';
import { nanoid } from 'nanoid';
import type { CanvasElement } from '@/types/canvas';

interface WebsiteImportProps {
  onImportComplete?: () => void;
}

export const WebsiteImport: React.FC<WebsiteImportProps> = ({ onImportComplete }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      new URL(url); // Validate URL
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      console.log('Starting website import for:', url);
      
      // Fetch the webpage content
      const response = await fetch('/api/import-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.statusText}`);
      }

      const { html, css, assets } = await response.json();
      console.log('Website content fetched successfully');
      console.log('HTML length:', html?.length || 0);
      console.log('CSS length:', css?.length || 0);
      console.log('Assets count:', assets?.length || 0);

      try {
        // Parse HTML and convert to canvas elements
        console.log('Parsing HTML content...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract and process all CSS
        console.log('Processing CSS...');
        await processCSS(css);
        
        // Convert body content to canvas elements (comprehensive processing)
        console.log('Converting HTML to canvas elements...');
        const bodyElement = doc.body;
        if (bodyElement && bodyElement.children.length > 0) {
          // Process all meaningful elements - no arbitrary limits
          const elementsToProcess = Array.from(bodyElement.children);
          console.log(`Processing ${elementsToProcess.length} top-level elements from body`);
          
          for (let i = 0; i < elementsToProcess.length; i++) {
            const child = elementsToProcess[i];
            try {
              console.log(`Processing element ${i + 1}/${elementsToProcess.length}: ${child.tagName}`);
              console.log('Element classes:', Array.from(child.classList || []));
              console.log('Element content preview:', child.textContent?.substring(0, 100));
              
              // Skip script and style tags, but process everything else
              if (['script', 'style', 'meta', 'link', 'title'].includes(child.tagName.toLowerCase())) {
                console.log('Skipping non-visual element:', child.tagName);
                continue;
              }
              
              await convertHTMLToElements(child, 'root');
              console.log(`Successfully processed: ${child.tagName}`);
              
            } catch (elementError) {
              console.error('Failed to convert element:', child.tagName, elementError);
              // Continue with other elements
            }
          }
        } else {
          console.log('No body element or children found - creating fallback element');
          
          // Create a fallback element if no body content
          const fallbackElement: CanvasElement = {
            id: nanoid(),
            type: 'text',
            x: 50,
            y: 50,
            width: 300,
            height: 100,
            styles: { fontSize: '16px', color: '#333333' },
            classes: [],
            content: 'Website imported successfully (no visible content found)',
            htmlTag: 'div'
          };
          
          dispatch(addElement({ element: fallbackElement, parentId: 'root' }));
        }

        // Process assets (images)
        console.log('Processing assets...');
        await processAssets(assets);
        
      } catch (conversionError) {
        console.error('HTML conversion failed:', conversionError);
        throw new Error(`Failed to convert HTML: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
      }

      setIsOpen(false);
      if (onImportComplete) {
        onImportComplete();
      }

      console.log('Website import completed successfully');

    } catch (error) {
      console.error('Import failed:', error);
      setError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const processCSS = async (css: string) => {
    console.log('Processing CSS styles for custom classes with scoping');
    console.log('CSS input length:', css?.length || 0);
    
    if (!css || css.trim().length === 0) {
      console.log('⚠️ No CSS content to process - CSS extraction may have failed');
      return;
    }

    try {
      // Create a unique scope for this import to prevent CSS conflicts
      const importScope = `imported-${nanoid(8)}`;
      console.log(`Creating CSS scope: ${importScope}`);
      
      // Enhanced CSS parsing to extract all rules including element selectors
      const rules: Array<{ selector: string; styles: Record<string, string>; scopedSelector: string }> = [];
      
      // Parse CSS rules - handle both class and element selectors
      const ruleRegex = /([^{}]+)\s*\{([^}]+)\}/g;
      let match;
      
      while ((match = ruleRegex.exec(css)) !== null) {
        const originalSelector = match[1].trim();
        const styleBlock = match[2];
        
        // Skip @rules, comments, and complex selectors for now
        if (originalSelector.startsWith('@') || originalSelector.includes('/*')) {
          continue;
        }
        
        // Create scoped selector to prevent conflicts with app styles
        const scopedSelector = originalSelector
          .split(',')
          .map(sel => {
            const trimmed = sel.trim();
            // Add scope prefix to prevent conflicts
            if (trimmed.startsWith('.')) {
              return `.${importScope} ${trimmed}`;
            } else if (trimmed.match(/^[a-zA-Z]/)) {
              // Element selector
              return `.${importScope} ${trimmed}`;
            } else {
              return `.${importScope} ${trimmed}`;
            }
          })
          .join(', ');
        
        // Parse CSS properties
        const styleObj: Record<string, string> = {};
        const propertyRegex = /([^:;]+):\s*([^;]+)/g;
        let propMatch;
        
        while ((propMatch = propertyRegex.exec(styleBlock)) !== null) {
          const property = propMatch[1].trim();
          const value = propMatch[2].trim();
          
          // Keep CSS property names as-is for proper CSS output
          styleObj[property] = value;
        }

        if (Object.keys(styleObj).length > 0) {
          rules.push({ 
            selector: originalSelector, 
            styles: styleObj,
            scopedSelector 
          });
        }
      }

      console.log(`Extracted ${rules.length} CSS rules for scoped import`);

      // Create scoped CSS classes for the custom class system
      const scopedClasses: Record<string, any> = {};
      
      for (const rule of rules) {
        let className: string;
        
        if (rule.selector.startsWith('.')) {
          // Class selector - prefix with scope
          className = `${importScope}-${rule.selector.substring(1)}`;
        } else {
          // Element selector - create a scoped class name
          className = `${importScope}-${rule.selector.replace(/[^a-zA-Z0-9]/g, '-')}`;
        }

        // Convert CSS properties to React-compatible camelCase for custom classes
        const reactStyles: Record<string, string> = {};
        Object.entries(rule.styles).forEach(([prop, value]) => {
          const camelProperty = prop.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
          reactStyles[camelProperty] = value;
        });

        // Create the custom class in the style editor
        dispatch(addCustomClass({
          name: className,
          styles: reactStyles,
          description: `Scoped import from ${rule.selector}`,
          category: 'imported'
        }));
        
        scopedClasses[className] = reactStyles;
        console.log(`✓ Added scoped class "${className}"`);
      }

      // Create the scoped CSS stylesheet and inject it into the page
      const scopedCSS = rules.map(rule => {
        const styleString = Object.entries(rule.styles)
          .map(([prop, value]) => `  ${prop}: ${value};`)
          .join('\n');
        
        return `${rule.scopedSelector} {\n${styleString}\n}`;
      }).join('\n\n');

      // Inject scoped CSS into the page
      if (scopedCSS.trim()) {
        const styleElement = document.createElement('style');
        styleElement.id = `imported-styles-${importScope}`;
        styleElement.textContent = scopedCSS;
        document.head.appendChild(styleElement);
        
        console.log(`✓ Injected ${scopedCSS.length} characters of scoped CSS`);
        console.log('Scoped CSS preview:', scopedCSS.substring(0, 500) + '...');
      }

      // Store the scope for applying to imported elements
      (window as any).lastImportScope = importScope;
      
    } catch (error) {
      console.error('Failed to process CSS:', error);
    }
  };

  const processAssets = async (assets: Array<{ url: string; data: string; filename: string }>) => {
    console.log('Processing assets:', assets.length);
    
    for (const asset of assets) {
      try {
        // Save images to IndexedDB
        const savedImage = {
          id: nanoid(),
          filename: asset.filename,
          data: asset.data, // Already base64
          mimeType: getMimeType(asset.filename),
          size: Math.round(asset.data.length * 0.75), // Approximate size from base64
          createdAt: new Date().toISOString()
        };

        await indexedDBManager.saveImage(savedImage);
        console.log('Saved asset:', asset.filename);
      } catch (error) {
        console.warn('Failed to save asset:', asset.filename, error);
      }
    }
  };

  const convertHTMLToElements = async (htmlElement: Element, parentId: string): Promise<void> => {
    try {
      const elementId = nanoid();
      
      // Determine element type based on HTML tag
      let elementType: CanvasElement['type'] = 'container'; // Default fallback
      let elementData: Partial<CanvasElement> = {};

      const textContent = htmlElement.textContent?.trim() || '';
      console.log(`Element ${htmlElement.tagName} text content: "${textContent.substring(0, 50)}"`);

      switch (htmlElement.tagName.toLowerCase()) {
        case 'img':
          elementType = 'image';
          const imgSrc = (htmlElement as HTMLImageElement).src;
          const imgAlt = (htmlElement as HTMLImageElement).alt;
          elementData = {
            imageUrl: imgSrc,
            imageAlt: imgAlt || 'Imported image',
            objectFit: 'contain'
          };
          break;
          
        case 'p':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
        case 'span':
        case 'a':
          elementType = 'text';
          elementData = {
            content: textContent || `${htmlElement.tagName} text`
          };
          break;
          
        case 'button':
          elementType = 'button';
          elementData = {
            content: textContent || 'Button'
          };
          break;
          
        case 'nav':
        case 'header':
        case 'main':
        case 'footer':
        case 'aside':
        case 'section':
        case 'article':
        case 'div':
        case 'ul':
        case 'ol':
        case 'li':
        case 'form':
        case 'fieldset':
        case 'details':
        case 'summary':
        case 'table':
        case 'thead':
        case 'tbody':
        case 'tr':
        case 'td':
        case 'th':
        default:
          // For semantic and container elements, process their children to extract content
          elementType = 'container';
          elementData = {
            isContainer: true,
            children: []
          };
          break;
      }

      // Extract classes (safely) and ensure they're preserved
      const originalClasses = htmlElement.classList ? Array.from(htmlElement.classList) : [];
      
      // Map Bootstrap and common classes to meaningful names if they exist
      const preservedClasses = originalClasses.filter(cls => 
        // Keep meaningful classes, skip utility classes that might conflict
        !cls.match(/^(mb-|mt-|ml-|mr-|p-|m-|d-|text-|bg-)\d+$/) &&
        cls.length > 1
      );
      
      // Extract inline styles and convert to CSS properties (safely)
      const inlineStyles: Record<string, string> = {};
      const styleAttr = htmlElement.getAttribute('style');
      if (styleAttr) {
        try {
          const propertyRegex = /([^:;]+):\s*([^;]+)/g;
          let match;
          
          while ((match = propertyRegex.exec(styleAttr)) !== null) {
            const property = match[1]?.trim();
            const value = match[2]?.trim();
            if (property && value) {
              inlineStyles[property] = value;
            }
          }
        } catch (styleError) {
          console.warn('Failed to parse inline styles:', styleError);
        }
      }

      // Calculate better dimensions based on content and element type
      let width = 200;
      let height = 50;
      
      if (elementType === 'text') {
        const textLength = (elementData.content as string)?.length || 0;
        width = Math.min(Math.max(textLength * 6, 120), 500);
        height = Math.max(Math.ceil(textLength / 50) * 20, 30);
      } else if (elementType === 'container') {
        // Make containers larger to accommodate content
        width = 600;
        height = 200;
        
        // Special sizing for semantic elements
        const tag = htmlElement.tagName.toLowerCase();
        if (tag === 'nav') {
          width = 800;
          height = 60;
        } else if (tag === 'header') {
          width = 800;
          height = 150;
        } else if (tag === 'footer') {
          width = 800;
          height = 100;
        } else if (tag === 'main') {
          width = 800;
          height = 400;
        }
      } else if (elementType === 'image') {
        width = 200;
        height = 150;
      }

      // Apply CSS scope to prevent conflicts with app styles
      const importScope = (window as any).lastImportScope;
      const scopedClasses = preservedClasses.map(cls => 
        importScope ? `${importScope}-${cls}` : cls
      );
      
      // Add the import scope class to the root container
      if (parentId === 'root' && importScope) {
        scopedClasses.unshift(importScope);
      }

      // Create canvas element with all required properties for proper rendering
      const canvasElement: CanvasElement = {
        id: elementId,
        type: elementType,
        x: 0, // Use consistent positioning
        y: 0,
        width,
        height,
        styles: {
          // Ensure basic styles for canvas rendering
          display: elementType === 'container' ? 'flex' : 'block',
          position: 'relative',
          ...inlineStyles
        },
        classes: scopedClasses || [],
        htmlTag: htmlElement.tagName.toLowerCase(),
        parent: parentId, // Ensure parent is set
        ...elementData
      };

      // Ensure container elements have proper flex properties
      if (elementType === 'container') {
        canvasElement.isContainer = true;
        canvasElement.flexDirection = 'column';
        canvasElement.justifyContent = 'flex-start';
        canvasElement.alignItems = 'stretch';
        canvasElement.children = [];
      }

      // Add element to canvas
      dispatch(addElement({ element: canvasElement, parentId }));

      console.log(`Created element: ${elementType} (${htmlElement.tagName}) - "${(elementData.content as string)?.substring(0, 50) || 'container'}" with scoped classes: [${scopedClasses.join(', ')}]`);

      // Process children recursively if it's a container
      if (elementType === 'container' && htmlElement.children && htmlElement.children.length > 0) {
        console.log(`Processing ${htmlElement.children.length} children of ${htmlElement.tagName}`);
        
        // Process all children - no artificial limits, but be smart about it
        const childrenToProcess = Array.from(htmlElement.children);
        let processedCount = 0;
        
        for (const child of childrenToProcess) {
          try {
            // Skip empty text nodes and non-visual elements
            if (child.tagName && !['script', 'style', 'meta', 'link'].includes(child.tagName.toLowerCase())) {
              await convertHTMLToElements(child, elementId);
              processedCount++;
              
              // If this is getting too deep, break to prevent infinite recursion
              if (processedCount > 50) {
                console.log(`Stopping child processing at ${processedCount} elements to prevent overflow`);
                break;
              }
            }
          } catch (childError) {
            console.warn('Failed to process child element:', child.tagName, childError);
          }
        }
        
        console.log(`Successfully processed ${processedCount} children of ${htmlElement.tagName}`);
      }

    } catch (elementError) {
      console.error('Failed to convert element:', htmlElement.tagName, elementError);
      throw elementError;
    }
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-import-website">
          <Globe className="w-4 h-4 mr-2" />
          Import Website
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Import Website
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="input-website-url"
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Imports HTML structure and CSS styles</p>
            <p>• Downloads and stores images locally</p>
            <p>• Preserves original layout and styling</p>
            <p>• Creates editable canvas elements</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !url.trim()}
              className="flex-1"
              data-testid="button-start-import"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteImport;