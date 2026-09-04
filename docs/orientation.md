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
| **Undo history persists across reloads** | Matches the documented design. After a refresh Ctrl+Z undoes the *previous session's* last action, and Ctrl+Y restores it. One line in `ensureBaseline` changes this if it ever feels wrong. |
| **M1 opens on its two small tasks** | Nothing depends on the order, and opening a milestone on an `[L]` is a wall. |
| **The CSS optimiser is scheduled for deletion, not maintenance** | It exists to undo bloat caused by generating one class per element. M4 fixes the cause. Do not invest in it. |
| **Templates avoided form elements** | They would have exported as `<div>`. **This is now unblocked** — `getHTMLTag` emits real tags, so a form or contact template is straightforward whenever it is wanted. |
| **Minifying is off by default in the export dialog** | It used to be on, and it was never applied, so nobody had met the behaviour. Promise #1 is code a programmer would sign off; that is the readable version. Minifying is now something you choose. |
| **The CSS optimiser is out of the export path** | It was the source of the classes the stylesheet did not define. It still backs `cssClassGenerator` and its own modal, so nothing was deleted — but an export no longer goes near it, which is one less thing M4 has to unpick. |
| **One class per element, still** | Fixing the export was not the moment to change what the editor produces. The generator now writes a rule for the class the markup actually carries, whatever that class is. Shared classes remain M4. |

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
- **Autosave is 30 seconds, not 5.** The docs said 5 for a long time. A refresh
  within 30s of an edit loses it.
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

---

## Open, and deliberately so

- **No analytics.** The largest gap. See the top of this file.
- **`server/import-service.ts` is dead** — imported by nothing, its jsdom import
  commented out. The dead-code guard only scans `client/src`, so it is not
  caught. Delete it, or widen the guard.
- **Inter still loads from Google's CDN.** Non-blocking now, so a failure is
  invisible, but self-hosting would remove the third-party dependency entirely.
- **One class per element** is generated, which is inline styling with extra
  steps and the reason the CSS optimiser exists. Shared classes are M4. Do not
  build further on per-element classes before then.
- **The Button Designer has no way to create a design.** `ButtonPreview` and
  `ButtonDesignList` were imported nowhere and were deleted; the dialog renders
  only `ButtonTestingMode`, which shows "No button designs created yet". The
  feature is a shell.
- **`package.json` declares seven unused dependencies** (`drizzle-orm`,
  `@neondatabase/serverless`, `express-session`, `passport`, `zod`, `date-fns`,
  `jsdom`) and a `db:push` script pointing at a config that does not exist.
  Harmless, but they describe an architecture that was never built.
