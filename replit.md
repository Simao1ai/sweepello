# CleanSlate - Cleaning Dispatch Platform

## Overview
A cleaning dispatch dashboard/platform for managing an Airbnb turnover cleaning brokerage business. Features job tracking, cleaner scorecards, client management, payments tracking, and analytics.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter
- **State**: TanStack React Query

## Project Structure
- `client/src/pages/` - Dashboard, Jobs, Cleaners, Clients, Payments, Analytics
- `client/src/components/` - AppSidebar, ThemeProvider, ThemeToggle, UI components
- `server/` - Express API routes, Drizzle DB, storage layer, seed data
- `shared/schema.ts` - Drizzle schemas for clients, cleaners, jobs, payments, reviews

## Key Features
- Dashboard with KPI stats (revenue, margin, jobs, ratings)
- Job management with status workflow (pending → assigned → in_progress → completed)
- Cleaner performance scorecards (rating, on-time %, revenue)
- Client/property management
- Payment tracking (incoming from clients, outgoing to cleaners)
- Analytics with charts (revenue trends, job status breakdown, cleaner performance)
- Dark/light theme toggle
- Sidebar navigation

## API Routes
- GET/POST /api/clients
- GET/POST /api/cleaners
- GET/POST /api/jobs, PATCH /api/jobs/:id
- GET /api/payments
- GET/POST /api/reviews
- GET /api/dashboard/stats

## Running
- `npm run dev` starts both Express backend and Vite frontend on port 5000
