# Automobile Marketplace MVP — MVP Requirements

## 1. Product Overview

The Automobile Marketplace MVP is a web-based marketplace connecting customers with automobile showrooms.

Customers can discover vehicles and showrooms, search/filter inventory, save favorites, calculate financing, contact showrooms through WhatsApp, and book appointments.

Showrooms can register, submit business information/documents for approval, manage inventory, import vehicles in bulk, and manage customer appointments.

Admins control approvals, users, listings, appointments, and manual payment records.

---

# 2. MVP Goals

The MVP must enable:

1. Customers to discover vehicles and showrooms.
2. Customers to search, filter, sort, and inspect vehicle listings.
3. Customers to save favorite vehicles.
4. Customers to contact showrooms through WhatsApp.
5. Customers to book showroom appointments.
6. Customers to view and manage their appointments.
7. Showrooms to register and receive admin approval.
8. Showrooms to manage vehicle inventory.
9. Showrooms to bulk-import vehicle inventory.
10. Showrooms to manage appointments.
11. Admins to manage marketplace operations.
12. Automated booking notifications through Email and WhatsApp Cloud API.
13. Admins to manually enter/manage payment records.

---

# 3. User Roles

## 3.1 Customer

Customers can:

* Register
* Login/logout
* Manage profile
* Browse vehicles
* Search vehicles
* Filter vehicles
* Sort vehicles
* View vehicle details
* View showroom details
* Favorite/unfavorite vehicles
* View favorites
* Book appointments
* View appointments
* Manage eligible appointment actions
* Contact showroom through WhatsApp

---

## 3.2 Showroom

Showrooms can:

* Register
* Submit business information
* Upload required documents
* Wait for admin approval
* Manage showroom profile
* Manage vehicles
* Upload vehicle photos
* Edit vehicle specifications
* Manage pricing
* Set vehicle status
* Bulk import vehicles
* View appointments
* Confirm appointments
* Reschedule appointments
* Decline appointments

A showroom cannot access showroom-management functionality until it has passed the required approval state.

---

## 3.3 Admin

Admins can:

* Login
* Manage customers
* Manage showrooms
* Approve/reject showrooms
* Review showroom documents
* Moderate vehicle listings
* Manage vehicle/listing status
* Oversee appointments
* View/manage booking records
* Enter/manage manual payment records
* Review relevant activity/audit records

---

# 4. Public Marketplace

## 4.1 Homepage

The homepage must provide:

* Marketplace search
* Vehicle categories
* Popular brands
* Featured listings
* Featured showrooms
* Core CTAs
* Social content sections (added 2026-09-04, from design review): a "Watch & Discover" TikTok video strip and a "Reviews & Guides" YouTube video strip. MVP scope is **static/manually-curated embeds** — the client supplies video links; no live TikTok/YouTube API integration or auto-sync.

The homepage must be responsive and visually aligned with the approved Figma design.

---

# 5. Vehicle Discovery

Customers must be able to:

* Browse vehicle listings
* Search by keyword
* Search vehicles
* Filter listings
* Sort listings
* Paginate results

## Supported Sorting

* Price
* Year
* Mileage
* Newest
* Relevance

Search/filter results must correctly reflect the selected criteria.

---

# 6. Vehicle Detail

Each vehicle detail page must support:

* Vehicle image gallery
* Vehicle specifications
* Price
* Description
* Showroom information
* Relevant vehicle status
* Finance calculator access
* Favorite action
* WhatsApp contact/inquiry action
* Appointment booking access where applicable

---

# 7. Showroom Marketplace

## Showroom Detail Page

Must display:

* Showroom name
* Verified/approval status
* Contact information
* Location
* Business hours
* Available vehicle listings

Customers should be able to navigate from a showroom to its available inventory.

---

# 8. Customer Account

## Registration/Login

Support:

