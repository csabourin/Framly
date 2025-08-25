# Design Tool Development TODO

This document outlines the development roadmap for the WYSIWYG web design tool, organized by priority levels from critical fixes to enhancement features.

## P0 — Critical / Correctness Issues

### 🔧 Persistent Units for All CSS Properties
**Goal:** Selected elements must keep (and show) their chosen units (px, %, rem, em, vw, vh, etc.) across all editable properties.

**Implementation Tasks:**
- [X] Create `getActiveUnit(propertyName, elementId)` utility function
  - [X] Read element's computed style or stored CSS class token
  - [X] Resolve unit for property (default to app-wide unit if unset)
- [X] Bind properties panel controls to unit resolver
- [X] Store chosen unit alongside value in Redux slice for style editing
- [X] Serialize units into CSS classes in IndexedDB

**Acceptance Criteria:**
- [ ] Switching element selection never resets units to px
- [ ] Changing unit on margin-left does not affect width (units are per property)
- [ ] Undo/redo preserves units and values
- [                                           ] Reloading app restores units exactly as last saved

<!-- Implementation Note: This affects PropertiesPanel.tsx, PropertyInput.tsx, and the CSS generation system -->

### 📤 Export Button Behavior (Tab-Scoped HTML + Project-Named CSS)
**Goal:** Export only the current tab's HTML; CSS filename must equal the project name.

**Implementation Tasks:**
- [ ] Hook Export action to active tab route (Wouter) and canvas state snapshot
- [ ] Generate HTML for active document tree only
- [ ] Generate single CSS file named `<projectName>.css`

**Acceptance Criteria:**
- [ ] Exporting on Tab A never includes Tab B content
- [ ] Downloaded CSS is `<projectName>.css`
- [ ] Re-importing the exported pair renders identically

<!-- Implementation Note: Requires updates to export functionality and HTML/CSS generators -->

### 🎨 Canvas Reflects `<body>` CSS
**Goal:** The Canvas visual equals `<body>` styling.

**Implementation Tasks:**
- [ ] Apply computed `<body>` class tokens to canvas host
- [ ] Mirror background, color, font, line-height from `<body>` into canvas root

**Acceptance Criteria:**
- [ ] Body background set in app instantly appears in canvas
- [ ] Exported HTML/CSS renders the same look outside the app

<!-- Implementation Note: This affects Canvas.tsx and the CSS application system -->

### 📍 Insertion Rules on Invalid Recipients
**Goal:** When dropping onto an invalid recipient, element inserts before or after target based on mouse position.

**Implementation Tasks:**
- [ ] Implement drag-over logic for invalid recipients
- [ ] Use bounding box midpoint: upper half → insert before, lower half → insert after
- [ ] Show clear placement indicator (line/ghost)

**Acceptance Criteria:**
- [ ] Dropping on `<span>` or locked instance still inserts above/below consistently
- [ ] Undo/redo preserves exact position

<!-- Implementation Note: This affects Canvas.tsx insertion detection logic -->

### 🎯 Insert in Canvas Padding = Top/Bottom of DOM
**Goal:** Dropping in upper padding inserts at document top; lower padding inserts at bottom.

**Implementation Tasks:**
- [ ] Create two drop zones mapped to document start/end
- [ ] Maintain visual affordances at top/bottom

**Acceptance Criteria:**
- [ ] Dropping in top gutter inserts at index 0
- [ ] Dropping in bottom gutter appends to the end

<!-- Implementation Note: Requires canvas padding detection and insertion zone logic -->

## P1 — High Priority / UX & Platform

### 📱 Breakpoints = Real Media Queries (Mobile-First)
**Goal:** Setting properties with breakpoint active writes properties into mobile‑first cascade using media queries.

**Implementation Tasks:**
- [ ] Maintain breakpoint context (base, sm, md, lg, xl)
- [ ] When editing in md, write base rules for mobile-first and overrides in `@media (min-width: md)`
- [ ] CSS generator merges per-breakpoint tokens into minimal output

