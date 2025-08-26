import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, ExternalLink, X, Image } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { updateElement } from '@/store/canvasSlice';
import { indexedDBManager } from '@/utils/indexedDB';
import { AppDispatch } from '@/store';
import { nanoid } from 'nanoid';
import type { SavedImage } from '@/utils/indexedDB';

interface ImageUploadProps {
  elementId: string;
  currentImageUrl?: string;
  currentImageBase64?: string;
  currentImageAlt?: string;
  onImageChange?: (updates: { imageUrl?: string; imageBase64?: string; imageAlt?: string }) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const ImageUpload: React.FC<ImageUploadProps> = ({
  elementId,
  currentImageUrl,
  currentImageBase64,
  currentImageAlt,
  onImageChange
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState(currentImageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const currentSource = currentImageBase64 || currentImageUrl;

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size must be less than 2MB.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        try {
          // Save to IndexedDB
          const imageId = nanoid();
          const savedImage: SavedImage = {
            id: imageId,
            filename: file.name,
            data: base64Data,
            mimeType: file.type,
            size: file.size,
            createdAt: new Date().toISOString()
          };

          await indexedDBManager.saveImage(savedImage);

          // Update element
          const updates = {
            imageBase64: base64Data,
            imageUrl: undefined, // Clear URL when uploading file
            imageAlt: currentImageAlt || file.name.replace(/\.[^/.]+$/, '') // Default alt from filename
          };
          dispatch(updateElement({
            id: elementId,
            updates
          }));

          if (onImageChange) {
            onImageChange(updates);
          }

        } catch (error) {
          setUploadError(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setUploadError('Failed to read file. Please try again.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setUploadError('Please enter a valid URL.');
      return;
    }

    try {
      new URL(urlInput); // Validate URL
    } catch {
      setUploadError('Please enter a valid URL.');
      return;
    }

    const updates = {
      imageUrl: urlInput.trim(),
      imageBase64: undefined, // Clear base64 when using URL
      imageAlt: currentImageAlt || 'Image from URL'
    };

    dispatch(updateElement({
      id: elementId,
      updates
    }));

    if (onImageChange) {
      onImageChange(updates);
    }

    setUploadError('');
  };

  const handleRemoveImage = () => {
    const updates = {
      imageUrl: undefined,
      imageBase64: undefined,
      imageAlt: undefined
    };

    dispatch(updateElement({
      id: elementId,
      updates
    }));

    if (onImageChange) {
      onImageChange(updates);
    }

    setUrlInput('');
    setUploadError('');
  };

  return (
    <div className="space-y-3">
      {currentSource && (
        <div className="relative border rounded p-2 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600 font-medium">Current Image:</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemoveImage}
              className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
              data-testid="button-remove-image"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-gray-200 rounded border overflow-hidden flex-shrink-0">
              <img 
                src={currentSource} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 truncate">
                {currentImageBase64 ? 'Uploaded Image' : currentImageUrl}
              </p>
              {currentImageAlt && (
                <p className="text-xs text-gray-500 truncate">Alt: {currentImageAlt}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
          <TabsTrigger value="url" className="text-xs">URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-2">
          <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
              data-testid="input-file-upload"
            />
            
            <div className="space-y-2">
              <Image className="h-8 w-8 mx-auto text-gray-400" />
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs"
                  data-testid="button-select-file"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {isUploading ? 'Uploading...' : 'Select Image'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Max 2MB • PNG, JPG, GIF, WebP
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <div className="flex space-x-2">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="text-xs"
              data-testid="input-image-url"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUrlSubmit}
              className="px-3 text-xs"
              data-testid="button-add-url"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Enter a direct link to an image
          </p>
        </TabsContent>
      </Tabs>

      {uploadError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {uploadError}
        </div>
      )}
    </div>
  );
};