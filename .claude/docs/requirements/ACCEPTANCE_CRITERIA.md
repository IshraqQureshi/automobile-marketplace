# ACCEPTANCE_CRITERIA.md

# Automobile Marketplace — MVP Acceptance Criteria

**Status:** MVP Scope Locked
**Source:** `MVP_REQUIREMENTS.md` + `FEATURES.md`
**Purpose:** Define objective pass/fail conditions for MVP features.

---

# 1. Acceptance Rules

A feature is accepted only when:

* All applicable criteria pass.
* Positive and negative scenarios pass.
* Authorization/RLS checks pass where applicable.
* Required E2E coverage passes.
* No P0/P1 regression is introduced.
* Code Review Agent approves the PR.

**PASS:** All mandatory criteria satisfied.

**FAIL:** Any mandatory criterion fails.

**BLOCKED:** Testing cannot be completed because of an environment/dependency issue.

---

# 2. Foundation

## FND-001 — Project Initialization

### Acceptance Criteria

* [ ] Application starts successfully in local development.
* [ ] Production build completes successfully.
* [ ] TypeScript check passes.
* [ ] ESLint passes.
* [ ] Environment variables are not hardcoded.
* [ ] No secrets are committed to Git.
* [ ] Existing project conventions are documented in `CLAUDE.md`.

---

## FND-002 — Supabase Integration

* [ ] Application connects successfully to Supabase.
* [ ] Server-side and client-side access use appropriate Supabase clients.
* [ ] Authentication works through Supabase Auth.
* [ ] Database queries return expected results.
* [ ] Storage operations work.
* [ ] Unauthorized database operations are rejected.
* [ ] Service-role credentials are never exposed to the browser.

---

## FND-003 — Database Schema

* [ ] Required MVP tables exist.
* [ ] Foreign-key relationships are enforced.
* [ ] Required fields have appropriate constraints.
* [ ] Invalid records are rejected.
* [ ] Required indexes exist for critical search/filter/query paths.
* [ ] Migrations can be applied consistently.
* [ ] Schema supports customer, showroom, vehicle, appointment, notification, payment and audit requirements.

---

## FND-004 — RLS & Authorization

* [ ] Customers can access only permitted customer-owned data.
* [ ] Showrooms can access only their own showroom data.
* [ ] Showrooms cannot read/update/delete another showroom's vehicles.
* [ ] Customers cannot modify another customer's favorites.
* [ ] Customers cannot modify another customer's appointments.
* [ ] Unauthorized users cannot access protected resources.
* [ ] Admin-only operations reject customer/showroom accounts.
* [ ] RLS is tested directly, not only through the UI.

**Release blocker if any mandatory authorization test fails.**

---

# 3. Authentication & Customer

## AUTH-001 — Registration

* [ ] Valid email/password creates a customer account.
* [ ] Customer profile is created correctly.
* [ ] Invalid email is rejected.
* [ ] Invalid/weak password is rejected according to configured policy.
* [ ] Duplicate email cannot create a second account.
* [ ] Validation errors are understandable.
* [ ] Password is never exposed in application logs/UI.

---

## AUTH-002 — Login/Logout

* [ ] Valid credentials authenticate successfully.
* [ ] Invalid credentials are rejected.
* [ ] Authenticated session persists correctly.
* [ ] Logout invalidates the active session.
* [ ] Protected pages reject unauthenticated users.
* [ ] Users cannot access another user's session/data.
* [ ] Google OAuth login succeeds and creates/links a profile correctly. (2026-09-04)
* [ ] A user who registered via email/password can also be distinguished/handled correctly if they later use Google with the same email (no duplicate/orphaned profile). (2026-09-04)

---

## AUTH-003 — Customer Profile

* [ ] Customer can view own profile.
* [ ] Customer can update permitted fields.
* [ ] Changes persist after refresh.
* [ ] Customer cannot modify protected account fields.
* [ ] Customer cannot modify another customer's profile.

---

## AUTH-004 — Customer Dashboard

