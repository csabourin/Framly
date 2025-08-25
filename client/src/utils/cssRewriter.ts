import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';
import { nanoid } from 'nanoid';

export interface RewrittenCSS {
  canvasId: string;
  cssText: string;
  renamedKeyframes: Map<string, string>;
  renamedFonts: Map<string, string>;
}

export class CSSRewriter {
  private canvasId: string;
  private scope: string;
  private renamedKeyframes = new Map<string, string>();
  private renamedFonts = new Map<string, string>();

  constructor(canvasId?: string) {
    this.canvasId = canvasId || nanoid(8);
    this.scope = `[data-canvas="${this.canvasId}"]`;
  }

  async rewrite(cssText: string): Promise<RewrittenCSS> {
    console.log('🔧 CSS REWRITER: Starting CSS rewrite process');
    console.log(`📋 Canvas ID: ${this.canvasId}`);
    console.log(`🎯 Scope: ${this.scope}`);
    
    try {
      const root = postcss.parse(cssText);
      
      // Step 1: Rewrite selectors
      this.rewriteSelectors(root);
      
      // Step 2: Handle keyframes
      this.rewriteKeyframes(root);
      
      // Step 3: Handle font faces
      this.rewriteFontFaces(root);
      
      // Step 4: Update animation and font references
      this.updateReferences(root);
      
      // Step 5: Sanitize dangerous content
      this.sanitize(root);
      
      const rewrittenCSS = root.toString();
      console.log(`✅ CSS REWRITER: Completed successfully (${rewrittenCSS.length} chars)`);
      
      return {
        canvasId: this.canvasId,
        cssText: rewrittenCSS,
        renamedKeyframes: this.renamedKeyframes,
        renamedFonts: this.renamedFonts
      };
    } catch (error) {
      console.error('❌ CSS REWRITER: Failed to rewrite CSS:', error);
      throw new Error(`CSS rewrite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private rewriteSelectors(root: postcss.Root) {
    console.log('🔧 Rewriting selectors...');
    let rewrittenCount = 0;
    
    root.walkRules(rule => {
      if (!rule.selectors) return;
      
      rule.selectors = rule.selectors.map(selector => {
        // Handle special selectors that should become the scope itself
        if (selector.match(/^:root$|^html$|^body$/)) {
          rewrittenCount++;
          return this.scope;
        }
        
        // Handle @keyframes selectors (from/to/percentages) - leave unchanged
        if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') {
          return selector;
        }
        
        // Prefix with scope and preserve specificity using :is()
        rewrittenCount++;
        return `${this.scope} :is(${selector})`;
      });
    });
    
    console.log(`✅ Rewrote ${rewrittenCount} selectors`);
  }

  private rewriteKeyframes(root: postcss.Root) {
    console.log('🔧 Rewriting keyframes...');
    let keyframesCount = 0;
    
    root.walkAtRules('keyframes', rule => {
      const originalName = rule.params.trim();
      const newName = `${this.canvasId}-${originalName}`;
      
      this.renamedKeyframes.set(originalName, newName);
      rule.params = newName;
      keyframesCount++;
      
      console.log(`  📝 ${originalName} → ${newName}`);
    });
    
    console.log(`✅ Rewrote ${keyframesCount} keyframes`);
  }

  private rewriteFontFaces(root: postcss.Root) {
    console.log('🔧 Rewriting font faces...');
    let fontCount = 0;
    
    root.walkAtRules('font-face', rule => {
      rule.walkDecls('font-family', decl => {
        const originalName = decl.value.replace(/['"]/g, '');
        const newName = `${this.canvasId}-${originalName}`;
        
        this.renamedFonts.set(originalName, newName);
        decl.value = `"${newName}"`;
        fontCount++;
        
        console.log(`  📝 Font: ${originalName} → ${newName}`);
      });
    });
    
    console.log(`✅ Rewrote ${fontCount} font faces`);
  }

  private updateReferences(root: postcss.Root) {
    console.log('🔧 Updating animation and font references...');
    let updatedCount = 0;
    
    root.walkDecls((decl) => {
      // Update animation references
      if (decl.prop.startsWith('animation') && this.renamedKeyframes.size > 0) {
        this.renamedKeyframes.forEach((newName, oldName) => {
          const regex = new RegExp(`\\b${oldName}\\b`, 'g');
          if (regex.test(decl.value)) {
            decl.value = decl.value.replace(regex, newName);
            updatedCount++;
          }
        });
      }
      
      // Update font-family references
      if (decl.prop === 'font-family' && this.renamedFonts.size > 0) {
        this.renamedFonts.forEach((newName, oldName) => {
          const regex = new RegExp(`\\b${oldName}\\b`, 'g');
          if (regex.test(decl.value)) {
            decl.value = decl.value.replace(regex, `"${newName}"`);
            updatedCount++;
          }
        });
      }
    });
    
    console.log(`✅ Updated ${updatedCount} references`);
  }

  private sanitize(root: postcss.Root) {
    console.log('🔧 Sanitizing dangerous content...');
    let sanitizedCount = 0;
    
    // Remove @import rules (should be inlined during processing)
    root.walkAtRules('import', rule => {
      rule.remove();
      sanitizedCount++;
    });
    
    // Sanitize URLs in values
    root.walkDecls(decl => {
      if (decl.value.includes('url(')) {
        const parsed = valueParser(decl.value);
        let modified = false;
        
        parsed.walk(node => {
          if (node.type === 'function' && node.value === 'url') {
            const url = node.nodes[0]?.value || '';
            
            // Block dangerous URLs
            if (url.startsWith('javascript:') || (url.startsWith('data:') && !url.startsWith('data:image/'))) {
              node.nodes[0].value = '#blocked';
              modified = true;
              sanitizedCount++;
            }
          }
        });
        
        if (modified) {
          decl.value = parsed.toString();
        }
      }
    });
    
    console.log(`✅ Sanitized ${sanitizedCount} dangerous items`);
  }
}

export const cssRewriter = new CSSRewriter();