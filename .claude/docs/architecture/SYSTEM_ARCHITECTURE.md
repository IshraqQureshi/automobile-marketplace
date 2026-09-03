# SYSTEM_ARCHITECTURE.md

# Automobile Marketplace — MVP System Architecture

**Status:** Architecture Draft — Implementation Baseline
**Source:** `MVP_REQUIREMENTS.md`, `FEATURES.md`, `ACCEPTANCE_CRITERIA.md`
**MVP Stack:** Next.js + TypeScript + Tailwind + Supabase + PostgreSQL + Supabase Auth + Supabase Storage + Playwright + Vercel

---

# 1. Architecture Goals

The MVP architecture must:

1. Ship within the agreed MVP timeline.
2. Remain simple and maintainable.
3. Enforce clear ownership and authorization boundaries.
4. Keep business rules out of UI components.
5. Make critical rules testable.
6. Avoid unnecessary infrastructure.
7. Support a future NestJS backend migration without requiring a rewrite of the domain model.

**Architecture principle:**

> Build the simplest production-quality architecture that satisfies the MVP. Do not build Phase 2 infrastructure early.

---

# 2. Architecture Style

The MVP uses a **modular monolith**.

```text
Browser
   │
   ▼
Next.js Application
   │
   ├── UI / Pages
   ├── Feature Modules
   ├── Application Logic
   ├── Validation
   └── Data Access
          │
          ▼
      Supabase
          │
          ├── PostgreSQL
          ├── Auth
          └── Storage
```

There is no separate NestJS backend during MVP.

---

# 3. Technology Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| Frontend       | Next.js                                     |
| Language       | TypeScript                                  |
| Styling        | Tailwind CSS                                |
| Authentication | Supabase Auth                               |
| Database       | PostgreSQL via Supabase                     |
| File Storage   | Supabase Storage                            |
| Backend/API    | Next.js server-side capabilities + Supabase |
| E2E            | Playwright                                  |
| Deployment     | Vercel                                      |
| Source Control | Git                                         |
| CI/CD          | Project-configured CI                       |

---

# 4. Explicitly Deferred Architecture

Do **not** introduce these during MVP unless explicitly approved:

* NestJS dedicated backend
* Microservices
* Redis
* RabbitMQ
* Kubernetes
* API Gateway
* Event bus
* Separate notification service
* Complex caching infrastructure
* Service mesh
* Multiple databases

These belong to Phase 2 or later scalability work.

---

# 5. Logical Application Layers

The application should maintain clear logical boundaries even though it is deployed as one application.

```text
Presentation
     ↓
Application / Feature Logic
     ↓
Data Access
     ↓
Supabase / PostgreSQL / Storage
```

## 5.1 Presentation Layer

Responsible for:

* Pages
* Layouts
* Components
* Forms
* User interaction
* Loading states
* Empty states
* Error states
* Accessibility

Presentation code should **not** contain complex business rules.

---

## 5.2 Application / Feature Layer

Responsible for:

* Business workflows
* Validation orchestration
* Appointment operations
* Vehicle operations
* Favorites
* Showroom workflows
* Notification triggering
* Admin operations
* Finance calculation orchestration

Business rules should be reusable and independently testable.

---

## 5.3 Data Access Layer

Responsible for:

* Supabase queries
* Database mutations
* Storage operations
* Query composition
* Mapping database records to application models

Database access should not be duplicated throughout UI components.

---

# 6. Feature-Based Organization

The codebase should be organized primarily around business capabilities rather than one giant global utilities structure.

Suggested structure:

```text
src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── customer/
│   ├── showroom/
│   └── admin/
│
├── components/
│   ├── ui/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── vehicles/
│   ├── showrooms/
│   ├── favorites/
│   ├── appointments/
│   ├── notifications/
│   ├── finance/
│   └── admin/
│
├── lib/
│   ├── supabase/
│   ├── validation/
│   ├── permissions/
│   └── utils/
│
├── types/
│
└── config/
```

The exact structure may be adjusted after inspecting the existing repository.

**Existing project conventions take precedence over blindly applying this structure.**

---

# 7. Authentication Architecture

Supabase Auth is the authentication authority.

**Providers (2026-09-04):** email/password plus Google OAuth via Supabase Auth's built-in Google provider. Both create/link the same `profiles` record — a user signing in with Google using an email that already has a password-based account must resolve to the same profile, not a duplicate.

