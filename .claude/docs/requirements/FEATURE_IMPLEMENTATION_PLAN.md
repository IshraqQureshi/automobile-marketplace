# Feature Implementation Plan

## 1. Purpose

This document is the execution blueprint for building the Automobile Marketplace MVP.

It converts:

```text
MVP Requirements
      ↓
Features
      ↓
Dependencies
      ↓
Implementation Tasks
      ↓
Testing
      ↓
PR + Code Review
      ↓
Merge
      ↓
Regression
      ↓
Release
```

This document is the primary implementation reference for Claude Code and all development agents.

---

# 2. MVP Delivery Target

## Timeline

```text
Development: 5 days
QA / E2E / Security / Performance / Deployment: 2 days
Total: 7 days
```

The timeline is aggressive.

Agents must prioritize:

1. P0 functionality
2. Correctness
3. Security
4. End-to-end user journeys
5. Production readiness

Avoid unnecessary abstractions and Phase 2 infrastructure.

---

# 3. Technology Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS

## Backend / Data

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Server-side application logic where required

## Testing

* Unit tests
* Integration tests
* RLS tests
* Playwright E2E

## Deployment

* Vercel
* Supabase

---

# 4. Mandatory Engineering Workflow

Every feature follows:

```text
REQUIREMENTS
↓
ARCHITECTURE
↓
TASK PLANNING
↓
IMPLEMENTATION
↓
UNIT / INTEGRATION TESTS
↓
E2E
↓
VISUAL QA
↓
SECURITY
↓
PERFORMANCE
↓
SELF REVIEW
↓
BRANCH
↓
PR
↓
AUTOMATED CHECKS
↓
CODE REVIEW AGENT
↓
FIXES
↓
RE-REVIEW
↓
APPROVAL
↓
MERGE
↓
REGRESSION
↓
RELEASE
```

No feature is considered complete merely because the code works locally.

---

# 5. Agent Ownership

| Area                   | Primary Agent      |
| ---------------------- | ------------------ |
| Architecture           | Architect Agent    |
| Frontend               | Frontend Agent     |
| Database / Supabase    | Backend/Data Agent |
| Cross-layer feature    | Full-Stack Agent   |
| Focused implementation | Code Agent         |
| Functional QA          | QA Agent           |
| Browser E2E            | E2E Agent          |
| Security               | Security Agent     |
| Performance            | Performance Agent  |
| PR review              | Code Review Agent  |
| Production release     | Release Agent      |

Agents may collaborate, but ownership must remain clear.

---

# 6. Implementation Priority

## P0

Must exist for MVP launch.

```text
FND-001
FND-002
FND-003
FND-004

AUTH-001
AUTH-002

MKT-001
MKT-002
MKT-003
MKT-005
MKT-007
MKT-008

SHR-001
SHR-002
SHR-003
SHR-004
SHR-005
SHR-006
SHR-008
SHR-009

APT-001
APT-002
APT-004
APT-006
APT-007
APT-008
APT-009
APT-010

NTF-001
NTF-002

ADM-001
ADM-002
ADM-004

SYS-002
SYS-003
```

**Priority upgrades (2026-09-03):** `SHR-009` (bulk import), `APT-008` (reschedule), and `NTF-002` (WhatsApp notifications) moved from P1 to P0 — all three were sold as flat MVP-week deliverables in the client's commercial Scope doc. See `MVP_REQUIREMENTS.md` §29 for the full decision log.

**New feature (2026-09-04):** `MKT-010` (vehicle inquiry form) added at P1, discovered from design review. See `MVP_REQUIREMENTS.md` §29.1.

## P1

Important MVP functionality.

```text
AUTH-003
AUTH-004
AUTH-005

MKT-004
MKT-006
MKT-009
MKT-010

SHR-007

APT-003
APT-005

NTF-003

ADM-003
ADM-005
ADM-006

SYS-001
```

## P2/P3

Only implement if explicitly approved and time permits.

---

# 7. Phase 0 — Project Foundation

## FND-001 — Project Initialization

### Owner

Code Agent / Architect Agent

### Tasks

* Verify existing Next.js project.
* Configure TypeScript.
* Configure Tailwind.
* Configure linting/formatting.
* Establish project conventions.
* Configure environment variables.
* Configure Supabase client utilities.
* Configure testing infrastructure.
* Configure Playwright.
* Establish feature-based project structure.
* Verify Vercel compatibility.
* Verify local development.

