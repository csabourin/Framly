/**
 * Eligibility Rules for Drag & Drop
 * Determines which elements can accept children based on HTML semantics
 */

const VOID_TAGS = new Set([
  "AREA", "BASE", "BR", "COL", "EMBED", "HR", "IMG", "INPUT", 
  "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"
]);

const REPLACED = new Set([
  "IMG", "VIDEO", "AUDIO", "CANVAS", "IFRAME", "OBJECT", "SVG"
]);

const INTERACTIVE = new Set([
  "INPUT", "SELECT", "TEXTAREA", "BUTTON", "LABEL"
]);

const NON_CONTAINER = new Set([
  "P", 
  ...Array.from(VOID_TAGS), 
  ...Array.from(REPLACED), 
  ...Array.from(INTERACTIVE)
]);

const STRICT_PARENTS: Record<string, (childTag: string) => boolean> = {
  UL: t => t === "LI",
  OL: t => t === "LI",
  TABLE: t => ["CAPTION", "COLGROUP", "THEAD", "TBODY", "TFOOT", "TR"].includes(t),
  THEAD: t => t === "TR",
  TBODY: t => t === "TR",
  TFOOT: t => t === "TR",
  TR: t => t === "TD" || t === "TH",
};

export type ComponentMeta = {
  id: string;
  tag: string;                   // uppercase
  acceptsChildren?: boolean;     // component override
  acceptsTags?: string[];        // optional whitelist
};

export function canAcceptChild(parent: ComponentMeta, child?: ComponentMeta): boolean {
  if (parent.acceptsChildren === false) return false;
  if (NON_CONTAINER.has(parent.tag)) return false;

  const strict = STRICT_PARENTS[parent.tag];
  if (!strict) return true;

  const childTag = child?.tag ?? "";
  return strict(childTag);
}

/**
 * Convert element type to uppercase HTML tag for compatibility
 */
export function elementTypeToTag(type: string): string {
  const typeMap: Record<string, string> = {
    'rectangle': 'DIV',
    'container': 'DIV',
    'text': 'P',
    'heading': 'H1',
    'button': 'BUTTON',
    'image': 'IMG',
    'list': 'UL',
    'section': 'SECTION',
    'nav': 'NAV',
    'header': 'HEADER',
    'footer': 'FOOTER',
    'article': 'ARTICLE',
    'input': 'INPUT',
    'textarea': 'TEXTAREA',
    'checkbox': 'INPUT',
    'radio': 'INPUT',
    'video': 'VIDEO',
    'audio': 'AUDIO',
    'link': 'A',
    'code': 'PRE',
    'divider': 'HR'
  };
  
  return typeMap[type] || 'DIV';
}