```text
User
 │
 ▼
Supabase Auth
 │
 ▼
Authenticated Session
 │
 ▼
Application Profile
 │
 ▼
Role / Permissions
```

Supported application roles:

```text
CUSTOMER
SHOWROOM
ADMIN
```

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to do?

These must never be treated as the same concern.

---

# 8. Authorization Architecture

Authorization must be enforced at multiple boundaries.

```text
UI protection
      +
Server-side authorization
      +
Database RLS
```

UI checks are for user experience.

Server-side checks protect application workflows.

RLS provides the database-level security boundary.

**Never rely only on frontend role checks.**

---

# 9. Ownership Model

Core ownership relationships:

```text
Customer
   ├── Favorites
   └── Appointments

Showroom
   ├── Vehicles
   ├── Vehicle Media
   ├── Availability
   └── Appointments

Admin
   └── Management / Moderation
```

A showroom must never be able to modify another showroom's:

* Vehicles
* Vehicle media
* Availability
* Appointments
* Protected documents

A customer must never be able to modify another customer's:

* Profile
* Favorites
* Appointments

---

# 10. Vehicle Architecture

Vehicle lifecycle:

```text
Create
  ↓
Validate
  ↓
Associate with Showroom
  ↓
Add Media
  ↓
Moderation / Publication Rules
  ↓
Public Listing
  ↓
Edit / Deactivate
```

Every vehicle must have an explicit showroom ownership relationship.

Public queries must only expose vehicles allowed by the publication/moderation rules.

---

# 11. Vehicle Media Architecture

Supabase Storage manages vehicle images.

```text
Showroom
   ↓
Upload
   ↓
Validation
   ↓
Storage
   ↓
Vehicle Media Record
   ↓
Vehicle Gallery
```

Requirements:

* Validate file type.
* Enforce size limits.
* Prevent unauthorized uploads.
* Prevent cross-showroom access.
* Avoid orphaned media where practical.

Storage authorization must be aligned with database ownership.

---

# 12. Showroom Onboarding

Showroom lifecycle:

```text
Registration
     ↓
Pending
     ↓
Admin Review
   ↙     ↘
Reject   Approve
           ↓
        Active
```

Only approved showrooms may:

* Operate as active marketplace businesses.
* Publish/maintain active listings.
* Perform approved showroom operations.

---

# 13. Appointment Architecture

Appointments are one of the most critical MVP domains.

Core relationship:

```text
Customer
   │
   ▼
Appointment
   │
   ├── Showroom
   ├── Date
   ├── Time Slot
   ├── Status
   ├── Booking Reference
   └── Selected Vehicles
```

Multiple vehicles are represented through an appointment-to-vehicle relationship rather than duplicating appointment records.

---

# 14. Appointment State Machine

The application must enforce controlled state transitions.

```text
Pending
 ├── Confirmed
 ├── Rescheduled
 ├── Declined
 └── Cancelled

Confirmed
 ├── Rescheduled
 ├── Cancelled
 └── Completed

Rescheduled
 ├── Confirmed
 ├── Rescheduled
 ├── Declined
 └── Cancelled
```

Invalid transitions must be rejected.

The state machine should exist in reusable application logic and be protected by server-side validation.

---

# 15. Appointment Conflict Prevention

Appointment availability cannot depend only on the frontend.

The system must protect against:

```text
Customer A ──┐
             ├── Same showroom + same slot
Customer B ──┘
```

Concurrent booking attempts must not create invalid conflicting bookings.

Conflict prevention must be enforced as close to the database transaction boundary as practical.

This requires integration/concurrency testing.

---

# 16. Multi-Car Viewing

Multiple vehicles may be attached to one appointment.

Business rule:

```text
Vehicle A → Showroom X
Vehicle B → Showroom X
       ↓
   VALID

Vehicle A → Showroom X
Vehicle B → Showroom Y
       ↓
   INVALID
```

The rule must be enforced server-side.

---

# 17. Notification Architecture

MVP notifications use:

```text
Appointment Event
       │
       ▼
Application Workflow
       │
       ├── Email
       │
       └── WhatsApp Cloud API
```

Notifications are **side effects**, not the source of truth.

The appointment record must be successfully persisted independently of notification delivery.

Example:

```text
Appointment Confirmed
       ↓
Appointment state saved
       ↓
Notification attempted
       ↓
Success / Failure recorded
```

