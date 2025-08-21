# Overview

This is a WYSIWYG (What You See Is What You Get) web design tool built as a full-stack application. The application allows users to create visual designs through drag-and-drop interface elements, with real-time preview and code generation capabilities. Users can design responsive layouts, manage design elements, and export their creations as HTML/CSS or React components.

## Recent Changes (January 20-21, 2025)

### IndexedDB Custom Classes Integration (Latest Update)
- **Local Class Storage**: Custom CSS classes now save to IndexedDB alongside workspace data
- **Class Persistence**: CSS classes with styles, descriptions, and categories stored locally
- **Category Management**: Class categories saved locally in IndexedDB
- **Auto-Save Integration**: Custom classes save automatically with workspace every 5 seconds  
- **Seamless Loading**: Custom classes and categories load automatically on app startup
- **Local-First Architecture**: All custom styling data persists locally without database dependency

### Previous Features
- **IndexedDB Persistence Implementation**: Complete local storage system for workspace and components
- **Auto-save functionality**: Workspace automatically saves every 5 seconds to prevent data loss
- **Component persistence**: Custom components are saved locally and restored on app restart
- **Data management UI**: Export/import functionality with JSON format for backup and transfer
- **Component tool improvements**: Fixed component drag-drop targeting and + button placement
- **Component panel toggle**: Components icon now toggles the component panel visibility instead of being a tool
- **Toolbar cleanup**: Removed split horizontal, vertical, and merge tools from the toolbar
- **Enhanced component placement**: Components now respect hover zones and provide intelligent positioning
- **DOM Tree Panel Implementation**: Added hierarchical element selection panel with toggle functionality
- **Element Tree Navigation**: Click elements in tree to select hard-to-reach elements in canvas
- **Layout Positioning Fix**: Proper positioning to prevent DOM tree panel from covering main toolbar
- **Canvas Layout Adaptation**: Dynamic canvas positioning that accounts for DOM tree panel visibility

### Critical Drag-Drop System Fixes (January 21, 2025)

- **DOM Detection Enhancement**: Fixed element detection during drag operations by temporarily hiding dragged element to prevent interference
- **Sibling Insertion Logic**: Corrected parent container detection for precise element positioning between siblings
- **Drop Validation System**: Implemented smart validation that checks parent containers for sibling insertion vs target containers for inside placement  
- **Visual Feedback Accuracy**: Blue insertion lines now correctly correspond to actual drop behavior - no more "does nothing" scenarios
- **Reliable Element Reordering**: Fixed all edge cases where elements would incorrectly "fall back to root" during drag operations

### Enhanced Text Editing System (Latest Update)

- **Natural Text Editing**: Text elements now fill their entire parent container and provide natural selection behavior
- **Paragraph Flow Support**: Enhanced HTML content support with proper paragraph (`<p>`) structure
- **Keyboard Controls**: Shift+Enter for line breaks (`<br>`) within paragraphs, Enter for new paragraphs
- **Inline Editing Mode**: Double-click text to edit while staying in selection tool, no tool switching required
- **Visual Feedback**: Text editing mode shows blue border and background highlighting the entire editable area
- **Click-Outside Detection**: Automatic text editing mode exit when clicking outside the text element
- **Full Container Coverage**: Text selection box now covers the whole text area, taking all available space within parent

### Properties Panel Bug Fixes (January 21, 2025)

- **Fixed Numeric Field Display**: Width and Height fields now properly show `0` instead of appearing empty
- **Corrected Value Handling**: Replaced falsy checks with explicit null/undefined checks for proper zero value display
- **Fixed Property Conflicts**: Resolved multiplication bug caused by conflicting element.width and styles.width values
- **Enhanced Default Values**: Added intelligent defaults that use element dimensions when available
- **Improved Tool Interaction**: Non-container elements automatically switch to selection tool when clicked during creation

### Advanced CSS Management System (January 21, 2025)

- **Component Editor Implementation**: Complete isolated editing environment for component modification with automatic instance propagation
- **Class Editor Enhancement**: Dynamic CSS class management system with full property editing capabilities
- **Universal Property Support**: Class editor now supports editing any CSS property, not just common ones
- **Dynamic Property Addition**: Users can add any CSS property with custom values to classes
- **Property Management Interface**: Visual interface for adding, editing, and removing individual CSS properties
- **Object-Safe Rendering**: Fixed React rendering errors when displaying complex CSS values
- **CSS Export Functionality**: Generate clean CSS from custom classes with proper kebab-case conversion
- **Class Renaming System**: Full class renaming with automatic element updates across the entire project
- **Applied Class Enhancement**: Edit any applied class with proper style extraction from selected elements

### CSS Optimization System

- **Advanced CSS Optimizer**: Comprehensive CSS optimization system with intelligent class generation
- **Utility Class Detection**: Automatically identifies and creates reusable utility classes for common patterns
- **Component Class Generation**: Groups complex style patterns into component classes
- **CSS Best Practices**: Implements modern CSS practices including property ordering, atomic CSS, and minification
- **Performance Analytics**: Detailed analysis showing size reduction and optimization metrics
- **CSS Class Suggestions**: Smart suggestions for class names based on element type and styles
- **CSS Optimization Modal**: Interactive interface to view optimization results and copy optimized CSS
- **Enhanced Code Generator**: Improved code generation with optimized CSS output and fallback support