* [ ] Authenticated customer can access dashboard.
* [ ] Unauthenticated customer is redirected/rejected.
* [ ] Favorites are displayed correctly.
* [ ] Appointments are displayed correctly.
* [ ] Empty states work when no data exists.
* [ ] Loading/error states work.

---

## AUTH-005 — Favorites

* [ ] Customer can favorite a vehicle.
* [ ] Customer can remove a favorite.
* [ ] Duplicate favorites are prevented.
* [ ] Favorite persists after refresh/login.
* [ ] Customer sees only own favorites.
* [ ] Deleted/unavailable vehicles are handled safely.
* [ ] Favorite functionality works through the complete E2E journey.

---

# 4. Marketplace

## MKT-001 — Homepage

* [ ] Homepage loads successfully.
* [ ] Figma-approved layout is implemented.
* [ ] Search is visible and functional.
* [ ] Categories are displayed.
* [ ] Popular brands are displayed.
* [ ] Featured vehicles are displayed.
* [ ] Featured showrooms are displayed.
* [ ] Primary CTAs navigate correctly.
* [ ] Mobile/tablet/desktop layouts work.
* [ ] Loading, empty and error states are handled.
* [ ] No broken images/assets exist.
* [ ] "Watch & Discover" (TikTok) and "Reviews & Guides" (YouTube) sections render manually-curated video links correctly; no broken embeds. (2026-09-04)

---

## MKT-002 — Vehicle Search

* [ ] Keyword search returns matching vehicles.
* [ ] Search is case-insensitive where applicable.
* [ ] Empty search results display a useful empty state.
* [ ] Search does not expose unauthorized/unpublished vehicles.
* [ ] Pagination works.
* [ ] Query errors are handled gracefully.

---

## MKT-003 — Vehicle Filters

* [ ] Price filtering returns correct results.
* [ ] Year filtering returns correct results.
* [ ] Mileage filtering returns correct results.
* [ ] Multiple filters can be combined.
* [ ] Clearing filters restores expected results.
* [ ] Invalid filter values are rejected/normalized.
* [ ] Filtered pagination remains correct.

---

## MKT-004 — Sorting

The following produce correct ordering:

* [ ] Price.

* [ ] Year.

* [ ] Mileage.

* [ ] Newest.

* [ ] Relevance.

* [ ] Sorting works together with filters.

* [ ] Sorting works with pagination.

* [ ] No duplicate/missing records are introduced unexpectedly.

---

## MKT-005 — Vehicle Detail

* [ ] Correct vehicle information is displayed.
* [ ] Gallery displays available photos.
* [ ] Price is correct.
* [ ] Specifications are correct.
* [ ] Description is correct.
* [ ] Correct showroom is displayed.
* [ ] Showroom CTA works.
* [ ] WhatsApp CTA works.
* [ ] Non-existent vehicle returns appropriate not-found state.
* [ ] Unauthorized/private vehicle data is not exposed.
* [ ] "Sold By" showroom card shows name, verified badge, location, hours, and listing count — no star rating/review count. (2026-09-04)
* [ ] "Send Message" CTA opens the vehicle inquiry form (MKT-010), not a live chat thread. (2026-09-04)

---

## MKT-006 — Showroom Listing

* [ ] Approved showrooms can appear publicly.
* [ ] Unapproved/rejected showrooms do not appear publicly.
* [ ] Showroom information is accurate.
* [ ] Pagination works where applicable.

---

## MKT-007 — Showroom Detail

* [ ] Correct showroom information is displayed.
* [ ] Verified/approval status is displayed correctly.
* [ ] Contact information is correct.
* [ ] Location is displayed.
* [ ] Business hours are displayed.
* [ ] Only appropriate active listings are displayed.
* [ ] Invalid showroom URL/ID is handled safely.
* [ ] No star rating/review count is displayed (omitted for MVP; no reviews data exists). (2026-09-04)

---

## MKT-008 — Finance Calculator

**Scope (2026-09-03):** per-listing configured — see `MVP_REQUIREMENTS.md` §17/§29.

### Inputs

