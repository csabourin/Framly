# Orientation

Three documents, three jobs:

- **`CLAUDE.md`** — what is *true* about the codebase right now.
- **`TODO.md`** — what to do *next*, sequenced.
- **This file** — what was *learned*, and why things are the way they are.

Read this before making a decision that looks like it has already been made.
It exists so the same ground is not re-covered, and so the reasoning behind a
choice outlives the conversation it was made in.

---

## How the project got here

The work in September 2026 started from one question: **the app gets traffic
but few people convert.**

### The first finding is that nobody can actually see the funnel

There is **no analytics in the application** — no Plausible, no GA, not one
custom event. There is also no account, no signup, no payment and no sharing.
The only terminal action in the whole app is "download two files".

So everything below is **inference from measurement, not from funnel data.** It
is well-evidenced, but it is not the same as knowing where people drop off. If
conversion is going to be reasoned about seriously, deciding what conversion
*means* here — exported once? came back on day two? built more than three
elements? — and then instrumenting it, comes before any further guessing.

### What measurement did show

Measured against a production build in headless Chromium:

| | Before | After |
|---|---|---|
| Time to visible UI | **13,020 ms** | **343 ms** |
| First Contentful Paint | never fired | — |

`index.html` requested **25 Google Font families** in one render-blocking
stylesheet. The app UI uses exactly one of them. There was no fallback paint, so
until that request resolved the visitor saw a blank white page.

Alongside that, a visitor who waited found: a blank 375px artboard with no
guidance; a Properties panel opening on CSS jargon before they had made
anything; a `DRAG TEST: Always draggable` tooltip on every element they created;
and PNG/PDF export options that closed the dialog and produced nothing.

Undo did not work — for any action. 35 TypeScript errors were shipping, several
of them live bugs (a component editor that referenced an undefined variable and
therefore never worked; a panel rendering `NaN bytes saved`).

### The pattern underneath

Every feature existed at demo depth; few at "a person could rely on this" depth.
The app had a Button State Gallery, a CSS optimiser, colour modes, component
propagation and website import — while undo was broken and the first paint took
thirteen seconds.

That is the signature of building without a verification loop: each feature
built until it looked right, then the next one started. Nothing used in anger,
so nothing found. There were no tests, no CI, and `npm run check` had been
failing for a long time.

**This is why M0 came first and why it was about gates rather than features.**
Nothing on the roadmap stays fixed unless something is watching.

---

## Decisions already taken

Recorded so they are not re-litigated. Each can be revisited — but knowingly.

