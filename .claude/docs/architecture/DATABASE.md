# Database Architecture

## 1. Purpose

This document defines the database architecture, schema, relationships, constraints, authorization model, Row Level Security (RLS), storage strategy, indexing, transaction boundaries, system configuration, and database testing requirements for the Automobile Marketplace MVP.

The database must prioritize:

* Data integrity
* Security
* Correct ownership
* RLS enforcement
* Simple MVP architecture
* Good query performance
* Maintainability
* Phase 2 migration readiness
* No unnecessary complexity

---

# 2. Database Technology

## MVP

* PostgreSQL through Supabase
* Supabase Auth
* Supabase Storage
* Supabase Row Level Security
* UUID primary keys
* SQL migrations committed to Git

## Phase 2

The application may introduce a dedicated NestJS backend while continuing to use PostgreSQL.

The MVP database must therefore avoid coupling business logic unnecessarily to Supabase-specific implementation details.

---

# 3. Core Tables

The MVP database consists of the following primary tables:

```text
auth.users
    │
    └── profiles
          │
          ├── favorites
          ├── appointments
          └── activity_logs
          
showrooms
    │
    ├── showroom_documents
    ├── vehicles
    │      └── vehicle_media
    │
    ├── showroom_availability
    └── appointments

appointments
    └── appointment_vehicles

notifications

manual_payments

vehicle_imports

system_settings
```

Some tables may be introduced only when their corresponding feature is implemented.

---

# 4. `profiles`

Extends Supabase `auth.users` with application-level user information.

### Fields

```text
id                  UUID PK
role                ENUM
full_name           TEXT
phone               TEXT NULL
avatar_url          TEXT NULL
is_active           BOOLEAN
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Roles

```text
CUSTOMER
SHOWROOM
ADMIN
```

**Note (2026-09-04):** the design includes an "Individual Seller" registration path, which would imply a 4th role. This is confirmed deferred to Phase 2 — MVP's `profiles.role` enum stays at exactly these three values. See `MVP_REQUIREMENTS.md` §29.1.

### Rules

* `id` references `auth.users.id`.
* A user must have exactly one application role.
* Users can update only their own allowed profile fields.
* Users cannot self-promote to `ADMIN`.
* Users cannot change their own role.
* Admin role changes require server-side authorization.
* Deactivated users must not be able to perform protected operations.

---

# 5. `showrooms`

Represents businesses selling/listing vehicles.

### Fields

```text
id                  UUID PK
owner_user_id       UUID FK -> profiles.id
business_name       TEXT
description         TEXT NULL
phone               TEXT
email               TEXT
address             TEXT NULL
city                TEXT NULL
latitude            NUMERIC NULL
longitude           NUMERIC NULL
opening_hours       JSONB NULL
status              ENUM
verified             BOOLEAN
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Status

```text
PENDING
APPROVED
REJECTED
SUSPENDED
```

### Rules

* One showroom belongs to its owning showroom user/account.
* Only approved showrooms can appear as active marketplace businesses.
* Showroom users can manage only their own showroom.
* Admin can manage all showrooms.
* Approval/rejection/suspension must be server-side protected.

---

# 6. `showroom_documents`

Stores showroom verification/business documents.

### Fields

```text
id                  UUID PK
showroom_id         UUID FK -> showrooms.id
document_type       TEXT
storage_path        TEXT
status              ENUM
uploaded_by         UUID FK -> profiles.id
reviewed_by         UUID FK -> profiles.id NULL
reviewed_at         TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Status

```text
PENDING
APPROVED
REJECTED
```

### Rules

* Showroom users can upload documents only for their own showroom.
* Admin can review documents.
* Documents must not be publicly accessible.
* Storage access must follow authorization rules.
* Service-role credentials must never be exposed to the client.

---

# 7. `vehicles`

Represents vehicle listings.

### Fields

```text
id                  UUID PK
showroom_id         UUID FK -> showrooms.id
title               TEXT
make                TEXT
model               TEXT
variant             TEXT NULL
year                INTEGER
price               NUMERIC
mileage             INTEGER NULL
fuel_type           TEXT NULL
transmission        TEXT NULL
body_type           TEXT NULL
color               TEXT NULL
description         TEXT NULL
status              ENUM
financing_down_payment_percent  NUMERIC NULL
financing_interest_rate         NUMERIC NULL
financing_tenure_options_months INTEGER[] NULL
financing_partner               TEXT NULL
financing_insurance_percent     NUMERIC NULL
financing_tracker_options       JSONB NULL
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Financing Fields (added 2026-09-03, extended 2026-09-04)

