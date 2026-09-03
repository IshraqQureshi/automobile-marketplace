# FEATURES.md

# Automobile Marketplace — MVP Feature Backlog

**Status:** MVP Scope Locked
**Timeline:** 5 Development Days + 2 QA/Release Days
**Source of Truth:** `MVP_REQUIREMENTS.md`

---

## 1. Purpose

This document converts the locked MVP requirements into discrete, implementable features.

Every feature must:

1. Have a unique feature ID.
2. Have defined priority and dependencies.
3. Be implemented on its own Git branch.
4. Include required unit/integration tests.
5. Include E2E coverage where applicable.
6. Pass security and performance checks.
7. Have its own PR.
8. Be reviewed by the Code Review Agent.
9. Receive approval before merge.
10. Update `.claude/docs/MVP_PROGRESS.md` after completion.

---

# 2. Priority Definitions

| Priority | Meaning                                                    |
| -------- | ---------------------------------------------------------- |
| P0       | Launch-critical. MVP cannot launch without it.             |
| P1       | Required MVP functionality.                                |
| P2       | Important but can be simplified if schedule is threatened. |
| P3       | Nice-to-have / defer if necessary.                         |

---

# 3. Feature Backlog

## FOUNDATION

### FND-001 — Project Initialization

**Priority:** P0
**Dependencies:** None

* Initialize Next.js + TypeScript + Tailwind.
* Configure project structure.
* Configure environment variables.
* Configure linting and type checking.
* Configure production build.
* Establish reusable UI/component conventions.

**Agents:** Architect → Code → Code Review

**Tests:**

* TypeScript
* ESLint
* Production build

---

### FND-002 — Supabase Integration

**Priority:** P0
**Dependencies:** FND-001

* Configure Supabase client.
* Configure server/client access boundaries.
* Configure environment variables.
* Establish database access patterns.
* Establish Storage integration.

**Agents:** Architect → Backend/Data → Security

**Tests:**

* Connection
* Authenticated access
* Unauthorized access
* Error handling

---

### FND-003 — Database Schema & Migrations

**Priority:** P0
**Dependencies:** FND-002

Create required PostgreSQL entities for:

* Users/profiles
* Showrooms
* Vehicles
* Vehicle media
* Favorites
* Appointments
* Appointment vehicles
* Availability
* Notifications/activity records
* Manual payments
* Supporting lookup/status data

Implement:

* Foreign keys
* Constraints
* Indexes
* Timestamps
* Ownership relationships

**Agents:** Architect → Backend/Data → Security

**Tests:** Schema, constraints, ownership, RLS.

---

### FND-004 — Supabase RLS & Authorization

**Priority:** P0
**Dependencies:** FND-003

Implement and test:

* Customer ownership
* Showroom ownership
* Vehicle ownership
* Appointment access
* Favorite ownership
* Admin restrictions

**Agents:** Backend/Data → Security

**Release blocker if failed.**

---

# AUTHENTICATION & CUSTOMER

### AUTH-001 — Customer Registration

**Priority:** P0
**Dependencies:** FND-002, FND-004

* Email/password registration.
* Validation.
* Account creation.
* Profile creation.

**Tests:** Positive, duplicate email, invalid input, unauthorized states.

---

### AUTH-002 — Customer Login/Logout

**Priority:** P0
**Dependencies:** AUTH-001