| Decision | Reasoning |
|---|---|
| **Local-first, no accounts** | It is a real, defensible position and the part that already works. Kept. |
| **The 28 unused `components/ui/*` files stay** | Vendored library surface, tree-shaken out of the bundle, and several are wanted for the M2/M3 interface work. Deleting them only pays off alongside dropping the matching Radix dependencies. |
| **`console.error` and `console.warn` stay; all `console.log` went** | The error/warn calls are the app's only diagnostics — many catch blocks are otherwise silent. The logs were debug noise. |
| **Undo history persists across reloads** | The workspace and history cursor now commit atomically. Reloading after undo preserves the redo branch, and a pending property edit remains undoable even before its typing debounce finishes. |
| **M1 opens on its two small tasks** | Nothing depends on the order, and opening a milestone on an `[L]` is a wall. |
| **The CSS optimiser is scheduled for deletion, not maintenance** | It exists to undo bloat caused by generating one class per element. M4 fixes the cause. Do not invest in it. |
| **Abandoned backend scaffolding was removed** | Framly is local-first and had no API routes, database, sessions or authentication. The unused database/auth packages, broken `db:push` script, dead website-import service and unused React Query wrapper described an architecture that did not exist and kept vulnerable packages installed. |
| **"Inherited" is said in words, never in colour** | `docs/interface.md` reserves hue for the box model and for pass/warn/fail. The old blue "Responsive" badge and blue italic *inherited* label are gone; a mono grey line under the control names the source breakpoint, and `aria-describedby` ties it to the input so it is not a sighted-only cue. |
| **Every style property can vary by breakpoint** | `responsive` in the property config now only decides whether a control shows the per-breakpoint UI. The roadmap's own "done when" names colour, which was not in the five properties the flag had been set on. |
| **Templates avoided form elements** | They would have exported as `<div>`. **This is now unblocked** — `getHTMLTag` emits real tags, so a form or contact template is straightforward whenever it is wanted. |
| **Minifying is off by default in the export dialog** | It used to be on, and it was never applied, so nobody had met the behaviour. Promise #1 is code a programmer would sign off; that is the readable version. Minifying is now something you choose. |
| **The CSS optimiser is out of the export path** | It was the source of the classes the stylesheet did not define. It still backs `cssClassGenerator` and its own modal, so nothing was deleted — but an export no longer goes near it, which is one less thing M4 has to unpick. |
| **One class per element, still** | Fixing the export was not the moment to change what the editor produces. The generator now writes a rule for the class the markup actually carries, whatever that class is. Shared classes remain M4. |
| **Generated export classes describe structure, not storage** | Timestamp classes remain internal editor handles. Export replaces them deterministically with `page`, `hero`, `hero-title`, and related structural names in DOM order. Explicit user classes are preserved; one-off auto classes from panel edits are folded into the structural rule. |
| **Canvas/export fidelity is tested from computed styles** | The Landing template is rendered twice in Chromium — once in the editor and once from its generated files — at every breakpoint. The test compares the properties the export actually emits, while excluding the editor's deliberate grab cursor. |
| **The box overlay measures the browser, not the model** | `SelectionOverlay` reads computed styles and rendered bounds, then converts them back through canvas zoom. That makes it describe what the user actually sees, including class and responsive styles, rather than one incomplete source of values. Margin geometry treats negative values as zero-width bands for now; the label still reports the signed value. |
| **Spacing previews do not mutate the document** | `SpacingHandles` applies a temporary canvas-only stylesheet, at most once per animation frame. Release removes it and commits through the existing style owner and history system; cancellation removes it without a document edit. A class-owned edit previews the other affected canvas elements too. |
| **Spacing shorthands need a stable rendering form** | React diffs style values rather than declaration order. A base side value reused after a breakpoint shorthand could leave the old computed spacing on screen. Canvas styles now expand physical padding/margin to longhands with CSSOM; export keeps readable shorthand declarations and merges class layers in declaration order. The generator remains DOM-independent. |
| **Saved is a transaction result** | The old status timer simulated success even when writes failed. The status now follows the real save queue. A workspace commit contains document data and references to history entries written in the same transaction; unchanged entries are reused to keep typing responsive. |
| **Loading must finish before editing begins** | The former three-second startup race could expose an empty editor and later overwrite new edits with a delayed restore. Startup now waits for the saved document, or shows a retryable error. Legacy records and unsupported formats remain untouched. |
| **A spacing preset is one action** | A preset may create a class and assign a style. Its history boundary includes both operations. Custom entry is explicitly revealed and opening it never rewrites mixed values. |
| **Measurements must not cover the edit** | The box bands and spacing handles remain on the element. Numeric labels and contextual help render in a readout below the scrollable canvas, outside its scaled and clipped surface. Native handle tooltips are removed; keyboard descriptions still name the source and scope. |
| **Enter belongs to the text** | Text blocks keep editing on Enter and save each input, including line breaks. The browser owns the caret and native editing undo; Redux updates only replace the DOM content when it differs. Ctrl/Cmd+Enter ends editing and Escape restores the content present on focus. |
| **Plain names teach the real property** | Layout, spacing, flex and grid controls show a translated plain-language label above the unchanged property name. Form sizing controls retain their real HTML attribute names (`rows`, `cols`, `size`). Search matches displayed names, CSS names and previous labels. This is presentation only; style keys and write routing stay unchanged. |
| **Flow explanations use actual formatting parents** | `readLayoutFlow` reads computed styles and skips `display: contents` ancestors. It distinguishes hidden ancestors, floats ignored in flex/grid, reversed directions and writing modes. Zero offsets and identity transforms add no explanation. The panel stays outside the artwork and sends users to the existing inspector writer, not the legacy Auto Layout shortcuts. |
| **Editor positioning must not override document positioning** | The old `.canvas-element { position: relative !important }` prevented absolute, fixed and sticky rules from taking effect. Relative remains the editor default, but explicit document rules now win. A tablet-only absolute edit is checked in both the canvas and an independently rendered export. |
| **The editor must not add to the box it measures** | `.canvas-element` carried `border: 2px dashed transparent`, `min-height: 32px`, `min-width: 32px` and `overflow: clip` from the first commit, and the artboard inherited the app shell's 13px/1.5 type. Every element therefore measured 4px larger than the page it exported, wrapped text at different points, and the overlay drew a labelled Border band around elements that had none. Editor chrome now lives entirely on the `.selectable-block::after` pseudo-element, where `outline` and `box-shadow` cannot move a box, and the artboard starts from the exported reset. |
| **`--element-*` custom properties must not inherit** | They are set per element and read with a fallback, but custom properties inherit by default, so a child that set none of its own resolved its parent's: every heading and paragraph inside the Landing hero rendered with the hero's `#eff6ff` background. They are registered `@property … { inherits: false }`. Fallbacks are now the CSS initial value (`min-width: auto`, `gap: normal`), not a guess. |
| **A one-directional gate looks like a two-directional one** | The original round-trip test read its property list off the *exported* rule, so it could only catch a declaration the export got wrong and was structurally blind to anything the canvas added — which is how all of the above survived a gate built to catch exactly it. The second test compares a fixed list both ways. When a gate reads its own scope from the thing it is checking, it can only shrink to nothing. |
| **Tests can pass on a layout coincidence** | Eleven specs selected the Landing hero with `hero.click()`, which aims at the element's centre. They passed only because that centre happened to fall in the gap between two children; once the fake border and padding were gone it landed on a paragraph and they selected the wrong element. `selectContainer()` clicks the container's own padding band instead. |

