# Database Migration Plan

## 1. Purpose

This document defines the exact migration strategy for the Automobile Marketplace MVP PostgreSQL database.

It converts the database architecture into an executable migration sequence.

The migration plan must ensure:

* Correct dependency ordering
* Safe schema creation
* Referential integrity
* RLS enforcement
* Secure storage policies
* Required indexes
* System settings
* Seed data
* Repeatable local setup
* Production-safe migrations
* Database test coverage
* Phase 2 compatibility

---

# 2. Migration Principles

All database changes must follow these rules:

1. Every schema change must be a version-controlled migration.
2. Migrations must run successfully on a clean database.
3. Foreign-key dependencies must be respected.
4. RLS must be enabled on protected tables.
5. Policies must be tested directly.
6. Destructive changes require explicit approval.
7. Production migrations must not be edited after deployment.
8. Data migrations must be separated from destructive schema changes where practical.
9. Every migration must have a clear purpose.
10. No manual undocumented production database changes.
11. Migration changes require PR review.
12. Database migrations must pass automated checks before merge.

---

# 3. Migration Directory

Use the Supabase migration directory:

```text id="q6qj1m"
supabase/
└── migrations/
    ├── 001_initial_extensions.sql
    ├── 002_create_enums.sql
    ├── 003_create_profiles.sql
    ├── 004_create_showrooms.sql
    ├── 005_create_showroom_documents.sql
    ├── 006_create_vehicles.sql
    ├── 007_create_vehicle_media.sql
    ├── 008_create_favorites.sql
    ├── 008a_create_vehicle_inquiries.sql
    ├── 009_create_showroom_availability.sql
    ├── 010_create_appointments.sql
    ├── 011_create_appointment_vehicles.sql
    ├── 012_create_notifications.sql
    ├── 013_create_manual_payments.sql
    ├── 014_create_vehicle_imports.sql
    ├── 015_create_activity_logs.sql
    ├── 016_create_system_settings.sql
    ├── 017_create_indexes.sql
    ├── 018_create_functions.sql
    ├── 019_enable_rls.sql
    ├── 020_create_rls_policies.sql
    ├── 021_create_storage_buckets.sql
    ├── 022_create_storage_policies.sql
    └── 023_seed_system_settings.sql
```

Migration numbers represent logical order, not necessarily future file count.

If Supabase tooling generates timestamps instead of sequential names, preserve the same logical ordering.

---

# 4. Migration Dependency Graph

```text id="p6j2yo"
Extensions
   ↓
Enums
   ↓
Profiles
   ↓
Showrooms
   ↓
Showroom Documents

Profiles
   ↓
Vehicles
   ↓
Vehicle Media

Profiles + Vehicles
   ↓
Favorites

Profiles + Vehicles + Showrooms
   ↓
Vehicle Inquiries

Showrooms
   ↓
Availability

Profiles + Showrooms
   ↓
Appointments
   ↓
Appointment Vehicles

Profiles + Appointments
   ↓
Notifications

Appointments + Profiles
   ↓
Manual Payments

Showrooms + Profiles
   ↓
Vehicle Imports

Profiles
   ↓
Activity Logs

Profiles
   ↓
System Settings

All Tables
   ↓
Indexes
   ↓
Functions
   ↓
RLS
   ↓
Policies

Storage
   ↓
Storage Policies

System Settings
   ↓
Seed Data
```

---

# 5. Migration 001 — Initial Extensions

## Purpose

Enable required PostgreSQL extensions.

Potentially required:

```sql
pgcrypto
```

Use only extensions actually required by the implementation.

UUID generation should use a supported PostgreSQL/Supabase mechanism.

## Validation

Verify:

* Migration succeeds.
* UUID generation works.
* No unnecessary extensions are installed.

---

# 6. Migration 002 — Enums

Create controlled enums for application lifecycle states.

Required enums include:

