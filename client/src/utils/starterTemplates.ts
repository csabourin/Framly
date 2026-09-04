import { CanvasElement } from '../types/canvas';
import { createDefaultElement } from './canvas';

/**
 * Starter templates for the empty canvas.
 *
 * Templates are declared as plain nested nodes and expanded into real
 * CanvasElements on apply, so they inherit whatever `createDefaultElement`
 * considers correct for each type rather than duplicating that knowledge.
 *
 * Only element types that the code generator emits as real HTML tags are used
 * here (heading, text, button, list, image, container). Semantic types such as
 * `section` and `input` now export with their own HTML tags via `getHTMLTag`,
 * so this remains focused on the basic building blocks used by the gallery.
 */

/** A node in a template tree. `children` is expanded recursively. */
type TemplateNode = Omit<Partial<CanvasElement>, 'children' | 'type' | 'id'> & {
  type: CanvasElement['type'];
  children?: TemplateNode[];
};

/** A block in the decorative thumbnail shown on a template card. */
export interface PreviewBlock {
  /** Width as a percentage of the thumbnail. */
  width: number;
  /** Height in px within the thumbnail. */
  height: number;
  tone: 'strong' | 'medium' | 'soft' | 'accent';
}

export interface StarterTemplate {
  id: string;
  /** i18n keys, resolved by the gallery so template names stay translatable. */
  nameKey: string;
  descriptionKey: string;
  preview: PreviewBlock[];
  nodes: TemplateNode[];
}

export interface BuiltTemplate {
  /** Every new element, keyed by id, ready to merge into the tab. */
  elements: Record<string, CanvasElement>;
  /** Ids to append to the root element's children, in order. */
  rootChildIds: string[];
}

// Each template element gets its own CSS class. `createDefaultElement` names
// classes with Date.now() alone, which collides when a template creates several
// elements of one type in the same millisecond - and since styling here is
// class-based, a shared class name would make elements share styles.
let classCounter = 0;
const uniqueClassName = (type: string): string =>
  `${type}-${Date.now().toString(36)}-${(classCounter++).toString(36)}`;

function expandNode(
  node: TemplateNode,
  parentId: string,
  out: Record<string, CanvasElement>
): string {
  const { children, type, styles, ...overrides } = node;
  const base = createDefaultElement(type);

  const element: CanvasElement = {
    ...base,
    ...overrides,
    // Template styles refine the type's defaults rather than replacing them.
    styles: { ...base.styles, ...(styles || {}) },
    classes: [uniqueClassName(type)],
    parent: parentId,
    children: [],
  };

  out[element.id] = element;

  if (children && children.length > 0) {
    element.children = children.map((child) => expandNode(child, element.id, out));
  }

  return element.id;
}

/** Expand a template into elements ready for the `applyStarterTemplate` action. */
export function buildTemplate(template: StarterTemplate): BuiltTemplate {
  const elements: Record<string, CanvasElement> = {};
  const rootChildIds = template.nodes.map((node) => expandNode(node, 'root', elements));
  return { elements, rootChildIds };
}

/** Number of elements a template creates - shown on its card. */
export function countTemplateElements(template: StarterTemplate): number {
  const count = (nodes: TemplateNode[]): number =>
    nodes.reduce((total, node) => total + 1 + (node.children ? count(node.children) : 0), 0);
  return count(template.nodes);
}

// Shared style fragments. The default canvas is 375px wide with 20px of root
// padding, so these are tuned for a ~335px content column and scale up.
const bodyText = {
  fontSize: '15px',
  fontWeight: '400',
  color: '#334155',
  lineHeight: '1.65',
  padding: '0px',
};

