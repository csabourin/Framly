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
      console.log('🚀 STARTING WEBSITE IMPORT PROCESS');
      console.log('📍 Target URL:', url);
      console.log('⏱️ Start time:', new Date().toISOString());
      
      console.log('🌐 STEP 1: Fetching webpage content from server...');
      // Fetch the webpage content
      const response = await fetch('/api/import-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        console.error('❌ Server request failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch website: ${response.statusText}`);
      }

      const { html, css, rewrittenCSS, canvasId, assets } = await response.json();
      console.log('✅ STEP 1 COMPLETE: Website content fetched successfully');
      console.log('📄 HTML length:', html?.length || 0, 'characters');
      console.log('🎨 CSS length:', css?.length || 0, 'characters');
      console.log('🖼️ Assets count:', assets?.length || 0);
      
      if (!html || html.length === 0) {
        console.error('❌ No HTML content received from server');
        throw new Error('No HTML content received');
      }

      try {
        // Parse HTML and convert to canvas elements
        console.log('🔧 STEP 2: Parsing HTML content...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        if (!doc || !doc.body) {
          console.error('❌ Failed to parse HTML - no body element found');
          throw new Error('Invalid HTML structure');
        }
        console.log('✅ STEP 2 COMPLETE: HTML parsed successfully');
        
        console.log('🎨 STEP 3: Injecting server-rewritten CSS...');
        if (rewrittenCSS && canvasId) {
          // Remove any existing imported styles
          const existingStyle = document.getElementById(`imported-styles-${canvasId}`);
          if (existingStyle) {
            existingStyle.remove();
          }
          
          // Create and inject new styles
          const styleElement = document.createElement('style');
          styleElement.id = `imported-styles-${canvasId}`;
          styleElement.textContent = rewrittenCSS;
          document.head.appendChild(styleElement);
          
          // Store for canvas usage
          (window as any).lastImportScope = canvasId;
          (window as any).lastImportedCSS = rewrittenCSS;
          
          console.log(`✅ Injected ${rewrittenCSS.length} characters of scoped CSS`);
          console.log(`🆔 Canvas ID: ${canvasId}`);
        }
        
        // Convert body content to canvas elements (comprehensive processing)
        console.log('🏗️ STEP 4: Converting HTML to canvas elements...');
        const bodyElement = doc.body;
        if (bodyElement && bodyElement.children.length > 0) {
          // Process all meaningful elements - no arbitrary limits
          const elementsToProcess = Array.from(bodyElement.children);
          console.log(`🎯 Processing ${elementsToProcess.length} top-level elements from body`);
          
          let processedElements = 0;
          const startTime = Date.now();
          
          for (let i = 0; i < elementsToProcess.length; i++) {
            const child = elementsToProcess[i];
            try {
              console.log(`🔧 Processing element ${i + 1}/${elementsToProcess.length}: ${child.tagName}`);
              
              // Skip script and style tags, but process everything else
              if (['script', 'style', 'meta', 'link', 'title'].includes(child.tagName.toLowerCase())) {
                console.log(`⏭️ Skipping non-visual element: ${child.tagName}`);
                continue;
              }
              
              const elementClasses = Array.from(child.classList || []);
              console.log(`📋 Classes: [${elementClasses.slice(0, 3).join(', ')}${elementClasses.length > 3 ? '...' : ''}]`);
              
              await convertHTMLToElements(child, 'root');
              processedElements++;
              console.log(`✅ Processed: ${child.tagName} (${processedElements} total)`);
              
              // Add small delay to prevent UI blocking for large imports
              if (processedElements % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              
            } catch (elementError) {
              console.error(`❌ Failed to convert element ${child.tagName}:`, elementError);
              // Continue with other elements
            }
          }
          
          const processingTime = Date.now() - startTime;
          console.log(`✅ STEP 4 COMPLETE: Processed ${processedElements}/${elementsToProcess.length} elements in ${processingTime}ms`);
        } else {
          console.log('⚠️ No body element or children found - creating fallback element');
          
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

      console.log('🎉 IMPORT COMPLETE: Website successfully imported!');

    } catch (error) {
      console.error('❌ Website import failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to import website');
    } finally {
      setIsImporting(false);
      console.log('🔄 Import process finished');
    }
  };

  // Function to extract all CSS classes actually used in the HTML
  const extractUsedClasses = (doc: Document): Set<string> => {
    console.log('🔍 Scanning HTML for used CSS classes...');
    const usedClasses = new Set<string>();
    
    // Get all elements with class attributes
    const elementsWithClasses = doc.querySelectorAll('[class]');
    console.log(`📊 Found ${elementsWithClasses.length} elements with class attributes`);
    
    elementsWithClasses.forEach((element, index) => {
      const classList = element.getAttribute('class');
      if (classList) {
        // Split class string and add each class
        const classes = classList.split(/\s+/).filter(cls => cls.trim().length > 0);
        classes.forEach(cls => {
          usedClasses.add(cls.trim());
        });
        
        if (index < 10) { // Log first 10 for debugging
          console.log(`📋 Element ${index + 1}: ${element.tagName} classes: [${classes.join(', ')}]`);
        }
      }
    });
    
    console.log(`✅ Class extraction complete: ${usedClasses.size} unique classes found`);
    return usedClasses;
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
          
        case 'hr':
        case 'br':
        case 'input':
        case 'area':
        case 'base':
        case 'col':
        case 'embed':
        case 'link':
        case 'meta':
        case 'param':
        case 'source':
        case 'track':
        case 'wbr':
          // Handle void elements - they cannot have children or content
          elementType = 'element';
          elementData = {
            content: '', // Void elements have no content
            isContainer: false
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
          // For all other HTML elements, create a generic "element" type
          // This allows the browser to render any HTML element naturally
          elementType = 'element';
          elementData = {
            content: textContent || '',
            // Check if this element can contain other elements
            isContainer: htmlElement.children.length > 0 || 
                        ['div', 'span', 'section', 'article', 'nav', 'header', 'footer', 
                         'main', 'aside', 'form', 'fieldset', 'blockquote'].includes(htmlElement.tagName.toLowerCase()),
            children: []
          };
          
          // If it's a container, set up container properties
          if (elementData.isContainer) {
            elementData.flexDirection = 'column';
            elementData.justifyContent = 'flex-start';
            elementData.alignItems = 'stretch';
          }
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
      } else if (elementData.isContainer) {
        // Make containers larger to accommodate content
        width = 600;
        height = 200;
      } else if (elementType === 'element' && elementData.isContainer) {
        // For generic container elements
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

      // Keep original class names for scoped CSS targeting
      const importScope = (window as any).lastImportScope;
      const elementClasses = [...preservedClasses];
      
      // Mark this as an imported element for identification
      if (importScope) {
        elementClasses.push('_imported-element');
      }

      // Create canvas element with preserved CSS layout
      const canvasElement: CanvasElement = {
        id: elementId,
        type: elementType,
        x: 0, // Let CSS handle positioning
        y: 0, 
        width,
        height,
        styles: {
          // Preserve original layout system - don't override display unless necessary
          position: (inlineStyles.position as 'fixed' | 'absolute' | 'relative' | 'static') || (elementData.isContainer ? 'relative' : undefined),
          // Keep all inline styles to preserve layout
          ...inlineStyles,
          // Only set display if not already specified and element is a container
          ...(inlineStyles.display ? {} : elementData.isContainer ? { display: 'block' } : {})
        },
        classes: elementClasses || [],
        htmlTag: htmlElement.tagName.toLowerCase(),
        parent: parentId,
        ...elementData
      };

      // Ensure container elements have proper flex properties
      if (canvasElement.isContainer) {
        canvasElement.flexDirection = canvasElement.flexDirection || 'column';
        canvasElement.justifyContent = canvasElement.justifyContent || 'flex-start';
        canvasElement.alignItems = canvasElement.alignItems || 'stretch';
        canvasElement.children = canvasElement.children || [];
      }

      // Add element to canvas
      dispatch(addElement({ element: canvasElement, parentId }));

      console.log(`Created element: ${elementType} (${htmlElement.tagName}) - "${(elementData.content as string)?.substring(0, 50) || 'container'}" with classes: [${elementClasses.join(', ')}]`);

      // Process children recursively if it's a container
      if (canvasElement.isContainer && htmlElement.children && htmlElement.children.length > 0) {
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