```text id="p6w9o6"
user_role
showroom_status
showroom_document_status
vehicle_status
appointment_status
notification_channel
notification_status
manual_payment_status
vehicle_import_status
system_setting_value_type
```

Example:

```text id="k6p8h5"
user_role:
CUSTOMER
SHOWROOM
ADMIN
```

```text id="l8q8iz"
showroom_status:
PENDING
APPROVED
REJECTED
SUSPENDED
```

```text id="3pp5tq"
vehicle_status:
DRAFT
PENDING_REVIEW
ACTIVE
SOLD
INACTIVE
REJECTED
```

```text id="72q16c"
appointment_status:
PENDING
CONFIRMED
RESCHEDULED
DECLINED
CANCELLED
COMPLETED
```

Exact enum values must remain synchronized with `ACCEPTANCE_CRITERIA.md`.

---

# 7. Migration 003 — Profiles

Create:

```text id="1brb1x"
profiles
```

Reference:

```text id="f7bzzy"
auth.users(id)
```

Required fields:

```text id="7f8wio"
id
role
full_name
phone
avatar_url
is_active
created_at
updated_at
```

Constraints:

* Primary key
* Foreign key to `auth.users`
* Valid role
* Appropriate defaults

Important:

The database must not allow a normal customer to change their own role to `ADMIN`.

---

# 8. Migration 004 — Showrooms

Create:

```text id="1x0c3y"
showrooms
```

Dependencies:

```text id="3s4s5g"
profiles
```

Required:

* Owner relationship
* Business information
* Contact information
* Address
* Location
* Opening hours
* Status
* Verification
* Timestamps

Constraints:

* Valid owner
* Valid status
* Required business fields

Indexes:

```text id="yqkq9o"
owner_user_id
status
city
```

---

# 9. Migration 005 — Showroom Documents

Create:

```text id="w4r7sp"
showroom_documents
```

Dependencies:

```text id="f6k5dd"
showrooms
profiles
```

Required:

* Document type
* Storage path
* Status
* Uploaded by
* Reviewed by
* Review timestamp

Private storage must be enforced later through Storage policies.

---

# 10. Migration 006 — Vehicles

Create:

```text id="r5p6xm"
vehicles
```

Dependencies:

```text id="zyjqgr"
showrooms
```

Required fields:

```text id
showroom_id
title
make
model
variant
year
price
mileage
fuel_type
transmission
body_type
color
description
status
financing_down_payment_percent
financing_interest_rate
financing_tenure_options_months
financing_partner
financing_insurance_percent
financing_tracker_options
created_at
updated_at
```

Financing fields added 2026-09-03, extended 2026-09-04 with insurance/tracker fields (nullable — per-listing finance calculator configuration; see `DATABASE.md` §7).

Constraints must validate:

* Valid showroom
* Reasonable year
* Non-negative price
* Non-negative mileage
* Valid status
* Financing percent between 0 and 100 (when set)
* Financing interest rate non-negative (when set)
* Financing tenure options non-empty when provided
* Financing insurance percent between 0 and 100 (when set) (2026-09-04)
* Financing tracker options well-formed (duration + non-negative price) when provided (2026-09-04)

Indexes:

```text id="ihdrx4"
showroom_id
status
make
model
year
price
mileage
created_at
```

---

# 11. Migration 007 — Vehicle Media

Create:

```text id="h1gr6d"
vehicle_media
```

Dependencies:

```text id="0cqk9s"
vehicles
```

Required:

* Vehicle relationship
* Storage path
* Media type
* Sort order
* Primary-image flag
* Created timestamp

Consider a database-safe strategy for preventing multiple primary images per vehicle.

---

# 12. Migration 008 — Favorites

Create:

```text id="4t7rme"
favorites
```

Dependencies:

```text id="i8c8s7"
profiles
vehicles
```

Constraint:

```text id="f4a0tw"
UNIQUE(customer_id, vehicle_id)
```

The database should prevent duplicate favorites.

---

# 12.1 Migration 008a — Vehicle Inquiries (added 2026-09-04)

