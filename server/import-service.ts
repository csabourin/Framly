// Remove jsdom import for now and use simpler approach
// import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import { nanoid } from 'nanoid';

export interface ImportedWebsite {
  html: string;
  css: string;
  rewrittenCSS: string;
  canvasId: string;
  assets: Array<{
    url: string;
    data: string; // base64
    filename: string;
  }>;
}

export class WebsiteImportService {
  async importWebsite(url: string): Promise<ImportedWebsite> {
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
      let combinedCSS = '';
      
      try {
        // Extract inline CSS from <style> tags using regex
        const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        let styleMatch;
        
        while ((styleMatch = styleTagRegex.exec(html)) !== null) {
          const cssContent = styleMatch[1];
          if (cssContent && cssContent.trim()) {
            combinedCSS += cssContent.trim() + '\n\n';
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
              // Skip invalid stylesheet URLs
            }
          }
        }
        
        // Fetch external stylesheets (limit to first 3 for safety)
        for (const stylesheetUrl of stylesheetUrls.slice(0, 3)) {
          try {
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
              }
            }
          } catch (error) {
            // Skip failed stylesheets
          }
        }
        
      } catch (cssError) {
        // Continue without CSS if extraction fails
      }
      
      // Rewrite CSS for scoped isolation
      const canvasId = nanoid(8);
      let rewrittenCSS = '';
      
      if (combinedCSS && combinedCSS.trim().length > 0) {
        try {
          rewrittenCSS = await this.rewriteCSS(combinedCSS, canvasId);
        } catch (rewriteError) {
          // Fallback to basic scoping if rewriter fails
          rewrittenCSS = this.basicCSSScope(combinedCSS, canvasId);
        }
      }
      
      return {
        html: html,
        css: combinedCSS,
        rewrittenCSS,
        canvasId,
        assets: [] // Process assets in client for now
      };



    } catch (error) {
      throw new Error(`Failed to import website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async rewriteCSS(cssText: string, canvasId: string): Promise<string> {
    const scope = `[data-canvas="${canvasId}"]`;
    
    try {
      const root = postcss.parse(cssText);
      
      // Rewrite selectors for scoping
      root.walkRules(rule => {
        if (!rule.selectors) return;
        
        rule.selectors = rule.selectors.map(selector => {
          const trimmed = selector.trim();
          
          // Handle special selectors that should become the scope itself
          if (trimmed.match(/^:root$|^html$|^body$/)) {
            return scope;
          }
          
          // Skip keyframe selectors
          if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') {
            return selector;
          }
          
          // Prefix with scope and preserve specificity using :is()
          return `${scope} :is(${trimmed})`;
        });
      });
      
      // Rename keyframes to avoid conflicts
      const keyframeMap = new Map<string, string>();
      root.walkAtRules('keyframes', rule => {
        const originalName = rule.params.trim();
        const newName = `${canvasId}-${originalName}`;
        keyframeMap.set(originalName, newName);
        rule.params = newName;
      });
      
      // Update animation references
      if (keyframeMap.size > 0) {
        root.walkDecls(decl => {
          if (decl.prop.startsWith('animation')) {
            keyframeMap.forEach((newName, oldName) => {
              const regex = new RegExp(`\\b${oldName}\\b`, 'g');
              if (regex.test(decl.value)) {
                decl.value = decl.value.replace(regex, newName);
              }
            });
          }
        });
      }
      
      // Remove dangerous @import rules
      root.walkAtRules('import', rule => {
        rule.remove();
      });
      
      return root.toString();
      
    } catch (error) {
      console.error('PostCSS rewrite failed:', error);
      throw error;
    }
  }
  
  private basicCSSScope(cssText: string, canvasId: string): string {
    const scope = `[data-canvas="${canvasId}"]`;
    
    // Simple regex-based scoping as fallback
    return cssText.replace(/([^{}]+)\s*\{/g, (match, selectors) => {
      const scoped = selectors
        .split(',')
        .map((sel: string) => {
          const trimmed = sel.trim();
          if (trimmed.match(/^:root$|^html$|^body$/)) {
            return scope;
          }
          return `${scope} :is(${trimmed})`;
        })
        .join(', ');
      
      return `${scoped} {`;
    });
  }
}

export const websiteImportService = new WebsiteImportService();