Per-listing financing configuration, set by the owning showroom and consumed by the finance calculator (`MKT-008`):

* `financing_down_payment_percent` — showroom-suggested minimum down payment as a percentage of price.
* `financing_interest_rate` — annual interest rate used for this listing's calculator.
* `financing_tenure_options_months` — array of loan durations the showroom offers for this vehicle.
* `financing_partner` — optional label for a financing partner/bank associated with the offer.
* `financing_insurance_percent` — insurance cost as a percentage of price (added 2026-09-04, from design review).
* `financing_tracker_options` — array of `{duration_months, price}` tracker subscription options offered for this vehicle (added 2026-09-04, from design review; e.g. `[{"duration_months": 12, "price": 30000}]`).

All financing fields are nullable. When null, the finance calculator falls back to platform-level defaults in `system_settings` (`finance_default_interest_rate`, `finance_default_duration`); insurance/tracker line items are simply omitted from the estimate when not configured. These fields must be validated (percentages 0–100, non-negative rate, non-empty tenure array when provided, tracker options well-formed) and are not part of the moderation-relevant fields — a showroom may update them without admin approval.

### Vehicle Status

```text
DRAFT
PENDING_REVIEW
ACTIVE
SOLD
INACTIVE
REJECTED
```

Exact statuses may be adjusted during implementation if the approved acceptance criteria require it.

### Rules

* Every vehicle belongs to exactly one showroom.
* Showroom users can create/update/remove only their own vehicles.
* Customers cannot modify vehicles.
* Admin can moderate vehicles.
* Only appropriate vehicle statuses can appear publicly.
* Soft deactivation is preferred over destructive deletion where historical references exist.

---

# 8. `vehicle_media`

Stores vehicle image metadata.

### Fields

```text
id                  UUID PK
vehicle_id          UUID FK -> vehicles.id
storage_path        TEXT
media_type          TEXT
sort_order          INTEGER
is_primary          BOOLEAN
created_at          TIMESTAMPTZ
```

### Rules

* Media belongs to exactly one vehicle.
* Showroom ownership must be validated before upload/delete/update.
* Storage paths must contain controlled resource identifiers.
* Public/private storage access must be intentional.
* Invalid file types and oversized uploads must be rejected.
* Do not trust client-provided MIME type alone.

---

# 8.1 `vehicle_inquiries` (added 2026-09-04)

Stores one-way customer inquiries submitted against a vehicle listing (the "Send Message" CTA in the design). This is deliberately **not** a chat/thread table — no reply/read-state modeling. Real-time chat remains Phase 2.

### Fields

```text
id                  UUID PK
vehicle_id          UUID FK -> vehicles.id
showroom_id         UUID FK -> showrooms.id
customer_id         UUID FK -> profiles.id
message             TEXT
status              ENUM
created_at          TIMESTAMPTZ
```

### Status

```text
NEW
VIEWED
```

### Rules

