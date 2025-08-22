// Remove jsdom import for now and use simpler approach
// import { JSDOM } from 'jsdom';

export interface ImportedWebsite {
  html: string;
  css: string;
  assets: Array<{
    url: string;
    data: string; // base64
    filename: string;
  }>;
}

export class WebsiteImportService {
  async importWebsite(url: string): Promise<ImportedWebsite> {
    console.log('Importing website:', url);
    
    try {
      // Fetch the main HTML
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      // Simple HTML processing without JSDOM for now
      // We'll send the raw HTML to the client for processing
      return {
        html: html,
        css: '', // Extract CSS in client for now
        assets: [] // Process assets in client for now
      };



    } catch (error) {
      console.error('Website import failed:', error);
      throw new Error(`Failed to import website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const websiteImportService = new WebsiteImportService();