**Acceptance Criteria:**
- [ ] Color set at base applies everywhere unless overridden at larger breakpoints
- [ ] Switching breakpoints updates which controls are "active/overridden"
- [ ] Exported CSS contains correct `@media` blocks with no duplicate base rules

### 🌐 i18n (EN/FR) Across the Interface
**Goal:** Full bilingual UI.

**Implementation Tasks:**
- [ ] Integrate react-i18next
- [ ] Create `en.json` and `fr.json`; wrap all strings with `t()`
- [ ] Persist user language in settings (IndexedDB)
- [ ] Auto-detect from browser with manual override

**Acceptance Criteria:**
- [ ] Language switch instantly updates all UI, tooltips, dialogs, validation messages
- [ ] New tabs and dialogs open in selected language

### 🔗 Import Web Page + CSS Scoping (Fix Broken Flow)
**Goal:** Import external HTML+CSS and scope styles so they don't leak.

**Implementation Tasks:**
- [ ] Parse HTML into element tree, mapping unknown tags to known element types
- [ ] Generate unique data-attribute (e.g., `data-scope="imp-xxxxx"`) on imported root
- [ ] Rewrite selectors to `:where([data-scope="imp-xxxxx"] ...)` to minimize specificity
- [ ] Resolve URL assets; inline small assets (<= 2MB) into IndexedDB

**Acceptance Criteria:**
- [ ] Imported styles affect only imported content
- [ ] No collisions with app UI or other tabs
- [ ] Export maintains selectors without app-internal prefixes

<!-- Implementation Note: This fixes the existing WebsiteImport.tsx functionality -->

### 🌳 Element Tree Toggle Button Relocation
**Goal:** Place Element Tree toggle next to Component Panel toggle, show at right side.

**Implementation Tasks:**
- [ ] Move toggle control into right-hand toolbar cluster
- [ ] Preserve keyboard shortcut unchanged

**Acceptance Criteria:**
- [ ] Visual order matches spec; click toggles Element Tree panel

### ✏️ Tabs: Rename by Double-Click
**Goal:** Double-click tab label to rename.

**Implementation Tasks:**
- [ ] Implement `dblclick` → inline edit input with focus trapping
- [ ] Handle Enter/Escape keys
- [ ] Persist to Redux + IndexedDB
- [ ] Validate uniqueness per project

**Acceptance Criteria:**
- [ ] Names update instantly across UI and in export
- [ ] Undo/redo returns previous name

### 🏷️ Semantic Elements Parity with Rectangle (div)
**Goal:** nav, section, main, aside have same properties and behaviors as div.

**Implementation Tasks:**
- [ ] Ensure element model exposes same editable property groups for semantic elements
- [ ] Ensure recipient rules allow children consistent with HTML semantics
- [ ] Don't restrict styling capabilities

**Acceptance Criteria:**
- [ ] Selecting `<nav>` shows full properties set
- [ ] CSS generation emits correct tag selectors or class tokens identically to div

## P2 — Medium Priority / Power-User Features

### 🎨 Advanced CSS Custom Properties System
**Goal:** Real cascading CSS variables with scope management and visual editing interface.

**Implementation Tasks:**
- [ ] Create variable definition panel with scope selector (global, component, element)
- [ ] Support variable inheritance and cascade behavior matching real CSS
- [ ] Visual variable editor with color pickers, unit selectors, and type validation
- [ ] Auto-complete for variable references in property inputs
- [ ] Variable usage tracking and dependency visualization

**Acceptance Criteria:**
- [ ] Variables defined at component level cascade correctly to children
- [ ] Changing variable value updates all references instantly in canvas
- [ ] Export generates proper `:root` and scoped variable declarations
- [ ] Undo/redo works correctly with variable definitions and references

### 🌓 Color Modes Support (Light/Dark/High-Contrast)
**Goal:** Native support for system color modes with design-time preview.

