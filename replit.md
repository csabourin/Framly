# Overview

This is a WYSIWYG (What You See Is What You Get) web design tool, allowing users to visually create web designs through a drag-and-drop interface. It provides real-time previews and code generation capabilities, enabling users to design responsive layouts, manage design elements, and export their creations as HTML/CSS or React components. The application emphasizes a local-first approach with IndexedDB for persistent storage of user workspaces, components, and custom CSS classes.

**Progressive Web App (PWA)**: The application is now fully PWA-compliant with offline functionality, installable across platforms, and optimized for mobile and desktop use.

# User Preferences

Preferred communication style: Simple, everyday language.

## Design Tool Principles
- **DOM Flow Integrity**: Elements must position exactly like real HTML elements, respecting DOM order unless explicitly positioned (dragged)
- **No Artificial Offsets**: Copy/paste and duplicate operations should never apply position offsets - elements appear in their natural DOM flow position
- **HTML-First Approach**: All positioning and layout must follow standard HTML/CSS behavior

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **State Management**: Redux Toolkit for global application state.
- **UI Components**: Radix UI primitives with shadcn/ui components.
- **Styling**: Tailwind CSS with custom CSS variables.
- **Build System**: Vite.
- **Routing**: Wouter.

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript.
- **Database**: PostgreSQL with Drizzle ORM (currently using in-memory for server, configured for future database integration).
- **Session Management**: Express session handling.

## Data Storage Solutions
- **Primary Storage**: IndexedDB for all application data (projects, components, custom classes, categories).
- **Auto-save System**: Automatic workspace and custom class saving every 5 seconds.
- **Local-First Approach**: Designed to work offline with no immediate external database dependency for core features.
- **Data Export/Import**: JSON-based backup and restore functionality.

## Design Tool Features
- **Canvas System**: Interactive design canvas with zoom, grid, and element manipulation.
- **Element Types**: Supports rectangles, text, images, and containers with flexbox layout.
- **Responsive Design**: Multiple breakpoint support.
- **Code Generation**: Automatic HTML/CSS and React component generation.
- **Export Options**: HTML files and component code.
- **Undo/Redo**: Full persistent history management with IndexedDB storage and smart debouncing.
- **Class-First Styling**: All styling is class-based; inline styles are disabled. New classes are automatically generated when properties are changed on elements without classes.
- **Text Editing**: Natural inline text editing with support for paragraphs and line breaks.
- **Advanced CSS Management**: Isolated component editing, dynamic CSS class management with full property editing, and CSS optimization.

## Authentication and Authorization
- **Current Implementation**: Basic session-based authentication.
- **Future Ready**: Designed for easy integration of OAuth or JWT systems.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL provider via @neondatabase/serverless.

## UI and Styling Libraries
- **Radix UI**: Accessible, unstyled UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Class Variance Authority**: For type-safe component variants.

## Development and Build Tools
- **Vite**: Modern build tool.
- **TypeScript**: Static type checking.
- **ESBuild**: Fast JavaScript bundler.

## State Management and Data Fetching
- **TanStack Query**: Server state management.
- **React Hook Form**: Form handling.
- **Zod**: Schema validation library.

## Utility Libraries
- **Date-fns**: Date manipulation.
- **Nanoid**: Unique ID generation.
- **CLSX/Tailwind Merge**: Dynamic className management.### Recent Implementation Updates

#### Persistent Undo/Redo System (January 21, 2025) - COMPLETED
- **IndexedDB Persistence**: Full undo/redo history persists across browser sessions
- **Smart Debouncing**: Property changes (colors, typing) are debounced to prevent creating excessive undo steps
- **Keyboard Shortcuts**: Ctrl+Z (undo), Ctrl+Shift+Z/Ctrl+Y (redo) work globally
- **Visual Controls**: Undo/redo buttons with proper enabled/disabled states
- **Cross-Session Recovery**: History survives browser restarts

#### Button Design System (January 22, 2025) - COMPLETED
- **Multi-State Editor**: Comprehensive button designer with support for 5 states (default, hover, active, focus, disabled)
- **Complete Property Suite**: Supports all button styling properties including shadows, gradients, borders, typography, spacing, and effects
- **Interactive Testing Mode**: Real-time testing interface with auto-cycling through all states and interactive preview
- **Design Management**: Create, duplicate, delete, and organize button designs with persistent storage
- **CSS Generation**: Automatic CSS code generation for all button states and variants
- **State-Aware Preview**: Side-by-side preview of all button states with isolated testing capabilities
- **Production Ready**: All styling properties follow CSS standards with TypeScript type safety