Create:

```text
vehicle_inquiries
```

Dependencies:

```text
profiles
vehicles
showrooms
```

Required:

```text
id
vehicle_id
showroom_id
customer_id
message
status
created_at
```

`showroom_id` is denormalized from the vehicle at insert time and must be validated server-side against the vehicle's actual `showroom_id` — never trusted from client input. One-way inquiry only; no reply/thread modeling (see `DATABASE.md` §8.1).

---

# 13. Migration 009 — Showroom Availability

Create:

```text id="a3w0lq"
showroom_availability
```

Dependencies:

```text id="5c1e8g"
showrooms
```

Required:

```text id="sjp5rx"
showroom_id
day_of_week
start_time
end_time
is_available
created_at
updated_at
```

Constraints:

* Valid day of week
* Start time before end time
* Valid showroom

---

# 14. Migration 010 — Appointments

Create:

```text id="qzq5dg"
appointments
```

Dependencies:

```text id="f6xg99"
profiles
showrooms
```

Required:

```text id="n1e6qy"
id
booking_reference
customer_id
showroom_id
appointment_date
start_time
end_time
status
customer_notes
showroom_notes
created_at
updated_at
```

Constraints:

```text id="7j2n5r"
UNIQUE(booking_reference)
```

Additional validation:

* Valid customer
* Valid showroom
* Valid time range
* Valid status

Indexes:

```text id="yd8j5j"
customer_id
showroom_id
appointment_date
status
booking_reference
```

---

# 15. Migration 011 — Appointment Vehicles

Create:

```text id="6n3r8a"
appointment_vehicles
```

Dependencies:

```text id="g5x7zi"
appointments
vehicles
```

Constraint:

```text id="h3td9e"
UNIQUE(appointment_id, vehicle_id)
```

Critical business rule:

Every vehicle attached to an appointment must belong to the same showroom as the appointment.

This must be enforced through trusted application/database transaction logic.

---

# 16. Migration 012 — Notifications

Create:

```text id="q4v8mi"
notifications
```

Dependencies:

```text id="2c8p9r"
profiles
appointments
```

Required:

```text id="n8h0pj"
user_id
appointment_id
channel
notification_type
status
recipient
provider_message_id
error_message
sent_at
created_at
updated_at
```

Indexes:

```text id="u3i8az"
user_id
appointment_id
status
```

---

# 17. Migration 013 — Manual Payments

Create:

```text id="v5q0s2"
manual_payments
```

Dependencies:

```text id="0z2w8m"
appointments
profiles
```

Required:

```text id="2z5k4b"
appointment_id
customer_id
amount
currency
payment_method
reference
status
notes
recorded_by
created_at
updated_at
```

Use `NUMERIC` for amount.

Only authorized administrators can manipulate these records.

---

# 18. Migration 014 — Vehicle Imports

Create:

```text id="c5x6nj"
vehicle_imports
```

Dependencies:

```text id="m8t4pr"
showrooms
profiles
```

Required:

```text id="g7z9la"
showroom_id
uploaded_by
file_name
storage_path
status
total_rows
successful_rows
failed_rows
error_report
created_at
updated_at
```

Use `JSONB` for structured import errors.

---

# 19. Migration 015 — Activity Logs

Create:

```text id="7y1k4p"
activity_logs
```

Dependencies:

```text id="j4w9sx"
profiles
```

Required:

```text id="6j4e7b"
actor_user_id
action
resource_type
resource_id
metadata
created_at
```

Audit logs should be append-oriented.

Normal users must not modify audit history.

---

# 20. Migration 016 — System Settings

Create:

```text id="0q8x4k"
system_settings
```

Required fields:

```text id
key
value
value_type
description
category
is_public
is_editable
updated_by
created_at
updated_at
```

### Constraints

```text id="2s7f8m"
UNIQUE(key)
```

`value` uses:

```text id="q7z2v4"
JSONB
```