**Implementation Tasks:**
- [ ] Add color mode toggle to toolbar (light/dark/auto/high-contrast)
- [ ] Extend color picker with mode-specific values
- [ ] Preview mode switcher in canvas toolbar
- [ ] Export generates proper `@media (prefers-color-scheme)` queries
- [ ] Support `prefers-contrast` and `forced-colors` media queries

**Acceptance Criteria:**
- [ ] Elements can have different colors per mode
- [ ] Canvas accurately previews selected mode
- [ ] Exported CSS works with system preferences
- [ ] High-contrast mode meets WCAG AAA requirements

### ✨ Interactive State Design System
**Goal:** Design hover, focus, active, and loading states for all interactive elements.

**Implementation Tasks:**
- [ ] Extend button states to links, inputs, and custom interactive elements  
- [ ] Add loading/error/success state variants
- [ ] State transition preview with timing controls
- [ ] Bulk state application across similar elements
- [ ] State inheritance from parent components

**Acceptance Criteria:**
- [ ] All interactive elements support standard pseudo-states
- [ ] Loading states can show spinners, skeletons, or custom content
- [ ] State transitions preview smoothly in canvas
- [ ] Export generates complete CSS with all pseudo-selectors

### 🧩 Component Editing via Tabs (Double-Click to Open)
**Goal:** Double-clicking component instance opens new component editor tab with ghost root.

**Implementation Tasks:**
- [ ] Create tab keyed by component id when not already open
- [ ] Editor uses isolated canvas with ghost root; lock external context
- [ ] On save/close: increment component version, propagate updates to all instances

**Acceptance Criteria:**
- [ ] Double-click on instance opens component tab
- [ ] Saving updates every instance; detach instances remain unchanged
- [ ] Closing via (X) behaves like save-or-discard (prompt on dirty state)

### 📏 Component Size Inherits Content
**Goal:** Newly inserted component sizes to its content (no arbitrary fixed size).

**Implementation Tasks:**
- [ ] Default display to `display: block` with no fixed width/height
- [ ] Allow content/intrinsic sizing
- [ ] Apply explicit size constraints only if component's first render has them

**Acceptance Criteria:**
- [ ] Inserting component wraps snugly around content unless user sets dimensions

### 🎛️ Button State Gallery — Full Gallery + Functional Preview
**Goal:** Show all button states side‑by‑side and allow interactive preview.

**Implementation Tasks:**
- [ ] Grid view with tiles for default, hover, active, focus, disabled
- [ ] Toggle "Auto-cycle" demo and manual state testing (mouse/keyboard/focus)

**Acceptance Criteria:**
- [ ] Styles per state render exactly as defined
- [ ] Copy/export produces CSS for all states

<!-- Implementation Note: This enhances the existing button design system -->

### 📐 Rulers (Horizontal & Vertical) with Configurable Units + Selection Markers
**Goal:** Add top/left rulers showing position with app's unit system; show markers for selected element bounds.

**Implementation Tasks:**
- [ ] Ruler overlays synced with canvas scroll/zoom
- [ ] Unit config sourced from new units system; update ticks on zoom
- [ ] Selection draws ticks/lines along rulers at element edges

**Acceptance Criteria:**
- [ ] Zooming updates tick density
- [ ] Selecting element shows correct markers on both rulers

### 📏 Draggable Guides from Rulers (Show/Hide/Lock)
**Goal:** Create guides for alignment; lockable and per‑tab persistent.

**Implementation Tasks:**
- [ ] Drag from ruler to create guide; double‑click ruler removes nearest guide
- [ ] Context menu: hide/show all, lock/unlock all
- [ ] Snap elements to guides (with modifier to ignore)

**Acceptance Criteria:**
- [ ] Guides persist in IndexedDB per tab
- [ ] Elements snap within small threshold; locked guides not draggable

### 🧮 Advanced CSS Functions Support
**Goal:** Native support for calc(), min(), max(), clamp(), and other CSS functions.