A notification failure must not make a valid appointment appear invalid.

---

# 18. Notification Idempotency

Notification operations should be designed to avoid accidental duplicate sends.

Where retries are implemented:

* Use identifiable notification/event records.
* Avoid blindly sending duplicate messages.
* Make retry behavior explicit.
* Do not retry indefinitely.

Complex event infrastructure is intentionally deferred.

---

# 19. Bulk Import Architecture

Bulk import flow:

```text
Spreadsheet
    ↓
Upload
    ↓
Parse
    ↓
Validate Structure
    ↓
Validate Rows
    ↓
Separate Valid / Invalid
    ↓
Import Valid Rows
    ↓
Report Results
```

Critical rule:

> Imported vehicles must always be associated with the authenticated showroom.

The showroom ID must never be trusted from arbitrary spreadsheet/user input.

---

# 20. Finance Calculator Architecture

Finance calculation logic must be isolated from UI rendering.

```text
User Inputs
    ↓
Validation
    ↓
Finance Calculation Function
    ↓
Result
    ↓
Formatted UI
```

The calculation function should be deterministic and independently unit tested.

UI components must not contain duplicated calculation formulas.

---

# 21. WhatsApp Inquiry Architecture

The inquiry feature is intentionally simple.

```text
Vehicle Detail
      ↓
WhatsApp CTA
      ↓
WhatsApp
```

There is:

* No internal conversation table.
* No internal messaging system.
* No showroom chat dashboard.

WhatsApp is the external communication channel.

**Vehicle Inquiry Form (added 2026-09-04):** a separate, deliberately minimal capability exists alongside WhatsApp — a one-way "Send Message" form on the vehicle detail page that persists to `vehicle_inquiries` and surfaces as a list in the showroom dashboard. It is explicitly not a chat/thread system (no replies, no read-state beyond NEW/VIEWED) — real-time chat remains Phase 2. See `DATABASE.md` §8.1.

---

# 22. Admin Architecture

Admin functionality is protected separately from normal user flows.

```text
Admin
  ↓
Server-side authorization
  ↓
Admin Operations
  ├── Showrooms
  ├── Customers
  ├── Vehicles
  ├── Appointments
  └── Manual Payments
```

Admin authorization must never rely solely on hiding UI elements.

---

# 23. Manual Payment Architecture

MVP supports administrative payment records only.

```text
Admin
 ↓
Payment Entry
 ↓
Validation
 ↓
Payment Record
```

No payment gateway processing is required.

Automated payment processing belongs to Phase 2.

---

# 24. Audit Architecture

Important business actions should produce activity records.

Conceptually:

```text
Actor
Action
Resource
Timestamp
Context
```

Examples:

* Showroom approved.
* Vehicle moderated.
* Appointment confirmed.
* Appointment rescheduled.
* Appointment declined.
* Manual payment recorded.

Audit records should be append-oriented and protected from ordinary user modification.

---

# 25. API / Server Boundary

Even without a dedicated NestJS backend, sensitive operations should have a controlled server-side boundary.

Examples:

* Admin operations
* Appointment booking
* Appointment status transitions
* Bulk imports
* Notification dispatch
* Protected storage operations
* Sensitive mutations

Do not expose privileged credentials or trusted operations directly to the browser.

---

# 26. Data Access Rules

Data access should follow these principles:

1. Use existing shared data-access functions before creating new ones.
2. Avoid duplicated Supabase queries.
3. Keep ownership conditions explicit.
4. Validate input before mutations.
5. Prefer server/database enforcement for critical rules.
6. Use pagination for potentially large datasets.
7. Add indexes based on real query requirements.
8. Avoid fetching unnecessary columns/data.

---

# 27. Error Handling

Errors should follow:

```text
Input
 ↓
Validation
 ↓
Business Rule
 ↓
Authorization
 ↓
Database / External Service
 ↓
Controlled Result
```

The application must not expose:

* Database internals.
* Secrets.
* Stack traces to users.
* Service credentials.
* Sensitive implementation details.

---

# 28. Performance Architecture

MVP performance priorities:

### Frontend

* Server rendering where appropriate.
* Avoid unnecessary client components.
* Optimized images.
* Avoid unnecessary JavaScript.
* Reuse components.

### Database

* Proper indexes.
* Pagination.
* Efficient filtering.
* Avoid N+1 query patterns.
* Fetch only required data.

### Network

