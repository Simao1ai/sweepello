# CleanSlate - Cleaning Dispatch Platform

## Overview
A cleaning dispatch dashboard/platform for managing an Airbnb turnover cleaning brokerage business in the NJ Shore market. Features a dual-portal architecture:
- **Client Portal**: Clients create accounts, request cleaning services, track bookings, and rate completed services
- **Admin Portal**: Dispatch management with job tracking, cleaner scorecards, scheduling calendar, client management, payments tracking, and analytics

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC with Google, GitHub, email support)
- **Routing**: Wouter
- **State**: TanStack React Query

## Project Structure
- `client/src/pages/` - Landing, Dashboard, Jobs, Cleaners, Clients, Payments, Analytics, Schedule, RequestService, MyBookings, RateService
- `client/src/components/` - AppSidebar (role-based), ThemeProvider, ThemeToggle, UI components
- `client/src/hooks/` - use-auth.ts (authentication hook)
- `server/` - Express API routes, Drizzle DB, storage layer, seed data
- `server/replit_integrations/auth/` - Replit Auth OIDC integration
- `shared/schema.ts` - All Drizzle schemas and types
- `shared/models/auth.ts` - Users and sessions schemas for Replit Auth

## Database Schema
- **users** - Authentication users (Replit Auth managed)
- **sessions** - Session storage (Replit Auth managed)
- **userProfiles** - Role (admin/client), phone, address, city, zip
- **clients** - Business client records with property details
- **cleaners** - Cleaner profiles with service areas and zip codes
- **cleanerAvailability** - Weekly availability schedule per cleaner
- **jobs** - Cleaning job records with status workflow
- **serviceRequests** - Client-submitted cleaning requests
- **payments** - Incoming/outgoing payment tracking
- **reviews** - Post-service ratings with user linkage

## Key Features
### Client Portal
- Landing page with hero image, features, how-it-works sections
- Request cleaning service form (address, property details, date/time)
- My Bookings page with status tracking
- Post-service star rating and review system
- Location-based cleaner matching by zip code

### Admin Portal
- Dashboard with KPI stats (revenue, margin, jobs, ratings)
- Scheduling calendar with job events and pending request assignment
- Job management with status workflow (pending → assigned → in_progress → completed)
- Cleaner performance scorecards (rating, on-time %, revenue, service area)
- Client/property management
- Payment tracking (incoming from clients, outgoing to cleaners)
- Analytics with charts

## Authentication & Routing
- Unauthenticated users see the Landing page
- Authenticated users with role="client" see the Client Portal (/my-bookings, /request-service, /rate/:id)
- Authenticated users with role="admin" see the Admin Portal (/admin/*)
- Role is stored in userProfiles table; new users default to "client"
- Role escalation is prevented server-side

## API Routes
### Public
- GET/POST /api/clients, /api/cleaners, /api/jobs, /api/payments, /api/reviews
- GET /api/dashboard/stats, /api/calendar

### Authenticated (Client)
- GET /api/profile, POST /api/profile
- POST /api/service-requests
- GET /api/service-requests/mine
- POST /api/service-requests/:id/rate
- GET /api/available-cleaners?zipCode=X&date=Y

### Authenticated (Admin)
- GET /api/service-requests (all)
- PATCH /api/service-requests/:id (assign cleaner)
- POST /api/cleaner-availability/:cleanerId

## Running
- `npm run dev` starts both Express backend and Vite frontend on port 5000