### Dependencies

None.

### Tests

* TypeScript
* ESLint
* Production build
* Basic application startup

### Completion

Project runs locally and production build succeeds.

---

# 8. Phase 1 — Supabase Foundation

## FND-002 — Supabase Integration

### Owner

Backend/Data Agent

### Tasks

* Configure Supabase project.
* Configure browser/server clients.
* Configure environment variables.
* Establish authentication integration.
* Establish storage integration.
* Establish database migration workflow.
* Establish typed database access.

### Dependencies

FND-001.

### Tests

* Supabase connection
* Auth connection
* Database query
* Storage access

---

# 9. Database Foundation

## FND-003 — Database Schema & Migrations

### Owner

Backend/Data Agent

### Tables

Implement:

```text
profiles
showrooms
showroom_documents
vehicles
vehicle_media
favorites
showroom_availability
appointments
appointment_vehicles
notifications
manual_payments
vehicle_imports
activity_logs
system_settings
```

### Tasks

* Create migrations.
* Create enums.
* Create foreign keys.
* Create unique constraints.
* Create check constraints.
* Create indexes.
* Create timestamps.
* Create required defaults.
* Establish soft-deactivation strategy.
* Verify migration ordering.

### Tests

* Fresh database migration
* Constraint tests
* Foreign key tests
* Duplicate prevention
* Invalid data rejection

---

# 10. Authorization Foundation

## FND-004 — RLS & Authorization

### Owner

Backend/Data Agent + Security Agent

### Tasks

Implement RLS for:

```text
profiles
showrooms
showroom_documents
vehicles
vehicle_media
favorites
showroom_availability
appointments
appointment_vehicles
notifications
manual_payments
vehicle_imports
activity_logs
system_settings
```

### Required tests

Customer cannot access another customer.

Showroom cannot access another showroom.

Showroom cannot modify another showroom's vehicles.

Customer cannot modify vehicles.

Non-admin cannot modify system settings.

Unauthorized users cannot access private documents.

Admin can perform authorized management operations.

### Gate

**Release blocking.**

---

# 11. Authentication

## AUTH-001 — Customer Registration

### Owner

Frontend Agent + Backend/Data Agent

### Tasks

* Registration UI.
* Email/password validation.
* Supabase Auth registration.
* Profile creation.
* Default CUSTOMER role.
* Duplicate email handling.
* Error states.
* Success state.

### Tests

* Valid registration
* Invalid email
* Weak password
* Duplicate email
* Profile creation
* Unauthorized role escalation attempt

### E2E

Customer registration → login → marketplace.

---

## AUTH-002 — Login / Logout

### Tasks

