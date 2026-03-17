# CleanSlate - Cleaning Dispatch Platform

## Overview
A cleaning dispatch dashboard/platform for managing an Airbnb turnover cleaning brokerage business in the NJ Shore market. Features a triple-portal architecture:
- **Client Portal**: Clients create accounts, request cleaning services, track bookings, and rate completed services
- **Admin Portal**: Dispatch management with job tracking, cleaner scorecards, scheduling calendar, client management, payments tracking, and analytics
- **Contractor Portal**: Cleaners log in to view assigned jobs, manage availability, update job status, and receive notifications

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC with Google, GitHub, email support)
- **Payments**: Stripe Connect (express accounts for contractor payouts), stripe-replit-sync for schema/webhook management
- **Routing**: Wouter
- **State**: TanStack React Query

## Tech Stack (additional)
- **Email**: SendGrid (via Replit integration) for transactional emails (application approved/rejected)

## Project Structure
- `client/src/pages/` - Landing, RoleSelection, Dashboard (admin), ClientDashboard, ContractorDashboard, ContractorEarnings, Jobs, Cleaners, Clients, Payments, Analytics, Schedule, RequestService, MyBookings, RateService, ContractorJobs, ContractorAvailability, ContractorNotifications, ContractorOnboarding, ContractorApply (public)
- `client/src/pages/admin/` - Applications, ReviewModeration, Disputes, Broadcast
- `client/src/components/` - AppSidebar (role-based), ThemeProvider, ThemeToggle, UI components
- `client/src/hooks/` - use-auth.ts (authentication hook)
- `server/` - Express API routes, Drizzle DB, storage layer, seed data
- `server/sendgrid.ts` - SendGrid email client (approval/rejection emails)
- `server/replit_integrations/auth/` - Replit Auth OIDC integration
- `shared/schema.ts` - All Drizzle schemas and types
- `shared/models/auth.ts` - Users and sessions schemas for Replit Auth

## Database Schema
- **users** - Authentication users (Replit Auth managed)
- **sessions** - Session storage (Replit Auth managed)
- **userProfiles** - Role (admin/client/contractor), phone, address, city, zip
- **clients** - Business client records with property details
- **cleaners** - Cleaner profiles with service areas, zip codes, and userId for contractor linking
- **cleanerAvailability** - Weekly availability schedule per cleaner
- **jobs** - Cleaning job records with status workflow
- **serviceRequests** - Client-submitted cleaning requests (with preferredCleanerId, squareFootage)
- **jobOffers** - Uber-style job offer broadcast tracking (serviceRequestId, cleanerId, status, priorityRank, expiresAt)
- **payments** - Incoming/outgoing payment tracking
- **reviews** - Post-service ratings with user linkage
- **notifications** - In-app notifications (userId, title, message, type, jobId, serviceRequestId, jobOfferId, isRead)
- **contractorOnboarding** - Multi-step contractor onboarding (userId, business info, W-9 signature, insurance, Stripe Connect accountId, onboardingStatus)
- **contractorApplications** - Public contractor applications (pre-account); status: pending/approved/rejected/waitlisted; admin reviews and triggers approval/rejection emails
- **disputes** - Dispute resolution records (open/investigating/resolved); admin managed with notes and resolution tracking
- **clients** now has isActive, isVip, adminNote fields for admin management
- **cleaners** now has statusNote, isFeatured, adminNote fields for admin management
- **reviews** now has moderationStatus (approved/hidden/pending), adminNote, adminModifiedAt for admin moderation

## Key Features
### Client Portal
- Landing page with hero image, features, how-it-works sections
- Request cleaning service form with property type (residential/commercial/Airbnb), pricing tiers, preferred cleaner selection
- My Bookings page with status tracking (Finding Cleaners → Matching → Confirmed → In Progress → Completed)
- Post-service star rating and review system
- Location-based cleaner matching by zip code

### Admin Portal
- Dashboard with KPI stats (revenue, margin, jobs, ratings)
- Scheduling calendar with job events, pending requests, and broadcasting status
- Uber-style job broadcast: auto-notify available cleaners sorted by rating, or manual assignment
- Job management with status workflow (pending → broadcasting → assigned → in_progress → completed)
- Cleaner performance scorecards (rating, on-time %, revenue, service area)
- Client/property management
- Payment tracking (incoming from clients, outgoing to cleaners)
- Analytics with charts

