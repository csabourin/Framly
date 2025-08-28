# Overview

This is a WYSIWYG (What You See Is What You Get) web design tool, enabling users to visually create web designs through a drag-and-drop interface. It provides real-time previews and code generation capabilities, allowing users to design responsive layouts, manage design elements, and export their creations as HTML/CSS or React components. The application emphasizes a local-first approach with IndexedDB for persistent storage of user workspaces, components, and custom CSS classes, and is fully PWA-compliant with offline functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

## Design Tool Principles
- **DOM Flow Integrity**: Elements must position exactly like real HTML elements, respecting DOM order unless explicitly positioned (dragged)
- **No Artificial Offsets**: Copy/paste and duplicate operations should never apply position offsets - elements appear in their natural DOM flow position
- **HTML-First Approach**: All positioning and layout must follow standard HTML/CSS behavior

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **State Management**: Redux Toolkit.
- **UI Components**: Radix UI primitives with shadcn/ui components.
- **Styling**: Tailwind CSS with custom CSS variables.
- **Build System**: Vite.
- **Routing**: Wouter.

## Modular Design System Architecture (August 28, 2025)
- **Canvas Modularization**: Refactored 1000+ line Canvas component into modular architecture following detailed refactoring plan:
  - **Phase 1**: Event Hooks - `useCanvasEvents`, `useDrawingEvents`, `useDragAndDrop` for separated event handling
  - **Phase 2**: Visual Components - `InsertionIndicator`, `DrawingOverlay`, `SelectionOverlay`, `CanvasContainer` for reusable UI feedback
  - **Phase 3**: Utility Modules - `canvasGeometry`, `insertionZones` for coordinate math and zone detection
  - **Phase 4**: Tool Handlers - `SelectionTool`, `DrawingTools`, `HandTool` for tool-specific behavior
- **Architecture Benefits**: Single responsibility modules, improved maintainability, better testability, enhanced performance, smaller focused files (150-line Canvas orchestrator vs 1000+ line monolith)
- **Functionality Preserved**: All original Canvas functionality maintained including toolbar element insertion, drawing tools, drag-and-drop, keyboard shortcuts, and point-and-click creation tools

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript.
- **Database**: PostgreSQL with Drizzle ORM (currently in-memory, configured for future integration).
- **Session Management**: Express session handling.

## Data Storage Solutions
- **Primary Storage**: IndexedDB for all application data (projects, components, custom classes, categories).
- **Auto-save System**: Automatic workspace and custom class saving every 5 seconds.
- **Local-First Approach**: Designed to work offline.
- **Data Export/Import**: JSON-based backup and restore.
- **Undo/Redo**: Persistent history management with IndexedDB and smart debouncing.

## Design Tool Features
- **Canvas System**: Interactive design canvas with zoom, grid, element manipulation, and extended drawing area with smart canvas sizing.
- **Element Types**: Supports rectangles, text, images, and containers with flexbox layout, including comprehensive image properties and button design system.
- **Responsive Design**: Multiple breakpoint support.
- **Code Generation**: Automatic HTML/CSS and React component generation.
- **Export Options**: HTML files and component code.
- **Styling**: Class-based styling only; inline styles disabled. Automatic generation of new classes for property changes.
- **Text Editing**: Natural inline text editing for elements and buttons.
- **Advanced CSS Management**: Isolated component editing, dynamic CSS class management, and CSS optimization.
- **Component System**: Comprehensive component management with definitions, instances, tabbed editor, propagation system, and context menu operations.
- **Tooling**: Intelligent tool persistence (creation tools stay active).
- **Website Import**: Imports HTML structure, extracts and scopes CSS, integrates custom classes, and manages assets.
- **Drag and Drop**: Full HTML5 drag and drop system for element reordering and placement.
- **Keyboard Shortcuts**: Comprehensive, platform-aware keyboard shortcut system with searchable cheatsheet.
- **Modular Architecture**: Refactored Canvas component from 1000+ lines to modular architecture with separated concerns for better maintainability and testing.

## Authentication and Authorization
- **Current Implementation**: Basic session-based authentication.
- **Future Ready**: Designed for OAuth or JWT integration.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL provider via @neondatabase/serverless.

## UI and Styling Libraries
- **Radix UI**: Accessible, unstyled UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Class Variance Authority**: For type-safe component variants.
- **CLSX/Tailwind Merge**: Dynamic className management.

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