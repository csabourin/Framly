# Overview

This is a WYSIWYG (What You See Is What You Get) web design tool, allowing users to visually create web designs through a drag-and-drop interface. It provides real-time previews and code generation capabilities, enabling users to design responsive layouts, manage design elements, and export their creations as HTML/CSS or React components. The application emphasizes a local-first approach with IndexedDB for persistent storage of user workspaces, components, and custom CSS classes.

# User Preferences

Preferred communication style: Simple, everyday language.

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
