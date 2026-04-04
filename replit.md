# Sweepello - Cleaning Dispatch Platform

## Overview
Sweepello is a nationwide cleaning dispatch dashboard/platform for managing an Airbnb turnover cleaning brokerage business. It features a triple-portal architecture to serve clients, contractors, and administrators. The platform aims to streamline the process of booking, managing, and executing cleaning services, providing a comprehensive solution for all stakeholders involved.

## User Preferences
I prefer simple language. I like functional programming. I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture
The platform is built with a modern web stack: React + TypeScript + Vite + Tailwind CSS + Shadcn UI for the frontend, and Express.js + TypeScript for the backend. PostgreSQL with Drizzle ORM is used for the database. Authentication is handled via Replit Auth, supporting OIDC with Google, GitHub, and email. Stripe Connect is integrated for payment processing, including express accounts for contractor payouts and `stripe-replit-sync` for schema and webhook management. Routing is managed by Wouter, and state management utilizes TanStack React Query.

The UI/UX design emphasizes a clean and intuitive interface, with distinct portal-specific dashboards and navigation (AppSidebar). Key features include:
- **Client Payment System**: Secure card storage via Stripe SetupIntent, $50 cancellation fee within 24 hours, and a tipping system for cleaners post-service.
- **Recurring Bookings**: Clients can set up, pause, or delete recurring cleaning schedules.
- **Before/After Job Photos**: Contractors can upload photos, stored locally and served statically.
- **Real-time Communication**: A WebSocket server (`ws` package) is used for live location tracking, job status updates, and in-app notifications.
- **Mapping**: Leaflet.js is integrated for GPS tracking of cleaners.
- **Role-Based Access Control**: Unauthenticated users see a landing page, new users select a role (Client/Contractor), and authenticated users are directed to their respective portals based on their role stored in `userProfiles`. Admin role escalation is prevented server-side.
- **Contractor Onboarding**: A mandatory 5-step onboarding process for contractors, including business info, e-signatures for agreements and W-9s, insurance details, and Stripe Connect setup.
- **Admin Detail Panels**: Dedicated sheets for managing client and cleaner profiles, including contact info, administrative controls (active, VIP, featured status), and service/job history.
- **Sweepo AI Agent**: An autonomous operations manager powered by GPT-4o with function calling capabilities to interact with and manage all platform data. It provides read and write tools for administrative tasks, logs token usage, and provides action cards for tool calls.
- **AI Usage Dashboard**: Tracks GPT-4o token usage and costs per Sweepo conversation.
- **Matching Algorithm**: Filters and sorts cleaners based on zip code, availability, and performance metrics. It prioritizes preferred cleaners and creates time-limited job offers with notifications.
- **Brokerage Pricing Model**: Dynamically calculates client prices based on service type, square footage, and property features, ensuring a 30% margin and minimum pricing.

## External Dependencies
- **Replit Auth**: For user authentication (OIDC with Google, GitHub, email).
- **Stripe Connect**: For payment processing, client card storage, contractor payouts, and managing subscriptions. `stripe-replit-sync` is used for schema and webhook management.
- **SendGrid**: For transactional email services (e.g., application approval/rejection, tip notifications).
- **Leaflet.js**: For map functionalities and GPS tracking.
- **GPT-4o**: Powers the Sweepo AI Agent for autonomous operations management.