`value_type` uses the controlled enum.

### Categories

```text id="1r6z7k"
general
maintenance
notifications
appointments
marketplace
registration
vehicle
bulk_import
finance
```

---

# 21. System Settings Initial Catalog

The migration should seed only approved MVP settings.

## General

```text id="4d9x1a"
site_name
support_email
support_phone
currency
currency_symbol
timezone
```

## Maintenance

```text id="9f5s3p"
maintenance_mode
maintenance_message
maintenance_allowed_roles
```

## Notifications

```text id="j4t6z8"
email_notifications_enabled
whatsapp_notifications_enabled
booking_confirmation_enabled
booking_reminder_enabled
booking_change_notification_enabled
admin_emails
admin_cc_emails
```

## Appointments

```text id="r3g8w2"
appointment_default_duration
appointment_reminder_hours
appointment_minimum_notice_hours
appointment_max_days_ahead
customer_cancellation_enabled
customer_reschedule_enabled
```

## Marketplace

```text id="2c6y8n"
default_page_size
maximum_page_size
public_listing_enabled
```

## Registration

```text id="6k9m4q"
customer_registration_enabled
showroom_registration_enabled
```

## Vehicle

```text id="8h3v6t"
maximum_vehicle_images
maximum_vehicle_image_size_mb
vehicle_listing_requires_approval
```

## Bulk Import

```text id="5r7x2p"
bulk_import_enabled
bulk_import_max_file_size_mb
bulk_import_max_rows
```

## Finance

```text id="3m9q7v"
finance_calculator_enabled
finance_default_interest_rate
finance_default_duration
```

Exact default values must be agreed upon before production seeding.

---

# 22. System Settings Security Model

The migration must establish the foundation for:

```text id="8v4c1n"
Public
   ↓
Read only explicitly public settings

Customer
   ↓
No modification

Showroom
   ↓
No modification

Admin
   ↓
Read/update authorized settings
```

The client must never be able to arbitrarily:

```text id="m1z8qx"
create setting keys
change value_type
change is_editable
change authorization-related configuration
```

The application must validate settings against a type-safe registry.

---

# 23. Migration 017 — Indexes

Create indexes based on actual application queries.

Required areas:

### Profiles

```text id="n3f7q1"
role
is_active
```

### Showrooms

```text id="h8k4m2"
owner_user_id
status
city
```

### Vehicles

```text id="s5q9v7"
showroom_id
status
make
model
year
price
mileage
created_at
```

### Favorites

```text id="x4j8p2"
customer_id
vehicle_id
```

### Availability

```text id="c9w5r3"
showroom_id
```

### Appointments

```text id="b7m2n6"
customer_id
showroom_id
appointment_date
status
booking_reference
```

### Notifications

```text id="t8y4k1"
user_id
appointment_id
status
```

### Imports

```text id="p3q7v9"
showroom_id
status
```

### Audit

```text id="k6x2m8"
actor_user_id
resource_type
resource_id
created_at
```

### Settings

```text id="r9c4z5"
key
category
is_public
```

Indexes must be reviewed for redundancy.

---

# 24. Migration 018 — Database Functions

Create only functions that provide meaningful integrity or reusable trusted operations.

Potential functions:

```text id="u4j7s9"
updated_at trigger
profile creation helper
appointment conflict validation
appointment vehicle showroom validation
system setting validation where appropriate
audit helper where appropriate
```

Avoid putting the entire application into PostgreSQL functions.

Business logic should remain understandable and maintainable.

---

# 25. Updated-at Trigger

Tables containing:

```text id="f7k3m1"
updated_at
```

should automatically update the timestamp when the row changes.

Likely tables:

```text id="p8x5q2"
profiles
showrooms
showroom_documents
vehicles
showroom_availability
appointments
notifications
manual_payments
vehicle_imports
system_settings
```

---

# 26. Migration 019 — Enable RLS

Enable Row Level Security on all protected tables.

At minimum:

