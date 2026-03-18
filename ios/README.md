# Sweepello iOS App

Native iOS app for the Sweepello cleaning dispatch platform, built with SwiftUI.

## Requirements

- Xcode 15+
- iOS 17+
- Swift 5.9+

## Architecture

The app mirrors the web platform's triple-portal architecture:

### Client Portal
- **Dashboard** - Welcome banner, quick actions, recent bookings
- **Request Service** - Full booking form with property details, service type, scheduling, pricing estimates, preferred cleaner selection
- **My Bookings** - Filterable list with status timeline and booking details
- **Rate Service** - Star rating and comment submission for completed cleans
- **Profile** - User info, settings, dark mode toggle

### Contractor Portal
- **Dashboard** - Online/offline toggle, stats grid, pending job offers (accept/decline), active jobs
- **Jobs** - Filterable job list with detail view, start/complete job actions
- **Availability** - Weekly schedule management with day toggles and time ranges
- **Notifications** - Job offers, status updates, mark read/unread
- **Onboarding** - 5-step flow (business info, agreement, W-9, insurance, Stripe Connect)
- **Apply** - Public contractor application form
- **Profile** - Performance stats, service area, settings

### Admin Portal
- **Dashboard** - KPI grid (revenue, jobs, cleaners, rating, pending, margin), pending requests, quick actions
- **Jobs** - Status-filtered job list with detail views
- **Cleaners** - Searchable cleaner list with performance scorecards
- **Clients** - Searchable client list with property details, VIP badges
- **Service Requests** - Full request management with broadcast-to-cleaners
- **Applications** - Review, approve, or reject contractor applications
- **Schedule** - Calendar view with job events
- **Payments** - Incoming/outgoing tracking with summary cards

## Project Structure

```
ios/
├── Sweepello.xcodeproj/
├── Sweepello/
│   ├── App/
│   │   ├── SweepelloApp.swift      # App entry point
│   │   ├── RootView.swift          # Auth-state routing
│   │   └── Configuration.swift     # API URLs, timeouts
│   ├── Models/                     # Data models matching PostgreSQL schema
│   │   ├── User.swift
│   │   ├── Client.swift
│   │   ├── Cleaner.swift
│   │   ├── Job.swift
│   │   ├── ServiceRequest.swift
│   │   ├── Payment.swift
│   │   ├── Review.swift
│   │   ├── JobOffer.swift
│   │   ├── Notification.swift
│   │   ├── ContractorOnboarding.swift
│   │   ├── ContractorApplication.swift
│   │   ├── Dispute.swift
│   │   ├── Message.swift
│   │   └── DashboardStats.swift
│   ├── Services/
│   │   ├── APIClient.swift         # HTTP networking (GET/POST/PATCH/DELETE)
│   │   ├── AuthManager.swift       # Authentication & session management
│   │   ├── WebSocketManager.swift  # Real-time: jobs, location, chat, offers
│   │   └── ThemeManager.swift      # Dark/light mode
│   ├── Views/
│   │   ├── Auth/                   # Landing, Login, RoleSelection
│   │   ├── Client/                 # Client portal views
│   │   ├── Contractor/             # Contractor portal views
│   │   ├── Admin/                  # Admin portal views
│   │   └── Shared/                 # JobChat
│   ├── Components/
│   │   └── SharedComponents.swift  # StatusBadge, EmptyState, DetailSection, FilterChip
│   └── Resources/
│       └── Info.plist
```

## Setup

1. Open `Sweepello.xcodeproj` in Xcode
2. Update `Configuration.swift` with your backend URL
3. Build and run on simulator or device

## API Connection

The app connects to the existing Sweepello Express.js backend. All API endpoints are the same as the web app:
- Authentication via session cookies
- REST API for CRUD operations
- WebSocket at `/ws` for real-time updates (location tracking, job status, chat, offers)

## Key Features

- **Real-time WebSocket** - Live job updates, location tracking, in-app chat
- **Uber-style job offers** - Contractors receive and accept/decline offers with priority ranking
- **5-step onboarding** - Full contractor onboarding with e-signatures and Stripe Connect
- **Pricing engine** - Live price estimates based on property details
- **Dark mode** - System-wide theme toggle
- **Pull to refresh** - All data views support pull-to-refresh
