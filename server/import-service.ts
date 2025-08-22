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
      
      // Extract CSS from HTML on server side
      console.log('Extracting CSS from HTML...');
      let combinedCSS = '';
      
      try {
        // Extract inline CSS from <style> tags using regex
        const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        let styleMatch;
        
        while ((styleMatch = styleTagRegex.exec(html)) !== null) {
          const cssContent = styleMatch[1];
          if (cssContent && cssContent.trim()) {
            combinedCSS += cssContent.trim() + '\n\n';
            console.log(`Extracted ${cssContent.length} characters from <style> tag`);
          }
        }
        
        // Extract external stylesheet URLs for future processing
        const linkTagRegex = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
        let linkMatch;
        const stylesheetUrls: string[] = [];
        
        while ((linkMatch = linkTagRegex.exec(html)) !== null) {
          const href = linkMatch[1];
          if (href && !href.startsWith('data:') && !href.startsWith('#')) {
            try {
              const stylesheetUrl = new URL(href, url).href;
              stylesheetUrls.push(stylesheetUrl);
            } catch (error) {
              console.warn('Invalid stylesheet URL:', href);
            }
          }
        }
        
        // Fetch external stylesheets (limit to first 3 for safety)
        for (const stylesheetUrl of stylesheetUrls.slice(0, 3)) {
          try {
            console.log('Fetching external stylesheet:', stylesheetUrl);
            const cssResponse = await fetch(stylesheetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (cssResponse.ok) {
              const cssContent = await cssResponse.text();
              if (cssContent && cssContent.trim()) {
                combinedCSS += `/* External stylesheet: ${stylesheetUrl} */\n`;
                combinedCSS += cssContent.trim() + '\n\n';
                console.log(`Extracted ${cssContent.length} characters from external stylesheet`);
              }
            }
          } catch (error) {
            console.warn('Failed to fetch stylesheet:', stylesheetUrl, error);
          }
        }
        
        console.log(`Total CSS extracted: ${combinedCSS.length} characters`);
        
      } catch (cssError) {
        console.error('CSS extraction failed:', cssError);
        // Continue without CSS if extraction fails
      }
      
      return {
        html: html,
        css: combinedCSS,
        assets: [] // Process assets in client for now
      };



    } catch (error) {
      console.error('Website import failed:', error);
      throw new Error(`Failed to import website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const websiteImportService = new WebsiteImportService();