```text id="m5q8z1"
profiles
showrooms
showroom_documents
vehicles
vehicle_media
favorites
vehicle_inquiries
showroom_availability
appointments
appointment_vehicles
notifications
manual_payments
vehicle_imports
activity_logs
system_settings
```

RLS must be enabled before application release.

---

# 27. Migration 020 — RLS Policies

Policies must follow ownership boundaries.

## Profiles

Customer:

```text id="z3p8r6"
SELECT own profile
UPDATE own allowed fields
```

Admin:

```text id="j6x1v4"
authorized management access
```

Role modification must remain restricted.

---

# 28. Showroom Policies

Showroom users:

```text id="a7q2n5"
SELECT own showroom
UPDATE own showroom
```

Admin:

```text id="k8m4z9"
full authorized access
```

Public users:

Only approved/public showroom information.

Private fields must not leak.

---

# 29. Vehicle Policies

Showroom:

```text id="s2f6w8"
SELECT own vehicles
INSERT own vehicles
UPDATE own vehicles
DELETE/deactivate own vehicles
```

Customer:

```text id="p5r9x3"
SELECT public active vehicles
```

Admin:

Authorized management access.

Critical ownership checks must exist server-side as well.

---

# 30. Vehicle Media Policies

Access must validate:

```text id="m8q4t7"
authenticated user
+
vehicle ownership
```

Public access should be limited to media belonging to publicly visible vehicles where appropriate.

---

# 31. Favorites Policies

Customer:

```text id="v6z2n9"
SELECT own
INSERT own
DELETE own
```

No customer may access another customer's favorites.

---

# 31.1 Vehicle Inquiry Policies (added 2026-09-04)

Customer:

```text
SELECT own
INSERT own
```

Showroom:

```text
SELECT inquiries where showroom_id = own showroom
UPDATE status only, own showroom's inquiries
```

Admin:

Authorized management access.

`showroom_id` must be validated server-side against the vehicle's actual showroom at insert time — never trusted from client input.

---

# 32. Availability Policies

Showroom:

```text id="b4x7p1"
SELECT own
INSERT own
UPDATE own
DELETE own
```

Admin:

Authorized management access.

---

# 33. Appointment Policies

Customer:

```text id="r5m8c2"
SELECT own
INSERT own
UPDATE own allowed fields
```

Showroom:

```text id="q9v3k6"
SELECT own showroom appointments
UPDATE authorized status/actions
```

Admin:

Authorized full management.

Critical appointment operations must also use server-side validation and transaction logic.

---

# 34. Appointment Vehicle Policies

Access must be inherited through the appointment/customer/showroom relationship.

A user must not be able to attach an arbitrary vehicle to another showroom's appointment.

---

# 35. Notification Policies

Users can view only their own relevant notification records.

Administrative access is restricted.

Notification providers must never be controlled by arbitrary client input.

---

# 36. Manual Payment Policies

Only authorized admins may:

```text id="d3x7q9"
SELECT
INSERT
UPDATE
```

Customers and showrooms must not create or modify payment records.

---

# 37. Vehicle Import Policies

Showroom users can access only their own import records.

Admins can access authorized imports.

Imported vehicles must always be associated with the authenticated showroom.

---

# 38. Activity Log Policies

Normal users:

```text id="v7m2q8"
No write access
```

Administrative/system operations may create logs through trusted mechanisms.

Users may only access audit information they are explicitly authorized to see.

---

# 39. System Settings Policies

Public:

Only explicitly public settings may be exposed.

Customer:

```text id="q8z3n5"
No write
```

Showroom:

```text id="m4x7r2"
No write
```

Admin:

```text id="p9k6v1"
SELECT
UPDATE
```

Admin access must be validated using trusted role information.

---

# 40. Migration 021 — Storage Buckets

Create:

```text id="n8q4w6"
vehicle-media
showroom-documents
```

### Vehicle media

Public visibility may be allowed if approved marketplace vehicle images are intended to be publicly displayed.