* Email/password registration
* Login
* Logout
* Google OAuth login (added 2026-09-04, from design review — the login design shows "Continue with Google" as the primary method; Supabase Auth's built-in Google provider is low incremental cost)
* Session management
* Appropriate authentication validation

## Customer Profile

Customers can manage basic profile information.

## Favorites

Customers can:

* Add vehicle to favorites
* Remove vehicle from favorites
* View favorite vehicles

Favorites must be associated with the authenticated customer.

## Customer Dashboard

The dashboard must provide basic access to:

* Profile
* Favorites
* Appointments
* Relevant account information

---

# 9. Showroom Registration & Approval

A showroom registration must collect required business information.

The workflow is:

```text
Showroom Registration
        ↓
Business Information
        ↓
Document Upload
        ↓
Pending Approval
        ↓
Admin Review
        ↓
Approved / Rejected
```

Admins must be able to review and approve/reject showroom registrations.

Only approved showrooms may operate as active marketplace showrooms.

Document storage must use secure Supabase Storage policies.

**MVP is showroom-only (confirmed 2026-09-04).** The design's "Ready to Sell?" page also shows an "Individual Seller" registration path (pay-per-listing, single personal vehicle). This is deferred to Phase 2 — MVP builds only the Showroom registration path. The showroom subscription price shown in the design (KSh 60,000/quarterly) may be displayed as **informational marketing copy** on the registration page; no billing/payment collection logic is built for it in MVP — registration still goes through the existing manual admin-approval workflow.

---

# 10. Showroom Vehicle Management

Approved showrooms can:

* Add vehicles
* Edit vehicles
* Remove vehicles
* Upload photos
* Manage specifications
* Set price
* Set vehicle status
* View inventory

Vehicle ownership must be enforced through authorization/RLS.

A showroom must not be able to modify another showroom's vehicles.

---

# 11. Bulk Vehicle Import

Showrooms must be able to import vehicle inventory using a supported spreadsheet format.

The import process must:

1. Accept the supported spreadsheet format.
2. Validate required columns.
3. Validate data types and values.
4. Detect invalid rows.
5. Report import errors clearly.
6. Prevent unauthorized inventory creation.
7. Associate successfully imported vehicles with the correct showroom.

The exact supported spreadsheet format and validation rules must be defined in the feature/acceptance documentation.

---

# 12. Appointment Booking

Customers must be able to book appointments with showrooms.

An appointment must contain at minimum:

* Customer
* Showroom
* Selected vehicle(s)
* Date
* Time slot
* Unique booking reference
* Appointment status

## Booking Flow

```text
Customer
 ↓
Select Showroom / Vehicle
 ↓
Select Date
 ↓
Select Available Time Slot
 ↓
Confirm Booking
 ↓
Unique Booking Reference
 ↓
Notifications
```

Showroom availability must control which appointment slots can be booked.

The system must prevent invalid or conflicting bookings.

---

# 13. Multi-Car Viewing

Where practical within MVP scope, customers must be able to include multiple vehicles from the same showroom in a single appointment.

Example:

```text
Appointment
├── Vehicle A
├── Vehicle B
└── Vehicle C
```

Multi-car booking must not allow vehicles from different showrooms within the same appointment.

If implementation complexity threatens the MVP timeline, the Architect/Project Owner must explicitly determine the smallest launch-compliant implementation rather than silently removing the requirement.

---

# 14. Appointment Management

## Customer

Customers can view their appointment list and relevant appointment details.

## Showroom

Showrooms can:

* View appointments
* Confirm appointments
* Reschedule appointments
* Decline appointments

Appointment status changes must be recorded.

## Appointment States

The final states should support at minimum:

```text
Pending
Confirmed
Reschedule Requested / Rescheduled
Declined
Cancelled
Completed
```

Exact state transitions must be defined in `ACCEPTANCE_CRITERIA.md`.

---

# 15. Booking Notifications

The MVP must support notifications for:

* Booking creation
* Booking confirmation
* Booking changes
* Booking reminders

## Email

Email notifications must be supported for relevant booking events.

## WhatsApp Cloud API

WhatsApp Cloud API notifications must support relevant booking events, including:

* Confirmation
* Changes
* Reminders

Notification failures must not corrupt the underlying appointment record.

Notification implementation must be reliable and auditable.

---

# 16. WhatsApp Inquiry

There is **no real-time showroom chat/inbox system in the MVP**.

The primary inquiry/contact action redirects the customer to WhatsApp.

The WhatsApp message should contain relevant context where practical, such as:

* Vehicle
* Showroom
* Customer inquiry intent

This is a redirect/contact flow, not an internal messaging system.

## 16.1 Vehicle Inquiry Form (added 2026-09-04, from design review)

The car-detail design shows a "Send Message" CTA alongside the WhatsApp button. Scope decision: this is a **simple one-way contact form**, not live chat —

* Customer submits a message against a specific vehicle listing.
* Showroom sees submitted inquiries in their dashboard (a list, not a real-time thread).
* No back-and-forth messaging, no read receipts, no live inbox.

This remains distinct from the Phase 2 "real-time customer-to-showroom chat/inquiry inbox," which is still out of MVP scope.

---

# 17. Finance Calculator

The MVP must include a finance calculator.

**Scope decision (2026-09-03):** the calculator is **per-listing configured**, not generic. Each showroom configures financing terms for a specific vehicle listing; the customer-facing calculator on that listing uses those terms rather than arbitrary customer-entered rates.

## Showroom Configuration (per listing)

Showrooms configure, per vehicle:

* Down payment percentage
* Interest rate
* Loan tenure options
* Financing partner (optional)
* Insurance percentage (added 2026-09-04, from design review)
* Tracker subscription options — duration + price (added 2026-09-04, from design review; e.g. "1 Year — KSh 30,000")

## Customer Inputs

* Vehicle price (from the listing)
* Down payment (defaults from showroom configuration; customer may adjust within allowed bounds)
* Interest rate (from showroom configuration for that listing)
* Loan duration (selected from the showroom's configured tenure options)

Output includes:

* Loan amount
* Insurance cost (added 2026-09-04)
* Tracker subscription cost, if selected (added 2026-09-04)
* Estimated monthly payment (includes insurance and tracker costs where applicable)
* Total payable estimate

If a showroom has not configured financing terms for a listing, the calculator falls back to the platform-level defaults in `system_settings` (`finance_default_interest_rate`, `finance_default_duration`). Insurance/tracker line items are omitted from the estimate when not configured for a listing.

The calculation must have deterministic business logic and appropriate validation.

It must be covered by:

* Unit tests
* Boundary/edge-case tests
* E2E testing

---

# 18. Admin Panel

The MVP admin panel must provide basic operational control.

## Showrooms

* View
* Approve
* Reject
* Manage status
* Review submitted information/documents

## Customers

* View/manage customers
* Review account status where required

## Vehicles

* View listings
* Moderate listings
* Manage listing status

## Appointments

* View appointments
* Monitor appointment status
* Resolve operational issues where required

## Payments

The MVP supports:

> **Manual payment entry by Admin.**

Payment automation is explicitly **Phase 2**.

Do not implement payment gateway automation unless explicitly approved.

---

# 19. Payments

## MVP

Payment records are entered/managed manually by Admin.

The MVP does not require automated payment processing.

## Phase 2

Payment automation/gateway integration may be introduced later.

The MVP architecture should avoid blocking future payment automation but must not implement unnecessary Phase 2 infrastructure.

---

# 20. Backend & Infrastructure

The MVP uses:

* Supabase Auth
* PostgreSQL
* Supabase Storage
* Supabase database access
* Vercel deployment

Security must include:

* Authentication
* Authorization
* Role-based access
* RLS
* Server-side validation
* Secure storage policies
* Protected admin functionality

---

# 21. Audit-Friendly Activity Records

Important operational actions should generate audit-friendly activity records where appropriate.

Examples:

* Showroom registration
* Showroom approval/rejection
* Vehicle creation/update/removal
* Appointment creation
* Appointment status changes
* Admin actions
* Manual payment entry

The MVP does not require a complex enterprise audit platform.

The implementation should provide enough information to understand:

```text
Who
→ Did what
→ To which resource
→ When
```

---

# 22. MVP Non-Goals

The following are explicitly outside the MVP unless separately approved:

* Automated payment processing
* Internal chat/messaging
* Separate showroom inquiry system
* Microservices
* Dedicated NestJS backend
* Redis
* RabbitMQ
* Kubernetes
* Complex event-driven architecture
* Advanced recommendation engine
* AI vehicle recommendations
* Enterprise analytics
* Advanced CRM
* Automated payment reconciliation
* Showroom ratings/reviews (confirmed 2026-09-03 — Phase 2)
* Saved searches / new-listing alerts (confirmed 2026-09-03 — Phase 2)
* Sell/trade-in vehicle appraisal submission (confirmed 2026-09-03 — Phase 2)
* Interactive location maps (Google Maps) — MVP displays address/location as text only (confirmed 2026-09-03 — Phase 2)
* Individual seller registration/listing (pay-per-listing personal vehicle sellers) — MVP is showroom-only (confirmed 2026-09-04 — Phase 2)
* Real-time customer-showroom chat/inbox — MVP builds only a one-way vehicle inquiry form, see §16.1 (confirmed 2026-09-04 — Phase 2)
* Showroom ratings/review display on vehicle and showroom pages — omitted from MVP UI (confirmed 2026-09-04 — Phase 2)

---

# 23. Phase 2 Boundary

Phase 2 may introduce:

* NestJS backend
* Dedicated business-logic services
* Automated payments
* More scalable infrastructure
* Advanced notifications
* Expanded analytics
* More advanced marketplace capabilities
* Showroom ratings/reviews and post-appointment feedback workflows
* Saved searches with new-listing alerts
* Sell/trade-in — customer submits a car for showroom appraisal
* Interactive location maps (Google Maps/Maps Platform integration)
* Individual seller (pay-per-listing) registration and listing flow
* Real-time customer-showroom chat/inbox (beyond the MVP one-way inquiry form)
* Showroom ratings/reviews display and collection

The MVP should remain clean enough that these capabilities can be introduced later without requiring premature implementation now.

---

# 24. Core Business Rules

1. Only authenticated customers can access customer account functionality.
2. Only approved showrooms can operate as active marketplace showrooms.
3. A showroom can manage only its own vehicles.
4. Customers can manage only their own favorites and appointments.
5. Admin-only actions must be protected server-side.
6. Appointment slots must respect showroom availability.
7. Conflicting bookings must be prevented.
8. Multi-car appointments may contain vehicles from only one showroom.
9. WhatsApp inquiry is a redirect/contact mechanism, not an internal chat system.
10. MVP payments are manually entered by Admin.
11. Payment automation belongs to Phase 2.
12. Security rules must be enforced at the data/backend boundary, not only in the frontend.
13. Critical business rules must have automated tests.
14. Required E2E user journeys must pass before release.

---

# 25. MVP Success Criteria

The MVP is successful when:

* Customers can discover vehicles and showrooms.
* Customers can search/filter/sort inventory.
* Customers can view complete vehicle/showroom information.
* Customers can favorite vehicles.
* Customers can calculate financing.
* Customers can contact showrooms through WhatsApp.
* Customers can book showroom appointments.
* Showrooms can register and be approved.
* Approved showrooms can manage inventory.
* Showrooms can bulk import inventory.
* Showrooms can manage appointments.
* Booking notifications work through Email and WhatsApp.
* Admins can operate the marketplace.
* Admins can manually manage payment records.
* Authentication and authorization work correctly.
* RLS protects tenant/customer data.
* Critical E2E journeys pass.
* Required security checks pass.
* Required regression tests pass.
* The application is production-ready and deployable on Vercel.

---

# 26. Requirement Priority

Requirements are prioritized:

```text
P0 — Required for MVP / Release Blocker
P1 — Required MVP functionality
P2 — Important but can be simplified if explicitly approved
P3 — Nice-to-have / Phase 2 candidate
```

A lower-priority requirement must never silently replace or remove a P0/P1 requirement.

Any scope change must be explicitly recorded in:

```text
.claude/docs/MVP_PROGRESS.md
```

---

# 27. Requirement Change Rule

Claude Code must not invent or expand product requirements.

When requirements are unclear:

1. Inspect existing project documentation.
2. Check Figma where applicable.
3. Check related acceptance criteria.
4. Identify the ambiguity.
5. Use the smallest interpretation consistent with the documented MVP.
6. If the decision materially affects scope, stop and request/record explicit approval.

---

# 28. Requirement → Engineering Traceability

Every major feature must be traceable through:

```text
Requirement
 ↓
Feature
 ↓
Acceptance Criteria
 ↓
Implementation
 ↓
Tests
 ↓
E2E Flow
 ↓
PR
 ↓
Code Review
 ↓
Release
```

A feature cannot be considered complete merely because code exists.

> **The MVP requirements define WHAT must be built. CLAUDE.md defines HOW it must be built.**

---

# 29. Scope Decision Log

Decisions made 2026-09-03 after cross-checking this document against the client's original proposal (`Automotive_Marketplace_Proposal (2).docx`) and the priced commercial scope (`Automotive_Marketplace_MVP_Phase2_Scope.docx`):

| Decision | Resolution | Reason |
|---|---|---|
| Finance calculator scope | Per-listing configured (showroom sets down payment %, rate, tenure, financing partner per vehicle) | Matches the client's original Proposal §5.2/§4.4; approved despite added schema work |
| `system_settings` table | Kept in MVP | Low incremental cost alongside FND-003; useful scaffolding |
| Manual payment entry (ADM-006) | Kept in MVP as P1 | Simple to build; useful even without automated billing |
| WhatsApp Cloud API notifications (NTF-002) | Upgraded P1 → P0 | Sold as flat MVP-week deliverable in the Scope doc; Meta verification/template approval is an external dependency that must start Day 1 |
| Bulk vehicle import (SHR-009) | Upgraded P1 → P0 | Sold as flat MVP-week deliverable in the Scope doc |
| Showroom reschedule (APT-008) | Upgraded P1 → P0 | Sold as flat MVP-week deliverable in the Scope doc |
| Showroom ratings/reviews | Confirmed Phase 2 | Matches the Scope doc; added to §22/§23 |
| Saved search / new-listing alerts | Confirmed Phase 2 | Absent from Scope doc's MVP bullets; added to §22/§23 |
| Sell/trade-in appraisal | Confirmed Phase 2 | Absent from Scope doc's MVP bullets; added to §22/§23 |
| Interactive location map | Text address only for MVP; map deferred to Phase 2 | Avoids adding Google Maps credentials as a Day-1 external dependency |

See corresponding priority updates in `FEATURES.md` and `FEATURE_IMPLEMENTATION_PLAN.md`, and schema updates in `DATABASE.md`/`DATABASE_MIGRATION_PLAN.md`.

## 29.1 Design Review Decisions (2026-09-04)

Decisions made after reviewing the 7 available screen designs in `/design` (homepage, car-detail, showroom-detail, login-page, register-as-a-showroom, register-individual-seller, ready-to-sell):

| Decision | Resolution | Reason |
|---|---|---|
| "Individual Seller" role (shown in `ready-to-sell.png`/`register-individual-seller.png`) | Deferred to Phase 2; MVP is showroom-only | Not in any requirements doc; adding a 4th role mid-plan risks the schema/RLS/approval-workflow surface under the 1-week timeline |
| Google OAuth login (shown in `login-page.png`) | Built for MVP | Low incremental cost via Supabase Auth's built-in provider; design shows it as the primary login method |
| "Send Message" CTA (shown in `car-detail.png`) | Built as a one-way vehicle inquiry form, not live chat | Matches the design without violating the "no real-time chat" non-goal; see §16.1 |
| Finance calculator insurance % + tracker subscription (shown in `car-detail.png`) | Added to the per-listing financing schema | Matches the actual design; see §17 |
| Showroom subscription pricing (KSh 60,000/quarterly, shown in `ready-to-sell.png`) | Displayed as informational copy only, no billing logic | Registration still uses the existing manual admin-approval flow |
| Star rating in "Sold By" card (shown in `car-detail.png`) | Omitted from MVP UI | No reviews table/data exists for MVP; avoids showing fake/placeholder ratings |
| TikTok/YouTube homepage sections (shown in `homepage.png`) | Built as static, manually-curated embeds | Matches the design visually without requiring live API integration |

These decisions update §4.1 (homepage), §8 (auth), §9 (showroom registration), §16/§16.1 (inquiry), §17 (finance calculator), and §22/§23 (Phase 2 boundary).