const cardSurface = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '16px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  width: '100%',
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'landing',
    nameKey: 'templates.landing.name',
    descriptionKey: 'templates.landing.description',
    preview: [
      { width: 70, height: 12, tone: 'strong' },
      { width: 100, height: 6, tone: 'soft' },
      { width: 90, height: 6, tone: 'soft' },
      { width: 42, height: 14, tone: 'accent' },
      { width: 100, height: 22, tone: 'medium' },
    ],
    nodes: [
      {
        type: 'container',
        styles: {
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '28px 20px',
          backgroundColor: '#eff6ff',
          border: 'none',
          borderRadius: '12px',
          width: '100%',
        },
        children: [
          {
            type: 'heading',
            headingLevel: 1,
            content: 'Build something people want',
            styles: {
              fontSize: '30px',
              fontWeight: '700',
              color: '#0f172a',
              lineHeight: '1.2',
              margin: '0px',
              padding: '0px',
            },
          },
          {
            type: 'text',
            content:
              'One clear sentence about what you make, who it is for, and why it beats the alternative.',
            styles: bodyText,
          },
          {
            type: 'button',
            buttonText: 'Get started',
            styles: {
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 22px',
              fontSize: '16px',
              fontWeight: '600',
              alignSelf: 'flex-start',
              minWidth: '0px',
            },
          },
        ],
      },
      {
        type: 'container',
        styles: {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '4px 0px',
          backgroundColor: 'transparent',
          border: 'none',
          width: '100%',
        },
        children: [
          {
            type: 'heading',
            headingLevel: 2,
            content: 'What you get',
            styles: {
              fontSize: '21px',
              fontWeight: '700',
              color: '#0f172a',
              lineHeight: '1.3',
              margin: '0px',
              padding: '0px',
            },
          },
          {
            type: 'list',
            listType: 'unordered',
            listItems: [
              'A reason to keep reading',
              'A second reason, just as concrete',
              'The one that closes the deal',
            ],
            styles: { ...bodyText, paddingLeft: '20px' },
          },
        ],
      },
      {
        type: 'text',
        content: '© Your company',
        styles: {
          fontSize: '13px',
          fontWeight: '400',
          color: '#64748b',
          lineHeight: '1.5',
          padding: '8px 0px 0px 0px',
        },
      },
    ],
  },

  {
    id: 'article',
    nameKey: 'templates.article.name',
    descriptionKey: 'templates.article.description',
    preview: [
      { width: 85, height: 12, tone: 'strong' },
      { width: 45, height: 5, tone: 'soft' },
      { width: 100, height: 26, tone: 'medium' },
      { width: 100, height: 5, tone: 'soft' },
      { width: 95, height: 5, tone: 'soft' },
      { width: 60, height: 5, tone: 'soft' },
    ],
    nodes: [
      {
        type: 'heading',
        headingLevel: 1,
        content: 'The title of your article',
        styles: {
          fontSize: '28px',
          fontWeight: '700',
          color: '#0f172a',
          lineHeight: '1.25',
          margin: '0px',
          padding: '0px',
        },
      },
      {
        type: 'text',
        content: 'By Author Name · 5 min read',
        styles: {
          fontSize: '13px',
          fontWeight: '500',
          color: '#64748b',
          lineHeight: '1.5',
          padding: '0px',
        },
      },
      {
        type: 'image',
        imageAlt: 'Describe this image for people who cannot see it',
        width: 335,
        height: 180,
        widthUnit: '%',
        styles: {
          width: '100%',
          height: '180px',
          backgroundColor: '#e2e8f0',
          borderRadius: '10px',
          objectFit: 'cover',
        },
      },
      {
        type: 'text',
        content:
          'Open with the point, not the preamble. Say what happened, what it means, and what the reader should do about it.',
        styles: bodyText,
      },
      {
        type: 'heading',
        headingLevel: 2,
        content: 'A section heading',
        styles: {
          fontSize: '20px',
          fontWeight: '700',
          color: '#0f172a',
          lineHeight: '1.3',
          margin: '0px',
          padding: '0px',
        },
      },
      {
        type: 'text',
        content:
          'Keep paragraphs short. Each one should carry a single idea the reader can take away on its own.',
        styles: bodyText,
      },
    ],
  },

  {
    id: 'features',
    nameKey: 'templates.features.name',
    descriptionKey: 'templates.features.description',
    preview: [
      { width: 55, height: 10, tone: 'strong' },
      { width: 100, height: 16, tone: 'medium' },
      { width: 100, height: 16, tone: 'medium' },
      { width: 100, height: 16, tone: 'medium' },
    ],
    nodes: [
      {
        type: 'heading',
        headingLevel: 1,
        content: 'Everything you need',
        styles: {
          fontSize: '26px',
          fontWeight: '700',
          color: '#0f172a',
          lineHeight: '1.25',
          margin: '0px',
          padding: '0px',
        },
      },
      {
        type: 'container',
        styles: cardSurface,
        children: [
          {
            type: 'heading',
            headingLevel: 2,
            content: 'First feature',
            styles: {
              fontSize: '17px',
              fontWeight: '600',
              color: '#0f172a',
              lineHeight: '1.3',
              margin: '0px',
              padding: '0px',
            },
          },
          {
            type: 'text',
            content: 'What it does, in the words your customer would use.',
            styles: { ...bodyText, fontSize: '14px' },
          },
        ],
      },
      {
        type: 'container',
        styles: cardSurface,
        children: [
          {
            type: 'heading',
            headingLevel: 2,
            content: 'Second feature',
            styles: {
              fontSize: '17px',
              fontWeight: '600',
              color: '#0f172a',
              lineHeight: '1.3',
              margin: '0px',
              padding: '0px',
            },
          },
          {
            type: 'text',
            content: 'Lead with the outcome, not the mechanism.',
            styles: { ...bodyText, fontSize: '14px' },
          },
        ],
      },
      {
        type: 'container',
        styles: cardSurface,
        children: [
          {
            type: 'heading',
            headingLevel: 2,
            content: 'Third feature',
            styles: {
              fontSize: '17px',
              fontWeight: '600',
              color: '#0f172a',
              lineHeight: '1.3',
              margin: '0px',
              padding: '0px',
            },
          },
          {
            type: 'text',
            content: 'Three is enough. A fourth dilutes the first three.',
            styles: { ...bodyText, fontSize: '14px' },
          },
        ],
      },
    ],
  },
];