### Showroom documents

Must remain private.

Storage access must be enforced with Storage policies.

---

# 41. Migration 022 — Storage Policies

## Vehicle Media

Showroom can upload/delete only within its own vehicle resources.

Public users may read only approved public media.

## Showroom Documents

Only:

```text id="f5z8k3"
Owning showroom
Authorized admin
```

may access documents.

Never expose private documents through public URLs.

---

# 42. Migration 023 — Seed System Settings

Insert the approved default settings.

Example:

```text id="r3x7m9"
maintenance_mode = false
customer_registration_enabled = true
showroom_registration_enabled = true
public_listing_enabled = true
finance_calculator_enabled = true
bulk_import_enabled = true
email_notifications_enabled = true
whatsapp_notifications_enabled = true
```

Default values must be treated as configuration, not hardcoded assumptions.

---

# 43. Admin User Bootstrap

The database migration must NOT create an admin account with a hardcoded password.

Admin creation must use a secure controlled bootstrap process.

Recommended:

```text id="j6p2v8"
Create Supabase Auth user securely
        ↓
Create/update profile
        ↓
Assign ADMIN role through trusted server/admin process
        ↓
Verify RLS
```

Never commit admin credentials to Git.

---

# 44. Test Data

Development/test seed data may include:

```text id="t8m4q1"
Test admin
Test customer
Test showroom
Test vehicles
Test availability
Test appointments
Test notifications
```

Production must never receive fake test users/data accidentally.

Use a clearly separated development/test seed process.

---

# 45. Migration Testing

Every migration must be tested against a clean database.

Minimum process:

```text id="w2q7n9"
Reset database
↓
Run all migrations
↓
Seed test data
↓
Run database tests
↓
Run RLS tests
↓
Run integration tests
```

The complete migration chain must work without manual intervention.

---

# 46. RLS Test Matrix

Test at minimum:

| Resource                | Customer            | Showroom        | Admin      | Anonymous          |
| ----------------------- | ------------------- | --------------- | ---------- | ------------------ |
| Own profile             | Read/Update         | Read/Update     | Manage     | No                 |
| Other profile           | No                  | No              | Authorized | No                 |
| Own showroom            | No/where applicable | Manage          | Manage     | Public data only   |
| Other showroom          | No                  | No              | Manage     | Public data only   |
| Own vehicles            | Read                | Manage          | Manage     | Public active only |
| Other showroom vehicles | Public only         | No write        | Manage     | Public active only |
| Own favorites           | Manage              | No              | Authorized | No                 |
| Own appointments        | Manage              | Relevant access | Manage     | No                 |
| Other appointments      | No                  | No              | Manage     | No                 |
| Payments                | No                  | No              | Manage     | No                 |
| System settings         | No write            | No write        | Manage     | Public subset only |
| Private documents       | No                  | Own             | Manage     | No                 |

Exact policies must be tested against actual Supabase behavior.

---

# 47. Data Integrity Tests

Test:

* Duplicate favorites rejected.
* Duplicate booking reference rejected.
* Invalid foreign key rejected.
* Invalid enum rejected.
* Negative vehicle price rejected.
* Negative mileage rejected.
* Invalid appointment time rejected.
* Invalid availability rejected.
* Invalid system setting type rejected.
* Invalid system setting key rejected.
* Cross-showroom appointment vehicle rejected.

---

# 48. Appointment Concurrency Tests

This is a release-critical database test.

Simulate concurrent requests for the same:

```text id="x6r2p8"
showroom
date
time slot
```

Expected result:

```text id="k4m7z1"
One valid booking
+
Other conflicting requests rejected safely
```

No double booking may occur.

---

# 49. Migration Rollback Strategy

Before production:

* Backup/database recovery capability must be verified.
* Migration must be tested on staging/preview.
* Destructive operations require explicit approval.

Do not assume every migration can be safely down-migrated.

For destructive migrations, prefer:

