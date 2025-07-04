# Prompt Manager Application

## Overview

This is a full-stack prompt management application built with React, Express.js, and PostgreSQL. The application allows users to create projects, manage prompts with versioning, collaborate with team members, and access prompts via API keys. It features a modern UI built with shadcn/ui components and Tailwind CSS.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based auth with bcrypt password hashing
- **API**: RESTful API with proper error handling middleware

### Development Setup
- **Monorepo Structure**: Shared schema between client and server
- **Hot Reload**: Vite middleware integrated with Express in development
- **Build Process**: Client builds to `dist/public`, server bundles with esbuild

## Key Components

### Database Schema (Drizzle)
- **Users**: Authentication and user management
- **Projects**: Workspace containers for prompts
- **Project Members**: Role-based access control (admin, editor, viewer)
- **Prompts**: Versioned prompt templates
- **Prompt Versions**: Full version history with author tracking
- **API Keys**: Secure API access with hashed keys

### Authentication System
- Session-based authentication using express-session
- Password hashing with bcrypt (12 rounds)
- Dual authentication middleware for both sessions and API keys
- Role-based project access control

### API Structure
- `/api/auth/*` - Authentication endpoints (signup, login, logout)
- `/api/projects/*` - Project management and membership
- `/api/prompts/*` - Prompt creation and versioning
- `/api/api-keys/*` - API key management

### UI Components
- Responsive sidebar navigation with project switching
- Modal dialogs for creating projects and prompts
- Form validation with real-time feedback
- Toast notifications for user feedback
- Dark/light theme support (configured but not implemented)

## Data Flow

### Authentication Flow
1. User signs up or logs in via forms with validation
2. Passwords are hashed with bcrypt before storage
3. Sessions are established and stored server-side
4. API requests include session cookies for authentication
5. API keys provide alternative authentication for programmatic access

### Project Management Flow
1. Users create projects with unique slugs
2. Project owners can invite members with specific roles
3. Role-based permissions control prompt access and editing
4. Projects serve as containers for organizing prompts

### Prompt Versioning Flow
1. Prompts are created within projects with unique slugs
2. Each edit creates a new version with commit-like messages
3. Version history tracks author and timestamp
4. Latest version is served by default, with history available

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management
- **express-session**: Session management
- **bcrypt**: Password hashing
- **wouter**: Lightweight routing

### UI Dependencies
- **@radix-ui/**: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. `npm run build` compiles both client and server
2. Client builds to `dist/public` directory
3. Server bundles to `dist/index.js` with esbuild
4. Static assets are served by Express in production

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key
- `NODE_ENV`: Environment mode (development/production)

### Database Management
- Drizzle migrations in `./migrations` directory
- Schema defined in `shared/schema.ts`
- `npm run db:push` pushes schema changes

### Production Considerations
- Static file serving configured for production
- Error handling middleware for proper error responses
- Session security configured based on environment
- Database connection pooling via PostgreSQL client

## Changelog
- July 04, 2025. Initial setup
- July 04, 2025. Added Swagger UI at /docs endpoint for API testing
- July 04, 2025. Fixed prompt versioning and content display issues  
- July 04, 2025. Created Python SDK with elegant dot notation: `promptvault.project_name.prompt_name`

## User Preferences

Preferred communication style: Simple, everyday language.