* [ ] Vehicle price is accepted (from the listing).
* [ ] Down payment is accepted, defaulting from the showroom's per-listing configuration.
* [ ] Interest rate is accepted, sourced from the showroom's per-listing configuration.
* [ ] Loan duration is accepted, selected from the showroom's configured tenure options.
* [ ] If a listing has no showroom-configured financing terms, platform default settings (`finance_default_interest_rate`, `finance_default_duration`) are used instead.
* [ ] Insurance percentage is accepted and included in the estimate when configured for the listing. (2026-09-04)
* [ ] Tracker subscription option is selectable and its cost is included in the estimate when chosen. (2026-09-04)
* [ ] Insurance/tracker line items are omitted from the estimate when not configured for a listing, without breaking the calculation. (2026-09-04)

### Calculation

* [ ] Loan amount = vehicle price − down payment.
* [ ] Monthly payment calculation is deterministic.
* [ ] Same inputs always produce the same output.
* [ ] Currency/unit formatting is correct.

### Boundaries

* [ ] Down payment cannot exceed vehicle price.
* [ ] Negative values are rejected.
* [ ] Invalid/non-numeric values are rejected.
* [ ] Zero-interest behavior is handled correctly.
* [ ] Invalid loan duration is rejected.
* [ ] Extremely large values do not break the UI/calculation.

### Testing

* [ ] Unit tests cover calculation logic.
* [ ] Boundary tests pass.
* [ ] E2E calculation flow passes.

---

## MKT-009 — WhatsApp Inquiry

* [ ] WhatsApp CTA opens the intended WhatsApp destination.
* [ ] Vehicle/showroom context is included where configured.
* [ ] No internal chat record/system is created.
* [ ] Invalid/malformed destination data is rejected safely.
* [ ] Desktop and mobile behavior work appropriately.

---

## MKT-010 — Vehicle Inquiry Form (added 2026-09-04)

* [ ] Customer can submit a message against a specific vehicle listing.
* [ ] Submission requires authentication (or captures contact info if guest submission is allowed — confirm before implementation).
* [ ] Showroom sees the inquiry in their dashboard as a list item.
* [ ] Inquiry is associated with the correct vehicle and showroom.
* [ ] No real-time thread/read-receipt behavior is implied or built.
* [ ] Empty/invalid message is rejected.

---

# 5. Showroom

## SHR-001 — Registration

* [ ] Showroom can submit required business information.
* [ ] Required fields are validated.
* [ ] Invalid information is rejected.
* [ ] Registration enters pending state.
* [ ] Pending showroom cannot operate as an approved showroom.
* [ ] Duplicate/invalid registration states are handled.

---

## SHR-002 — Document Upload

* [ ] Allowed document types can be uploaded.
* [ ] Oversized files are rejected.
* [ ] Unsupported file types are rejected.
* [ ] Upload errors are handled.
* [ ] Files are associated with the correct showroom.
* [ ] Unauthorized users cannot access protected documents.
* [ ] Storage paths cannot be manipulated to access another showroom's files.

---

## SHR-003 — Approval Workflow

* [ ] New showroom starts as Pending.
* [ ] Admin can approve showroom.
* [ ] Admin can reject showroom.
* [ ] Approval changes showroom availability correctly.
* [ ] Rejected showroom cannot publish active listings.
* [ ] Approval state cannot be changed by unauthorized users.
* [ ] Public marketplace reflects approval status.

---

## SHR-004 — Showroom Dashboard

* [ ] Approved showroom can access dashboard.
* [ ] Pending/rejected showroom cannot access approved-only functionality.
* [ ] Dashboard displays showroom-owned data only.
* [ ] Vehicle management is accessible.
* [ ] Appointment management is accessible.
* [ ] Loading/error/empty states work.

---

## SHR-005 — Vehicle Creation

* [ ] Showroom can create a vehicle.
* [ ] Required fields are validated.
* [ ] Vehicle is associated with the authenticated showroom.
* [ ] Vehicle cannot be assigned to another showroom.
* [ ] Price/specification/status values are validated.
* [ ] Newly created listing appears correctly where applicable.
* [ ] Showroom can optionally configure financing terms for the listing: down payment %, interest rate, loan tenure options, financing partner. (2026-09-03)
* [ ] Financing fields are validated (percentages within 0–100, rate/tenure non-negative). (2026-09-03)
* [ ] Listings without showroom-configured financing terms fall back to platform defaults in the finance calculator. (2026-09-03)

