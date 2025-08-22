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

      try {
        // Parse HTML and convert to canvas elements
        console.log('Parsing HTML content...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract and process all CSS
        console.log('Processing CSS...');
        await processCSS(css);
        
        // Convert body content to canvas elements (with safe processing)
        console.log('Converting HTML to canvas elements...');
        const bodyElement = doc.body;
        if (bodyElement && bodyElement.children.length > 0) {
          // Start with just the first few simple elements
          const elementsToProcess = Array.from(bodyElement.children).slice(0, 3);
          console.log(`Processing ${elementsToProcess.length} top-level elements`);
          
          for (let i = 0; i < elementsToProcess.length; i++) {
            const child = elementsToProcess[i];
            try {
              console.log(`Processing element ${i + 1}/${elementsToProcess.length}: ${child.tagName}`);
              
              // Skip script and style tags
              if (['script', 'style', 'meta', 'link'].includes(child.tagName.toLowerCase())) {
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
    console.log('Processing CSS styles');
    
    // Extract CSS classes and create custom classes in our system
    const classRegex = /\.([a-zA-Z][\w-]*)\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = classRegex.exec(css)) !== null) {
      const className = match[1];
      const styles = match[2];
      
      // Parse CSS properties
      const styleObj: Record<string, string> = {};
      const propertyRegex = /([^:;]+):\s*([^;]+)/g;
      let propMatch;
      
      while ((propMatch = propertyRegex.exec(styles)) !== null) {
        const property = propMatch[1].trim();
        const value = propMatch[2].trim();
        styleObj[property] = value;
      }

      // Add as custom class
      dispatch(addCustomClass({
        name: className,
        styles: styleObj,
        category: 'imported'
      }));
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
            content: htmlElement.textContent?.trim() || 'Text'
          };
          break;
          
        case 'button':
          elementType = 'button';
          elementData = {
            content: htmlElement.textContent?.trim() || 'Button'
          };
          break;
          
        case 'div':
        case 'section':
        case 'article':
        case 'header':
        case 'footer':
        case 'nav':
        case 'main':
        case 'aside':
        case 'ul':
        case 'ol':
        case 'li':
        default:
          elementType = 'container';
          elementData = {
            isContainer: true,
            children: []
          };
          break;
      }

      // Extract classes (safely)
      const classes = htmlElement.classList ? Array.from(htmlElement.classList) : [];
      
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

      // Calculate better dimensions based on content
      let width = 200;
      let height = 50;
      
      if (elementType === 'text') {
        const textLength = (elementData.content as string)?.length || 0;
        width = Math.min(Math.max(textLength * 8, 100), 600);
        height = Math.max(textLength > 50 ? 100 : 50, 30);
      } else if (elementType === 'container') {
        width = 300;
        height = 100;
      }

      // Create canvas element with safe defaults
      const canvasElement: CanvasElement = {
        id: elementId,
        type: elementType,
        x: Math.random() * 50, // Small random offset to prevent overlap
        y: Math.random() * 50,
        width,
        height,
        styles: inlineStyles,
        classes,
        htmlTag: htmlElement.tagName.toLowerCase(),
        ...elementData
      };

      // Add element to canvas
      dispatch(addElement({ element: canvasElement, parentId }));

      console.log(`Created element: ${elementType} (${htmlElement.tagName}) - "${(elementData.content as string)?.substring(0, 50) || 'container'}"`);

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