---

## How to work on this

These are the practices that actually found the bugs above. They are cheap.

**Verify a gate by breaking it.** Every CI gate here was confirmed by
deliberately introducing the failure it is meant to catch, then reverting. A
check that cannot fail is worse than no check, because it produces confidence.

**Walk the import graph; do not grep.** Grep would have got three of the M0.4
deletions wrong. See the traps below.

**Delete the TypeScript cache for a real answer.** `npm run check` is
incremental (`node_modules/typescript/tsbuildinfo`). A green run can be a stale
cache. Delete it when the answer matters.

**Before enabling a path that has only ever been a no-op, check its ordering
and blast radius.** Dead code becomes a data-loss bug the moment it starts
running.

**Measure rather than assume.** The thirteen-second load was invisible in the
source and obvious in a browser. Run the app.

**A green CI run beats a confident reviewer.** A bot review claimed the test
suite would not typecheck; a cold check and a deliberate error proved the file
was checked and clean. Verify before acting on a finding.

---

## Traps that cost time

- **There were two files named `DrawingOverlay`.** Canvas imports
  `./components/DrawingOverlay`; the top-level one was dead. Deleting by name
  would have taken the live one.
- **Two competing undo stacks existed**, and Ctrl+Z was bound to the dead one —
  which is why undo silently did nothing for every action. There is one system
  now: `historySlice` + `historyManager`. The canvas slice has no stack.
- **`canvas/setProject` had no reducer.** Orphan cleanup computed a cleaned
  project, dispatched it into the void, then saved the uncleaned state. Prefer
  typed action creators over string literals; the compiler catches this.
- **`escapeAttr` produces HTML entities**, which are wrong inside a JSX
  attribute. HTML and React output need different escaping.
- **`DOMParser` is browser-only.** Using it unguarded in the code generator made
  a pure transformation untestable in Node. It stays DOM-optional.
- **The autosave loss window was real.** The interval was 30 seconds, while the
  status merely simulated saves. Both are now replaced by immediate queued
  transactions, with browser coverage for failures and immediate reloads.
- **A green build says nothing about types.** Vite does not typecheck.
- **The HTML and the CSS were generated from different ideas of what a class
  is.** `getOptimizedClasses` put optimiser-invented names in the markup;
  `generateCSS` wrote `[data-element-id="…"]` selectors for an attribute that
  was never emitted, and only for elements that had *no* classes — which the
  templates always give them. The result was an export with no styling at all,
  and it had been that way long enough to be invisible. Anything that writes
  markup and a stylesheet has to resolve the names once, for both.
- **Two components were writing the same value to different places.**
  `ResponsivePropertyInput` wrote the breakpoint override *and* called the
  panel's `onChange`, which knew nothing about breakpoints and wrote the base.
  Neither was wrong on its own reading. Whenever an edit passes through two
  hands, check what the second one does with it.
- **The rule order in the exported CSS is not a matter of taste.** Every
  selector the generator writes is a single class, so specificity is always
  equal and the last rule wins. The canvas cascade — element styles, then named
  class, then breakpoint override — is therefore a spec the file has to follow,
  and it was being written class-first.
- **An empty output passes a lot of tests.** See the note in `TODO.md`: the
  exported-page accessibility gate was green because there were no colours to
  fail the contrast check. When a gate has never failed, ask what it would take
  for it to — not just whether it is running.
- **Editor CSS can silently falsify the canvas.** A global rule zeroed container
  padding and gap with `!important`, so the property panel and export agreed
  with each other while the canvas showed neither value. The artboard also used
  `border-box`, making its content two pixels narrower than its labelled
  viewport. The round-trip gate now catches both kinds of drift.
- **A selection outline already existed in three places.** Inline blue outline
  and shadow styles, the old `selectable-block::after` chrome, and
  `SelectionOverlay` all competed. The measured overlay now owns the visible
  selection edge; the other selected-state decoration is suppressed so the
  reserved box colours keep one meaning.

---

## Open, and deliberately so

- **No analytics.** The largest gap. See the top of this file.
- **IBM Plex still loads from Google's CDN.** Non-blocking now, so a failure is
  invisible, but self-hosting would remove the third-party dependency entirely.
- **One class per element** is generated, which is inline styling with extra
  steps and the reason the CSS optimiser exists. Shared classes are M4. Do not
  build further on per-element classes before then.
- **The Button Designer has no way to create a design.** `ButtonPreview` and
  `ButtonDesignList` were imported nowhere and were deleted; the dialog renders
  only `ButtonTestingMode`, which shows "No button designs created yet". The
  feature is a shell.