* `showroom_id` is denormalized from `vehicle_id` at insert time for simpler RLS/query scoping (must match the vehicle's actual showroom — validated server-side, never trusted from client input).
* Only authenticated customers can submit inquiries.
* Customers can view only their own submitted inquiries.
* Showrooms can view only inquiries addressed to their own vehicles.
* Admin can view all inquiries for moderation/support purposes.
* No update/delete by customers after submission; showrooms may mark `status = VIEWED`.

---

# 9. `favorites`

Stores customer favorite vehicles.

### Fields

```text
id                  UUID PK
customer_id         UUID FK -> profiles.id
vehicle_id          UUID FK -> vehicles.id
created_at          TIMESTAMPTZ
```

### Constraints

```text
UNIQUE(customer_id, vehicle_id)
```

### Rules

* Only authenticated customers can create favorites.
* Customers can access only their own favorites.
* Duplicate favorites must be prevented at database level.
* Deleting a vehicle should not create broken references.

---

# 10. `showroom_availability`

Stores showroom appointment availability.

### Fields

```text
id                  UUID PK
showroom_id         UUID FK -> showrooms.id
day_of_week         INTEGER
start_time          TIME
end_time            TIME
is_available        BOOLEAN
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Rules

* Availability belongs to a showroom.
* Showroom users can manage only their own availability.
* Admin can manage availability when necessary.
* Invalid time ranges must be rejected.
* Overlapping availability should be prevented or normalized.

---

# 11. `appointments`

Represents customer appointments.

### Fields

```text
id                      UUID PK
booking_reference       TEXT UNIQUE
customer_id             UUID FK -> profiles.id
showroom_id             UUID FK -> showrooms.id
appointment_date        DATE
start_time              TIME
end_time                TIME
status                  ENUM
customer_notes          TEXT NULL
showroom_notes          TEXT NULL
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

### Status

```text
PENDING
CONFIRMED
RESCHEDULED
DECLINED
CANCELLED
COMPLETED
```

### Rules

* Every appointment belongs to one customer and one showroom.
* Booking reference must be unique.
* Customer can access only their own appointments.
* Showroom can access only appointments belonging to that showroom.
* Admin can access all appointments.
* Appointment creation must verify showroom availability.
* Booking conflicts must be prevented at the database/application transaction boundary.
* Appointment status changes must follow approved transitions.
* Historical appointment records should not be silently destroyed.

---

# 12. `appointment_vehicles`

Associates vehicles with an appointment.

This supports viewing multiple vehicles during one appointment.

### Fields

```text
id                  UUID PK
appointment_id      UUID FK -> appointments.id
vehicle_id          UUID FK -> vehicles.id
created_at          TIMESTAMPTZ
```

### Constraints

```text
UNIQUE(appointment_id, vehicle_id)
```

### Critical Integrity Rule

All vehicles associated with one appointment must belong to the same showroom as:

```text
appointments.showroom_id
```

This must be enforced through application validation and database-safe transaction logic.

A customer must not be able to create an appointment for Showroom A containing a vehicle from Showroom B.

---

# 13. `notifications`

Tracks system-generated notifications.

### Fields

```text
id                  UUID PK
user_id             UUID FK -> profiles.id NULL
appointment_id      UUID FK -> appointments.id NULL
channel             ENUM
notification_type   ENUM
status              ENUM
recipient            TEXT
provider_message_id TEXT NULL
error_message       TEXT NULL
sent_at              TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Channels

```text
EMAIL
WHATSAPP
```

### Notification Types

```text
BOOKING_CREATED
BOOKING_CONFIRMED
BOOKING_RESCHEDULED
BOOKING_DECLINED
BOOKING_CANCELLED
BOOKING_REMINDER
```

### Status

```text
PENDING
SENT
FAILED
```

### Rules

* Notification failure must not roll back a valid appointment.
* Notification attempts should be recorded.
* Sensitive information must not be exposed unnecessarily.
* Retry behavior must be controlled.
* Provider credentials must remain in environment/secret management.

---

# 14. `manual_payments`

Stores manually recorded payment information.

Automated payment processing is Phase 2.

### Fields

```text
id                  UUID PK
appointment_id      UUID FK -> appointments.id NULL
customer_id         UUID FK -> profiles.id NULL
amount              NUMERIC
currency            TEXT
payment_method      TEXT
reference           TEXT NULL
status              ENUM
notes               TEXT NULL
recorded_by         UUID FK -> profiles.id
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Status

```text
RECORDED
VOIDED
```

### Rules

* Only authorized admins can create/update manual payment records.
* Payment records must be auditable.
* MVP does not process card/online payments automatically.
* Financial calculations must use appropriate numeric types, not floating-point storage.

---

# 15. `vehicle_imports`

Tracks bulk vehicle spreadsheet imports.

### Fields

```text
id                  UUID PK
showroom_id         UUID FK -> showrooms.id
uploaded_by         UUID FK -> profiles.id
file_name           TEXT
storage_path        TEXT NULL
status              ENUM
total_rows          INTEGER
successful_rows     INTEGER
failed_rows         INTEGER
error_report        JSONB NULL
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Status

```text
PENDING
PROCESSING
COMPLETED
COMPLETED_WITH_ERRORS
FAILED
```

### Rules

* Import must always be associated with the authenticated showroom.
* Imported vehicles must belong to that showroom.
* Invalid rows must not silently become successful records.
* Validation errors must be reported.
* Import processing must be safely repeatable where practical.
* Maximum file size and row limits must be configurable.

---

# 16. `activity_logs`

Provides audit-friendly activity records.

### Fields

```text
id                  UUID PK
actor_user_id       UUID FK -> profiles.id NULL
action              TEXT
resource_type       TEXT
resource_id         UUID NULL
metadata            JSONB NULL
created_at          TIMESTAMPTZ
```

### Examples

```text
SHOWROOM_APPROVED
SHOWROOM_REJECTED
VEHICLE_CREATED
VEHICLE_UPDATED
VEHICLE_REMOVED
APPOINTMENT_CREATED
APPOINTMENT_CONFIRMED
APPOINTMENT_RESCHEDULED
APPOINTMENT_DECLINED
PAYMENT_RECORDED
USER_SUSPENDED
SYSTEM_SETTING_UPDATED
```

### Rules

* Audit records should be append-oriented.
* Normal users must not modify audit history.
* Admin access must be controlled.
* Sensitive information must not be unnecessarily stored in metadata.
* Important administrative actions should generate audit records.

---

# 17. `system_settings`

Stores global application/business configuration controlled by authorized administrators.

This table is the **database-backed source of truth for configurable system behavior**.

It prevents business configuration from being hardcoded throughout the application.

## Fields

```text
id                  UUID PK
key                 TEXT UNIQUE
value               JSONB
value_type          ENUM
description         TEXT NULL
category            TEXT
is_public           BOOLEAN
is_editable         BOOLEAN
updated_by          UUID FK -> profiles.id NULL
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### `value_type`

```text
STRING
NUMBER
BOOLEAN
JSON
```

`JSONB` is used for `value` so settings can support strings, numbers, booleans, arrays, and structured configuration.

---

# 18. System Setting Categories

## General

Examples:

```text
site_name
site_url
support_email
support_phone
currency
currency_symbol
timezone
```

## Maintenance

```text
maintenance_mode
maintenance_message
maintenance_allowed_roles
```

When maintenance mode is enabled:

* Public application access may be restricted.
* Admin access must remain available.
* Maintenance message must be configurable.
* Health/deployment endpoints should remain available where required.
* Behavior must be enforced server-side, not only through frontend UI.

## Administrator Notifications

```text
admin_emails
admin_cc_emails
```

These may contain arrays of email addresses.

Example:

```json
[
  "admin@example.com",
  "manager@example.com"
]
```

Used for system-generated administrative notifications.

## Customer/Showroom Notifications

```text
email_notifications_enabled
whatsapp_notifications_enabled
booking_confirmation_enabled
booking_reminder_enabled
booking_change_notification_enabled
```

## Appointment

Examples:

```text
appointment_default_duration
appointment_reminder_hours
appointment_minimum_notice_hours
appointment_max_days_ahead
customer_cancellation_enabled
customer_reschedule_enabled
```

Exact business values must be confirmed before implementation if they are not already defined in the approved requirements.

## Marketplace

```text
default_page_size
maximum_page_size
default_vehicle_sort
public_listing_enabled
```

## Registration

```text
customer_registration_enabled
showroom_registration_enabled
```

## Vehicle

Examples:

```text
maximum_vehicle_images
maximum_vehicle_image_size_mb
allowed_vehicle_image_types
vehicle_listing_requires_approval
```

## Bulk Import

Examples:

```text
bulk_import_enabled
bulk_import_max_file_size_mb
bulk_import_max_rows
bulk_import_allowed_file_types
```

## Finance Calculator

Examples:

```text
finance_calculator_enabled
finance_default_interest_rate
finance_default_duration
finance_minimum_down_payment
finance_maximum_duration
```

The calculator must remain deterministic and must validate all inputs independently of configurable defaults.

---

# 19. Secrets Must NOT Be Stored in `system_settings`

The following must never be stored in the database settings table:

```text
Supabase service-role key
Supabase secrets
WhatsApp access tokens
WhatsApp app secrets
SMTP passwords
API keys
JWT signing secrets
OAuth client secrets
Payment gateway secrets
Database passwords
Private encryption keys
```

These belong in:

```text
Environment variables
Vercel environment secrets
Secret management infrastructure
```

`system_settings` contains application/business configuration, not credentials.

---

# 20. System Settings Security

Only authorized administrators may modify settings.

### Required controls

* Admin authentication
* Server-side authorization
* RLS
* Input validation
* Type validation
* Allowed-key validation
* Audit logging
* No arbitrary setting creation by normal users
* No privilege escalation through setting updates

The application must not blindly trust:

```text
key
value
value_type
```

provided by the client.

Setting updates must validate the setting against an approved configuration definition.

---

# 21. Settings Configuration Registry

Application code should maintain a type-safe definition of supported settings.

Conceptually:

```text
Setting Definition
├── key
├── type
├── category
├── validation schema
├── default value
├── public/private
├── editable/not editable
└── description
```

The database stores the current value.

The application registry defines what values are valid.

This prevents an admin from inserting arbitrary configuration that the application does not understand.

---

# 22. Public Settings

Settings marked:

```text
is_public = true
```

may be safely exposed to unauthenticated users when required.

Examples:

```text
site_name
currency
currency_symbol
maintenance_mode
maintenance_message
```

Private settings must never be returned through public APIs.

Examples:

```text
admin_emails
admin_cc_emails
internal notification configuration
internal operational settings
```

---

# 23. RLS Strategy

RLS must be enabled on all application tables containing user/business data.

## Customer

Can access:

* Own profile
* Own favorites
* Own appointments
* Own notification records where appropriate
* Own submitted vehicle inquiries (added 2026-09-04)

Cannot access:

* Other customers' data
* Showroom private data
* Admin data
* Private showroom documents
* System settings
* Other customers' inquiries (added 2026-09-04)

## Showroom

Can access:

* Own showroom
* Own showroom documents
* Own vehicles
* Own vehicle media
* Own availability
* Own appointments
* Own imports
* Inquiries addressed to their own vehicles (added 2026-09-04)

Cannot access:

* Other showrooms' private data
* Other showroom management data
* System settings
* Admin-only information
* Inquiries addressed to other showrooms' vehicles (added 2026-09-04)

## Admin

Can manage:

* Customers
* Showrooms
* Documents
* Vehicles
* Appointments
* Manual payments
* System settings
* Appropriate audit information

Admin authorization must be enforced server-side and through database policies where applicable.

---

# 24. System Settings RLS

`system_settings` requires stricter access than normal application tables.

### Public users

Can read only settings explicitly marked:

```text
is_public = true
```

### Customers

No write access.

### Showrooms

No write access.

### Admin

Can read and modify authorized editable settings.

### Important

A frontend check such as:

```text
if (user.role === 'ADMIN')
```

is not sufficient security.

Authorization must also be enforced at the trusted server/database boundary.

---

# 25. Relationships

Core relationships:

```text
auth.users
    ↓
profiles

profiles
    ↓
showrooms
    ↓
vehicles
    ↓
vehicle_media

profiles
    ↓
favorites
    ↓
vehicles

profiles + vehicles + showrooms
    ↓
vehicle_inquiries

showrooms
    ↓
showroom_availability

profiles
    ↓
appointments
    ↓
appointment_vehicles
    ↓
vehicles

appointments
    ↓
notifications

appointments
    ↓
manual_payments

showrooms
    ↓
vehicle_imports

profiles
    ↓
activity_logs

profiles
    ↓
system_settings.updated_by
```

Foreign keys must be used wherever practical to maintain referential integrity.

---

# 26. Appointment Integrity

Appointment creation is a critical transaction.

Before committing an appointment:

1. Authenticate customer.
2. Verify customer authorization.
3. Verify showroom exists.
4. Verify showroom is approved/active.
5. Verify requested date/time.
6. Verify showroom availability.
7. Verify selected vehicles belong to the showroom.
8. Check conflicting appointments.
9. Generate unique booking reference.
10. Create appointment.
11. Create appointment vehicle relationships.
12. Commit transaction.
13. Trigger notification processing.

Notification failure must not invalidate the successfully committed appointment.

---

# 27. Concurrency Protection

Appointment conflict prevention must account for concurrent requests.

The system must not rely only on:

```text
SELECT → check availability → INSERT
```

without transaction/concurrency protection.

The implementation must use an appropriate PostgreSQL transaction, locking strategy, constraint, or equivalent safe mechanism.

Concurrent booking tests are mandatory.

---

# 28. Status Integrity

Status fields must use controlled values.

The application must not allow arbitrary strings for critical lifecycle statuses.

Examples:

```text
showroom.status
vehicle.status
appointment.status
notification.status
manual_payment.status
vehicle_import.status
```

Status transitions must be explicitly defined.

Example:

```text
PENDING
   ↓
CONFIRMED
   ↓
COMPLETED
```

Invalid transitions must be rejected.

---

# 29. UUIDs

Application tables should use UUID primary keys.

Benefits:

* Avoid predictable sequential IDs
* Better distributed-system compatibility
* Better Phase 2 migration readiness
* Reduced ID enumeration risk

UUIDs must not replace authorization. RLS and ownership checks remain mandatory.

---

# 30. Timestamps

Use:

```text
TIMESTAMPTZ
```

for timestamps.

Store timestamps in UTC.

Convert to local timezone only for presentation/business scheduling.

Appointment date/time handling must explicitly account for the configured business timezone.

---

# 31. Money

Monetary values must use PostgreSQL numeric/decimal types.

Do not store financial amounts using floating-point types.

Examples:

```text
vehicle.price
manual_payments.amount
```

Currency must be stored or derived from approved system configuration.

---

# 32. Finance Calculator

The finance calculator must not require database persistence for every calculation.

**Scope (2026-09-03):** per-listing configured, not generic. Inputs are sourced from the vehicle's financing fields (§7) when present, falling back to `system_settings` platform defaults when a showroom has not configured financing for that listing. See `MVP_REQUIREMENTS.md` §17/§29.

Core formula:

```text
loan_amount = vehicle_price - down_payment
```

Monthly payment calculation must be deterministic.

Inputs must validate:

```text
vehicle price > 0
down payment >= 0
down payment <= vehicle price
interest rate >= 0
duration > 0
```

Zero-interest scenarios must be handled explicitly.

Unit, boundary, integration, and E2E tests are mandatory.

---

# 33. Indexing Strategy

Indexes should exist for frequently queried fields.

Likely indexes include:

```text
profiles.role
profiles.is_active

showrooms.owner_user_id
showrooms.status
showrooms.city

vehicles.showroom_id
vehicles.status
vehicles.make
vehicles.model
vehicles.year
vehicles.price
vehicles.mileage
vehicles.created_at

favorites.customer_id
favorites.vehicle_id

showroom_availability.showroom_id

appointments.customer_id
appointments.showroom_id
appointments.appointment_date
appointments.status
appointments.booking_reference

appointment_vehicles.appointment_id
appointment_vehicles.vehicle_id

notifications.appointment_id
notifications.user_id
notifications.status

manual_payments.appointment_id
manual_payments.customer_id

vehicle_imports.showroom_id
vehicle_imports.status

activity_logs.actor_user_id
activity_logs.resource_type
activity_logs.resource_id
activity_logs.created_at

system_settings.key
system_settings.category
system_settings.is_public
```

Indexes must be added based on actual query patterns and verified performance.

Do not blindly index every column.

---

# 34. Marketplace Search

MVP search should use PostgreSQL capabilities.

Potential search fields:

```text
make
model
variant
title
description
```

Filters:

```text
price
year
mileage
make
model
body_type
fuel_type
transmission
showroom
```

Sorting:

```text
newest
price ascending
price descending
year
mileage
relevance where supported
```

Pagination is mandatory for large result sets.

---

# 35. Pagination

Public listing APIs must not return unlimited records.

Default and maximum page sizes should be configurable through approved system settings.

The application must enforce a maximum regardless of client input.

Pagination strategy may begin with offset pagination for MVP and evolve later if required by scale.

---

# 36. Storage

Supabase Storage is used for:

```text
Vehicle media
Showroom verification documents
```

Recommended logical buckets:

```text
vehicle-media
showroom-documents
```

Storage paths should be scoped by resource identifiers.

Example:

```text
vehicle-media/{showroom_id}/{vehicle_id}/{file}
```

```text
showroom-documents/{showroom_id}/{file}
```

Storage access must follow the same ownership and authorization model as database records.

---

# 37. Soft Delete / Deactivation

Prefer deactivation/status changes instead of destructive deletion where records may have:

* Appointments
* Payments
* Audit records
* Notifications
* Historical references

Example:

```text
vehicle.status = INACTIVE
```

rather than immediately deleting the vehicle.

Permanent deletion should be restricted to cases where referential integrity and business requirements allow it.

---

# 38. Validation

Validation must exist at multiple boundaries:

```text
UI validation
    ↓
Server/application validation
    ↓
Database constraints/RLS
```

Never rely exclusively on frontend validation.

Critical rules must be enforced at the trusted backend/database boundary.

---

# 39. Migration Rules

All schema changes must be committed as migrations.

Never make undocumented production database changes manually.

Each migration must:

* Be reviewable
* Be reversible where practical
* Preserve existing data
* Avoid unnecessary destructive operations
* Include required indexes/constraints/RLS
* Include tests where behavior changes
* Be included in the PR

Database migrations require Code Review Agent approval before merge.

---

# 40. RLS Testing

RLS must be tested directly.

Tests must verify:

### Customer

Cannot access another customer's:

* Profile
* Favorites
* Appointments

### Showroom

Cannot access another showroom's:

* Vehicles
* Media
* Documents
* Availability
* Appointments

### Admin

Can perform authorized administrative operations.

### Unauthenticated user

Cannot access protected/private records.

RLS failures are release-blocking security issues.

---

# 41. System Settings Testing

System settings require:

* Admin read test
* Admin update test
* Non-admin rejection test
* Public/private visibility test
* Invalid value test
* Invalid key test
* Type validation test
* Audit-log test
* Maintenance-mode behavior test

Changing a setting must not allow privilege escalation.

---

# 42. Database Performance Testing

Performance testing must focus on real application queries.

Verify:

* Marketplace search
* Vehicle filtering
* Sorting
* Showroom listings
* Appointment availability
* Appointment conflict checks
* Admin tables
* Notification queries
* System settings lookup

Avoid premature database infrastructure such as:

```text
Redis
RabbitMQ
Elasticsearch
Database sharding
Read replicas
```

unless measured requirements justify them.

---

# 43. Configuration Loading

Application configuration should follow this priority:

```text
Environment secrets
        ↓
Typed application configuration
        ↓
Database system settings
        ↓
Feature/business logic
```

Secrets always remain environment-managed.

Database settings should be loaded through a centralized configuration service/module rather than querying `system_settings` randomly throughout the codebase.

Avoid:

```text
Component A → database
Component B → database
Component C → database
```

Prefer:

```text
System Settings Service
        ↓
validated configuration
        ↓
application features
```

---

# 44. Caching System Settings

System settings are relatively low-frequency data.

The application may cache them in memory where appropriate.

However:

* Cache invalidation must be handled when settings change.
* Security-sensitive settings must not become stale in a way that creates authorization problems.
* Maintenance mode changes should propagate reliably.
* MVP should use the simplest reliable approach.

Do not introduce Redis solely for system settings during MVP.

---

# 45. Audit Requirements

The following actions should create activity log records:

```text
Admin login/security-sensitive action where appropriate
Showroom approval
Showroom rejection
Showroom suspension
Vehicle moderation
User suspension
Appointment administrative changes
Manual payment creation/update
System setting creation/update
```

Audit logs should capture:

```text
who
what
which resource
when
relevant metadata
```

---

# 46. Phase 2 Compatibility

The MVP database should remain compatible with a future NestJS backend.

The database must not depend on:

```text
Next.js-specific business logic
React state
Frontend-only validation
Client-side authorization
```

Phase 2 can introduce:

```text
NestJS
Dedicated API
Background workers
Redis
Queues
Automated payments
Advanced notification processing
Advanced search
```

without requiring a complete database redesign.

---

# 47. Database Definition of Done

A database feature is complete only when:

* Schema is implemented
* Migration exists
* Foreign keys are correct
* Constraints are correct
* RLS is implemented
* Authorization is verified
* Input validation exists
* Indexes are appropriate
* Concurrency is handled where required
* Error cases are handled
* Unit/integration tests exist
* RLS tests exist where applicable
* E2E coverage exists for user-facing behavior
* Security review passes
* Performance review passes where applicable
* Code Review Agent approves the PR
* Regression tests pass

---

# 48. Database Golden Rules

1. **Database constraints protect data integrity.**
2. **RLS protects data access.**
3. **Server-side authorization protects business operations.**
4. **Frontend authorization is never trusted.**
5. **Secrets never belong in `system_settings`.**
6. **System settings are validated against an approved configuration registry.**
7. **Critical business rules must be tested.**
8. **Concurrent appointment booking must be safe.**
9. **Financial values use numeric/decimal types.**
10. **Historical records should not be casually deleted.**
11. **Every schema change goes through migrations and PR review.**
12. **No premature infrastructure.**
13. **Measure performance before optimizing.**
14. **Keep the MVP database simple and Phase 2 migration-friendly.**
15. **No database feature is complete without appropriate security and tests.**
