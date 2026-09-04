# Framly — Roadmap

## What Framly is

A web editor that a beginner can open without knowing HTML, that a designer can
work in without fighting it, and whose output a programmer would approve in a
code review.

The idea it is built on: **the box model is the truth of the web.** Figma, and
most visual builders after it, treat a page as absolutely positioned rectangles
and then translate. Framly does not translate — elements sit where real HTML
elements sit, and the box around them is visible, draggable and named. Learning
Framly is learning the web.

Three promises, in priority order. When two conflict, the higher one wins:

1. **The output is correct.** Semantic, accessible, readable HTML and CSS.
2. **The box model is visible.** Spacing is something you see and drag, not a
   number you guess.
3. **You cannot easily make something broken.** Guardrails, in plain language,
   at the moment of the mistake.

---

## How to use this document

- **Work top to bottom.** Milestones are sequential. Finish one before starting
  the next. The next thing to do is always the first unchecked box.
- **Every task has a "done when".** If you can't test it, it isn't done.
- Sizes: `[S]` one sitting · `[M]` about a day · `[L]` several days.
- New ideas go in **Parking lot**, never in a milestone. Each one has a
  condition for coming back. Writing it down is how you stop carrying it.
- If a task turns out to be `[L]` when it looked `[S]`, split it and put the
  second half in the parking lot. Shipping half is fine. Carrying half is not.

### 👉 Start here

**M2.1 — Box overlay on selection.** The output milestone is complete. The
next job is making Framly's differentiator visible: selecting an element should
show its margin, border, padding and content boxes directly on the canvas.

*M0 is done: CI runs on every PR, and three gates fail on a regression.*

---

## M0 — Make it stay fixed

*Why first: four features silently broke and shipped before anyone noticed.
Until something checks, everything below will rot at the same rate it's built.*

- [x] `[S]` **CI: typecheck + build on push.** `.github/workflows/ci.yml` runs
      `npm run check` and `npm run build` on every branch and PR.
- [x] `[M]` **Playwright + axe harness — 68 tests.** `npm test` builds the
      production bundle, serves it through the app's own Express server, and
      covers: first run and the empty state, all three templates, undo/redo
      (including one Ctrl+Z per drawn shape), export, disabled formats, and
      the absence of debug artifacts.
- [x] `[S]` **axe gate on Framly's own UI.** `tests/axe-baseline.json` records
      the known violations; the gate fails on any new rule or a worse count,
      and tells you when a number can come down. Verified by deliberately
      adding an unlabelled `<select>` — it failed, naming the rule and the
      element. Everything added since the baseline (empty state, gallery,
      export dialog) is held to zero, so the baseline can only shrink.
- [x] `[S]` **The output promise is now a test.** A document containing one of
      every element type, and each template's exported page with its CSS
      inlined, must score zero axe violations. Verified by deliberately
      removing an `aria-label` — it failed.
- [x] `[S]` **Delete dead code.** 24 files removed, found by walking the real
      import graph from `main.tsx` rather than grepping: the four orphaned
      ButtonDesigner components, `useDragAndDropV2`, the three `tools/` files
      that were never wired up, both stale locale copies, and eleven more.
      All 54 debug `console.log` calls are gone; the 14 `console.error` and 6
      `console.warn` stay, as they are the app's only diagnostics.
      `tests/deadcode.spec.ts` now walks that graph on every run, so an orphan
      cannot come back. Vendored `components/ui/*` is exempt — see below.
- [x] `[S]` **Removed `maximum-scale=1`** from the viewport meta, so a phone can
      pinch-zoom again (WCAG 1.4.4). `meta-viewport` is out of the axe baseline,
      which now has four entries instead of five, and a test states the
      requirement in its own right. Both guards were verified by putting the
      regression back.

**Milestone done when:** you can break something on purpose and CI tells you.
**✅ Done.** Every gate here was verified by deliberately breaking it.

---

## M1 — Output a programmer would sign off

*Why second: this is promise #1, and it is the only promise that is currently
half-kept. Semantic tags now export correctly; so, since the first three tasks
below, does the CSS around them — but it is one rule per element, with the
class names to match, and it has no real media queries.*