* Login UI.
* Supabase authentication.
* Google OAuth login (added 2026-09-04, via Supabase Auth's built-in Google provider).
* Session handling.
* Protected routes.
* Logout.
* Invalid credentials.
* Session expiration handling.

### E2E

Login → dashboard → logout.

---

## AUTH-003 — Customer Profile

### Tasks

* Profile view.
* Profile editing.
* Phone/name updates.
* Validation.

---

## AUTH-004 — Customer Dashboard

### Tasks

Display:

* Profile
* Favorites
* Appointments
* Basic account information

---

## AUTH-005 — Favorites

### Tasks

* Add favorite.
* Remove favorite.
* Display favorites.
* Duplicate prevention.
* Ownership validation.

### E2E

Login → vehicle → favorite → dashboard → favorite visible.

---

# 12. Marketplace

## MKT-001 — Homepage

### Owner

Frontend Agent

### Tasks

Implement Figma design exactly enough to satisfy approved visual requirements.

Sections may include:

* Hero
* Search
* Categories
* Popular brands
* Featured listings
* Showrooms
* Core CTAs
* "Watch & Discover" (TikTok) and "Reviews & Guides" (YouTube) sections — static, manually-curated video links only, no live API integration (added 2026-09-04)

### Requirements

* Responsive
* Accessible
* Real data
* Loading states
* Empty states
* Error states

### Tests

* Responsive testing
* Component tests
* E2E homepage load

---

## MKT-002 — Search

### Tasks

* Keyword search.
* Vehicle search.
* Showroom/search context where required.
* Pagination.

### Tests

* Valid search
* No results
* Partial search
* Case handling
* Pagination

---

## MKT-003 — Filters

Filters:

```text
Price
Year
Mileage
Make
Model
Body type
Fuel type
Transmission
Showroom
```

### Tests

* Individual filters
* Combined filters
* Boundary values
* Empty results
* Invalid values

---

## MKT-004 — Sorting

Sorting:

```text
Newest
Price low → high
Price high → low
Year
Mileage
```

Must work with filtering and pagination.

---

## MKT-005 — Vehicle Detail

### Tasks

Display:

* Gallery
* Vehicle information
* Price
* Specifications
* Description
* Showroom
* Finance calculator
* WhatsApp inquiry

### Tests

* Existing vehicle
* Invalid vehicle
* Inactive vehicle
* Image failure
* Responsive layout

---

## MKT-006 — Showroom Listing

Display approved showrooms and relevant vehicle counts/listings.

---

## MKT-007 — Showroom Detail

Display:

* Business name
* Verification status
* Contact information
* Address/location
* Hours
* Vehicles

Only approved showroom information should be publicly exposed.

---

# 13. Finance Calculator

## MKT-008 — Finance Calculator

### Owner

Frontend Agent + Code Agent

### Scope (2026-09-03)

Per-listing configured, not generic. Showroom configures financing terms per vehicle (down payment %, interest rate, loan tenure options, financing partner); the calculator on that listing uses those terms as inputs/defaults. See `MVP_REQUIREMENTS.md` §17/§29.

### Inputs

```text
Vehicle price (from listing)
Down payment (defaults from showroom's per-listing config)
Interest rate (from showroom's per-listing config, else system_settings default)
Loan duration (from showroom's configured tenure options)
Insurance percentage (added 2026-09-04)
Tracker subscription option (added 2026-09-04)
```

Output adds insurance cost, tracker cost (if selected), and a total payable estimate alongside loan amount and monthly payment (added 2026-09-04).

### Core rule

```text
loan_amount = vehicle_price - down_payment
```

### Validation

```text
vehicle_price > 0
down_payment >= 0
down_payment <= vehicle_price
interest_rate >= 0
duration > 0
```

Zero-interest scenarios must work correctly.

### Tests

* Unit
* Boundary
* Invalid inputs
* Zero interest
* Large values
* E2E

Financial calculation errors are release blockers.

---

# 14. WhatsApp Inquiry

## MKT-009

### Rule

This is **not an internal chat system**.

The user is redirected to WhatsApp with relevant vehicle/showroom context.

### Tasks

* Generate WhatsApp URL.
* Encode message safely.
* Include vehicle context.
* Handle missing phone number.
* Prevent unsafe arbitrary URL behavior.

---

## MKT-010 — Vehicle Inquiry Form (added 2026-09-04)

### Rule

One-way contact form, not live chat. Distinct from the Phase 2 real-time chat/inbox.

### Tasks

* "Send Message" form on vehicle detail page.
* Persist inquiry (vehicle, showroom, customer, message).
* Showroom-side inquiry list view (dashboard).
* Validation (non-empty message, rate-limit basic abuse if trivial to add).

---

# 15. Showroom Onboarding

## SHR-001 — Registration

**MVP is showroom-only (2026-09-04).** The design's "Individual Seller" path is deferred to Phase 2.

### Tasks

* Showroom registration form.
* Business information.
* Owner association.
* Validation.
* PENDING status.
* Informational subscription pricing display (added 2026-09-04 — copy only, no billing logic).

---

## SHR-002 — Document Upload

### Tasks

* Upload verification documents.
* Validate file type.
* Validate size.
* Store securely.
* Associate with showroom.

---

## SHR-003 — Approval Workflow

### Lifecycle

```text
PENDING
   ↓
APPROVED
   ↓
SUSPENDED
```

Alternative:

```text
PENDING → REJECTED
```

Admin controls approval.

### Tests

* Approval
* Rejection
* Suspension
* Unauthorized modification

---

## SHR-004 — Showroom Dashboard

Display:

* Business information
* Vehicles
* Appointments
* Availability
* Documents
* Import history where applicable

---

# 16. Vehicle Management

## SHR-005 — Vehicle Creation

### Tasks

* Vehicle form.
* Validation.
* Ownership.
* Status.
* Media upload.
* Financing configuration (2026-09-03): down payment %, interest rate, loan tenure options, financing partner — optional per listing, feeds MKT-008.

---

## SHR-006 — Vehicle Editing

Only the owning showroom may edit.

---

## SHR-007 — Vehicle Removal

Prefer status/deactivation over destructive deletion when historical references exist.

---

## SHR-008 — Vehicle Photos

### Tasks

* Upload.
* Delete.
* Reorder.
* Primary image.
* Maximum image count.
* File validation.
* Storage ownership.

### Tests

* Valid upload
* Invalid format
* Oversized file
* Unauthorized access
* Delete
* Reorder

---

# 17. Bulk Vehicle Import

## SHR-009

### Tasks

* Spreadsheet upload.
* Validate supported columns.
* Validate data types.
* Validate required fields.
* Associate all records with authenticated showroom.
* Report invalid rows.
* Import valid rows.
* Handle duplicates.
* Track import status.

### Critical rule

Never report a successful import when records failed silently.

### Tests

* Valid file
* Missing columns
* Invalid rows
* Mixed valid/invalid rows
* Empty file
* Duplicate rows
* Oversized file
* Unauthorized showroom access

---

# 18. Appointments

## APT-001 — Availability

### Tasks

* Showroom availability configuration.
* Date selection.
* Time slots.
* Business hours.
* Disabled dates/times.

---

## APT-002 — Booking

### Flow

```text
Vehicle / Showroom
↓
Select appointment date
↓
Select available slot
↓
Select vehicles
↓
Confirm
↓
Create appointment
↓
Generate booking reference
↓
Send notifications
```

### Validation

* Authenticated customer.
* Approved showroom.
* Valid slot.
* Valid vehicles.
* Vehicle/showroom relationship.
* No conflicting booking.

---

## APT-003 — Multi-Car Viewing

Customer may select multiple vehicles from the same showroom.

Cross-showroom selection is prohibited.

---

## APT-004 — Conflict Prevention

### Requirement

Concurrent requests must not create conflicting appointments.

### Tests

* Same slot sequential booking.
* Same slot concurrent booking.
* Different showroom same time.
* Different slots.
* Cancelled appointment slot reuse.

### Gate

**Release blocking.**

---

## APT-005 — Customer Appointments

Customer can view:

* Upcoming
* Past
* Status
* Showroom
* Vehicles
* Date/time
* Booking reference

---

## APT-006 — Showroom Appointments

Showroom can view only its appointments.

---

## APT-007 — Confirm

Showroom can confirm pending appointments.

---

## APT-008 — Reschedule

Showroom can request/apply a new time according to the approved workflow.

Availability must be checked again.

---

## APT-009 — Decline

Showroom can decline an appointment.

Reason may be recorded if required.

---

## APT-010 — Status Lifecycle

Supported statuses:

```text
PENDING
CONFIRMED
RESCHEDULED
DECLINED
CANCELLED
COMPLETED
```

Invalid transitions must be rejected.

---

# 19. Notifications

## NTF-001 — Email

Email events:

```text
Booking created
Booking confirmed
Booking rescheduled
Booking declined
Booking cancelled
Booking reminder
```

### Rules

* Appointment must remain valid if email fails.
* Failure must be logged.
* Recipient must be validated.
* Duplicate notification behavior must be controlled.

---

## NTF-002 — WhatsApp

Use WhatsApp Cloud API.

Credentials remain environment secrets.

Events follow the approved notification configuration.

---

## NTF-003 — Notification Failure Handling

Failed notifications must:

* Record failure.
* Preserve appointment.
* Avoid silent failure.
* Support controlled retry where implemented.

---

# 20. Admin

## ADM-001 — Admin Authentication / RBAC

Admin access must be protected through:

```text
Authentication
+
Role verification
+
Server-side authorization
+
RLS where applicable
```

Never trust frontend role checks alone.

---

## ADM-002 — Showroom Management

Admin can:

* View
* Approve
* Reject
* Suspend
* Review documents

---

## ADM-003 — Customer Management

Admin can:

* View customers
* Deactivate/reactivate where approved
* Review relevant activity

Admin must not expose unnecessary sensitive information.

---

## ADM-004 — Vehicle Moderation

Admin can:

* View listings
* Approve/reject where workflow requires
* Deactivate
* Moderate inappropriate listings

---

## ADM-005 — Appointment Oversight

Admin can:

* View appointments
* Inspect status
* Resolve operational issues where permitted

---

## ADM-006 — Manual Payments

Admin can manually record payment information.

Automated payment processing is Phase 2.

---

# 21. System Configuration

System settings are managed through the Admin panel.

## Setting categories

```text
General
Maintenance
Administrator Notifications
Customer/Showroom Notifications
Appointments
Marketplace
Registration
Vehicle
Bulk Import
Finance Calculator
```

## Examples

```text
site_name
support_email
support_phone

maintenance_mode
maintenance_message

admin_emails
admin_cc_emails

email_notifications_enabled
whatsapp_notifications_enabled

appointment_default_duration
appointment_reminder_hours

default_page_size
maximum_page_size

customer_registration_enabled
showroom_registration_enabled

maximum_vehicle_images
maximum_vehicle_image_size_mb

bulk_import_enabled
bulk_import_max_rows

finance_calculator_enabled
```

### Security

Secrets such as:

```text
API keys
SMTP passwords
WhatsApp access tokens
Supabase service keys
```

must remain in environment/secret management.

### Admin setting changes

Every important setting change should generate an activity log.

---

# 22. SYS-001 — Activity / Audit Logging

Track important actions.

Minimum administrative events:

```text
Showroom approval
Showroom rejection
Showroom suspension
Vehicle moderation
Appointment administrative change
Manual payment creation/update
System setting update
User status change
```

---

# 23. SYS-002 — Global Validation & Error Handling

Every feature must implement:

* Input validation
* Server-side validation
* Database constraints
* Friendly user errors
* Structured application errors
* Loading state
* Empty state
* Error state
* Recovery where practical

Never expose:

* Stack traces
* Secrets
* Database internals
* Service credentials

to end users.

---

# 24. SYS-003 — Responsive & Accessibility

Every user-facing feature must support:

* Desktop
* Tablet
* Mobile

Minimum accessibility requirements:

* Keyboard navigation
* Labels
* Focus states
* Accessible buttons
* Appropriate semantic HTML
* Form errors
* Meaningful image alt text
* Sufficient interaction targets

---

# 25. Mandatory E2E Journeys

The following complete browser journeys are mandatory.

## E2E-001

Customer:

```text
Register
→ Login
→ Search vehicle
→ Filter
→ Open detail
→ Finance calculation
→ Favorite
→ Logout
```

## E2E-002

Customer:

```text
Login
→ Vehicle
→ Select showroom
→ Select appointment
→ Select one/multiple vehicles
→ Book
→ Receive confirmation state
```

## E2E-003

Showroom:

```text
Register
→ Upload documents
→ Pending approval
→ Admin approves
→ Showroom login
→ Dashboard
```

## E2E-004

Showroom:

```text
Login
→ Add vehicle
→ Upload images
→ Save
→ Vehicle appears in marketplace
```

## E2E-005

Showroom:

```text
Login
→ Edit vehicle
→ Change information
→ Save
→ Verify marketplace
```

## E2E-006

Showroom:

```text
Login
→ Configure availability
→ Customer books
→ Showroom views appointment
→ Confirm
```

## E2E-007

Appointment:

```text
Customer books
→ Showroom reschedules/declines
→ Customer sees updated status
→ Notification recorded
```

## E2E-008

Admin:

```text
Login
→ Showroom management
→ Vehicle moderation
→ Appointment oversight
→ Manual payment
→ System settings
```

## E2E-009

Bulk import:

```text
Showroom login
→ Upload spreadsheet
→ Validation
→ Import
→ Review results
→ Verify vehicles
```

All mandatory E2E journeys must pass before release.

---

# 26. Cross-Feature Regression

Every new feature must verify that it has not broken:

```text
Authentication
Marketplace
Vehicle detail
Showroom access
Appointments
Notifications
Admin
RLS
Finance calculator
Existing E2E journeys
```

Regression tests must run before merge/release according to the feature impact.

---

# 27. PR Rules

Every feature gets its own branch.

Branch examples:

```text
feature/customer-auth
feature/vehicle-search
feature/appointment-booking
feature/system-settings

fix/appointment-conflict
fix/vehicle-upload
security/showroom-rls
```

No direct commits to main.

---

# 28. PR Gate

Before PR:

```text
TypeScript
ESLint
Unit tests
Integration tests
Relevant RLS tests
Relevant E2E tests
Build
Self-review
```

After PR:

```text
Automated checks
↓
Code Review Agent
↓
Fix findings
↓
Re-review
↓
Approval
↓
Merge
```

No merge without Code Review Agent approval.

---

# 29. Code Review Requirements

Code Review Agent must verify:

* Requirements
* Acceptance criteria
* Architecture
* TypeScript
* DRY/reuse
* Security
* RLS
* Authorization
* Database integrity
* Error handling
* Async/race conditions
* Performance
* Unit tests
* Integration tests
* E2E tests
* Figma compliance
* Git hygiene
* Scope

Findings:

```text
BLOCKER
HIGH
MEDIUM
LOW
```

BLOCKER/HIGH issues must be resolved before approval.

---

# 30. Performance Gate

Performance Agent must measure:

* Marketplace search
* Vehicle listing
* Vehicle detail
* Appointment availability
* Admin tables
* Image loading
* JavaScript bundle impact
* Database query efficiency

Do not introduce infrastructure merely because it may be useful later.

Optimize measurable bottlenecks.

---

# 31. Security Gate

Security Agent must verify:

* Authentication
* Authorization
* RLS
* IDOR
* Privilege escalation
* Input validation
* File upload security
* Storage security
* XSS
* Injection
* Open redirects
* Secret exposure
* Admin access
* Mass assignment
* Race conditions
* Sensitive data exposure

Security blockers prevent release.

---

# 32. Release Gate

Release Agent requires:

```text
All P0 features complete
+
Required P1 features complete
+
Unit tests pass
+
Integration tests pass
+
RLS tests pass
+
Mandatory E2E tests pass
+
Security approved
+
Performance approved
+
Code Review approved
+
Production build passes
```

Then:

```text
Preview deployment
↓
Smoke tests
↓
Production deployment
↓
Production smoke tests
↓
Production E2E verification
↓
Monitoring
↓
MVP_PROGRESS.md update
```

---

# 33. Seven-Day Execution Plan

## Day 1 — Foundation

```text
FND-001
FND-002
FND-003
FND-004
AUTH-001
AUTH-002
```

Goal:

```text
Project
+
Supabase
+
Database
+
RLS
+
Authentication
```

**External dependency kickoff (2026-09-03):** Meta Business Manager verification and WhatsApp Cloud API message template submission must start on Day 1, in parallel with FND-001, since NTF-002 is now P0 and Meta approval lead time is outside development control.

---

## Day 2 — Marketplace

```text
MKT-001
MKT-002
MKT-003
MKT-004
MKT-005
MKT-007
MKT-008
MKT-009
```

Goal:

```text
Customer can discover vehicles,
view details,
calculate finance,
and initiate WhatsApp inquiry.
```

---

## Day 3 — Showroom

```text
SHR-001
SHR-002
SHR-003
SHR-004
SHR-005
SHR-006
SHR-008
```

Goal:

```text
Showroom can register,
get approved,
manage vehicles,
and upload media.
```

---

## Day 4 — Appointments

```text
APT-001
APT-002
APT-003
APT-004
APT-005
APT-006
APT-007
APT-008
APT-009
APT-010
```

Goal:

```text
Customer books appointment
→
Showroom manages appointment
→
Customer sees updated status.
```

---

## Day 5 — Admin / Notifications / Remaining MVP

```text
NTF-001
NTF-002
NTF-003

ADM-001
ADM-002
ADM-003
ADM-004
ADM-005
ADM-006

SHR-009
SYS-001
SYS-002
SYS-003

AUTH-003
AUTH-004
AUTH-005
MKT-006
```

Goal:

```text
Complete integrated MVP.
```

---

# 34. Day 6 — QA / Hardening

Primary owners:

```text
QA Agent
E2E Agent
Security Agent
Performance Agent
Code Review Agent
```

Tasks:

* Full regression
* Complete E2E journeys
* Negative testing
* Boundary testing
* RLS testing
* Security testing
* Performance testing
* Responsive testing
* Accessibility testing
* Bug fixes
* Re-testing
* PR reviews

No feature is considered complete because it passed only happy-path testing.

---

# 35. Day 7 — Release

Primary owner:

```text
Release Agent
```

Tasks:

1. Verify all release gates.
2. Verify exact approved commit.
3. Run production build.
4. Validate environment variables.
5. Validate database migrations.
6. Validate RLS.
7. Deploy preview.
8. Run smoke tests.
9. Deploy production.
10. Run production smoke tests.
11. Run critical production E2E flows.
12. Verify monitoring/logging.
13. Confirm rollback readiness.
14. Update `MVP_PROGRESS.md`.

---

# 36. Feature Status Lifecycle

Every feature must use:

```text
TODO
↓
IN_PROGRESS
↓
TESTING
↓
PR_OPEN
↓
CHANGES_REQUESTED
↓
APPROVED
↓
MERGED
```

Exceptional state:

```text
BLOCKED
```

A feature cannot move to `MERGED` without Code Review Agent approval.

---

# 37. Definition of Feature Complete

A feature is complete only when:

* Requirements understood
* Architecture approved
* Implementation complete
* Reusable code used
* No unnecessary duplication
* Validation implemented
* Error states implemented
* Unit tests pass
* Integration tests pass where applicable
* E2E coverage exists where applicable
* Security checks pass
* Performance checked where applicable
* Visual QA passes where applicable
* PR created
* Automated checks pass
* Code Review Agent approves
* Changes resolved
* PR merged
* Regression passes
* `MVP_PROGRESS.md` updated

---

# 38. Definition of MVP Complete

The MVP is complete only when:

```text
All required P0 features
+
Approved P1 features
+
Database
+
RLS
+
Authentication
+
Marketplace
+
Showroom workflows
+
Appointments
+
Notifications
+
Admin
+
Finance calculator
+
WhatsApp inquiry
+
Mandatory E2E journeys
+
Security approval
+
Performance approval
+
Code Review approval
+
Production deployment
+
Production verification
```

are complete.

---

# 39. Scope Protection

The following must NOT be introduced during MVP unless explicitly approved:

```text
NestJS backend
Microservices
Redis
RabbitMQ
Kubernetes
API Gateway
Event bus
Elasticsearch
Advanced recommendation engine
Automated payment processing
Internal chat system
Enterprise analytics
CRM
Automated financial reconciliation
Complex background processing infrastructure
Showroom ratings/reviews (confirmed 2026-09-03)
Saved searches / new-listing alerts (confirmed 2026-09-03)
Sell/trade-in vehicle appraisal submission (confirmed 2026-09-03)
Interactive location maps / Google Maps integration (confirmed 2026-09-03)
Individual seller (pay-per-listing) registration and listing flow (confirmed 2026-09-04)
Real-time customer-showroom chat/inbox (confirmed 2026-09-04 — MVP builds only a one-way inquiry form, MKT-010)
```

Phase 2 architecture must not consume MVP development time.

---

# 40. Phase 2 Readiness

MVP should remain migration-friendly through:

* Clean feature boundaries
* Centralized business logic
* Typed data access
* Clear authorization boundaries
* Reusable validation
* Minimal Supabase coupling
* No frontend-only business rules
* No duplicated database logic
* Clear domain ownership

Phase 2 migration readiness means **clean boundaries**, not premature infrastructure.

---

# 41. Final Execution Rule

Claude Code must follow this order:

```text
READ REQUIREMENTS
↓
READ ACCEPTANCE CRITERIA
↓
READ ARCHITECTURE
↓
READ DATABASE
↓
CHECK MVP_PROGRESS
↓
SELECT FEATURE
↓
CREATE BRANCH
↓
IMPLEMENT
↓
TEST
↓
E2E
↓
SECURITY
↓
PERFORMANCE
↓
SELF REVIEW
↓
CREATE PR
↓
CODE REVIEW AGENT
↓
FIX
↓
RE-REVIEW
↓
APPROVAL
↓
MERGE
↓
REGRESSION
↓
UPDATE MVP_PROGRESS
```

Never skip a gate because the feature appears simple.

---

# 42. Golden Rule

**Build → Test → Verify → Review → Approve → Merge → Regress → Release → Verify → Record**

The fastest path is not writing code fastest.

The fastest path is avoiding rework, broken integrations, security failures, and release-blocking bugs.
