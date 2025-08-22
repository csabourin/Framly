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

      // Parse HTML and convert to canvas elements
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract and process all CSS
      await processCSS(css);
      
      // Convert body content to canvas elements
      const bodyElement = doc.body;
      if (bodyElement) {
        await convertHTMLToElements(bodyElement, 'root');
      }

      // Process assets (images)
      await processAssets(assets);

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
    const children: string[] = [];

    for (const child of Array.from(htmlElement.children)) {
      const elementId = nanoid();
      
      // Determine element type based on HTML tag
      let elementType: CanvasElement['type'] = 'container'; // Default fallback
      let elementData: Partial<CanvasElement> = {};

      switch (child.tagName.toLowerCase()) {
        case 'img':
          elementType = 'image';
          const imgSrc = (child as HTMLImageElement).src;
          const imgAlt = (child as HTMLImageElement).alt;
          elementData = {
            imageUrl: imgSrc,
            imageAlt: imgAlt,
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
          elementType = 'text';
          elementData = {
            content: child.textContent || ''
          };
          break;
          
        case 'button':
          elementType = 'button';
          elementData = {
            content: child.textContent || 'Button'
          };
          break;
          
        case 'div':
        case 'section':
        case 'article':
        case 'header':
        case 'footer':
        case 'nav':
        default:
          elementType = 'container';
          elementData = {
            isContainer: true,
            children: []
          };
          break;
      }

      // Extract classes
      const classes = Array.from(child.classList);
      
      // Extract inline styles and convert to CSS properties
      const inlineStyles: Record<string, string> = {};
      if (child.getAttribute('style')) {
        const styleStr = child.getAttribute('style') || '';
        const propertyRegex = /([^:;]+):\s*([^;]+)/g;
        let match;
        
        while ((match = propertyRegex.exec(styleStr)) !== null) {
          const property = match[1].trim();
          const value = match[2].trim();
          inlineStyles[property] = value;
        }
      }

      // Create canvas element
      const canvasElement: CanvasElement = {
        id: elementId,
        type: elementType,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        styles: inlineStyles,
        classes,
        htmlTag: child.tagName.toLowerCase(),
        ...elementData
      };

      // Add element to canvas
      dispatch(addElement({ element: canvasElement, parentId }));
      children.push(elementId);

      // Recursively process children if it's a container
      if (elementType === 'container' && child.children.length > 0) {
        await convertHTMLToElements(child, elementId);
      }
    }

    // Update parent with children
    if (children.length > 0 && parentId !== 'root') {
      dispatch(updateElement({
        id: parentId,
        updates: { children }
      }));
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