- [x] `[S]` **The exported CSS now reaches the exported HTML.** Found while
      wiring up the settings below: **every export was arriving unstyled.** The
      markup carried classes invented by the CSS optimiser, the stylesheet
      selected `[data-element-id="…"]` — an attribute the generator never
      writes — and the few rules that did come out named their properties
      `backgroundColor`, which a browser drops. A landing-page export was 264
      bytes of reset. It is now ~1.9KB and renders in its own colours. One
      class per element is still the shape of it; that is M4's to change, not
      this fix's. The optimiser is out of the export path, along with the
      legacy CSS fallback and two unused methods.
      *Verified by:* three deliberate regressions — the old selector, the old
      property names, and dropping the settings — each caught by a named test.
- [x] `[S]` **Apply the export settings.** `includeResponsive`, `minifyCSS` and
      `includeComments` now reach the generator. Minifying moved to **off by
      default**: promise #1 is code a programmer would sign off, and that is
      the readable version. Comments label the sections; when minifying would
      strip them straight back out, the dialog says so where a screen reader
      reads it.
      *Done when:* unchecking "minify" visibly changes the downloaded CSS. ✅
- [x] `[S]` **Export the active tab only**, with the CSS file named after the
      project. This turned out to be already true — the dialog has always
      passed the active tab's elements — but nothing said so. Two tests now do:
      a second tab's export contains none of the first tab's markup, and the
      page links the stylesheet the export writes.
      *Done when:* exporting from Tab A never contains Tab B's markup. ✅
- [x] `[L]` **Real media queries, mobile-first.**

      **The writing path.** An edit at a larger breakpoint is now an override
      and nothing else. It used to be written twice: `ResponsivePropertyInput`
      wrote `responsiveStyles[bp]` and then handed the same value to the panel,
      which wrote it to the base as well — so setting a font size at "tablet"
      changed the base rule too, and the exported page carried the wide-screen
      value at every width. There is one writer now, and it routes by the
      current breakpoint. Any style property can differ by breakpoint;
      `responsive` in the property config now only decides whether a control
      offers the per-breakpoint UI. The exporter's rule order was also wrong
      against the canvas — a named class overrides an element's own styles on
      the canvas, and the file was written the other way round, so a panel edit
      could be shown and then not exported.

      **The controls.** Every responsive control now carries a line saying
      where its value comes from: `base · applies at every width`, `set here`,
      or `inherited from Tablet` — naming the breakpoint, not just the fact.
      It is mono grey text tied to the input with `aria-describedby`, so it
      reaches a screen reader and carries no colour: `docs/interface.md`
      reserves hue for the box model and for pass/warn/fail, and the old blue
      "Responsive" badge and blue italic *inherited* label are gone. Clearing
      an override is offered inline, named for the breakpoint it clears
      ("Clear Tablet") rather than a bare ×, and only when there is something
      to clear. `breakpoints.inherited` and `breakpoints.clearValue` were
      referenced but had never been added to either locale file, so they had
      been rendering as raw keys.
      *Done when:* setting a colour at base applies everywhere; changing it at
      `md` produces exactly one media query and no duplicate base rule. ✅

- [x] `[M]` **CSS a human can read.** Editor timestamps and element ids no
      longer leak into an export. Class names now follow the document structure
      (`page`, `hero`, `hero-title`, `hero-text`, `hero-action`,
      `what-you-get`), remain identical across repeated exports, and their
      rules follow DOM order. Explicit user classes keep their names. Internal
      one-off classes created by the Properties panel are folded into the
      element's readable rule; real shared classes remain separate and keep
      their cascade position. Declarations made unreachable by a later
      shorthand or shared class are omitted.
      *Verified by:* five focused tests covering meaningful names, stability,
      document order, shorthand cleanup and panel-created classes. The naming
      gate was proven by deliberately changing `page`; it failed on the exact
      missing selector. ✅
- [x] `[M]` **Round-trip test.** The browser test applies the Landing template,
      creates real tablet, desktop and large-desktop overrides, loads its
      generated HTML and CSS in a second page, and compares every emitted
      rendered CSS property against the canvas at 375, 768, 1024 and 1440px.
      It exposed two production mismatches: container padding and gap were
      being erased by editor CSS, and the labelled artboard width included its
      border while an exported viewport does not. Both are fixed. Editor-only
      drag cursors are explicitly outside the visual comparison.
      *Verified by:* deliberately restoring the artboard sizing bug; the gate
      failed on the exact two-pixel width difference, then passed after the
      regression was reverted. ✅

