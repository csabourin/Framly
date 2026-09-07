# Framly

A web editor a beginner can open without knowing HTML, a designer can work in
without fighting it, and whose output a programmer would approve in review.

The idea it is built on: **the box model is the truth of the web.** Figma, and
most visual builders after it, treat a page as absolutely positioned rectangles
and then translate. Framly does not translate — elements sit where real HTML
elements sit, and the box around them is visible, draggable and named. Learning
Framly is learning the web.

Three promises, in priority order. When two conflict, the higher one wins:

1. **The output is correct.** Semantic, accessible, readable HTML and CSS.
2. **The box model is visible.** Spacing is seen and dragged, not guessed.
3. **You cannot easily make something broken.** Guardrails, in plain language,
   at the moment of the mistake.

**`TODO.md` is the roadmap** — sequenced, one next action at the top. Work from
it. **`docs/orientation.md`** is why things are the way they are: what the
diagnosis found, which decisions are already taken and why, and the traps that
have cost time. Read it before revisiting a decision that looks settled.

**Before any UI or visual work, read `docs/interface.md`.** It is the interface
direction: the palette (and the rule that colour only ever means something), the
type pairing, the four-surface layout, and what was deliberately removed.
`docs/interface-proposal.html` is the rendered mockup — open it in a browser.
Both live in the repo so neither depends on a link surviving; the same mockup is
published at
<https://claude.ai/code/artifact/53e406a7-bce7-4538-a8b5-384a0d99f668>.

# User Preferences

Preferred communication style: Simple, everyday language.

# Non-negotiables

- **Accessibility is a gate, not a goal.** Pages Framly produces must have zero
  axe violations (WCAG 2.2 AA). Framly's own violations are capped by a
  ratcheting baseline that may only shrink. Both are enforced in CI.
- **Breakpoint edits are overrides.** Mobile is the base; an edit at any larger
  breakpoint writes `responsiveStyles` and must never touch the base. The
  panel's `handlePropertyChange` and canvas spacing controls share
  `utils/styleEditing.ts`'s `breakpointStyleUpdate` writer and route on the current
  breakpoint. `tests/responsive.spec.ts` fails if a base rule picks up a
  breakpoint value, or if a media query goes missing.
- **The exported rule order follows the canvas cascade.** Element styles, then
  named class, then breakpoint override. Every selector is one class, so
  specificity is equal and order alone decides the winner — write the file in
  any other order and the export stops matching what the canvas showed.
- **DOM flow integrity.** Elements position exactly like real HTML elements,
  respecting DOM order unless explicitly positioned by dragging. Copy, paste and
  duplicate never apply an offset. Absolute positioning is the exception the
  tool exists to avoid, never the default.
- **The canvas element computes to the exported box.** The overlay measures the
  live canvas node with `getComputedStyle`, so anything the editor adds to
  `.canvas-element` is reported to the user as if the page had it. Editor chrome
  goes on the `.selectable-block::after` pseudo-element using `outline` and
  `box-shadow`, which cannot move a box. Never put a border, a minimum, an
  `overflow` or a padding on a canvas element to make it easier to click:
  `tests/roundtrip.spec.ts` fails, and the box model stops being the truth.
  The `--element-*` custom properties are registered `inherits: false` for the
  same reason — they leaked a parent's value into every child that set none.
- **The code generator stays DOM-optional.** `utils/codeGenerator.ts` is a pure
  transformation, tested in Node. Reaching for `DOMParser` or `document` without
  a fallback breaks that and rules out ever exporting outside a browser.
- **The markup and the stylesheet name classes once.** `resolveStyleClasses()`
  decides which class carries each element's styles, and both the HTML and the
  CSS ask it. Generating class names on one side and selectors on the other is
  how every export came to ship unstyled; `tests/export.spec.ts` fails if a rule
  selects a class no element has, or an element's styles reach no rule.
- **No dead code.** `tests/deadcode.spec.ts` walks the import graph from
  `main.tsx` and fails on anything reachable from nothing.

# Working on this

```bash
npm run dev     # dev server on :5174
npm run check   # tsc — Vite does NOT typecheck, so this is the only type gate
npm test        # Playwright suite, against the production build
npm run build   # client bundle + esbuild server bundle
```

`npm run check` uses an incremental cache (`node_modules/typescript/tsbuildinfo`).
Delete it when you want a genuinely cold check.

CI runs typecheck, build and tests on every PR. Three gates each fail on a
deliberately introduced regression — that was verified, and any new gate should
be too. A check that cannot fail is worthless.