# User Preferences

Preferred communication style: Simple, everyday language.

# Future Improvements TODO List

## Workspace & Canvas Enhancements
- **Viewport boundary constraints**: Prevent workspace from extending beyond viewport bounds to maintain scrollability
- **Infinite canvas with boundaries**: Ensure users can always scroll back to see all added elements
- **Canvas scroll behavior**: Implement proper scroll limits and reset functionality

## Advanced Styling System
- **Class style editor**: 
  - Extract styles from selected elements into reusable classes
  - Apply custom classes to selections
  - Visual class customization interface
- **Media query support**: Modifications in mobile/desktop/large breakpoints should apply to relevant media queries
- **Advanced CSS features**: Support for animations, transitions, and complex selectors

## Component System Enhancements
- **Component editor**: Dedicated editing interface that opens components in isolated tabs
- **Component inheritance**: Changes to components automatically affect all instances
- **Instance detachment**: Allow instances to become independent and stop inheriting component changes
- **Component replacement workflow**: Creating components should replace selection with component instance
- **Default component categories**: Prevent empty categories by providing sensible defaults
- **Component library**: Built-in collection including:
  - Accordions
  - Tabs (vertical/horizontal orientation)
  - Navigation components
  - Form components
  - Layout templates

## Interactive Elements
- **Button component system**: 
  - Specialized button creation tools
  - State editor for hover, active, focus, disabled states
  - Button variants and styling options

## Persistence & State Management
- **Workspace configuration persistence**:
  - Panel visibility states
  - Properties panel group order and expansion states
  - User interface layout preferences
- **Undo/Redo system**: 
  - Implement Ctrl+Z/Ctrl+Shift+Z functionality
  - Make undo history persistent across sessions
  - Support for complex operations like component modifications

## User Interface Improvements  
- **Multi-tab workspace**: Bottom tab interface for multiple projects/components
- **Enhanced panel management**: Better organization and customization of UI panels
- **Keyboard shortcuts**: Comprehensive shortcut system for power users

## Component Categories & Organization
- **Category persistence**: Save custom component categories
- **Category management**: Tools for organizing and restructuring component library
- **Search and filtering**: Easy discovery of components and classes

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **State Management**: Redux Toolkit for global application state, with separate slices for canvas operations and UI state
- **UI Components**: Radix UI primitives with shadcn/ui components for consistent design system
- **Styling**: Tailwind CSS with custom CSS variables for theming support
- **Build System**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing

## Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript throughout the entire stack for consistency
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Data Storage**: In-memory storage implementation with interface for easy database integration
- **Session Management**: Express session handling with PostgreSQL session store support

## Data Storage Solutions
- **IndexedDB Primary Storage**: All application data stored locally including projects, components, and custom classes
- **Custom Class Storage**: CSS classes with styles, descriptions, and categories stored in IndexedDB
- **Category Management**: Both component and class categories persist locally
- **Auto-save System**: Automatic workspace and custom class saving every 5 seconds with change detection
- **Component Storage**: User-created components stored locally with categories and metadata
- **Data Export/Import**: JSON-based backup and restore functionality for all data types
- **Local-First Approach**: No database dependency, everything works offline
- **PostgreSQL Available**: Database configured but using MemStorage for server (for future features)

## Design Tool Features
- **Canvas System**: Interactive design canvas with zoom, grid, and element manipulation
- **Element Types**: Support for rectangles, text, images, and containers with flexbox layout
- **Responsive Design**: Multiple breakpoint support (mobile, desktop, large screens)
- **Code Generation**: Automatic HTML/CSS and React component generation from visual designs
- **Export Options**: Multiple export formats including HTML files and component code
- **Undo/Redo**: Full history management for design operations

## Authentication and Authorization
- **Current Implementation**: Basic session-based authentication structure
- **User Management**: User creation and retrieval with username-based lookup
- **Session Handling**: Express session middleware with secure cookie configuration
- **Future Ready**: Interface-based design allows for easy integration of OAuth or JWT systems

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL provider via @neondatabase/serverless
- **Connection**: Environment-based DATABASE_URL configuration for flexible deployment

## UI and Styling Libraries
- **Radix UI**: Complete set of accessible, unstyled UI primitives for React
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **Lucide React**: Icon library for consistent iconography throughout the application
- **Class Variance Authority**: For creating type-safe component variants

## Development and Build Tools
- **Vite**: Modern build tool with hot module replacement and optimized bundling
- **TypeScript**: Static type checking across frontend, backend, and shared modules
- **ESBuild**: Fast JavaScript bundler for production server builds
- **Replit Integration**: Development environment integration with runtime error handling

## State Management and Data Fetching
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form handling with validation support via @hookform/resolvers
- **Zod**: Schema validation library integrated with Drizzle ORM for type safety

## Utility Libraries
- **Date-fns**: Date manipulation and formatting utilities
- **Nanoid**: Unique ID generation for canvas elements and sessions
- **CLSX/Tailwind Merge**: Dynamic className management and conflict resolution