**Milestone done when:** you export the Landing template, open it in a browser,
and it matches the canvas at every breakpoint — and you'd be happy to hand the
CSS to someone else.
**✅ Done.** The four-breakpoint browser comparison and readable-CSS gates are
both in CI and have each caught a deliberate regression.

---

## M2 — The box model, made visible

*Why third: this is the differentiator. It is also the least-built part of the
app — the padding handles exist as a file that nothing renders. Everything
above is table stakes; this is the reason Framly exists.*

- [ ] `[M]` **Box overlay on selection.** Margin, border, padding and content
      drawn on the canvas, colour-coded and labelled, always visible while an
      element is selected — not a panel you have to go find.
      *Done when:* selecting anything shows you its four boxes without a click.
- [ ] `[L]` **Drag the spacing.** Grab a padding or margin edge on the canvas and
      pull. Numbers update live; the overlay shows what's changing.
      Revive `PaddingHandles` properly and extend it to margin.
      *Done when:* you can set padding without touching the right-hand panel.
- [ ] `[M]` **A spacing scale.** 4 / 8 / 12 / 16 / 24 / 32 / 48 as the default
      choices, with free entry as a deliberate escape hatch.
      *Done when:* the default path produces consistent spacing and arbitrary
      values take one extra, obvious step.
- [ ] `[S]` **Plain language, with the real term underneath.** "Space inside ·
      `padding`". "Space outside · `margin`". Beginners understand it; everyone
      learns the vocabulary they'll need elsewhere.
      *Done when:* every control in the Layout section reads this way.
- [ ] `[M]` **Show the flow.** Indicate whether an element is in normal flow, and
      which direction its parent stacks children.
      *Done when:* it is obvious why an element landed where it did.

**Milestone done when:** someone who does not know what padding is can add it,
see it, and tell you its name — without reading any documentation.

---

## M3 — Accessible by construction

*Why fourth: promise #3. This is two jobs — the pages Framly makes, and Framly
itself. Do them together; it's the same skill and the same context.*

### The pages Framly makes

- [ ] `[M]` **Heading structure.** Offer the correct next level by default; warn
      on a skipped level; never let a page start at `h3` by accident.
- [ ] `[M]` **Alt text at insert time.** Ask when the image is added, with
      "decorative" as an explicit, respected choice — not an empty field.
- [ ] `[M]` **Live contrast in the colour picker.** Show the ratio and the AA
      verdict while choosing, not afterwards.
- [ ] `[M]` **Labels as a first-class field** on every form element, with the
      association generated automatically.
- [ ] `[S]` **Offer landmarks** when a page has no `header`/`nav`/`main`/`footer`.
- [ ] `[L]` **"Framly checks" panel.** A live list of issues in plain language,
      each linking to the element that caused it.

### Framly itself

- [ ] `[L]` **Burn down the axe baseline** in `tests/axe-baseline.json`: 20
      unnamed comboboxes and 12 unlabelled inputs in the Properties panel;
      `DOMTreePanel`'s invalid `role="tree"`; `aria-selected` on canvas
      elements with no role. Lower each number as you fix it — the gate keeps
      it there.
- [ ] `[L]` **A keyboard path for reordering.** Drag is currently the only way to
      move an element — WCAG 2.5.7 and 2.1.1. Elements carry `tabIndex={0}` with
      no handlers, producing a 121-stop tab order that does nothing.

**Milestone done when:** axe reports zero AA violations on both a page built in
Framly *and* on Framly itself, and CI keeps it that way.

---

## M4 — Styles you can reuse

*Why fifth: "class-based styling, no inline styles" is stated as a principle,
but the implementation generates a unique class per element — inline styles with
extra steps, producing exactly the bloat the CSS optimiser then exists to undo.
Fixing the cause removes a whole subsystem.*

- [ ] `[L]` **Shared classes.** Name a style, apply it to many elements, edit it
      once.
      *Done when:* changing `.card` restyles all nine cards.
- [ ] `[M]` **Refactoring.** Rename a class everywhere it's used; extract a class
      from an element that has ad-hoc styles.
- [ ] `[M]` **Retire per-element class generation** and delete the CSS optimiser
      that exists to compensate for it.
      *Done when:* the export contains one rule per style, not one per element.
- [ ] `[L]` **Rebuild components on shared classes.** The component system
      becomes meaningful once styles are shared rather than copied.

**Milestone done when:** the exported CSS for a nine-card page has one card rule.

---

## M5 — Precision for designers

*Only after M4. These are the things that make it pleasant for people who
already know what they're doing — worth nothing if the four promises above
aren't kept.*