---

## SHR-006 — Vehicle Editing

* [ ] Showroom can edit its own vehicle.
* [ ] Changes persist.
* [ ] Showroom cannot edit another showroom's vehicle.
* [ ] Invalid values are rejected.
* [ ] Public listing reflects approved changes.

---

## SHR-007 — Vehicle Removal

* [ ] Showroom can remove/deactivate its own listing.
* [ ] Removed listing is no longer publicly active.
* [ ] Showroom cannot remove another showroom's listing.
* [ ] Existing references are handled safely.

---

## SHR-008 — Vehicle Photos

* [ ] Showroom can upload vehicle photos.
* [ ] File validation works.
* [ ] Photos are associated with the correct vehicle.
* [ ] Unauthorized users cannot manipulate another showroom's media.
* [ ] Failed uploads do not create broken references.
* [ ] Deleted vehicle media is handled safely.

---

## SHR-009 — Bulk Import

### Upload

* [ ] Supported spreadsheet format can be uploaded.
* [ ] Unsupported formats are rejected.
* [ ] File size limits are enforced.

### Validation

* [ ] Required columns are validated.
* [ ] Invalid data types are detected.
* [ ] Invalid rows are identified.
* [ ] Validation results identify the affected row/field where practical.

### Import

* [ ] Valid rows are imported.
* [ ] Invalid rows do not create invalid records.
* [ ] Imported vehicles belong to the authenticated showroom.
* [ ] A showroom cannot import records into another showroom.
* [ ] Duplicate handling follows defined import rules.
* [ ] Partial failures do not silently report success.

### Reporting

* [ ] Import result reports success/failure counts.
* [ ] Invalid rows are clearly reported.
* [ ] User can understand what needs correction.

**Full import E2E flow required.**

---

# 6. Appointments

## APT-001 — Availability

* [ ] Showroom can define available dates/time slots.
* [ ] Invalid availability ranges are rejected.
* [ ] Past slots cannot be booked.
* [ ] Availability belongs to the correct showroom.
* [ ] Customers cannot modify showroom availability.

---

## APT-002 — Appointment Booking

* [ ] Authenticated customer can select showroom.
* [ ] Customer can select available vehicle.
* [ ] Customer can select date.
* [ ] Customer can select available time slot.
* [ ] Booking receives unique reference.
* [ ] Booking starts with correct initial status.
* [ ] Appointment belongs to correct customer/showroom.
* [ ] Booking confirmation is displayed.
* [ ] Unauthenticated customers cannot create bookings.
* [ ] Unavailable slots cannot be booked.

**Complete E2E journey required.**

---

## APT-003 — Multi-Car Appointment

* [ ] Customer can select multiple vehicles where supported.
* [ ] All selected vehicles belong to the same showroom.
* [ ] Vehicles from different showrooms cannot be combined.
* [ ] Each selected vehicle is associated with the appointment.
* [ ] Customer and showroom see the correct vehicle list.
* [ ] Removing a selected vehicle updates the appointment correctly.

---

## APT-004 — Booking Conflict Prevention

* [ ] Already-booked unavailable slot cannot be booked again.
* [ ] Concurrent booking attempts cannot create conflicting confirmed bookings.
* [ ] Server/database validation enforces conflict prevention.
* [ ] Client-side validation alone is not relied upon.
* [ ] Failed booking does not create a misleading success state.

**Release blocker if concurrency tests fail.**

---

## APT-005 — Customer Appointment List

* [ ] Customer sees own appointments.
* [ ] Customer cannot see another customer's appointments.
* [ ] Status is displayed correctly.
* [ ] Booking reference is displayed.
* [ ] Selected vehicles are displayed.
* [ ] Empty state works.

---

## APT-006 — Showroom Appointment List