**Implementation Tasks:**
- [ ] Add function builder UI for complex value expressions
- [ ] Support calc() with mixed units and variables
- [ ] Clamp() editor with min/preferred/max inputs and visual preview
- [ ] Auto-completion for CSS function syntax
- [ ] Real-time preview of computed values in canvas

**Acceptance Criteria:**
- [ ] Functions render correctly in canvas matching browser behavior
- [ ] Complex expressions with nested functions work properly
- [ ] Export generates clean, optimized CSS function syntax
- [ ] Functions work correctly with responsive breakpoints

### 📱 Fluid Typography & Container Queries
**Goal:** Advanced responsive design with container-based breakpoints and fluid scaling.

**Implementation Tasks:**
- [ ] Container query editor with container selector and size breakpoints
- [ ] Fluid typography with min/max size scaling based on viewport/container
- [ ] Visual container boundary indicators in canvas
- [ ] Preview container at different sizes without changing viewport
- [ ] Export generates proper `@container` queries

**Acceptance Criteria:**
- [ ] Typography scales smoothly between defined breakpoints
- [ ] Container queries work independently of viewport media queries
- [ ] Canvas shows accurate container-based responsive behavior
- [ ] Generated CSS uses modern container query syntax

### 📝 Variable Content & Edge Cases
**Goal:** Design for real-world content variations and edge cases.

**Implementation Tasks:**
- [ ] Text overflow handling with truncation, ellipsis, and wrap options
- [ ] Dynamic content simulator with variable text lengths
- [ ] Missing image/media fallback design
- [ ] Tag/badge overflow handling with "+N more" patterns
- [ ] RTL language support and text direction switching

**Acceptance Criteria:**
- [ ] Elements handle very long and very short content gracefully
- [ ] Overflow behaviors match CSS specifications exactly
- [ ] Missing media shows designed fallback states
- [ ] RTL layouts mirror correctly with proper text alignment

## P3 — Robustness / Constraints

### 🎬 Animations & Transitions System
**Goal:** Design and preview CSS animations, transitions, and scroll-triggered effects.

**Implementation Tasks:**
- [ ] Transition editor with easing curves, duration, and delay controls
- [ ] Keyframe animation builder with timeline interface
- [ ] Scroll-triggered animation support (intersection observer based)
- [ ] Animation library with common presets (fade, slide, bounce)
- [ ] Performance impact visualization and optimization suggestions

**Acceptance Criteria:**
- [ ] Transitions preview accurately in canvas
- [ ] Complex keyframe animations play smoothly
- [ ] Scroll animations trigger at correct viewport positions
- [ ] Export generates optimized CSS with proper vendor prefixes

### 📺 Enhanced Media Support
**Goal:** Support for video, audio, and interactive media elements.

**Implementation Tasks:**
- [ ] Video element with poster frame design and controls styling
- [ ] Audio player with custom control design
- [ ] Media queries for different media types and capabilities
- [ ] Responsive image/picture element with multiple sources
- [ ] Background video support with performance considerations

**Acceptance Criteria:**
- [ ] Video elements show poster frames in canvas
- [ ] Media controls can be styled and positioned
- [ ] Responsive images switch sources correctly in preview
- [ ] Media elements export with proper HTML5 semantic markup

### 🖱️ Advanced Scrolling & Positioning
**Goal:** Support for complex scrolling behaviors and positioning modes.

**Implementation Tasks:**
- [ ] Sticky positioning with container constraints
- [ ] Scroll snap implementation with visual snap points
- [ ] Custom scrollbar styling for containers
- [ ] Fixed positioning with viewport-relative controls
- [ ] Smooth scrolling behavior configuration

**Acceptance Criteria:**
- [ ] Sticky elements behave correctly during canvas scrolling
- [ ] Scroll snap points are visible and functional in preview
- [ ] Custom scrollbars render consistently across browsers
- [ ] Fixed elements maintain position relative to viewport