- [ ] `[M]` Type scale and colour tokens
- [ ] `[M]` Alignment and distribution tools
- [ ] `[M]` Rulers and draggable guides
- [ ] `[M]` Interactive states (hover/focus/active) on any element, not just buttons
- [ ] `[L]` A component library worth browsing

---

## Parking lot

Not now. Each comes back when its condition is met — until then it does not
belong in a milestone and does not need thinking about.

| Idea | Comes back when |
|---|---|
| Website import + CSS scoping | After M4. It needs shared classes to import into. |
| PNG / PDF export | After M1, and only if someone actually asks. |
| React export | After M4. Two output formats before one is right is a trap. |
| Colour modes (light/dark/HC) | After M4. Needs colour tokens to be coherent. |
| Button designer as a separate tool | Dissolved into M5 "states on any element". |
| Animations and transitions | After M5. |
| Container queries, fluid type | After M5. |
| Advanced CSS functions (`clamp`, `calc`) | After M5. |
| Multi-page projects | Tabs work; don't extend them until M2 ships. |
| Accounts, sharing, collaboration | Only if local-first stops being the answer. |

---

## Graveyard

Deliberately not doing these. Recorded so they don't get re-proposed.

- **CSS optimiser** — solves a problem M4 removes at the source.
- **The second drag-and-drop implementation** — pick one, delete the other.
- **Absolute positioning as a layout mode** — this is the thing Framly exists
  not to do. Dragged elements may be explicitly positioned; that is the
  exception, and it stays an exception.

---

## Known truths

Things that are true and surprising. Written down so they aren't rediscovered.

- **Autosave runs every 30 seconds**, not the 5 seconds `CLAUDE.md` claims.
  A refresh within 30s of an edit loses it. (Worth revisiting — probably in M0.)
- **Undo history persists across reloads.** After a refresh, Ctrl+Z undoes the
  *previous session's* last action. Reversible with Ctrl+Y. This is by design;
  one line in `ensureBaseline` changes it if you'd rather it didn't.
- **Vite does not typecheck.** `npm run build` succeeding says nothing about
  types — which is why CI runs `npm run check` separately.
- **28 vendored `components/ui/*` files are unused** and deliberately kept: they
  are a library surface, several are wanted for the M2/M3 interface work, and
  they are tree-shaken out of the bundle. `tests/deadcode.spec.ts` exempts them.
  Deleting them would only pay off alongside dropping the matching Radix
  dependencies, which is its own decision.
- **Dead files cost nothing at runtime.** Removing all 24 shrank the bundle by
  ~2KB, all of it the `console.log` calls in live files; the files themselves
  were already tree-shaken. The reason to delete them is what you have to hold
  in your head, not bundle size.
- **The code generator must stay DOM-optional.** It is a pure transformation and
  is tested in Node; reaching for `DOMParser` or `document` in it breaks that
  and forecloses ever running an export outside a browser.
- **Element `x`/`y` are usually `undefined`** — elements live in document flow,
  which is the point. Treat a defined `x`/`y` as the unusual case.
- **The canvas renders `element.htmlTag`** and always did; only the exporter
  used to ignore it.
- **A breakpoint switch straight after typing a value can be lost.** Type in a
  property field, then click the breakpoint switcher in the status bar: the
  menu opens but the item is replaced under the pointer as the panel
  re-renders, so the click does nothing and you have to repeat it. Measured,
  not inferred — `aria-expanded` stays `false`, and a second click works.
  Memoising the element handed to `PropertyInput` reduced the render churn but
  did not remove the race, so it is still open. `tests/responsive.spec.ts`
  retries the menu rather than pretending it is reliable.
- **Style keys are camelCase everywhere**, because the canvas hands them
  straight to React. Anything writing a real stylesheet has to convert them —
  and a browser does not just skip `backgroundColor: #fff`, it abandons the
  rest of the rule.
- **A gate can pass because the thing it checks is empty.** The exported-page
  axe test was green for months while the export shipped no CSS at all: with no
  colours, contrast was measured against browser defaults. It only became a
  real contrast check once the stylesheet worked.
- **Default styles can contradict themselves.** Several element types set
  `marginBottom` and then `margin`, so the shorthand wins and the margin is
  always zero. The canvas and the export agree — React applies them in the same
  order — so it is not an export bug, but it is a wart to clean up when the
  spacing scale lands in M2.
