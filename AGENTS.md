# Framly — Instructions for product and implementation agents

## Product purpose

Build a web design tool that beginners can understand, designers can work in fluently, and developers can maintain after export.

Framly uses real HTML and CSS layout. Its distinguishing quality should be that users can understand what controls their design, predict what an edit will affect, and recover easily from mistakes.

Preserve these priorities, in order:

1. Produce correct, semantic, accessible, maintainable output.
2. Make the web’s box model and layout relationships visible.
3. Make common tasks predictable and mistakes easy to repair.

## Work within the existing product

Before implementation, read the repository’s agent instructions, `TODO.md`, and the relevant implementation. Before interface changes, read `docs/interface.md` and inspect the existing interface proposal.

Follow the roadmap’s sequence. Add proposed future work to its parking lot with a condition for revisiting it. Do not turn an individual improvement into an unrelated redesign.

Preserve working behavior and established architectural constraints, including local-first storage, mobile-first breakpoint overrides, consistent canvas/export rule ordering, and the DOM-independent code generator.

Do not describe a feature as unique without verifying the comparison. Demonstrate Framly’s value through better behavior.

## 1. Explain why the layout looks this way

A selected element should reveal the relationships controlling its size and position.

Provide contextual explanations such as:

- “Width fills the parent.”
- “Height grows with the text.”
- “The parent places these items in a row.”
- “This image’s minimum width prevents the row from shrinking.”
- “This value comes from the shared Card style.”

Make explanations actionable: selecting one should reveal or highlight the controlling element or setting.

Use browser layout and actual style provenance as evidence. Never invent a plausible explanation from appearance alone.

**Done when:** a user can identify the cause of a layout problem and reach the relevant control without searching unrelated panels.

## 2. Give every gesture a predictable meaning

Distinguish moving an item within document flow, changing its parent, resizing its box, adjusting spacing, and intentionally positioning it outside normal flow.

During dragging:

- Highlight the destination parent.
- Show the insertion point and a preview of the resulting layout.
- Describe the operation where ambiguity remains: “Inside Hero, after Heading.”
- Explain rejected drops and suggest a valid nearby action.

Do not silently change sizing modes or introduce absolute positioning to preserve a screenshot-like arrangement.

Preserve explicit user settings when changing layout direction or structure. If settings conflict, explain the conflict and offer a reversible adjustment.

**Done when:** the drop matches its preview, and one undo restores the complete previous state.

## 3. Show who owns each space

Make padding, border, margin, and parent gap distinguishable on the canvas.

Use plain language alongside the real CSS term:

- “Space inside · padding”
- “Space between items · gap”
- “Space outside · margin”

A gap handle must edit the parent’s gap. A padding handle must edit the selected box’s padding. Do not simulate shared spacing through unrelated child margins.

Show both the applied rule and the resulting measurement when they differ. Account for margin collapsing, distributed free space, and layout constraints.

Offer the spacing scale as a convenient default, with an obvious custom-value option.

Follow the interface’s semantic color rules. Labels and interaction cues must remain understandable without color.

**Done when:** users can adjust internal spacing and spacing between siblings directly, and the resulting CSS expresses the intended relationship.

## 4. Make the scope of an edit explicit

Before a consequential edit, make these answers available:

1. Where does the current value come from?
2. What will this edit change?
3. Which elements and viewport widths will it affect?

Distinguish local styles, shared classes, component defaults, instance overrides, and breakpoint overrides.

Use concrete descriptions such as “Shared style · 12 instances” and “Tablet override · applies until another rule overrides it.”

Structural changes affect the shared document. Do not imply that moving an element in the tree only affects the currently previewed breakpoint.

Preserve the single writing path for breakpoint changes. Editing a larger breakpoint must never accidentally modify the mobile base.

Provide explicit reset actions that name the override being removed.

**Done when:** a user can predict an edit’s reach, inspect affected elements, and remove an override without damaging its source.

## 5. Design for changing widths and content

Treat breakpoint presets as editing conveniences. The page must behave sensibly between them.

Support continuous viewport resizing and, when reached in the roadmap, reversible content stress previews for:

- Longer headings and body text.
- Additional repeated items.
- Missing images or optional content.
- Enlarged text.

Stress previews must not overwrite project content.

