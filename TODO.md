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

**M0.4 — Delete the dead code.** One sitting, and it permanently lowers how
much you have to hold in your head. CI is now watching, so it is safe to cut.

---

## M0 — Make it stay fixed

*Why first: four features silently broke and shipped before anyone noticed.
Until something checks, everything below will rot at the same rate it's built.*

- [x] `[S]` **CI: typecheck + build on push.** `.github/workflows/ci.yml` runs
      `npm run check` and `npm run build` on every branch and PR.
- [x] `[M]` **Playwright + axe harness — 25 tests.** `npm test` builds the
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
- [ ] `[S]` **Delete dead code.** `ButtonPreview` and `ButtonDesignList` (imported
      nowhere), `en_backup.json`, `en_old.json`, one of the two drag-and-drop
      implementations, the `canvas/setProject` dispatch with no reducer, and the
      ~80 `console.*` calls.
      *Done when:* nothing in `src/` is unreachable from `main.tsx`.
- [ ] `[S]` **Remove `maximum-scale=1`** from the viewport meta. It blocks
      pinch-zoom — a WCAG 1.4.4 failure, and a two-minute fix.
      *Done when:* you can pinch-zoom Framly on a phone.

**Milestone done when:** you can break something on purpose and CI tells you.
*(The two gates above were verified this way. Two tasks left below.)*

---

## M1 — Output a programmer would sign off

*Why second: this is promise #1, and it is the only promise that is currently
half-kept. Semantic tags now export correctly; the CSS around them does not.*

- [ ] `[L]` **Real media queries, mobile-first.** Editing at a breakpoint writes
      base rules plus `@media (min-width: …)` overrides, not four parallel
      copies. Controls show whether a value is inherited or overridden here.
      *Done when:* setting a colour at base applies everywhere; changing it at
      `md` produces exactly one media query and no duplicate base rule.
- [ ] `[S]` **Apply the export settings.** `includeResponsive`, `minifyCSS` and
      `includeComments` are collected and thrown away.
      *Done when:* unchecking "minify" visibly changes the downloaded CSS.
- [ ] `[S]` **Export the active tab only**, with the CSS file named after the
      project.
      *Done when:* exporting from Tab A never contains Tab B's markup.
- [ ] `[M]` **CSS a human can read.** Stable, meaningful class names instead of
      `el-4pinocqwb`; rules grouped by element; no duplicated declarations.
      *Done when:* you can open the exported CSS and find the hero's styles
      without searching.
- [ ] `[M]` **Round-trip test.** Export a template, load the files in a browser,
      compare against the canvas at all four breakpoints.
      *Done when:* the test runs in CI and catches a deliberate regression.

**Milestone done when:** you export the Landing template, open it in a browser,
and it matches the canvas at every breakpoint — and you'd be happy to hand the
CSS to someone else.

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
- **The code generator must stay DOM-optional.** It is a pure transformation and
  is tested in Node; reaching for `DOMParser` or `document` in it breaks that
  and forecloses ever running an export outside a browser.
- **Element `x`/`y` are usually `undefined`** — elements live in document flow,
  which is the point. Treat a defined `x`/`y` as the unusual case.
- **The canvas renders `element.htmlTag`** and always did; only the exporter
  used to ignore it.
