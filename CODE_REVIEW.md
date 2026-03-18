# Sweepello Code Review

**Date:** 2026-03-18
**Reviewer:** Claude Code

## Project Summary

Sweepello is a NJ Shore cleaning services brokerage platform (Express + Drizzle ORM backend, React + TanStack Query frontend, PostgreSQL, Stripe Connect, SendGrid, Replit Auth). It has admin, client, and contractor portals with job matching, onboarding, disputes, and review moderation.

---

## CRITICAL Security Issues

### 1. Unauthenticated admin routes (P0 — Data breach risk)

**Files:** `server/routes.ts` lines 228-338, 646-698

Several routes that manage core business data have **no authentication or authorization**:

- `GET /api/clients` — anyone can list all clients
- `POST /api/clients` — anyone can create clients
- `GET /api/cleaners` — anyone can list all cleaners
- `POST /api/cleaners` — anyone can create cleaners
- `GET /api/jobs` — anyone can list all jobs with pricing
- `POST /api/jobs` — anyone can create jobs
- `PATCH /api/jobs/:id` — anyone can update job status
- `GET /api/payments` — anyone can see all payments
- `POST /api/reviews` — anyone can post reviews
- `GET /api/reviews` — anyone can read all reviews
- `GET /api/dashboard/stats` — exposes revenue/profit numbers publicly
- `GET /api/calendar` — exposes all job schedules and addresses publicly

**Fix:** Add `isAuthenticated` middleware and admin role checks to all these routes.

### 2. Unvalidated req.body passed directly to storage updates (P0 — Privilege escalation)

**Files:** `server/routes.ts` lines 295, 428, 721

- `storage.updateJob(req.params.id, req.body)` — attacker can overwrite any column
- `storage.updateServiceRequest(req.params.id, req.body)` — same
- `storage.updateContractorOnboarding(userId, req.body)` — contractor can set `stripeOnboardingComplete: true` or `onboardingStatus: "complete"`

**Fix:** Destructure and whitelist allowed fields before passing to storage.

### 3. XSS in email templates (P1)

**File:** `server/sendgrid.ts` lines 44, 92

`name` and `note` parameters are interpolated directly into HTML without escaping.

**Fix:** HTML-encode all interpolated values.

---

## Design & Architecture Issues

### 4. Massive monolithic routes.ts (1297 lines)

All ~50 route handlers live in one file with duplicated auth checks and business logic.

**Fix:** Split into `adminRoutes.ts`, `contractorRoutes.ts`, `clientRoutes.ts`, and use middleware for auth.

### 5. N+1 query patterns

- `server/matching.ts:104-113` — `getCleanerAvailability()` called per cleaner in a loop
- `server/routes.ts:127-132` — `getCleaner()` called per ID in a loop
- `server/routes.ts:450-454` — `getCleaner()` called per offer in a loop
- `server/routes.ts:586-589` — `getServiceRequest()` called per offer in a loop

**Fix:** Use batch queries or JOINs.

### 6. Duplicated business logic

Client creation logic is copy-pasted in 3 places (`matching.ts:226`, `routes.ts:360`). Payment creation is duplicated in 3 places. All create clients with `name: "Client"` placeholder that never gets updated.

**Fix:** Extract shared helpers.

### 7. No database foreign keys

`shared/schema.ts` defines no foreign key constraints. No referential integrity, no cascades.

### 8. No indexes beyond primary keys

No indexes on `userId`, `cleanerId`, `clientId`, `status`, `serviceRequestId` — will cause full table scans.

### 9. Stringly-typed enums

Status/role fields are plain `text` with no enum constraint. Typos silently succeed.

---

## Code Quality Issues

### 10. Pervasive `any` types

- `getUserId(req: any)`, `isAdmin(req: any)`, `isContractor(req: any)`
- `let connectionSettings: any`, `let stripeSync: any`
- `const paymentRows: any[]`

### 11. Inconsistent authorization patterns

Admin checks done 3 different ways: `isAdmin()` helper, inline profile check, or missing entirely.

### 12. Empty catch blocks

`routes.ts:955`, `routes.ts:1083`, `routes.ts:1104` — `catch {}` silently swallows errors.

### 13. Floating-point money math

Monetary `decimal` values converted to JS `Number` for arithmetic — precision errors with real money.

### 14. Unused imports

`routes.ts:2` — `createServer` imported but never used. `registerRoutes` receives `httpServer` but never uses it.

### 15. Type mismatch

`onTimePercent` is `integer()` in schema but `"100"` (string) is passed in `routes.ts:908`.

---

## Missing Features / Best Practices

### 16. No tests (P1)

Zero test files. For a platform handling financial transactions and PII, this is critical.

### 17. No rate limiting

Public endpoints (contractor application, pricing estimate) have no rate limiting.

### 18. No pagination

All list endpoints return entire tables with no limits.

### 19. No audit logging

Admin actions have no audit trail.

### 20. Seed data in production startup path

`server/index.ts:128` — `seedDatabase()` called on every server start.

---

## Priority Summary

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | Unauthenticated routes exposing all data | Data breach risk |
| P0 | Raw req.body passed to DB updates | Privilege escalation |
| P1 | XSS in email templates | Email injection |
| P1 | No foreign keys or indexes | Data integrity + performance |
| P1 | No tests | Regression risk |
| P2 | N+1 queries | Performance degradation |
| P2 | Duplicated business logic | Maintenance burden |
| P2 | No pagination | Scalability |
| P2 | Floating-point money math | Financial errors |
| P3 | Code organization | Developer velocity |
| P3 | Type safety | Bug risk |
| P3 | Rate limiting, audit logging | Operational maturity |