* Avoid unnecessary requests.
* Avoid duplicate data fetching.
* Handle loading states correctly.

Do not introduce Redis or other caching infrastructure without measured need.

---

# 29. Security Architecture

Security follows:

```text
Authentication
      ↓
Authorization
      ↓
Input Validation
      ↓
Business Rules
      ↓
RLS
      ↓
Database
```

Critical security requirements:

* Supabase RLS.
* Server-side authorization.
* Ownership validation.
* Secure Storage policies.
* File validation.
* Input validation.
* Admin privilege protection.
* IDOR protection.
* Secret protection.
* Safe error responses.

Security testing must include unauthorized and cross-owner scenarios.

---

# 30. Testing Architecture

Testing layers:

```text
Unit
  ↓
Integration
  ↓
E2E
  ↓
Regression
  ↓
Production Smoke
```

### Unit

Use for:

* Finance calculations.
* Validation.
* Appointment state transitions.
* Reusable business logic.

### Integration

Use for:

* Database operations.
* RLS.
* Authentication/authorization.
* Appointment conflict handling.
* Bulk import.
* Notifications.

### E2E

Use for complete user journeys.

Required journeys are defined in:

`ACCEPTANCE_CRITERIA.md`

---

# 31. Environment Architecture

At minimum:

```text
Local
  ↓
Preview/Staging
  ↓
Production
```

Environment-specific configuration must be stored securely.

Never commit:

* API secrets.
* Supabase service-role keys.
* WhatsApp credentials.
* Email credentials.
* Production secrets.

---

# 32. Deployment Architecture

MVP deployment:

```text
Git Repository
      ↓
CI Checks
      ↓
Vercel Build
      ↓
Preview
      ↓
QA / E2E / Security
      ↓
Production
```

Production deployment requires Release Agent approval.

---

# 33. Phase 2 Migration Strategy

The MVP must not contain a premature NestJS backend.

Instead, maintain clean boundaries:

```text
Next.js UI
     ↓
Application / Domain Logic
     ↓
Data Access Boundary
     ↓
Supabase
```

Phase 2 can evolve toward:

```text
Next.js
    ↓
NestJS API
    ↓
Domain/Application Services
    ↓
PostgreSQL
```

The database/domain model should remain stable where practical.

The migration goal is:

> Replace infrastructure boundaries, not rewrite business behavior.

---

# 34. Architecture Decision Rules

Before introducing a new architectural pattern, ask:

1. Does MVP require it?
2. Is there a measured problem?
3. Can the requirement be solved more simply?
4. Does it introduce additional operational complexity?
5. Does it create unnecessary Phase 2 infrastructure?
6. Does it violate the modular-monolith strategy?

If the answer does not justify the complexity, do not introduce it.

---

# 35. Architecture Review Gate

The Architect Agent must review:

* Database boundaries.
* Authentication.
* Authorization.
* RLS.
* Appointment design.
* Storage.
* Notification flow.
* Bulk import.
* Admin operations.
* New dependencies.
* Significant refactors.
* Any architecture change.

Statuses:

```text
APPROVED
CHANGES_REQUIRED
BLOCKED
```

No major architectural change proceeds while status is `BLOCKED`.

---

# 36. Golden Architecture Principles

```text
Simple
   ↓
Modular
   ↓
Secure
   ↓
Testable
   ↓
Measurable
   ↓
Production Ready
```

The MVP should optimize for **business correctness and delivery speed without sacrificing security or maintainability**.

Do not optimize for hypothetical scale.

Do not build Phase 2 infrastructure early.

Do not bypass database authorization.

Do not put business logic exclusively in the UI.

Do not duplicate business rules.

Do not merge unreviewed feature work.

---

# 37. Architecture Definition of Done

Architecture is considered ready for implementation when:

* [ ] MVP stack is confirmed.
* [ ] Module boundaries are defined.
* [ ] Authentication model is defined.
* [ ] Authorization model is defined.
* [ ] Ownership model is defined.
* [ ] Appointment architecture is defined.
* [ ] Notification architecture is defined.
* [ ] Storage approach is defined.
* [ ] Bulk import flow is defined.
* [ ] Testing boundaries are defined.
* [ ] Phase 2 boundaries are explicit.
* [ ] No unnecessary infrastructure is introduced.
* [ ] Architect Agent approves the architecture.

**Architecture Status:**

```text
READY_FOR_IMPLEMENTATION
```