| Gate | Behaviour |
|---|---|
| `tests/axe-baseline.json` | Framly's own known AA violations. Fails on a new rule or a worse count; reports when a number can come down. Lower it as you fix things. |
| Exported-page a11y | Zero violations, no baseline. This is promise #1. Now a real contrast check — until the CSS export was fixed there were no colours to measure. |
| Export ↔ stylesheet | `tests/export.spec.ts`: no rule may select a class the markup lacks, no styled element may go unselected, no camelCase property, and the rendered page must compute to the colours it was designed in. |
| Canvas ↔ export | `tests/roundtrip.spec.ts`: the Landing template's emitted rendered properties must match the canvas at all four breakpoint widths, including real responsive overrides. Editor drag cursors are intentionally excluded. |
| Canvas box ↔ exported box | `tests/roundtrip.spec.ts`, second test: 36 layout-critical properties compared for every element at all four widths, whether or not the export declares them. The rule above reads its property list off the exported rule, so it can only catch a declaration the export gets wrong — it is blind to anything the *canvas* adds. `tests/canvas-box-baseline.json` records what still diverges and may only shrink. Only `cursor` and `position` are excluded, each because it provably cannot move a box. |
| Box-model overlay | `tests/box-model.spec.ts`: selection must expose all four labelled, distinctly coloured boxes without intercepting interaction, and must remeasure after a box or breakpoint change. An element that renders nothing must keep its clickable floor both before and after selection — asserted on computed `min-width`, since the rendered box is large enough to pass with the floor switched off. |
| Direct spacing | `tests/spacing.spec.ts`: padding/margin handles preview live, cancel cleanly, respect zoom and breakpoints, support keyboard editing and commit one undo step. Shared styles and independently rendered exports must agree. |
| Spacing scale | `tests/spacing-scale.spec.ts`: presets and Custom remain keyboard accessible, undo together, preserve side overrides and match exported CSS. |
| Durable saving | `tests/persistence.spec.ts`: Saved waits for transaction completion; acknowledged edits and undo/redo survive reload; failed writes preserve the previous snapshot and offer retry and live backup. Legacy migration and import retain recovery copies. The aborted-write test was verified to fail when saving resolves before transaction completion. |
| Layout explanations | `tests/layout-flow.spec.ts`: computed parent flow, reverse/RTL/vertical axes, hidden and boxless ancestors, keyboard navigation, real positioning and breakpoint export must agree. |
| Heading structure | `tests/heading-structure.spec.ts`: an inserted heading takes the level its position calls for, at three depths and in the export; a skipped level, a page below `h1` and a second `h1` are named and fixed in one undoable click, and the fix is the peer level the outline calls for rather than one step below the heading above; the outline works by keyboard; axe passes on the warning states; all three templates stay sound. |
| `tests/deadcode.spec.ts` | Fails on any unreachable file. `components/ui/*` is exempt. |

# Architecture

## Frontend

- **React 18 + TypeScript**, **Redux Toolkit**, **Vite**, **Wouter** (one route).
- **Tailwind CSS** with CSS variables; **Radix UI** via **shadcn/ui**.
- **i18n**: `react-i18next`, English and French, both kept in step.

Canvas is split into an orchestrator plus hooks (`useCanvasEvents`,
`useDrawingEvents`, `useDragAndDrop`, `useToolHandler`), visual components
(`InsertionIndicator`, `DrawingOverlay`, `SelectionOverlay`, `CanvasContainer`)
and utilities (`canvasGeometry` for coordinate math, `insertionLogic` for
drop-zone detection). `CanvasElement.tsx` renders the tree recursively.

## Backend

**There is effectively no backend.** `server/index.ts` sets a CSP header and
serves the built client through Express. There are no API routes, no database,
no sessions and no authentication. Everything is client-side.

The abandoned database, authentication, website-import and API-client
scaffolding has been removed. Do not reintroduce it unless the local-first
decision changes deliberately.

## Storage

- **IndexedDB is the only storage** — projects, components, custom classes,
  categories, undo history, uploaded images.
- **Autosave starts on each persistent change**, coalescing synchronous actions
  without a timer. `utils/persistence.ts` queues writes; the document, classes,
  component definitions and undo position commit in one IndexedDB transaction.
  Unchanged history entries are reused instead of copied on each keystroke.
  The visible save indicator says "Saved" only after the transaction completes;
  failed saves offer retry and a backup of current in-memory edits.
- **Undo/redo persists across sessions.** After a reload, Ctrl+Z undoes the
  previous session's last action; Ctrl+Y restores it. One history system only —
  `historySlice` plus `historyManager`. The canvas slice has no stack. The undo
  cursor and redo branch survive reload, including pending property edits.