* Login.
* Logout.
* Google OAuth login (added 2026-09-04, via Supabase Auth's built-in Google provider).
* Session persistence.
* Protected routes.

---

### AUTH-003 — Customer Profile

**Priority:** P1
**Dependencies:** AUTH-002

* View profile.
* Edit basic information.
* Secure ownership.

---

### AUTH-004 — Customer Dashboard

**Priority:** P1
**Dependencies:** AUTH-002

Dashboard includes:

* Favorites
* Appointments
* Basic account information

---

### AUTH-005 — Favorites

**Priority:** P1
**Dependencies:** AUTH-002, FND-003

* Add vehicle to favorites.
* Remove favorite.
* View favorites.
* Prevent duplicate favorites.

**E2E required.**

---

# PUBLIC MARKETPLACE

### MKT-001 — Marketplace Homepage

**Priority:** P0
**Dependencies:** FND-001, FND-003

Implement Figma-approved homepage containing:

* Search
* Categories
* Popular brands
* Featured vehicles
* Featured showrooms
* Core CTAs
* "Watch & Discover" (TikTok) and "Reviews & Guides" (YouTube) static video sections (added 2026-09-04, manually-curated links only — no live API)

**Visual QA required.**

---

### MKT-002 — Vehicle Search

**Priority:** P0
**Dependencies:** MKT-001

* Keyword search.
* Pagination.
* Empty state.
* Error state.

---

### MKT-003 — Vehicle Filters

**Priority:** P0
**Dependencies:** MKT-002

Filters:

* Price
* Year
* Mileage
* Relevant vehicle attributes

---

### MKT-004 — Vehicle Sorting

**Priority:** P1
**Dependencies:** MKT-002

Sorting:

* Price
* Year
* Mileage
* Newest
* Relevance

---

### MKT-005 — Vehicle Detail

**Priority:** P0
**Dependencies:** MKT-002

Display:

* Image gallery
* Price
* Specifications
* Description
* Showroom information
* Contact/WhatsApp CTA

**E2E required.**

---

### MKT-006 — Showroom Listing

**Priority:** P1
**Dependencies:** FND-003

Display approved showrooms in marketplace contexts.

---

### MKT-007 — Showroom Detail

**Priority:** P0
**Dependencies:** MKT-006

Display:

* Verified status
* Business information
* Contact information
* Location
* Opening hours
* Vehicle listings

**Note (2026-09-04):** the design's showroom card/detail includes a star rating — omit this for MVP (no reviews table/data exists; see `MVP_REQUIREMENTS.md` §22).

---

### MKT-008 — Finance Calculator

**Priority:** P0
**Dependencies:** MKT-005, SHR-005 (financing configuration)

**Scope (2026-09-03):** per-listing configured, not generic — see `MVP_REQUIREMENTS.md` §17 and §29.

Inputs:

* Vehicle price (from listing)
* Down payment (defaults from showroom's per-listing configuration; customer may adjust within bounds)
* Interest rate (from showroom's per-listing configuration, or `system_settings` default if unconfigured)
* Loan duration (from showroom's configured tenure options)
* Insurance percentage (added 2026-09-04)
* Tracker subscription option (added 2026-09-04)

Output:

* Loan amount
* Insurance cost (added 2026-09-04)
* Tracker cost, if selected (added 2026-09-04)
* Estimated monthly payment
* Total payable estimate (added 2026-09-04)

Must have deterministic calculations and boundary tests.

**E2E required.**

---

### MKT-009 — WhatsApp Inquiry Redirect

**Priority:** P1
**Dependencies:** MKT-005

* Redirect customer to WhatsApp.
* Include useful vehicle/showroom context where practical.
* No internal chat system.

---

### MKT-010 — Vehicle Inquiry Form

**Priority:** P1 (added 2026-09-04, from design review)
**Dependencies:** MKT-005

* Customer submits a one-way message against a specific vehicle listing ("Send Message" CTA in the design).
* Showroom sees submitted inquiries in their dashboard as a list.
* No real-time thread, no read receipts — distinct from the Phase 2 chat/inbox system.

---

# SHOWROOM

### SHR-001 — Showroom Registration

**Priority:** P0
**Dependencies:** AUTH-002, FND-003

**MVP is showroom-only (2026-09-04).** The design's "Individual Seller" registration path is deferred to Phase 2.

Collect:

* Business information
* Contact information
* Required documents
* Informational subscription pricing display (added 2026-09-04 — copy only, no billing logic)

---

### SHR-002 — Document Upload

**Priority:** P0
**Dependencies:** SHR-001, FND-002

* Upload documents to Supabase Storage.
* Validate file type/size.
* Protect document access.

**Security review required.**

---

### SHR-003 — Showroom Approval Workflow

**Priority:** P0
**Dependencies:** SHR-001, SHR-002, ADM-001

Statuses:

* Pending
* Approved
* Rejected

Only approved showrooms may operate publicly.

---

### SHR-004 — Showroom Dashboard

**Priority:** P0
**Dependencies:** SHR-003

Dashboard provides:

* Business information
* Vehicle management
* Appointment management
* Basic activity/status information

---

### SHR-005 — Vehicle Creation

**Priority:** P0
**Dependencies:** SHR-004

Showroom can add:

* Vehicle information
* Specifications
* Price
* Status
* Photos
* Financing configuration (down payment %, interest rate, loan tenure options, financing partner) — decided 2026-09-03, feeds MKT-008

---

### SHR-006 — Vehicle Editing

**Priority:** P0
**Dependencies:** SHR-005

Showroom can edit only its own vehicles.

---

### SHR-007 — Vehicle Removal

**Priority:** P1
**Dependencies:** SHR-005

Showroom can remove/deactivate its own listings.

---

### SHR-008 — Vehicle Photo Management

**Priority:** P0
**Dependencies:** SHR-005, FND-002

* Upload photos.
* Validate files.
* Associate media with vehicle.
* Secure storage access.

---

### SHR-009 — Bulk Vehicle Import

**Priority:** P0 (upgraded from P1 on 2026-09-03 — sold as flat MVP-week deliverable per client Scope doc)
**Dependencies:** SHR-005

Support spreadsheet import.

Process:

1. Upload spreadsheet.
2. Validate format.
3. Validate required columns.
4. Validate row values.
5. Report invalid rows.
6. Import valid records.
7. Associate records with correct showroom.

**Must prevent cross-showroom ownership.**

---

# APPOINTMENTS

### APT-001 — Showroom Availability

**Priority:** P0
**Dependencies:** SHR-004

Showroom defines available appointment dates/time slots.

---

### APT-002 — Appointment Booking

**Priority:** P0
**Dependencies:** AUTH-002, APT-001, MKT-005

Customer selects:

* Showroom
* Vehicle(s)
* Date
* Time slot

System generates:

* Unique booking reference
* Appointment record
* Initial appointment status

**E2E required.**

---

### APT-003 — Multi-Car Appointment

**Priority:** P1
**Dependencies:** APT-002

Allow multiple vehicles in one appointment when they belong to the same showroom.

Must prevent vehicles from different showrooms being combined.

---

### APT-004 — Booking Conflict Prevention

**Priority:** P0
**Dependencies:** APT-002

Prevent conflicting bookings through server/database-level validation.

Must handle concurrent booking attempts safely.

**Security + integration testing required.**

---

### APT-005 — Customer Appointment List

**Priority:** P1
**Dependencies:** APT-002, AUTH-004

Customer can view appointment history/status.

---

### APT-006 — Showroom Appointment List

**Priority:** P0
**Dependencies:** APT-002, SHR-004

Showroom can view its appointments.

---

### APT-007 — Confirm Appointment

**Priority:** P0
**Dependencies:** APT-006

Showroom confirms pending appointments.

---

### APT-008 — Reschedule Appointment

**Priority:** P0 (upgraded from P1 on 2026-09-03 — sold as flat MVP-week deliverable per client Scope doc)
**Dependencies:** APT-006, APT-001

Showroom can propose/update a different date/time according to approved business rules.

---

### APT-009 — Decline Appointment

**Priority:** P0
**Dependencies:** APT-006

Showroom can decline an appointment.

---

### APT-010 — Appointment Status Lifecycle

**Priority:** P0
**Dependencies:** APT-007, APT-008, APT-009

Implement controlled status transitions:

* Pending
* Confirmed
* Rescheduled
* Declined
* Cancelled
* Completed

Invalid status transitions must be rejected.

---

# NOTIFICATIONS

### NTF-001 — Email Booking Notifications

**Priority:** P0
**Dependencies:** APT-010

Send email notifications for:

* Booking creation
* Confirmation
* Changes
* Reminders

---

### NTF-002 — WhatsApp Booking Notifications

**Priority:** P0 (upgraded from P1 on 2026-09-03 — sold as flat MVP-week deliverable per client Scope doc; Meta Business Manager verification and template approval are external dependencies and must begin Day 1 in parallel with FND-001)
**Dependencies:** APT-010

Use WhatsApp Cloud API for:

* Confirmation
* Changes
* Reminders

Notification failure must not corrupt appointment data.

---

### NTF-003 — Notification Failure Handling

**Priority:** P1
**Dependencies:** NTF-001, NTF-002

* Record notification failures.
* Do not roll back valid appointment state because of notification failure.
* Support retry-safe behavior where practical.

---

# ADMIN

### ADM-001 — Admin Authentication & RBAC

**Priority:** P0
**Dependencies:** AUTH-002, FND-004

* Secure admin access.
* Server-side authorization.
* Prevent customer/showroom privilege escalation.

---

### ADM-002 — Showroom Management

**Priority:** P0
**Dependencies:** ADM-001, SHR-003

Admin can:

* Review applications.
* Approve.
* Reject.
* Manage showroom records.

---

### ADM-003 — Customer Management

**Priority:** P1
**Dependencies:** ADM-001

Admin can view/manage customer accounts according to MVP requirements.

---

### ADM-004 — Vehicle Moderation

**Priority:** P0
**Dependencies:** ADM-001, SHR-005

Admin can review/moderate vehicle listings.

---

### ADM-005 — Appointment Oversight

**Priority:** P1
**Dependencies:** ADM-001, APT-002

Admin can view appointment activity and status.

---

### ADM-006 — Manual Payment Entry

**Priority:** P1
**Dependencies:** ADM-001

Admin can record manual payment information.

**No automated payment processing in MVP.**

---

# AUDIT & SYSTEM RECORDS

### SYS-001 — Activity/Audit Records

**Priority:** P1
**Dependencies:** FND-003

Record important actions:

* Actor
* Action
* Resource
* Timestamp
* Relevant context

Must avoid storing unnecessary sensitive information.

---

### SYS-002 — Global Validation & Error Handling

**Priority:** P0
**Dependencies:** FND-001

Standardize:

* Input validation
* API/database errors
* Form errors
* Loading states
* Empty states
* Failure states

---

### SYS-003 — Responsive & Accessibility Baseline

**Priority:** P0
**Dependencies:** MKT-001

Verify:

* Mobile
* Tablet
* Desktop
* Keyboard navigation
* Labels
* Focus states
* Basic semantic/accessibility requirements

---

# 4. Cross-Cutting Requirements

Every applicable feature must include:

### Code Quality

* Strict TypeScript.
* DRY implementation.
* Reusable components/utilities.
* No unnecessary duplication.
* No unnecessary dependencies.

### Security

* Authentication.
* Authorization.
* RLS.
* Input validation.
* Ownership checks.
* Secure file handling.
* No exposed service-role credentials.

### Testing

* Unit tests where logic exists.
* Integration tests for data/business rules.
* E2E tests for user journeys.
* Negative/boundary tests.
* Regression coverage.

### Performance

* Efficient queries.
* Proper indexes.
* Pagination.
* Optimized images.
* No unnecessary client-side fetching.
* No premature infrastructure.

### UI

* Figma is the visual source of truth.
* Reuse existing components.
* Loading/empty/error/success states.
* Visual QA for frontend features.

---

# 5. Mandatory E2E Journeys

The following complete journeys must exist before MVP release:

### E2E-001 — Customer Discovery

Homepage → Search → Filter → Vehicle Detail → Finance Calculator → WhatsApp

### E2E-002 — Customer Account

Register → Login → Profile → Favorite Vehicle → View Favorites → Logout

### E2E-003 — Showroom Onboarding

Register Showroom → Upload Documents → Pending → Admin Approval → Dashboard

### E2E-004 — Vehicle Management

Showroom Login → Add Vehicle → Upload Photos → Publish → Edit → Remove

### E2E-005 — Bulk Import

Showroom Login → Upload Spreadsheet → Validation → Import → Verify Listings

### E2E-006 — Appointment

Customer → Vehicle/Showroom → Select Vehicle(s) → Date → Time → Book → Booking Reference

### E2E-007 — Appointment Management

Showroom → View Booking → Confirm/Reschedule/Decline → Customer Sees Updated Status

### E2E-008 — Notifications

Booking Event → Email Notification → WhatsApp Notification → Failure Handling

### E2E-009 — Admin

Admin Login → Approve Showroom → Moderate Listing → View Appointment

---

# 6. Feature Dependencies — High-Level Order

Implementation should generally follow:

```text
Foundation
    ↓
Authentication + RBAC
    ↓
Database + RLS
    ↓
Public Marketplace
    ↓
Showroom Onboarding
    ↓
Vehicle Management
    ↓
Appointments
    ↓
Notifications
    ↓
Admin
    ↓
Cross-feature Integration
    ↓
Full E2E Regression
    ↓
Release
```

Some independent features may be developed in parallel where dependencies allow.

---

# 7. Feature Completion Definition

A feature is **COMPLETE** only when:

* [ ] Requirements understood.
* [ ] Architecture approved.
* [ ] Implementation completed.
* [ ] Existing functionality preserved.
* [ ] DRY/reuse verified.
* [ ] Unit/integration tests completed where applicable.
* [ ] E2E coverage completed where applicable.
* [ ] Security checks passed.
* [ ] Performance checked.
* [ ] Frontend visual QA completed where applicable.
* [ ] Self-review completed.
* [ ] Feature branch created.
* [ ] PR created.
* [ ] Automated checks passed.
* [ ] Code Review Agent reviewed PR.
* [ ] All blockers/high findings fixed.
* [ ] Code Review Agent approved.
* [ ] PR merged.
* [ ] Regression checks passed.
* [ ] `MVP_PROGRESS.md` updated.

---

# 8. MVP Release Gate

The MVP **MUST NOT be released** unless:

* All P0 features are complete.
* Required P1 features are complete or explicitly approved for deferral.
* Unit/integration tests pass.
* Full E2E journeys pass.
* Security gate passes.
* Performance gate passes.
* Code Review Agent has approved all feature PRs.
* Production build succeeds.
* Database/RLS configuration is verified.
* Production smoke tests pass.
* Release Agent approves deployment.

**Any failed mandatory gate = RELEASE BLOCKED.**

---

# 9. Scope Protection

Any new feature, requirement, or major change after this document is locked must be evaluated for:

1. Business necessity.
2. MVP impact.
3. Development effort.
4. Testing impact.
5. Security impact.
6. Timeline impact.

No scope expansion should silently enter the MVP.

---

# 10. Phase 2 Boundary

The following remain outside MVP unless explicitly approved:

* Automated online payments.
* Dedicated NestJS backend.
* Microservices.
* Redis.
* RabbitMQ.
* Kubernetes.
* API Gateway.
* Advanced recommendation engine.
* Advanced analytics.
* CRM.
* Automated payment reconciliation.
* Internal chat system.
* Advanced notification orchestration.
* Enterprise-scale infrastructure.

MVP architecture should remain clean enough to support these later without prematurely implementing them.