#### Enhanced Image Properties Panel (January 22, 2025) - COMPLETED
- **Comprehensive Image Support**: Added imageBase64, imageAlt, imageTitle, objectFit, objectPosition properties to canvas elements
- **Dual Input Methods**: Full-featured ImageUpload component with file upload (max 2MB) and URL input tabs
- **IndexedDB Storage**: Images store in IndexedDB for persistent local image storage with Base64 encoding
- **Smart Placeholder**: Enhanced image placeholders with responsive sizing, hover effects, and double-click navigation
- **Properties Panel Integration**: New 'Content' category with imageUpload property type for image-specific controls
- **File Validation**: Proper file size limits, type validation, and comprehensive error handling
- **Accessibility Features**: Alt text and title support for screen readers and tooltips

#### Button Text Editing System (January 23, 2025) - COMPLETED
- **Double-Click Text Editing**: Buttons support in-place text editing with double-click activation
- **Real-Time Synchronization**: Text changes sync properly between local state and Redux store
- **Event Handling Fix**: Resolved event propagation issue where CanvasElement wrapper was intercepting double-click events
- **Persistent Text Updates**: Edited button text correctly displays after editing completion
- **Professional UX**: Smooth transition between display and editing modes with proper focus management

#### Comprehensive Components System (January 23, 2025) - COMPLETED
- **Spec-Compliant Data Model**: Implemented ComponentDef and ComponentCategory interfaces with version tracking and proper categorization
- **Component Instances**: Added componentRef to CanvasElement for read-only component instances with double-click to edit functionality
- **Tabbed Component Editor**: Full-featured component editing interface with isolated editing environment and auto-save
- **Component Instance Rendering**: ComponentInstanceElement handles read-only rendering with accessibility features (role="group", aria-label)
- **Context Menu Operations**: Comprehensive context menus for edit, duplicate, rename, delete, propagate updates, and detach instances
- **Propagation System**: Automatic updates to all component instances when definitions change, with instance-specific property preservation
- **Edge Case Handling**: Circular dependency prevention, version conflict detection, and safe deletion with usage checking
- **IndexedDB Persistence**: Dual storage system supporting both legacy and spec-compliant component definitions
- **Accessibility Features**: Focus management, keyboard navigation, screen reader support with proper ARIA labels
- **Professional UI Polish**: Visual indicators for component instances, chrome overlays, and state-aware styling

#### Intelligent Tool Persistence (January 22, 2025) - COMPLETED
- **Smart Tool Behavior**: Creation tools (rectangle, text, image, etc.) now stay active after inserting elements
- **Context-Aware Switching**: Tools automatically switch to selection only when clicking on invalid/non-recipient areas
- **Rapid Element Placement**: Users can quickly place multiple elements of the same type without manual tool switching
- **Improved Workflow**: Enhanced productivity by eliminating unnecessary tool switching friction
- **User-Driven Control**: Tool behavior responds intelligently to user intent and click targets

#### Progressive Web App Implementation (January 25, 2025) - COMPLETED
- **Full PWA Compliance**: Complete PWA implementation with web app manifest, service worker, and offline functionality
- **Cross-Platform Installation**: Installable on desktop, mobile, and tablet devices across all major platforms
- **Offline Support**: Service worker provides offline caching and background sync capabilities
- **Native App Experience**: Standalone display mode with custom splash screens and app icons
- **Smart Install Prompts**: Contextual installation prompts with user-friendly interface
- **Enhanced Performance**: Optimized caching strategies for faster loading and better user experience

#### Revolutionary Website Import System (January 22, 2025) - COMPLETED
- **Complete HTML Structure Import**: Imports all semantic elements (nav, header, main, footer, aside, section, article)
- **Advanced CSS Extraction**: Server-side CSS extraction from both inline styles and external stylesheets
- **CSS Scoping System**: Prevents imported styles from conflicting with design tool interface using unique scope prefixes
- **Custom Class Integration**: All imported CSS rules automatically become editable custom classes in style editor
- **Comprehensive Element Processing**: Recursive processing of nested elements with proper parent-child relationships
- **Bootstrap & Framework Support**: Handles complex layouts and preserves meaningful CSS classes while filtering conflicts
- **Asset Management**: Downloads and stores images locally in IndexedDB for persistent access
- **Canvas Integration**: All imported elements properly render on canvas and appear in element tree with full editability

#### Advanced Drawing-Based UX System (August 26, 2025) - COMPLETED
- **Two-Phase Drawing**: Sophisticated rubber-band feedback with invisible morphing animation for seamless UX
- **Extended Drawing Area**: Draw from empty space around canvas with automatic canvas dimension updates
- **Smart Canvas Sizing**: Height expands immediately, width uses 100% for large elements or exact size for smaller ones
- **Breakpoint-Aware Width Logic**: Compares against current breakpoint width (mobile: 375px) for responsive behavior
- **Proper Unit Management**: Elements display percentage width units in properties panel when exceeding breakpoint
- **Accurate DOM Insertion**: Elements inserted at correct DOM position - top insertions go to beginning, not end
- **Coordinate System Simplification**: Removed complex padding logic for predictable, accurate positioning
- **Element Unit Preferences**: Automatic unit preference setting for percentage-width elements