### 📱 Device-Specific & Touch Considerations
**Goal:** Design considerations for touch interfaces and device capabilities.

**Implementation Tasks:**
- [ ] Touch target size validation and warnings (44px minimum)
- [ ] Hover state alternatives for touch devices
- [ ] Safe area respect for notched devices (env() CSS functions)
- [ ] Orientation change handling and landscape/portrait specific styles
- [ ] Keyboard navigation and focus indicators for accessibility

**Acceptance Criteria:**
- [ ] Touch targets meet accessibility guidelines
- [ ] Touch-friendly alternatives available for hover interactions
- [ ] Safe areas correctly respected on mobile preview
- [ ] Keyboard navigation works throughout the interface

### 🎛️ Display Type & Positioning Correctness
**Goal:** Ensure all display types and positioning modes work. Prevent abs-pos elements from being dragged outside canvas.

**Implementation Tasks:**
- [ ] Normalize controls for display, position, top/right/bottom/left, z-index
- [ ] Drag constraints: clamp element's bounding box to canvas bounds during drag
- [ ] Resize handles active for abs-pos elements; keep within canvas

**Acceptance Criteria:**
- [ ] Switching display/position reflect immediately in canvas and exported CSS
- [ ] Abs-pos elements cannot be lost off-screen; resize/drag feels unrestricted inside canvas

## Always-On Polish (Can Be Done Alongside)

### ♿ Element Insertion UX Feedback
**Goal:** Clear, accessible indicators for insertion points.

**Implementation Tasks:**
- [ ] High-contrast insertion line + ARIA live region
- [ ] Announce "Insert before X" / "Insert after X" / "Insert at top/bottom"

**Acceptance Criteria:**
- [ ] Screen readers announce insertion target
- [ ] WCAG 2.1 AA contrast confirmed

---

## Notes & Dependencies

### 🔄 State & Persistence
All new UI state and style tokens must round-trip through Redux Toolkit and IndexedDB (class-first model), and work with undo/redo.

### 📤📥 Export/Import
Keep HTML/CSS generators and parsers in sync with breakpoint, units, and scoping changes.

### ♿ Accessibility
Follow WCAG 2.1 AA—focus states, keyboard access (rename, toggles, drag alternatives), and ARIA where indicated.

### 🧪 Testing
Add unit tests for utilities (`getActiveUnit`, breakpoint serialization), and integration tests for export, import, and insertion rules.

---

## Implementation Priority Notes

**Start with P0 items** as they address critical correctness issues that affect core functionality.

**P1 items** significantly improve UX and platform capabilities.

**P2 items** add power-user features that enhance productivity.

**P3 items** focus on robustness and edge case handling.

Remember to update this TODO list as items are completed and new requirements emerge.

---

## 🚀 Extended Feature Roadmap (Web-Capable Design Features)

*Based on analysis of features commonly missing in design software but essential for modern web development*

### Future Considerations (P4 - Advanced/Experimental)

#### 🔄 Advanced State Management
- Form validation states (invalid, valid, required)
- Data loading patterns (skeleton, spinner, error, empty states)
- Progressive disclosure and conditional visibility
- Multi-step process states and progress indicators

#### 🌍 Advanced Responsive & Performance
- Network-aware design (slow connection fallbacks)
- Reduced motion respect (`prefers-reduced-motion`)
- Print-specific styles and page break controls
- Critical CSS identification and above-fold optimization

#### 🧩 Component System Extensions
- Slot-based composition patterns
- Component variants with design tokens
- Auto-generated style guides and documentation
- Component usage analytics and optimization suggestions

#### 🔗 Advanced Interactivity
- Form design with validation states and error handling
- Modal and overlay management with focus trapping
- Drag-and-drop interface design
- Complex navigation patterns (mega menus, breadcrumbs)

These extended features represent the cutting edge of what design tools could support to bridge the gap between design and development, enabling designers to work with real web platform capabilities rather than approximations.