- **Storage migration preserves originals.** The authoritative workspace uses
  the existing settings store; legacy project/class/history records are kept.
  Unknown saved formats block editing instead of being replaced by a blank page.
- **JSON export/import** for backup and transfer, via `PersistenceStatus`.
- PWA: service worker registered in production, unregistered in dev.

# Features, honestly

Working and tested: 24 element types; four breakpoints; drawing and
point-and-click insertion; HTML5 drag-and-drop reordering; inline text editing;
starter templates on an empty canvas; undo/redo; semantic HTML/CSS export;
stable structural export classes (`page`, `hero`, `hero-title`, etc.); keyboard
shortcuts with a searchable cheatsheet; light/dark colour modes. Canvas/export
fidelity is browser-tested at all four breakpoints. Selecting an element draws
its computed margin, border, padding and content boxes on the canvas. Dimensions
and contextual spacing help appear in a readout below the scrollable canvas,
so information never covers the object being edited.
Padding and margin sides can be dragged or edited with arrow keys. Handles name
their style owner and breakpoint scope; previews are temporary, and each commit
is one undoable action. Margin labels report CSS values, not an inferred distance
between siblings when margins collapse or a parent distributes free space.
The inspector offers a spacing scale (0 / 4 / 8 / 12 / 16 / 24 / 32 / 48) for
padding, margin, individual sides and parent gap, with an explicit Custom path.
Layout controls show a plain-language name followed by the real property in mono,
in English and French. Search accepts those names, CSS names and legacy labels;
inputs expose the same names to assistive technology.
The flow explanation reads the browser's actual selected and parent styles, and
links to the existing inspector controls. It distinguishes normal flow from
out-of-flow positioning, handles grid and boxless ancestors, and explains flex
direction without assuming a horizontal writing mode. Canvas positioning now
honors explicit rules instead of forcing every element to remain relative.
Text blocks support multiline input: Enter and Shift+Enter insert line breaks,
Ctrl/Cmd+Enter finishes editing, and Escape restores the starting content.
Each input is saved immediately; line breaks survive reload and HTML export.
`tests/text-editing.spec.ts` covers these behaviors and plain-text multiline paste.
Heading level is treated as page structure, not text size. `utils/headingOutline.ts`
is DOM-free like the code generator: it reads the outline from the element record,
so the reducer that assigns a level on insert and the panel that explains one apply
identical rules. A new heading has no level of its own — `addElement` gives it the
one its position calls for, so no insertion path can bypass it. The inspector shows
level chips, the reason for the suggested level, and the page outline with any
problem heading flagged and reachable. The header's "Checks" pill reports heading
problems only, and only when there are some.

Partly built — treat with care before extending:

- **Component system** (definitions, instances, propagation, tabbed editor)
  works but is thin, and is due to be rebuilt on shared classes in M4.
- **Website import** was removed. It stays parked until shared classes make an
  import model coherent in M4.
- **CSS optimiser** exists to undo the bloat caused by generating one class per
  element. It is no longer in the export path — it was inventing class names the
  stylesheet never defined — but still backs `cssClassGenerator` and its own
  modal. M4 fixes the cause and deletes it.
- **PNG/PDF export** is deliberately disabled and labelled "Coming soon".
- **React export** is generated but not a maintained output format.

## A known tension

"Class-based styling, no inline styles" is the stated principle, but the
implementation still generates a *unique rule per element* — now under a
readable, stable structural class rather than an id, but still inline styling
with extra steps and the reason the CSS optimiser exists. Shared, reusable
classes are M4. Do not build more on top of per-element classes until then.

## A second known tension

`CanvasElement` renders a wrapper `<div class="canvas-element">` around the
real semantic tag and puts the element's styles on the wrapper. The exported
document has no such layer, so the canvas DOM and the export DOM are not the
same shape, and for a button the styles apply twice — once on the wrapper and
once on the inner `<button>`.

This is the only remaining cause of canvas/export box divergence, and the six
entries in `tests/canvas-box-baseline.json` are all of it. Removing the wrapper
is the fix; drag-and-drop, inline editing and the overlays all target it, so it
is a real refactor rather than a tidy-up.

# External dependencies that are actually used

- **Radix UI** — accessible unstyled primitives, via shadcn/ui.
- **Tailwind CSS**, **CLSX** / **tailwind-merge**, **Class Variance Authority**.
- **Lucide React** — icons.
- **Redux Toolkit**, **react-i18next**, **nanoid**.
- **Playwright** + **axe-core** — tests and the accessibility gates.
