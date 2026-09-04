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
it.

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
- **DOM flow integrity.** Elements position exactly like real HTML elements,
  respecting DOM order unless explicitly positioned by dragging. Copy, paste and
  duplicate never apply an offset. Absolute positioning is the exception the
  tool exists to avoid, never the default.
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

`package.json` still declares `drizzle-orm`, `@neondatabase/serverless`,
`express-session`, `passport`, `zod`, `date-fns` and `jsdom` — **all unused, in
zero files**. The `db:push` script points at a `drizzle.config.ts` that does not
exist and cannot run. `server/import-service.ts` is imported by nothing and has
its jsdom import commented out. Treat all of this as leftovers, not architecture.

`@tanstack/react-query` is wired up in `App.tsx` but there is not a single
`useQuery` or `useMutation`; it is scaffolding for an API that does not exist.

## Storage

- **IndexedDB is the only storage** — projects, components, custom classes,
  categories, undo history, uploaded images.
- **Autosave runs every 30 seconds** (`AUTO_SAVE_INTERVAL` in
  `utils/persistence.ts`). A refresh within 30s of an edit loses it.
- **Undo/redo persists across sessions.** After a reload, Ctrl+Z undoes the
  previous session's last action; Ctrl+Y restores it. One history system only —
  `historySlice` plus `historyManager`. The canvas slice has no stack.
- **JSON export/import** for backup and transfer, via `PersistenceStatus`.
- PWA: service worker registered in production, unregistered in dev.

# Features, honestly

Working and tested: 24 element types; four breakpoints; drawing and
point-and-click insertion; HTML5 drag-and-drop reordering; inline text editing;
starter templates on an empty canvas; undo/redo; semantic HTML/CSS export;
keyboard shortcuts with a searchable cheatsheet; light/dark colour modes.

Partly built — treat with care before extending:

- **Component system** (definitions, instances, propagation, tabbed editor)
  works but is thin, and is due to be rebuilt on shared classes in M4.
- **Website import** is half-finished and parked until M4.
- **CSS optimiser** exists to undo the bloat caused by generating one class per
  element. It is no longer in the export path — it was inventing class names the
  stylesheet never defined — but still backs `cssClassGenerator` and its own
  modal. M4 fixes the cause and deletes it.
- **PNG/PDF export** is deliberately disabled and labelled "Coming soon".
- **React export** is generated but not a maintained output format.

## A known tension

"Class-based styling, no inline styles" is the stated principle, but the
implementation generates a *unique class per element* — inline styles with extra
steps, and the reason the CSS optimiser exists. Shared, reusable classes are
M4. Do not build more on top of per-element classes until then.

# External dependencies that are actually used

- **Radix UI** — accessible unstyled primitives, via shadcn/ui.
- **Tailwind CSS**, **CLSX** / **tailwind-merge**, **Class Variance Authority**.
- **Lucide React** — icons.
- **Redux Toolkit**, **react-i18next**, **nanoid**.
- **Playwright** + **axe-core** — tests and the accessibility gates.