### Contractor Portal
- **Onboarding (gated)**: 5-step onboarding flow required before accessing jobs
  - Step 1: Business info (name, contact, address, service zip codes)
  - Step 2: Independent Subcontractor Agreement (NJ-compliant, agree or decline with e-signature)
  - Step 3: W-9 tax agreement with electronic signature
  - Step 4: Liability insurance details (optional but recommended)
  - Step 5: Stripe Connect payment setup for direct deposit payouts
  - On completion: auto-creates cleaner profile in cleaners table
- My Jobs page showing assigned/in-progress/completed jobs
- Accept/Decline job offers (Uber-style notifications with priority for preferred cleaner)
- Start and Complete job actions to update status
- Weekly availability schedule with day toggles and time ranges
- Notifications page with job offers (accept/decline) and general updates
- Linked via userId field in cleaners table

### Matching Algorithm (server/matching.ts)
- Filters cleaners by: zip code match, availability on requested day, active status
- Sorts by: rating (desc) → on-time % → total jobs
- Preferred cleaner gets rank 0 (first offer) if available
- Creates jobOffers with 30-min expiry, sends notifications to contractor userId
- First to accept gets the job; others auto-expire
- Brokerage pricing model: sub_cost = sqft * rate + bedroom/bath/basement adjustments
- Client price = sub_cost / (1 - 30% margin), market floor protection, $120 minimum, rounded to $5
- Service types: standard ($0.10/sqft sub), deep ($0.14/sqft sub), move-out ($0.18/sqft sub)
- Sub adjustments: +$8/bedroom over 2, +$20/bathroom over 1, basement = max($40, 0.02*sqft)

## Authentication & Routing
- Unauthenticated users see the Landing page
- New users (no profile) see the Role Selection page to choose Client or Contractor
- Authenticated users with role="client" see the Client Portal (/dashboard, /my-bookings, /request-service, /rate/:id)
- Authenticated users with role="contractor" see the Contractor Portal (/contractor/dashboard, /contractor/jobs, /contractor/availability, /contractor/notifications, /contractor/earnings)
- Authenticated users with role="admin" see the Admin Portal (/admin/*)
- Role is stored in userProfiles table; set on first profile creation via role selection
- Role escalation is prevented server-side (admin role cannot be self-assigned)
- Each portal has distinct sidebar styling (colors, icons, branding)

## API Routes
### Public
- GET/POST /api/clients, /api/cleaners, /api/jobs, /api/payments, /api/reviews
- GET /api/dashboard/stats, /api/calendar

### Authenticated (Client)
- GET /api/profile, POST /api/profile
- POST /api/service-requests (auto-broadcasts to matching cleaners)
- GET /api/service-requests/mine
- POST /api/service-requests/:id/rate
- GET /api/available-cleaners?zipCode=X&date=Y
- GET /api/client/previous-cleaners (for preferred cleaner selection)
- GET /api/pricing-estimate?propertyType=X&bedrooms=N&bathrooms=N&squareFootage=N

### Authenticated (Contractor)
- GET /api/contractor/onboarding (get onboarding status)
- POST /api/contractor/onboarding (save business info - step 1)
- POST /api/contractor/onboarding/agreement (sign or decline agreement - step 2)
- POST /api/contractor/onboarding/w9 (sign W-9 - step 3)
- POST /api/contractor/onboarding/insurance (save insurance info - step 4)
- POST /api/contractor/onboarding/stripe-connect (create Stripe Connect account link - step 5)
- GET /api/contractor/onboarding/stripe-status (check Stripe account status)
- POST /api/contractor/onboarding/complete (finalize onboarding, create cleaner profile)
- GET /api/contractor/profile, /api/contractor/jobs, /api/contractor/availability
- POST /api/contractor/availability
- PATCH /api/contractor/jobs/:id/status
- GET /api/contractor/offers (pending job offers)
- POST /api/contractor/offers/:id/accept
- POST /api/contractor/offers/:id/decline
- GET /api/notifications
- PATCH /api/notifications/:id/read
- POST /api/notifications/read-all

### Authenticated (Admin)
- GET /api/service-requests (all)
- PATCH /api/service-requests/:id (assign cleaner, triggers notification)
- POST /api/service-requests/:id/broadcast (send/re-send offers to cleaners)
- GET /api/service-requests/:id/offers (view offer statuses)
- POST /api/cleaner-availability/:cleanerId

## Running
- `npm run dev` starts both Express backend and Vite frontend on port 5000