```text id="n7c3q5"
Backup
→
Forward migration
→
Verification
```

rather than relying on a theoretical rollback script.

---

# 50. Production Migration Process

Production database changes follow:

```text id="r8m2x6"
Create migration
↓
Local clean DB test
↓
Unit/integration tests
↓
RLS tests
↓
PR
↓
Code Review Agent
↓
Approval
↓
Merge
↓
Preview/Staging migration
↓
Verification
↓
Production migration
↓
Smoke tests
↓
Production verification
```

No manual SQL changes outside the migration process.

---

# 51. Migration Safety Rules

Never casually use:

```text id="y4p8m2"
DROP TABLE
DROP COLUMN
TRUNCATE
CASCADE
```

in production.

If required:

1. Explain the impact.
2. Verify dependent objects.
3. Verify data backup/recovery.
4. Obtain explicit approval.
5. Test in staging.
6. Execute through reviewed migration.

---

# 52. Schema Change Rules

When changing an existing table:

Prefer:

```text id="w9q3v6"
Add new column
↓
Deploy compatible code
↓
Backfill data
↓
Verify
↓
Remove old column later
```

over breaking existing production code immediately.

This becomes especially important during Phase 2.

---

# 53. Database Performance Verification

After migrations, verify important queries:

```text id="h7m4q2"
Vehicle listing
Vehicle search
Vehicle filtering
Vehicle detail
Showroom listing
Appointment availability
Appointment conflict checking
Admin listing
Notification retrieval
System settings retrieval
```

Use actual query plans where required.

Avoid unnecessary indexes.

---

# 54. System Settings Performance

Application code must use a centralized settings service.

Preferred:

```text id="k8r2x6"
Feature
   ↓
Settings Service
   ↓
Validated settings
   ↓
Database
```

Avoid direct `system_settings` queries scattered throughout components.

Settings should be cached only when useful.

Do not introduce Redis for this during MVP.

---

# 55. Migration Documentation

Every migration should have:

* Clear filename
* Clear purpose
* Dependencies
* Schema changes
* Security impact
* Data impact
* Testing requirements

Complex migrations should include comments explaining non-obvious decisions.

---

# 56. Migration Definition of Done

The database foundation is complete only when:

* All required tables exist.
* All required enums exist.
* Foreign keys work.
* Constraints work.
* Indexes are appropriate.
* Functions/triggers work.
* RLS is enabled.
* RLS policies work.
* Storage buckets exist.
* Storage policies work.
* System settings exist.
* Approved settings are seeded.
* No secrets are stored in the database.
* Clean database migration succeeds.
* Test data can be loaded safely.
* RLS tests pass.
* Integrity tests pass.
* Appointment concurrency tests pass.
* Integration tests pass.
* Code Review Agent approves the migration PR.

---

# 57. Final Migration Sequence

The complete MVP database setup must follow:

```text id="p4x7n2"
001 Extensions
↓
002 Enums
↓
003 Profiles
↓
004 Showrooms
↓
005 Showroom Documents
↓
006 Vehicles
↓
007 Vehicle Media
↓
008 Favorites
↓
008a Vehicle Inquiries (added 2026-09-04)
↓
009 Showroom Availability
↓
010 Appointments
↓
011 Appointment Vehicles
↓
012 Notifications
↓
013 Manual Payments
↓
014 Vehicle Imports
↓
015 Activity Logs
↓
016 System Settings
↓
017 Indexes
↓
018 Functions / Triggers
↓
019 Enable RLS
↓
020 RLS Policies
↓
021 Storage Buckets
↓
022 Storage Policies
↓
023 Seed System Settings
```

---

# 58. Golden Rule

**Migration → Reset → Test → RLS Test → Integration Test → Review → Stage → Verify → Production → Verify**

The database is part of the application's security boundary.

A migration is not complete because it executes successfully.

It is complete only when the **schema, constraints, RLS, storage, data integrity, concurrency behavior, tests, and production safety** have all been verified.