* [ ] Showroom sees only its own appointments.
* [ ] Customer information is displayed appropriately.
* [ ] Selected vehicles are displayed.
* [ ] Appointment status is displayed correctly.
* [ ] Unauthorized showroom access is rejected.

---

## APT-007 — Confirm

* [ ] Showroom can confirm eligible pending appointment.
* [ ] Status changes to Confirmed.
* [ ] Customer sees updated status.
* [ ] Confirmation notification is triggered.
* [ ] Invalid status transition is rejected.

---

## APT-008 — Reschedule

* [ ] Showroom can reschedule eligible appointment.
* [ ] New date/time must be valid and available.
* [ ] Conflicting slot cannot be selected.
* [ ] Customer sees updated appointment information.
* [ ] Change notification is triggered.
* [ ] Invalid transition is rejected.

---

## APT-009 — Decline

* [ ] Showroom can decline eligible appointment.
* [ ] Status changes to Declined.
* [ ] Customer sees updated status.
* [ ] Customer cannot treat declined appointment as confirmed.
* [ ] Notification is triggered.

---

## APT-010 — Status Lifecycle

Valid transitions must be explicitly enforced.

Expected states:

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

* [ ] Invalid transitions are rejected.
* [ ] Unauthorized actors cannot change status.
* [ ] Status history/activity is recorded where required.
* [ ] Customer and showroom views remain consistent.

---

# 7. Notifications

## NTF-001 — Email Notifications

Notifications are triggered for:

* [ ] Booking creation.

* [ ] Booking confirmation.

* [ ] Appointment changes.

* [ ] Appointment reminders.

* [ ] Correct recipient receives notification.

* [ ] Notification contains correct appointment context.

* [ ] Notification failure is recorded.

* [ ] Notification failure does not corrupt appointment state.

---

## NTF-002 — WhatsApp Notifications

* [ ] Required booking events trigger WhatsApp notification.
* [ ] Correct recipient is targeted.
* [ ] Correct appointment information is sent.
* [ ] API failures are handled.
* [ ] API credentials are protected.
* [ ] Notification failure does not corrupt appointment state.

---

## NTF-003 — Notification Failure

* [ ] Appointment remains valid if notification fails.
* [ ] Failure is observable/logged appropriately.
* [ ] Duplicate notification behavior is controlled.
* [ ] Retry behavior, if implemented, is safe/idempotent.

---

# 8. Admin

## ADM-001 — Admin Authentication/RBAC

* [ ] Admin can authenticate.
* [ ] Customer cannot access admin pages.
* [ ] Showroom cannot access admin pages.
* [ ] Admin APIs/actions enforce server-side authorization.
* [ ] Manipulating client-side roles cannot grant admin access.

---

## ADM-002 — Showroom Management

* [ ] Admin can view pending showrooms.
* [ ] Admin can approve.
* [ ] Admin can reject.
* [ ] Approval state persists.
* [ ] Unauthorized users cannot perform these actions.

---

## ADM-003 — Customer Management

* [ ] Admin can access customer management.
* [ ] Appropriate customer records are displayed.
* [ ] Unauthorized users cannot access management functions.

---

## ADM-004 — Vehicle Moderation

* [ ] Admin can view relevant vehicle listings.
* [ ] Admin can moderate listings.
* [ ] Moderation state is reflected publicly.
* [ ] Unauthorized users cannot moderate listings.

---

## ADM-005 — Appointment Oversight

* [ ] Admin can view appointments.
* [ ] Admin can see appropriate appointment status.
* [ ] Admin cannot accidentally violate appointment ownership rules through ordinary user flows.

---

## ADM-006 — Manual Payment Entry

* [ ] Admin can create a manual payment record.
* [ ] Required payment information is validated.
* [ ] Payment is associated with the correct relevant record.
* [ ] Unauthorized users cannot create/edit payment records.
* [ ] No automated payment processing occurs in MVP.

---

# 9. Audit & System

## SYS-001 — Activity Records

For applicable sensitive actions:

* [ ] Actor is recorded.
* [ ] Action is recorded.
* [ ] Resource is identifiable.
* [ ] Timestamp is recorded.
* [ ] Unauthorized users cannot modify audit history.

