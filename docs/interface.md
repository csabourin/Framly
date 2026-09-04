# Framly — interface direction

Rendered proposal: **`docs/interface-proposal.html`** — open it in a browser.
Also published at
<https://claude.ai/code/artifact/53e406a7-bce7-4538-a8b5-384a0d99f668>.

Everything needed to build this is in this file; the mockup shows how it looks,
it is not a dependency.

## The direction: a drafting table

Framly's subject is the box model — a measured, nested drawing. So the
interface borrows the discipline of a technical drawing rather than the look of
a SaaS dashboard: hairlines instead of shadows, annotation type, real
dimensions, and restraint everywhere except where information lives.

Three rules carry the whole thing.

### 1. Colour always means something

Colour is never decoration in Framly. It is reserved:

| Hue | Means | Appears |
|---|---|---|
| `#D99A3C` amber | margin | box overlay only |
| `#77879A` slate | border | box overlay only |
| `#56996B` green | padding | box overlay only |
| `#5688D6` blue | content | box overlay only |
| `#3F7D53` / `#A9761E` / `#A8412F` | pass / warn / fail | checks only |

Those four box hues are the code Chrome and Firefox dev tools already use. We
inherit it deliberately: it is the code our users will meet the day they open
dev tools, so learning Framly is learning the real thing.

**Everything else is ink on paper.** Primary buttons, the selection edge, focus
rings, active tool states: all `--ink`. There is no brand hue and no gradient.

This is not a style preference. In a design tool the chrome must not compete
with the user's work — if the interface is purple, you cannot judge your own
colours. The only saturated things on screen should be the user's design and
the measurement of it.

### 2. Plain language leads, the CSS term follows

Every control in the inspector reads:

> **Space inside**
> `padding`

Sans for the human phrase, mono for the property. A beginner is never blocked
by jargon; by the fourth time they see it they have learned the real word. This
single pattern is the "beginners *and* designers" brief solved typographically,
and it costs one line of markup per control.

### 3. The box is drawn, not reported

Selecting an element draws its four boxes in place on the canvas, with a
dimension line and real numbers — the way a drawing is dimensioned. You drag
the bands directly; the numbers follow. Spacing offers a scale
(4 · 8 · 12 · 16 · 24 · 32 · 48) with free entry one deliberate click away.

The selection edge is `1.5px` ink, never a hue: it has to stay legible over
whatever the user has designed, including a blue button.

---

## Tokens

Drop-in replacements for the current palette. Light values shown; the dark set
is in the rendered proposal.

```css
:root {
  /* Neutrals — cool-biased, the grey of drafting stock */
  --paper:       #FFFFFF;  /* panel surfaces */
  --paper-2:     #F7F8F6;  /* wells, inputs */
  --ground:      #E8EAE6;  /* canvas backdrop */
  --rule:        #D9DCD7;  /* hairlines */
  --rule-strong: #BFC4BD;

  --ink:         #191C1A;  /* text, primary actions, selection, focus */
  --ink-2:       #5A605C;
  --ink-3:       #8C938E;
  --ink-inv:     #F7F8F6;

  /* Reserved — see table above */
  --box-margin:  #D99A3C;
  --box-border:  #77879A;
  --box-padding: #56996B;
  --box-content: #5688D6;
  --ok: #3F7D53;  --warn: #A9761E;  --stop: #A8412F;

  --r-control: 4px;   /* buttons, inputs, chips */
  --r-panel:   6px;   /* panels, popovers */

  --t-fast: 120ms;    /* state change */
  --t-move: 180ms;    /* layout change */
}
```

Contrast: `--ink` on `--paper` is 17.0:1; the amber `--warn` and green `--ok`
both clear AA on `--paper-2`.

**Elevation:** one shadow token, used only for things that genuinely float
(popovers, menus, modals). Panels are separated by `1px solid var(--rule)`.
Nothing else gets a shadow.

**Radii:** 4px on controls, 6px on panels. Not 16px. Softness comes from
spacing, not corners.

## Type

IBM Plex Sans + IBM Plex Mono. Plex was drawn for an engineering company and
the mono is by the same hand, so the pairing is one decision rather than two.
Both are already permitted by the CSP and load from Google Fonts.

| Role | Spec |
|---|---|
| UI default | Plex Sans 13 / 1.5 |
| Panel titles | Plex Sans 15 / 500 |
| Values, CSS terms, dimensions | Plex Mono 11 |
| Annotations (section labels) | Plex Mono 10, `+0.09em`, uppercase |
| Modal titles | Plex Sans 20 / 600 |

Numbers that line up in columns get `font-variant-numeric: tabular-nums`.

## Layout — four surfaces, not six

Today: header, icon rail, tree panel, canvas, inspector, tab bar, status bar.

```
┌──────────────────────────────────────────────────────────────┐
│ Framly │ Project │ Phone Tablet Laptop Desktop │ Checks · Export │
├────────────┬──────────────────────────────┬──────────────────┤
│ Insert     │                              │ Button    button │
│ / Layers   │         C A N V A S          │ ──────────────── │
│            │      (largest thing on       │ Content          │
│ Search     │          the screen)         │ Box              │
│ Text    p  │                              │ Appearance       │
│ Heading h2 │      ▓ margin                │ Checks           │
│ Button     │      ▓ border                │                  │
│ …          │      ▓ padding  ◄─ 44px      │                  │
│            │      ▓ content               │                  │
└────────────┴──────────────────────────────┴──────────────────┘
```

- **Top rail.** Project name, breakpoints, checks, preview, export. Nothing
  else. **Breakpoints move up out of the status bar** — it is the control you
  reach for most and it belongs beside the thing it changes.
- **Left.** One panel toggling Insert / Layers, not two competing panels.
  Elements are **named**, with their tag in mono: `Heading · h2`. Nobody
  guesses a glyph for `<article>`. Six common elements visible, the rest behind
  a search field.
- **Centre.** The canvas, dominant. Neutral ground so the white artboard reads.
- **Right.** Inspector, ordered **Content → Box → Appearance → Checks**: what it
  says, then the space around it, then how it looks. Not CSS spec order.
- **The status bar goes.** Its one useful control moved up; element counts are
  not information.

## Checks: a conscience, not a report

The rail carries a live count. Problems are stated where they happen, in the
words of the consequence rather than the rule:

> ⚠ This page jumps from **Heading 1** to **Heading 3**. Screen readers use
> that order to navigate. **Make it Heading 2 →**

Not "WCAG 1.3.1 violation". Every check ends in a verb so the fix is one click,
not homework. Contrast is shown live while picking a colour, not audited after.

## What goes

| Removed | Because |
|---|---|
| Blue→purple gradients | Decoration that competes with the user's work |
| Emoji in the UI | `✅ Element selected - Ready to style!` is a placeholder that shipped |
| Shadows on every surface | Depth should mean one thing: this floats above |
| `rounded-2xl` everywhere | 4px / 6px. Softness comes from spacing |
| Icon-only tool rail | Sixteen unlabelled glyphs is a memory test |
| The status bar | One control promoted, the rest was telemetry |
| "Class Editing" as the default panel | CSS vocabulary before the user has made anything |

## Sequencing

This is a direction, not a rewrite. It lands alongside the roadmap in
`TODO.md`, not instead of it:

- **Tokens, type, radii, shadows** — mechanical, and can happen any time.
- **Four-surface layout + named insert list** — best with M2, when the canvas
  becomes the centre of attention.
- **Box overlay, dimension lines, spacing scale** — *is* M2.
- **Plain-language labels** — M2 task, one line per control.
- **Checks panel and inline notes** — M3.