When overflow occurs, identify the responsible element or constraint. Offer specific alternatives such as wrapping, allowing shrinkage, or stacking items, with previews.

Do not silently hide overflow, shrink text, or duplicate content to make a preview appear correct.

**Done when:** a user can discover and repair a failure at an intermediate width, and the exported page behaves the same way.

## 6. Keep reuse predictable

Separate shared appearance, variable content, and local exceptions.

Users should be able to change a card’s content without losing shared typography, spacing, and future component updates.

When rebuilding components:

- Make editable content regions explicit.
- Show overridden properties individually.
- Allow individual resets.
- Preview the effect of shared changes.
- Preserve local content when updating shared appearance.

Do not silently detach instances. Do not merge styles merely because two elements currently look identical.

Follow the roadmap’s shared-class work instead of extending the existing one-class-per-element workaround.

**Done when:** changing one instance’s content preserves its connection, and updating a shared style changes the expected instances without erasing local content.

## 7. Keep essential controls discoverable

Keep relevant sizing mode, dimensions, layout direction, spacing, and editing scope readily visible.

Use compact, resizable panels and clear navigation through nested elements. Provide breadcrumbs and a reliable way to select the parent.

Reveal advanced controls progressively. Beginners and experienced users must edit the same document model; avoid separate modes that produce different underlying structures.

Use meaningful default names and straightforward renaming.

Essential actions must work by keyboard and must not depend exclusively on hover, dragging, or color.

**Done when:** common layout adjustments require no hidden gesture, and deeply nested elements can be selected without repeated trial and error.

## 8. Make exported code a maintained product

Treat HTML/CSS export as a primary output.

Require:

- Semantic elements appropriate to their purpose.
- Meaningful, stable class names.
- Shared styles where reuse is intentional.
- Predictable rule ordering matching the canvas.
- No unnecessary wrappers, duplicate declarations, or editor artifacts.
- Required assets and clearly disclosed external dependencies.
- No Framly service dependency for exported static layout and content.

A small design edit should produce a small, understandable code change. Avoid renaming unrelated classes or rewriting unrelated rules during export.

Verify the exported files in a browser independently of the editor. Do not imply that optional export formats are maintained unless they receive equivalent validation.

**Done when:** a developer can locate and change a section’s styles, and the exported result matches the canvas across representative widths and states.

## 9. Make guardrails helpful and honest

Explain problems at the moment they occur, name the affected element, and offer a concrete repair.

Prefer “This would place a button inside another button. Place it alongside instead?” to a generic rejection.

Use semantic and accessible defaults. Provide appropriate guidance for image purpose, form labels, headings, keyboard behavior, focus, and contrast.

Preserve the automated accessibility gates. Describe their result accurately: zero detected violations is not proof of complete WCAG conformance.

Include human verification for behavior that automated tools cannot establish, such as meaningful alternative text, logical reading order, and usable keyboard interactions.

Do not silently alter content or flatten design choices to satisfy a check.

**Done when:** the user understands the problem and can apply or undo a specific repair.

## 10. Protect confidence in experimentation

Make saving and recovery dependable.

Address the documented autosave loss window through durable local persistence. Show “Saved” only after persistence succeeds; surface failures clearly.

Preserve undo across sessions. Treat each complete user action as one undoable operation, including actions that update multiple properties.

When evolving saved project formats, preserve recoverable originals and verify migration behavior.

Favor responsive direct manipulation. Keep expensive analysis out of the critical drag and typing paths.

**Done when:** acknowledged saved edits survive reload, compound actions undo cleanly, and trying a different layout does not put existing work at risk.

## Implementation and validation discipline

For each change:

1. Identify the concrete frustration and reproduce the current behavior.
2. Define the intended user-visible outcome.
3. Implement the smallest complete improvement consistent with the architecture.
4. Check keyboard access, undo behavior, responsive scope, and export where affected.
5. Run the relevant repository checks.
6. Report what changed, how it was verified, and any remaining limitation.

Add meaningful regression coverage for layout rules, persistence, shared styles, and export behavior. Avoid tests that merely mirror implementation details.

Use beginner and designer task sessions to validate usability. Observe unexpected changes, repeated undo, help requests, and whether users can explain the outcome.

Judge success by whether users can **predict, understand, and revise a real web layout while producing code that remains useful outside Framly**.