---

## SYS-002 — Validation & Error Handling

* [ ] User input is validated at appropriate boundaries.
* [ ] Invalid requests return controlled errors.
* [ ] Database errors do not expose sensitive internals.
* [ ] Forms display useful validation errors.
* [ ] Loading states are handled.
* [ ] Empty states are handled.
* [ ] Unexpected failures have recoverable UI states where practical.

---

## SYS-003 — Responsive & Accessibility

* [ ] Core MVP pages work on mobile.
* [ ] Core MVP pages work on tablet.
* [ ] Core MVP pages work on desktop.
* [ ] Keyboard navigation works for interactive controls.
* [ ] Form fields have appropriate labels.
* [ ] Focus states are usable.
* [ ] Images have appropriate alternative text where required.
* [ ] No major accessibility violations exist in core journeys.

---

# 10. Mandatory Security Acceptance

Before release:

* [ ] Authentication cannot be bypassed.
* [ ] Authorization cannot be bypassed through UI manipulation.
* [ ] RLS policies pass direct tests.
* [ ] IDOR scenarios fail safely.
* [ ] Admin privilege escalation scenarios fail.
* [ ] Input validation is enforced server-side.
* [ ] File upload restrictions work.
* [ ] Storage authorization works.
* [ ] Service-role credentials remain server-only.
* [ ] Sensitive information is not exposed in client responses/logs.
* [ ] Dependency/security checks pass.

---

# 11. Mandatory E2E Acceptance

The following must pass:

| E2E     | Journey                    | Required |
| ------- | -------------------------- | -------- |
| E2E-001 | Customer discovery         | Yes      |
| E2E-002 | Customer account/favorites | Yes      |
| E2E-003 | Showroom onboarding        | Yes      |
| E2E-004 | Vehicle management         | Yes      |
| E2E-005 | Bulk import                | Yes      |
| E2E-006 | Appointment booking        | Yes      |
| E2E-007 | Appointment management     | Yes      |
| E2E-008 | Notifications              | Yes      |
| E2E-009 | Admin workflow             | Yes      |

**Any mandatory E2E failure blocks MVP release.**

---

# 12. Regression Acceptance

Before release:

* [ ] All P0 features pass.
* [ ] Required P1 features pass.
* [ ] Existing E2E journeys pass after each major integration.
* [ ] No critical regression exists.
* [ ] Production build succeeds.
* [ ] Database migrations apply successfully.
* [ ] RLS policies work in production-like environment.
* [ ] Production smoke tests pass.

---

# 13. Release Acceptance

Release is allowed only when:

```text
Requirements
    ↓
Implementation
    ↓
Unit/Integration Tests PASS
    ↓
E2E Tests PASS
    ↓
Visual QA PASS
    ↓
Security PASS
    ↓
Performance PASS
    ↓
Self Review PASS
    ↓
PR Created
    ↓
Code Review Agent APPROVED
    ↓
Merge
    ↓
Regression PASS
    ↓
Release Agent APPROVED
    ↓
Production Deploy
    ↓
Smoke Tests PASS
    ↓
Production Verification PASS
```

If any mandatory gate fails:

**RELEASE = BLOCKED**

---

# 14. Final MVP Acceptance

The Automobile Marketplace MVP is considered **READY FOR LAUNCH** only when:

* [ ] All mandatory P0 requirements pass.
* [ ] Required P1 functionality passes.
* [ ] All mandatory E2E journeys pass.
* [ ] Security Agent = APPROVED.
* [ ] Performance Agent = APPROVED.
* [ ] QA Agent = APPROVED.
* [ ] Code Review Agent = APPROVED for every feature PR.
* [ ] All required PRs are merged.
* [ ] Production build succeeds.
* [ ] Release Agent = APPROVED.
* [ ] Production smoke tests pass.
* [ ] Production verification passes.
* [ ] `.claude/docs/MVP_PROGRESS.md` is updated.

**Final status:**

```text
MVP_STATUS = READY_FOR_LAUNCH
```

Otherwise:

```text
MVP_STATUS = BLOCKED
```
