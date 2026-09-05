# Automobile Marketplace MVP — Progress Tracker

> **Project Timeline:** 5 Development Days + 2 QA/Deployment Days
> **MVP Status:** 🟡 In Progress
> **Feature Freeze:** End of Day 5
> **Production Target:** End of Day 7

---

# Status Legend

* ⬜ Not Started
* 🟡 In Progress
* 🔵 Development Complete
* 🟣 In QA
* 🟢 Passed
* 🔴 Blocked / Failed
* 🚀 Production

---

# Overall Progress

| Area               | Development | QA | PR | Production |
| ------------------ | ----------- | -- | -- | ---------- |
| Foundation         | 🟢          | ⬜  | 🟢  | ⬜          |
| Authentication     | 🟢          | ⬜  | 🟢  | ⬜          |
| Showrooms          | 🟡           | ⬜  | 🟢  | ⬜          |
| Vehicles           | ⬜           | ⬜  | ⬜  | ⬜          |
| Marketplace        | ⬜           | ⬜  | ⬜  | ⬜          |
| Finance Calculator | ⬜           | ⬜  | ⬜  | ⬜          |
| WhatsApp Inquiry   | ⬜           | ⬜  | ⬜  | ⬜          |
| Admin              | 🟡           | ⬜  | 🟢  | ⬜          |

---

# DAY 1 — Foundation

## Project Foundation

* [x] Repository setup (git initialized, `.gitignore`, pushed to [github.com/IshraqQureshi/automobile-marketplace](https://github.com/IshraqQureshi/automobile-marketplace))
* [x] Next.js setup (Next.js 16, App Router)
* [x] TypeScript configuration (strict mode, `noUncheckedIndexedAccess`, `@/*` path alias)
* [x] Tailwind CSS installed (v4) — no brand tokens yet; design tokens land with MKT-001 against `/design` references
* [x] Supabase configuration (FND-002 — typed clients, session-refresh proxy, connectivity verified against local Supabase — see PR #2)
* [x] Environment configuration (`.env.example`, zod-validated `src/lib/env.ts`; no secrets committed)
* [x] Database foundation (FND-003 — 15 tables, enums, constraints, indexes, triggers; RLS/storage/seed data intentionally deferred to FND-004 — see PR #3)
* [x] Seed/test data (FND-004 — 36 approved `system_settings` values seeded — see PR #4)
* [x] Error handling (global `error.tsx`/`global-error.tsx`/`not-found.tsx` foundation in place — see PR #6; feature-specific error handling continues to be added per-feature, e.g. auth's typed action states)
* [x] Logging (`src/lib/logger.ts` — minimal structured JSON logging, wired into real error paths; not a dependency, deliberately, per MVP scope)
* [x] Git workflow (feature branch created; no direct commits to `main` for feature work)

## Authentication

* [x] Registration (AUTH-001 — email/password, `/login` sign-up tab, real E2E-verified)
* [x] Login (AUTH-002 — email/password; Google OAuth wired but untestable without real credentials, see blocker)
* [x] Logout
* [x] Password reset (real flow: `/forgot-password` → emailed reset link via `/auth/callback` → `/reset-password`, E2E-verified end-to-end incl. old password rejected and new password working)
* [x] Session handling (proxy.ts refresh from FND-002; protected-route redirect verified)
* [x] User roles (CUSTOMER auto-assigned via FND-003's handle_new_user trigger — verified via E2E)
* [x] Real-time client-side validation + confirm-password field on signup (PR #7 — same zod schemas as the server, server remains sole authority; see PR #7 code review for the divergence analysis)
* [x] Super-admin bootstrap (`npm run seed:admin` — `scripts/seed-admin.mjs`, PR #7; idempotent create-or-promote via service-role client, refuses to run against a non-local Supabase URL unless `ADMIN_SEED_ALLOW_REMOTE=true`, never writes/commits credentials)

## UI Foundation

* [x] Application layout (Header + Footer wired into root `layout.tsx`, applied to every page — see PR #6)
* [x] Header (real logo, Brands/Model/Type nav + search inert pending MKT-001/002/003, Log in/Sign up, working mobile hamburger)
* [x] Navigation (header nav + mobile menu; per-feature navigation, e.g. marketplace filters, lands with those features)
* [x] Responsive foundation (Header/Footer verified at 1440px and 390px via Playwright screenshots)
* [x] Loading states (`src/app/loading.tsx` — root Suspense fallback; page-specific loading states land per feature)
* [ ] Empty states (no data-driven listing pages exist yet to have an empty state — lands with MKT-002/SHR-004 etc.)
* [x] Error states (`error.tsx`, `global-error.tsx`, `not-found.tsx`)

## Testing Infrastructure

* [x] Unit testing configured (Vitest — 9 passing tests across `src/lib/utils.test.ts` and `src/lib/env.test.ts`)
* [x] Integration testing configured (Vitest — connectivity + 17 schema/constraint/trigger tests + 45 RLS authorization tests + 8 storage RLS tests, 81 total, all against a live local Supabase instance)
* [x] E2E framework configured (Playwright — smoke test in `e2e/smoke.spec.ts` verified passing against a production build)
* [ ] CI checks configured (no GitHub Actions workflow yet — remote repo exists, CI pipeline itself not set up)

## Claude Engineering System

* [x] CLAUDE.md
* [x] Agents configured
* [x] Skills configured
* [x] Figma integration verified (Figma Make view-only access isn't fetchable; using 7 static design exports in `/design` instead — see Blocker B-002)

### Day 1 Gate

* [x] Application runs locally (`npm run dev` serves the app shell; verified via `curl`)
* [x] Supabase connected (FND-002 — local instance running, Auth/Storage connectivity verified via real integration tests, no schema yet)
* [x] Authentication works (AUTH-001/002 — registration/login/logout/protected-route redirect all E2E-verified; Google OAuth wired but blocked on real credentials, see B-005)
* [x] Tests execute successfully (typecheck, lint, `npm test` (11/11), `npm run build`, and `npm run test:e2e` all verified passing)

**Status:** 🟢 Day 1 Gate CLOSED — FND-001/FND-002/FND-003/FND-004/AUTH-001/AUTH-002 all complete and verified

---

# DAY 2 — Showrooms + Vehicles

## Showrooms

* [x] Create showroom (SHR-001/SHR-002 — `/ready-to-sell` chooser + `/register-showroom` form: business info, license/registration document upload to the `showroom-documents` bucket, one-active-showroom-per-owner enforced at both the app and DB layer — see PR #16)
* [x] Showroom profile (`/dashboard/profile` — showroom owner can view their own business name, logo, location, phone, email, address, description; editable even while PENDING — see PR #31)
* [x] Edit showroom (owner self-service via `/dashboard/profile`, reusing the same `updateShowroomProfile()` write/logo-upload logic as admin's `/admin/showrooms` edit — see PR #31; admin-side edit already existed, see PR #21/#23)
* [ ] Showroom listing
* [ ] Showroom details

## Vehicles

* [x] Add vehicle (SHR-005 — `/dashboard/vehicles/new`, showroom-owner-facing, own full page not a modal — created as DRAFT — see PR #26, moved to a page and Brand/Model made cascading catalog dropdowns in PR #27)
* [x] Edit vehicle (SHR-006 — `/dashboard/vehicles/[id]/edit` — see PR #26, PR #27)
* [x] Delete vehicle (SHR-007 — implemented as a status change to INACTIVE ("Removed"), not a hard delete, given `vehicle_media`/`vehicle_inquiries` FK references to a vehicle and the requirement's own "remove/deactivate" wording — see PR #26)
* [x] Vehicle images (SHR-008 — "Photo Gallery"/"Featured Image", multi-upload to the existing `vehicle-media` bucket, primary-image selection, delete with automatic primary reassignment; moved from a dialog to an always-visible section on the edit page in PR #27 — see PR #26, PR #27)
* [x] Vehicle specifications (Brand/Model dropdowns sourced from the admin catalog, Body Type dropdown from `vehicle_types`, Engine, Interior, Doors, Seats, Colour, Country of Origin, year/mileage/fuel type/transmission — fuel type & transmission are fixed app-level lists; Brand/Model/Body Type write into the same free-text `make`/`model`/`body_type` columns, no FK added — see PR #26, expanded in PR #27)
* [x] Pricing (financing fields — Installment/Bank Finance enable toggles, Deposit as a Fixed-or-Percentage toggle + amount, interest rate, insurance %, tracker fee (1yr/2yr), loan term, financing partner; the financing config section only shows once "Available on installment" is enabled — see PR #27; the customer-facing finance *calculator* itself is still Day 4/MKT-008 scope, not built)
* [x] Vehicle status (owner-settable subset: Draft/Published/Sold/Removed; settable both from the vehicle list's inline dropdown and directly on the create/edit form itself — see PR #26, PR #30; PENDING_REVIEW/REJECTED reserved for the not-yet-built Day 4 admin moderation flow)
* [ ] Vehicle listing (public marketplace browsing — Day 3 MKT scope, not built yet; a vehicle can be "published" but there's nowhere public to see it)

## Admin

* [x] Admin dashboard foundation (built ahead of schedule, per explicit user request before starting Day 2 — sidebar/topbar shell, real auth-gated `/admin` layout, dashboard stat tiles wired to real `showrooms`/`vehicles`/`profiles` counts, honest empty states for pending-approvals/activity since no submission flow exists yet; the "Pending approvals" panel now shows real pending showrooms — see PR #20)
* [x] Vehicle catalog management (`/admin/catalog` — Brands/Models(nested under Brand)/Vehicle Types CRUD, built ahead of schedule per explicit user request as a prerequisite for the vehicle-add flow below — see PR #15; Brands can also carry an optional logo, admin-only public-bucket upload — see PR #17)
* [x] Showroom management (`/admin/showrooms` — SHR-003/ADM-002: review a PENDING showroom's full details and submitted documents (opened via short-lived Supabase Storage signed URLs), then approve or reject via an inline confirmation. Authorization is enforced entirely by the existing `prevent_showroom_self_approval` RLS trigger + `is_admin()`, no duplicated role check in the server actions — see PR #20. Extended with full Create/Edit/Delete per explicit user request — see PR #21. Create supports assigning an existing user (email search) or inviting a brand-new one (real Supabase invite email, not a mailed plaintext password), plus optional document upload matching the actual registration design — see PR #22. Review dialog redesigned with a header card/icon-labeled fields, document viewing moved to an inline in-dialog preview instead of a new browser tab, and an optional showroom logo (falls back to initials) added to create/edit — see PR #23)
* [ ] Vehicle management

## Testing

* [x] Unit tests (schema/validation tests across showroom + catalog + vehicle features — 207/207 passing as of PR #31)
* [x] Integration tests (RLS ownership coverage for showrooms/catalog/vehicles/vehicle_media/storage, including the showroom-logos bucket's owner-or-admin write policies added in PR #31)
* [x] E2E showroom flow (registration + admin approval covered; self-service profile edit — `e2e/dashboard-profile.spec.ts` — added in PR #31)
* [x] E2E vehicle flow (`e2e/dashboard-vehicles.spec.ts` — create/edit/publish/mark sold/deactivate, photo upload/set-primary/delete, pending-showroom gating — see PR #26)
* [ ] Figma visual QA (no Figma mockup exists for the showroom-owner dashboard/vehicle-management screens — confirmed before implementation; built from the existing admin-panel design system instead, per CLAUDE.md's "don't invent visual patterns where Figma already defines them, but don't fabricate a Figma reference either" spirit)

### Day 2 Gate

* [x] Showroom can manage its profile (self-service profile edit at `/dashboard/profile` — see PR #31)
* [x] Showroom can manage vehicles (add/edit/publish/mark sold/deactivate/photos — see PR #26)
* [x] Admin can manage showroom/vehicle data (showroom: PR #20-#23; vehicle catalog taxonomy: PR #15/#17 — admin vehicle *moderation* specifically is Day 4/ADM-004, not yet built)
* [x] Required tests pass (207/207 unit+integration, 59/59 E2E, typecheck/lint/build all clean as of PR #31)

**Status:** 🟢 Day 2 Gate CLOSED — showroom self-service profile editing (PR #31) was the last remaining item

---

# DAY 3 — Marketplace

## Vehicle Discovery

* [ ] Vehicle listing
* [ ] Search
* [ ] Filters
* [ ] Sorting
* [ ] Pagination
* [ ] Vehicle detail page

## Showroom Discovery

* [ ] Showroom listing
* [ ] Showroom search/filter
* [ ] Showroom detail page
* [ ] Showroom vehicles

## Testing

* [ ] Search tests
* [ ] Filter tests
* [ ] Marketplace tests
* [ ] E2E marketplace flow
* [ ] Figma visual QA

### Day 3 Gate

* [ ] Customer can browse vehicles
* [ ] Customer can search vehicles
* [ ] Customer can filter vehicles
* [ ] Customer can view vehicle details
* [ ] Customer can view showroom details
* [ ] Required tests pass

**Status:** ⬜

---

# DAY 4 — Finance + Inquiry + Admin

## Finance Calculator

* [ ] Vehicle price
* [ ] Down payment
* [ ] Loan amount
* [ ] Interest rate
* [ ] Loan duration
* [ ] Monthly payment
* [ ] Input validation
* [ ] Edge cases

## WhatsApp Inquiry

* [ ] Inquiry CTA
* [ ] Vehicle information
* [ ] Showroom information
* [ ] WhatsApp redirect
* [ ] Mobile behavior

## Admin

* [ ] Dashboard metrics
* [ ] User management
* [ ] Showroom approval/status
* [ ] Vehicle moderation
* [ ] Required admin controls

## Testing

* [ ] Finance tests
* [ ] Inquiry tests
* [ ] Admin tests
* [ ] E2E finance flow
* [ ] E2E inquiry flow
* [ ] E2E admin flow
* [ ] Figma visual QA

### Day 4 Gate

* [ ] All major MVP business functionality exists
* [ ] Required tests pass

**Status:** ⬜

---

# DAY 5 — Integration + Completion

## Integration

* [ ] Connect all modules
* [ ] Complete unfinished features
* [ ] Fix broken flows
* [ ] Verify authentication/authorization
* [ ] Verify database relationships
* [ ] Verify error handling

## Frontend QA

* [ ] Responsive review
* [ ] Loading states
* [ ] Empty states
* [ ] Error states
* [ ] Figma visual comparison
* [ ] Mobile review

## Security

* [ ] Authentication review
* [ ] Authorization review
* [ ] RBAC review
* [ ] RLS review
* [ ] Input validation review
* [ ] Sensitive data review

## Performance

* [ ] Database indexes reviewed
* [ ] Queries reviewed
* [ ] Pagination verified
* [ ] Unnecessary requests removed
* [ ] Image handling reviewed

## Testing

* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] E2E tests pass
* [ ] Regression suite passes

## Release Candidate

* [ ] Production configuration ready
* [ ] Environment variables verified
* [ ] Production database verified
* [ ] Production build succeeds
* [ ] No critical/high blockers

### DAY 5 GATE — FEATURE FREEZE

**No new MVP features after this point without explicit approval.**

**Status:** ⬜

---

# DAY 6 — QA + E2E

## Critical E2E Flows

### Flow 01 — Customer Discovery

* [ ] Registration
* [ ] Login
* [ ] Browse vehicles
* [ ] Search
* [ ] Filter
* [ ] Vehicle details
* [ ] Showroom details

**Status:** ⬜

### Flow 02 — Vehicle Inquiry

* [ ] Open vehicle
* [ ] Click inquiry
* [ ] Correct vehicle data included
* [ ] Correct showroom data included
* [ ] WhatsApp opens correctly

**Status:** ⬜

### Flow 03 — Showroom Management

* [ ] Login
* [ ] Manage showroom
* [ ] Add vehicle
* [ ] Upload images
* [ ] Edit vehicle
* [ ] Publish vehicle

**Status:** ⬜

### Flow 04 — Admin

* [ ] Admin login
* [ ] Review showroom
* [ ] Approve/reject showroom
* [ ] Manage vehicles
* [ ] Manage users

**Status:** ⬜

### Flow 05 — Finance

* [ ] Open calculator
* [ ] Enter inputs
* [ ] Calculate
* [ ] Verify result
* [ ] Test invalid inputs
* [ ] Test edge cases

**Status:** ⬜

---

# Day 6 Bug Cycle

For every bug:

```text
Bug Found
    ↓
Issue Created
    ↓
Developer Agent Fix
    ↓
Automated Tests
    ↓
QA Retest
    ↓
Regression Test
```

## Bugs

| ID | Description | Severity | Status | Fixed By | Retested |
| -- | ----------- | -------- | ------ | -------- | -------- |
| —  | —           | —        | —      | —        | —        |

### Day 6 Gate

* [ ] All critical E2E flows pass
* [ ] All critical bugs fixed
* [ ] All high-severity release blockers fixed
* [ ] Regression suite passes

**Status:** ⬜

---

# DAY 7 — Final Release

## Final Validation

* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] E2E tests pass
* [ ] Full regression passes
* [ ] Security checks pass
* [ ] Performance checks pass
* [ ] Visual QA complete

## Production Deployment

* [ ] Production build
* [ ] Environment configuration
* [ ] Database verification
* [ ] Deploy application
* [ ] Smoke tests
* [ ] Authentication verified
* [ ] Marketplace verified
* [ ] Vehicle pages verified
* [ ] Finance calculator verified
* [ ] WhatsApp inquiry verified
* [ ] Admin verified

## Production Verification

* [ ] Homepage working
* [ ] Login working
* [ ] Marketplace working
* [ ] Search/filter working
* [ ] Vehicle details working
* [ ] Showroom pages working
* [ ] Finance calculator working
* [ ] WhatsApp inquiry working
* [ ] Admin working
* [ ] No critical production errors

### FINAL RELEASE GATE

* [ ] All required tests pass
* [ ] No critical/high release blockers
* [ ] Release Agent approved
* [ ] Production smoke tests pass

**Production Status:** ⬜

---

# Feature Status

| Feature            | Dev | Tests | E2E | Visual QA | Security | PR | Production |
| ------------------ | --- | ----- | --- | --------- | -------- | -- | ---------- |
| Authentication     | ⬜   | ⬜     | ⬜   | ⬜         | ⬜        | ⬜  | ⬜          |
| Showrooms          | ⬜   | ⬜     | ⬜   | ⬜         | ⬜        | ⬜  | ⬜          |
| Vehicles           | ⬜   | ⬜     | ⬜   | ⬜         | ⬜        | ⬜  | ⬜          |
| Marketplace        | ⬜   | ⬜     | ⬜   | ⬜         | ⬜        | ⬜  | ⬜          |
| Finance Calculator | ⬜   | ⬜     | ⬜   | ⬜         | ⬜        | ⬜  | ⬜          |
| WhatsApp Inquiry   | ⬜   | ⬜     | ⬜   | ⬜         | ⬜        | ⬜  | ⬜          |
| Admin              | ⬜   | ⬜     | ⬜   | ⬜         | ⬜        | ⬜  | ⬜          |

---

# Pull Requests

| PR | Feature | Review | Tests | Status | Merged |
| -- | ------- | ------ | ----- | ------ | ------ |
| [#1](https://github.com/IshraqQureshi/automobile-marketplace/pull/1) | FND-001 (`feature/project-init` → `main`) | 🟢 APPROVED by Code Review Agent (2 MEDIUM findings, both fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit (9/9)/E2E/build all passing | MERGED | 🟢 (squash, `e653976`) |
| [#2](https://github.com/IshraqQureshi/automobile-marketplace/pull/2) | FND-002 (`feature/supabase-integration` → `main`) | 🟢 APPROVED by Code Review Agent (2 MEDIUM + 1 LOW, all fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit (11/11, incl. real Auth/Storage integration tests)/E2E/build all passing | MERGED | 🟢 (squash, `2ba69c4`) |
| [#3](https://github.com/IshraqQureshi/automobile-marketplace/pull/3) | FND-003 (`feature/database-schema` → `main`) | 🟢 APPROVED by Code Review Agent (1 HIGH + 2 LOW, all fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit (28/28, incl. 17 real schema/constraint/trigger tests)/E2E/build/`supabase db reset` all passing | MERGED | 🟢 (squash, `b39172b`) |
| [#4](https://github.com/IshraqQureshi/automobile-marketplace/pull/4) | FND-004 (`feature/rls-authorization` → `main`) | 🟢 APPROVED by Code Review Agent (2 BLOCKER + 2 HIGH + 1 MEDIUM + 2 LOW-tracked, all blocking findings fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit (86/86, incl. 45 RLS + 8 storage RLS tests with real signed-in sessions per role)/E2E/build/`supabase db reset` all passing | MERGED | 🟢 (squash, `aa1341f`) |
| [#5](https://github.com/IshraqQureshi/automobile-marketplace/pull/5) | AUTH-001/AUTH-002 (`feature/customer-auth` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM + 2 LOW, all fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit (95/95)/E2E (4/4, incl. full register→account→logout→login journey)/build all passing | MERGED | 🟢 (squash, `ec72909`) |
| [#6](https://github.com/IshraqQureshi/automobile-marketplace/pull/6) | UI foundation + real brand assets + signup design fidelity (`feature/ui-foundation` → `main`) | 🟢 APPROVED by Code Review Agent (findings fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit/E2E/build all passing | MERGED | 🟢 (squash, `494ce9c`) |
| [#7](https://github.com/IshraqQureshi/automobile-marketplace/pull/7) | Day 1 follow-ups: real-time validation, confirm-password field, admin seed script, stats row (`feature/day1-followups` → `main`) | 🟢 APPROVED by Code Review Agent (1 HIGH — admin seed script had no local-only guard, fixed in `276230f` and re-verified — see PR comment) | 🟢 typecheck/lint/unit (103/103)/E2E (6/6)/build all passing | MERGED | 🟢 (squash, `e52e99c`) |
| [#8](https://github.com/IshraqQureshi/automobile-marketplace/pull/8) | Fraunces font for login/signup hero stats (`fix/stats-font` → `main`) | 🟢 APPROVED by Code Review Agent (no findings — see PR comment) | 🟢 typecheck/lint/unit (103/103)/E2E (6/6)/build all passing | MERGED | 🟢 (squash, `ccca821`) |
| [#9](https://github.com/IshraqQureshi/automobile-marketplace/pull/9) | Password eye icon, real password reset, registration confirmation email (`feature/auth-password-reset-and-eye-icon` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM — password toggle not keyboard-reachable, fixed in `6900bec` and re-verified; 1 LOW logged, non-blocking — see PR comment) | 🟢 typecheck/lint/unit (110/110)/E2E (9/9, real Mailpit-driven)/build all passing | MERGED | 🟢 (squash, `05b109f`) |
| [#10](https://github.com/IshraqQureshi/automobile-marketplace/pull/10) | Real SMTP (Mailtrap) for dev, E2E stays on local Mailpit (`feature/mailtrap-smtp-dev` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM — SMTP-toggle regex not bounded to its config section, fixed in `0f2a3cc` and re-verified — see PR comment) | 🟢 typecheck/lint/unit (110/110)/E2E (9/9, toggle verified both directions) all passing | MERGED | 🟢 (squash, `b39fa2f`) |
| [#11](https://github.com/IshraqQureshi/automobile-marketplace/pull/11) | Branded HTML email templates for auth emails (`feature/branded-email-templates` → `main`) | 🟢 APPROVED by Code Review Agent (no findings — Go template safety verified live via XSS-payload and nil-metadata tests against the real GoTrue instance, not assumed — see PR comment) | 🟢 typecheck/lint/unit (110/110)/E2E (9/9)/GoTrue template load all passing | MERGED | 🟢 (squash, `72c5e5a`) |
| [#12](https://github.com/IshraqQureshi/automobile-marketplace/pull/12) | Auth form field preservation, signup success UX, rate-limit message (`fix/auth-form-ux-and-rate-limit` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM — duplicate-email test missing an email-field value assertion, fixed in `cac5f62` and re-verified — see PR comment) | 🟢 typecheck/lint/unit (110/110)/E2E (10/10, 2 new tests)/rate-limit fix verified live all passing | MERGED | 🟢 (squash, `7da27ac`) |
| [#13](https://github.com/IshraqQureshi/automobile-marketplace/pull/13) | Separate admin login from customer/showroom login (`feature/admin-login-separation` → `main`) | 🟢 APPROVED by Code Review Agent (2 LOW, non-blocking, logged for future admin-route work — see PR comment) | 🟢 typecheck/lint/unit (110/110)/E2E (14/14, 4 new tests, run twice)/manual verification of all 6 scenarios all passing | MERGED | 🟢 (squash, `1f4d784`) |
| [#14](https://github.com/IshraqQureshi/automobile-marketplace/pull/14) | Real admin dashboard shell — sidebar, topbar, live stats (`feature/admin-dashboard-shell` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM — failed stat query looked identical to a genuine zero, fixed; 1 stale doc-comment path fixed; 1 LOW forward-looking note on nav active-state — see PR comment) | 🟢 typecheck/lint/unit (110/110)/E2E (14/14)/production build (all 12 routes resolve correctly) all passing | MERGED | 🟢 (squash, `3179cbc`) |
| [#15](https://github.com/IshraqQureshi/automobile-marketplace/pull/15) | Admin CRUD for Brands/Models(nested under Brand)/Vehicle Types catalog (`feature/admin-catalog-crud` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM — update/delete server actions didn't check affected row count, so an RLS-blocked or already-deleted write silently reported success, fixed via `.select("id")` + 0-row check on every catalog update/delete and re-verified; 1 LOW logged, non-blocking — see PR comment) | 🟢 typecheck/lint/unit (124/124, incl. 14 new RLS integration tests)/E2E (20/20, incl. 6 new admin-catalog tests)/production build all passing | MERGED | 🟢 (squash, `20f3d3c`) |
| [#16](https://github.com/IshraqQureshi/automobile-marketplace/pull/16) | Showroom registration, SHR-001/SHR-002 (`feature/showroom-registration` → `main`) | 🟢 APPROVED by Code Review Agent (1 HIGH — a total document-upload failure left an unrecoverable documentless PENDING showroom with no self-service fix, fixed via a service-role rollback delete for that one case + a new E2E assertion that documents actually persist, not just that the UI says so, re-verified; 2 LOW logged, non-blocking — see PR comment) | 🟢 typecheck/lint/unit (138/138, incl. 10 new schema tests + 4 new one-showroom-per-owner constraint tests)/E2E (25/25, incl. 5 new registration-flow tests)/production build all passing | MERGED | 🟢 (squash, `abc0275`) |
| [#17](https://github.com/IshraqQureshi/automobile-marketplace/pull/17) | Brand logo upload (`feature/brand-logo` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM — a successful upload followed by a failed DB update could orphan the file in Storage forever, fixed with a best-effort cleanup delete and re-verified; 2 LOW logged, non-blocking — see PR comment) | 🟢 typecheck/lint/unit (143/143, incl. 5 new brand-logos Storage RLS tests)/E2E (26/26, incl. 1 new upload/replace/remove test)/production build all passing | MERGED | 🟢 (squash, `981b44f`) |
| [#18](https://github.com/IshraqQureshi/automobile-marketplace/pull/18) | Professional visual redesign of the admin catalog page (`feature/catalog-ui-polish` → `main`) | 🟢 APPROVED by Code Review Agent (1 MEDIUM — the new shared `TagIcon` was a byte-for-byte duplicate of the sidebar's existing local `CatalogIcon`, fixed by having the sidebar reuse the shared one instead of maintaining a second copy, re-verified; 1 LOW logged, non-blocking — see PR comment) | 🟢 typecheck/lint/unit (143/143, unchanged)/E2E (26/26, unmodified test file — icon-only buttons kept identical `aria-label`s)/production build all passing | MERGED | 🟢 (squash, `3244700`) |
| [#19](https://github.com/IshraqQureshi/automobile-marketplace/pull/19) | Admin catalog interaction rework — full-width tabs, dialogs, toasts (`feature/catalog-tabs-dialogs-toasts` → `main`) | 🟢 APPROVED by Code Review Agent (1 HIGH — a live-reproduced Dialog focus-stealing bug broke typing in every create/edit form, fixed and re-verified; 1 MEDIUM — an open dialog's overlay could block a background tab reached via keyboard Tab navigation, fixed with a real focus trap plus per-tab dialog auto-close, re-verified — see PR comment) | 🟢 typecheck/lint/unit (143/143, unchanged)/E2E (26/26, full rewrite for the new dialog-based flow)/production build all passing | MERGED | 🟢 (squash, `047f1d2`) |
| [#20](https://github.com/IshraqQureshi/automobile-marketplace/pull/20) | Admin showroom approval workflow, SHR-003/ADM-002 (`feature/showroom-approval-admin` → `main`) | 🟢 APPROVED by Code Review Agent (1 LOW — a comment misattributed the approve/reject enforcement mechanism to RLS row-filtering instead of the actual `prevent_showroom_self_approval` trigger; not a functional bug, both rejection paths were already handled correctly, fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit (149/149, incl. 6 new signed-URL/approval integration tests)/E2E (30/30, incl. 4 new admin-showrooms tests, run both in isolation and in the full suite)/production build all passing | MERGED | 🟢 (squash, `c5fe362`) |
| [#21](https://github.com/IshraqQureshi/automobile-marketplace/pull/21) | Full admin showroom CRUD — create/edit/delete (`feature/showroom-admin-crud` → `main`) | 🟢 APPROVED by Code Review Agent (1 BLOCKER — the new owner-search Server Action used the service-role client with no authorization check of its own, letting any signed-in non-admin invoke it directly and receive other users' emails/names; fixed by checking the caller's own profile role first, and verified effective by literally reverting the fix and confirming the new E2E regression test fails, then restoring it and confirming green; 1 MEDIUM — the owner-search debounce could apply a stale, out-of-order response, fixed via a request-id ref — see PR comment) | 🟢 typecheck/lint/unit (155/155, incl. 6 new admin-CRUD RLS integration tests)/E2E (34/34, incl. 4 new/changed admin-showrooms tests — create, edit, delete, and the security regression test)/production build all passing | MERGED | 🟢 (squash, `96528ef`) |
| [#22](https://github.com/IshraqQureshi/automobile-marketplace/pull/22) | Create-showroom form: new/existing owner toggle + invite email + document upload (`feature/showroom-create-owner-invite-documents` → `main`) | 🟢 APPROVED by Code Review Agent (2 LOW — missing `required` attributes on the new-owner name/email fields and missing `aria-pressed` on the owner-mode toggle, both fixed and re-verified — see PR comment) | 🟢 typecheck/lint/unit (158/158, incl. 3 new admin-document-insert RLS integration tests)/E2E (36/36, incl. a real Mailpit-captured invite-link-to-account E2E test)/production build all passing | MERGED | 🟢 (squash, `20f99cb`) |
| [#23](https://github.com/IshraqQureshi/automobile-marketplace/pull/23) | Showroom review dialog redesign, inline document preview, logo (`feature/showroom-review-modal-and-logo` → `main`) | 🟢 APPROVED by Code Review Agent (1 LOW — an unused `"xl"` Dialog size variant with no caller anywhere, removed and re-verified; 1 informational/non-blocking note on a pre-existing, unchanged Content-Type-trust gap in document uploads — see PR comment) | 🟢 typecheck/lint/unit (163/163, incl. 5 new `showroom-logos` Storage RLS integration tests)/E2E (37/37, incl. an updated document-view test asserting no new tab opens and a new logo-upload test using real PNG bytes)/production build all passing | MERGED | 🟢 (squash, `8a0b9ce`) |
| [#24](https://github.com/IshraqQureshi/automobile-marketplace/pull/24) | Fix: real client-side validation on all admin CRUD forms (`fix/admin-crud-real-client-validation` → `main`) | 🟢 APPROVED by Code Review Agent (no findings — verified all four forms, confirmed no leftover debug logs, confirmed the new E2E assertions correctly use `.first()` for the banner/inline duplicate-message case — see PR comment) | 🟢 typecheck/lint/unit (163/163, unchanged)/E2E (40/40, incl. 3 new client-side-validation-blocks-submission tests)/production build all passing | MERGED | 🟢 (squash, `caed789`) |
| [#25](https://github.com/IshraqQureshi/automobile-marketplace/pull/25) | Fix: duplicate validation message + Dialog focus-steal + stale error state (`fix/admin-form-validation-duplicate-and-stale-state` → `main`) | 🟢 APPROVED by Code Review Agent (no findings — verified the Dialog focus-skip doesn't regress non-autoFocus dialogs, no reset()/blur race, no leftover banner/inline duplication, E2E assertions correctly dialog-scoped — see PR comment) | 🟢 typecheck/lint/unit (163/163, unchanged)/E2E (40/40, run twice, incl. strengthened toHaveCount(0)/(1) regression assertions)/production build all passing | MERGED | 🟢 (squash, `adadf77`) |
| [#26](https://github.com/IshraqQureshi/automobile-marketplace/pull/26) | Showroom-owner vehicle management, SHR-004..008 (`feature/vehicle-management` → `main`) | 🟢 APPROVED by Code Review Agent after one fix round (2 HIGH — `setPrimaryVehiclePhotoAction` was missing the `.select("id")` + 0-row check every other mutation in the file already follows, so a non-owned/gone media id was silently reported as success, fixed and re-verified; the Photos dialog stored a one-time snapshot of the vehicle object on open, which went stale after any photo mutation since `revalidatePath` refreshes the parent Server Component but not this component's own local state — fixed by deriving the dialog's vehicle from the live `vehicles` prop by id, verified live via Playwright; 3 MEDIUM/LOW — duplicated `getOwnerShowroom` calls across the layout and its child pages deduped via React `cache()`, a missing `vehicle_media` UPDATE ownership integration test and missing mark-sold/deactivate/set-primary E2E coverage added, missing onBlur validation wired for variant/color/description — all fixed and re-verified — see PR comments) | 🟢 typecheck/lint/unit (201/201, incl. 20 new schema tests + 8 new vehicle/vehicle_media RLS integration tests)/E2E (46/46, incl. 6 new `dashboard-vehicles.spec.ts` tests)/production build all passing | MERGED | 🟢 (squash, `1f4a0c9`) |
| [#27](https://github.com/IshraqQureshi/automobile-marketplace/pull/27) | Vehicle spec/financing fields, page-based form, dashboard chrome fix (`feature/vehicle-form-page-and-specs` → `main`) | 🟢 APPROVED by Code Review Agent after two fix rounds (round 1 — 2 HIGH: `doors`/`seats` schemas had no lower bound so `0` passed client validation and only failed at the DB's `between 1-10`/`1-20` check constraints as a generic error, fixed by adding `.min(1, ...)`; the pre-submit validation gate omitted every new field entirely, and four fields had schema validation with no onBlur/error UI at all, both fixed; 2 MEDIUM: the ~30-line DB-row→VehicleListItem mapping duplicated verbatim across the list and edit pages, factored into one shared `vehicleRowToListItem()` + `VEHICLE_SELECT_COLUMNS`; missing doors/seats-zero and make-not-in-catalog test coverage, added — round 2 — 1 HIGH, a regression introduced by round 1's own fix: financing fields were now validated unconditionally even though their inputs/errors live in a section that unmounts when "Available on installment" is unchecked, so a leftover invalid value silently blocked Save with no visible error anywhere — fixed at both the client (skip validating hidden fields) and server (`readVehicleFormData` blanks financing fields server-side whenever `installmentEnabled` is false, so a direct action call can't bypass it either) — see PR comments) | 🟢 typecheck/lint/unit (206/206, incl. 8 new schema tests)/E2E (50/50, run three times with no flakes, incl. 4 new `dashboard-vehicles.spec.ts` tests)/production build all passing | MERGED | 🟢 (squash, `395c859`) |
| [#28](https://github.com/IshraqQureshi/automobile-marketplace/pull/28) | Fix: vehicle form action bar overlap + missing New-page gallery placeholder (`fix/vehicle-form-overlap-and-missing-gallery` → `main`) | 🟢 APPROVED by Code Review Agent (no findings — minimal, surgical 2-file diff exactly matching the described fix, reproduced live via full-page screenshots before and after) | 🟢 typecheck/lint/unit (206/206, unchanged)/E2E (50/50, unchanged)/production build all passing | MERGED | 🟢 (squash, `7c01299`) |
| [#29](https://github.com/IshraqQureshi/automobile-marketplace/pull/29) | Fix: photo upload body-size limit + Deposit field width overlap (`fix/vehicle-upload-size-limit-and-deposit-field-width` → `main`) | 🟢 APPROVED by Code Review Agent (no BLOCKER/HIGH — 2 MEDIUM/LOW noted as non-blocking follow-ups, not required fixes: the global `bodySizeLimit` increase modestly widens the app's request-size surface with no rate limiting anywhere to compensate, worth a tracked hardening item before production rather than dismissing as zero-risk; the new bounding-box regression test uses an arbitrary low threshold and only runs at one viewport — see PR comment) | 🟢 typecheck/lint/unit (206/206, unchanged)/E2E (51/51, run twice with no flakes, incl. 1 new large-file-upload test)/production build all passing | MERGED | 🟢 (squash, `b85a497`) |
| [#30](https://github.com/IshraqQureshi/automobile-marketplace/pull/30) | Add a Status field to the vehicle create/edit form (`feature/vehicle-status-field-on-form` → `main`) | 🟢 APPROVED by Code Review Agent after one fix round (1 HIGH — the edit form compared `form.status` against the `initialValues` prop, frozen at page-load time since neither `updateVehicleAction` nor `updateVehicleStatusAction` triggers a navigation/refresh, so a second status change in the same visit (no reload in between) compared against the stale original status instead of the just-persisted one — e.g. Published → Save (persists), then Draft → Save again silently skipped the revert while still showing "Vehicle updated." — fixed by tracking a `lastKnownStatus` local state updated only after a successful status change, re-verified with a two-consecutive-saves regression test — see PR comments) | 🟢 typecheck/lint/unit (206/206, unchanged)/E2E (53/53, run twice with no flakes, incl. 2 new Status-field tests)/production build all passing | MERGED | 🟢 (squash, `58ac5d0`) |

---

# Blockers

| ID | Blocker | Impact | Owner | Status |
| -- | ------- | ------ | ----- | ------ |
| B-001 | Meta Business Manager verification + WhatsApp Cloud API template approval not yet started | NTF-002 is now P0; Meta approval lead time is outside dev control and could block Day 5 if not started Day 1 | Client (access) + Full-Stack Agent (integration) | ⬜ Not started |
| B-002 | ~~Figma/Figma Make access not yet confirmed available~~ | Resolved 2026-09-04: Figma Make view-only link isn't fetchable (JS-rendered SPA), but client supplied 7 static screen exports in `/design` (homepage, car-detail, showroom-detail, login-page, register-as-a-showroom, register-individual-seller, ready-to-sell). Screens not covered by an export must be built following the same branding (teal `#2f6f68`-ish primary, dark navy/charcoal nav+footer, serif display headlines, sans-serif body) per user instruction 2026-09-04. | Client / Frontend Agent | 🟢 Resolved |
| B-003 | Original client requirements review found the Proposal doc (`Automotive_Marketplace_Proposal (2).docx`) is missing body content for Sections 10, 12–14, 16–17 (Monetization, Tech Stack, Hosting, Cost, Dev Phases, Assumptions) — headings exist in the TOC but no text follows in the extracted document | Cannot independently verify the client's own document specifies Next.js/Supabase/Vercel; currently relying on `CLAUDE.md`/Scope doc only | Client (re-supply complete doc if available) | ⬜ Not started |
| B-004 | ~~`main` branch protection (required PR review) couldn't be satisfied — GitHub blocks an account from approving its own PR, and this repo currently has one collaborator~~ | Resolved 2026-09-04: branch protection removed by repo owner to unblock merging PR #1. Still enforced in practice: no direct commits to `main` for feature work (git-pr workflow followed manually); Code Review Agent verdicts recorded as PR comments instead of formal GitHub approvals. Revisit real branch protection (PR required, 0 approvals) once decided whether to add a second collaborator or accept comment-based review as the standing process. | Client / repo owner | 🟢 Resolved (process, not tooling) |
| B-005 | No real Google OAuth credentials (client ID/secret) available for AUTH-002 | `supabase/config.toml` has `auth.external.google` wired and `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`/`_SECRET` are ready in `.env.example`, but empty — email/password auth works fully, but the "Continue with Google" button fails at click-time until real credentials exist. See `.env.example` for the Google Cloud Console setup needed (redirect URI: `http://127.0.0.1:54321/auth/v1/callback` for local dev). | Client (create a Google Cloud OAuth 2.0 Client ID) | ⬜ Not started |
| B-006 | No real legal content (Terms of Service, Privacy Policy, Cookie Policy) supplied yet | The signup form requires agreeing to Terms/Privacy before account creation (matches `design/signup-page.png`), and the footer links to all three — real pages exist at `/terms`, `/privacy`, `/cookie-policy` but show an honest "placeholder, not final" notice rather than fabricated legal text. Was already flagged generically in the original Proposal's "Client Requirements / Access Needed" list; this is the concrete point it starts blocking real functionality. | Client / legal counsel | ⬜ Not started |
| B-007 | No production SMTP credentials yet — local/staging dev uses a Mailtrap sandbox inbox (`supabase/config.toml` `[auth.email.smtp]`, credentials in gitignored `.env.local`), which only ever delivers to Mailtrap's own inbox, never real recipients | Confirmation and password-reset emails work end-to-end in dev via Mailtrap, but production needs real SMTP or no user will ever receive an actual email. Client has said they'll supply Google Workspace SMTP details when ready — swap `supabase/config.toml`'s `host`/`port`/`user`/`pass` (env-var-backed) to those values then. | Client (provide Google SMTP credentials) | ⬜ Not started |
| B-008 | PR #29 raised every Server Action's request body cap app-wide from Next.js's 1MB default to 20MB (`next.config.ts`'s `experimental.serverActions.bodySizeLimit`) to fix real photo-upload failures — the only mechanism Next.js exposes for this is global, not per-action. Code Review Agent flagged (non-blocking) that this modestly widens the request-size/resource-exhaustion surface with no rate limiting anywhere in the app to compensate | Not a functional bug — a deliberate, necessary trade-off for file uploads to work at all — but worth a real look before production: either app-level rate limiting, or push large uploads to signed direct-to-Storage URLs instead of routing file bytes through a Server Action at all | Security Agent / Full-Stack Agent (Day 5 hardening pass) | ⬜ Not started |

---

# Decisions / Changes

Record important scope or architectural decisions here.

| Date | Decision | Reason |
| ---- | -------- | ------ |
| 2026-09-03 | Finance calculator (MKT-008) is per-listing configured, not generic — showroom sets down payment %, interest rate, loan tenure options, financing partner per vehicle | Matches client's original Proposal §4.4/§5.2; `vehicles` schema updated with financing fields |
| 2026-09-03 | `system_settings` table kept in MVP scope | Low incremental cost alongside FND-003; useful scaffolding despite not being explicitly requested |
| 2026-09-03 | Manual payment entry (ADM-006) kept in MVP as P1 | Simple to build; useful even without automated billing, despite absence from client-facing scope docs |
| 2026-09-03 | WhatsApp Cloud API notifications (NTF-002) upgraded P1 → P0 | Sold as flat MVP-week deliverable in client Scope doc; Meta approval is an external dependency (see B-001) |
| 2026-09-03 | Bulk vehicle import (SHR-009) upgraded P1 → P0 | Sold as flat MVP-week deliverable in client Scope doc |
| 2026-09-03 | Showroom reschedule (APT-008) upgraded P1 → P0 | Sold as flat MVP-week deliverable in client Scope doc |
| 2026-09-03 | Showroom ratings/reviews, saved-search alerts, and sell/trade-in appraisal confirmed as Phase 2 (not MVP) | Absent from/explicitly deferred in client Scope doc; added to `MVP_REQUIREMENTS.md` §22/§23 Phase 2 boundary |
| 2026-09-03 | Interactive location map deferred to Phase 2; MVP shows text address only | Avoids adding Google Maps credentials as a Day-1 external dependency |
| 2026-09-04 | "Individual Seller" role (found in `/design/ready-to-sell.png`) deferred to Phase 2 — MVP is showroom-only | Not in any requirements doc; avoids adding a 4th role/RLS surface mid-plan under the 1-week timeline |
| 2026-09-04 | Google OAuth login built for MVP alongside email/password | Low incremental cost via Supabase Auth's built-in provider; design shows it as primary login method |
| 2026-09-04 | "Send Message" CTA built as a one-way vehicle inquiry form (new `vehicle_inquiries` table, feature MKT-010), not live chat | Matches the design without violating the "no real-time chat" MVP non-goal |
| 2026-09-04 | Finance calculator extended with insurance % and tracker subscription options (`vehicles.financing_insurance_percent`, `financing_tracker_options`) | Matches the actual design's Estimate Summary |
| 2026-09-04 | Showroom subscription pricing (KSh 60,000/quarterly) shown as informational copy only, no billing logic | Registration still uses the existing manual admin-approval flow |
| 2026-09-04 | Star rating in vehicle-detail "Sold By" card and showroom detail omitted from MVP UI | No reviews table/data exists for MVP; avoids showing fake data |
| 2026-09-04 | Homepage "Watch & Discover" (TikTok) / "Reviews & Guides" (YouTube) sections built as static, manually-curated embeds | Matches the design without requiring live API integration |
| 2026-09-04 | FND-001 stack pins: Next.js 16 (App Router), React 19, TypeScript ^5.7 (deliberately not the newly-released TS 7 — avoids ecosystem/tooling breakage on a foundational dependency), Tailwind CSS v4, ESLint 9 flat config via `eslint-config-next`'s native flat exports (not `FlatCompat`, which throws on this eslint-config-next/eslint combination), Vitest for unit tests, Playwright for E2E | Verified via `npm run typecheck/lint/test/build` and `npm run test:e2e`, all passing |
| 2026-09-04 | Disabled Next.js 16's new auto-generated root `AGENTS.md`/`CLAUDE.md` (`agentRules: false` in `next.config.ts`) | It collided with the project's real engineering constitution at `.claude/CLAUDE.md` |
| 2026-09-04 | `main` branch protection removed by repo owner | Unblocked merging PR #1 given the self-approval limitation (B-004) |
| 2026-09-04 | FND-002: migrated `middleware.ts` to Next.js 16's `proxy.ts` convention via the official `@next/codemod` | `middleware.ts` printed a deprecation warning on build; not worth shipping new code against a convention already being replaced |
| 2026-09-04 | FND-002: `.env.local` populated from local Supabase (`npx supabase status`), not the linked remote project | Matches "local development" scope for FND-002; production/staging Supabase credentials are a deployment-time concern, not Day 1 |
| 2026-09-04 | FND-003: RLS, storage buckets/policies, and `system_settings` seed data deferred to FND-004 (not included in the schema PR) | Matches `FEATURE_IMPLEMENTATION_PLAN.md`'s dependency graph (FND-003 → FND-004) and its own release-blocking gate for RLS |
| 2026-09-04 | FND-003: `validate_appointment_vehicle_showroom` and `set_vehicle_inquiry_showroom` triggers made `security definer` | Code review caught that, without it, these triggers' internal lookups would silently misbehave once FND-004 enables RLS (would run under the calling user's row visibility instead of an unrestricted view) |
| 2026-09-04 | FND-004: RLS enabled on all 15 tables, storage bucket policies added, 36 `system_settings` values seeded | Release-blocking security gate per `FEATURE_IMPLEMENTATION_PLAN.md` |
| 2026-09-04 | FND-004: `vehicles`/`vehicle_media` public-visibility policies require the parent showroom to be `APPROVED`, not just the row's own `status = 'ACTIVE'` | Caught before testing even started, while reasoning through test fixtures — a vehicle from a still-pending showroom must not be publicly visible |
| 2026-09-04 | FND-004: `is_admin()` extended to recognize `auth.role() = 'service_role'` | The service-role JWT has no `sub` claim, so `auth.uid()` is NULL for it — this silently blocked the admin client itself from the `prevent_showroom_self_approval` trigger, since ordinary triggers don't get the `BYPASSRLS` treatment RLS policies do |
| 2026-09-04 | FND-004: 5 INSERT-time privilege-escalation bugs fixed (2 BLOCKER: showrooms/showroom_documents self-approval at insert; 2 HIGH: appointments self-confirmation, profiles self-reactivation after admin deactivation; 1 MEDIUM: vehicle_imports fabricated success) | Code review found these by checking every `WITH CHECK` clause against every column, not just the ownership condition — none of the original 81 tests probed field-level boundaries on INSERT |
| 2026-09-04 | AUTH-001/002: base design tokens (teal `#2f6f68`-ish brand color, dark `--color-ink` bg, serif display font stack) established in `globals.css`, first used on `/login` | Approximated from `/design/login-page.png` (no Figma Dev Mode access — B-002); MKT-001 and later pages reuse these same tokens rather than re-deriving them |
| 2026-09-04 | AUTH-001/002: homepage stats row ("12,400+ cars listed", "800+ dealers", "47 cities") from the login design was deliberately omitted from the built page | Those are placeholder mockup numbers, not real data — a fresh MVP launch has ~0 real listings; showing fabricated stats would be actively misleading, not just an approximation |
| 2026-09-04 | AUTH-001/002: full Brands/Model/Type footer link lists from the design were omitted; a minimal copyright-only footer was built instead | No real vehicle taxonomy/category data exists yet to back those links — building them now would mean hardcoding fake navigation, deferred to when MKT-001 has real data |
| 2026-09-04 | AUTH-002: `auth.external.google` added to `supabase/config.toml` (enabled, env-var credentials) even though no real Google OAuth credentials exist yet | Verified `supabase start` tolerates empty credential env vars without breaking the rest of the local stack; keeps the config ready to activate the moment real credentials are supplied (B-005), rather than needing a second migration/config PR later |
| 2026-09-04 | AUTH-002: `signOutAction` now checks and surfaces a failed `supabase.auth.signOut()` instead of redirecting to `/login` unconditionally | Code review found that silently redirecting on failure would let a user believe they'd logged out (e.g. on a shared device) while the session cookie could still be valid |
| 2026-09-04 | UI Foundation: Header/Footer built matching the design, using the real logo/hero photo supplied in `real-assets/` (copied into `public/`, `real-assets/` itself gitignored to match the `/design` pattern) | Direct user feedback — header/footer weren't matching the design, and real brand assets existed but weren't being used |
| 2026-09-04 | Header's Brands/Model/Type nav dropdowns and search icon built as visually-present but inert (disabled, "coming soon" tooltip) | No vehicle taxonomy or search exists yet (MKT-001/002/003); matches design fidelity without faking functionality |
| 2026-09-04 | Footer's Brands/Model/Type link lists and social icons rendered as static text, not real links | No real taxonomy/social-account data exists yet — avoids dead or misleading links while still matching the design's visual structure |
| 2026-09-04 | Signup form updated to match `design/signup-page.png` (not previously reviewed): added phone number (+254 prefix) and a required Terms/Privacy agreement checkbox | Design review gap — this design file wasn't available/checked during the original AUTH-001/002 build |
| 2026-09-04 | `handle_new_user` (FND-003) extended via a new migration to also capture `phone` from signup metadata | Phone isn't a privilege field (unlike `role`), so trusting it from client-supplied signup metadata carries no escalation risk |
| 2026-09-04 | Minimal stub pages built for `/terms`, `/privacy`, `/cookie-policy` — honest "placeholder" notices, not fabricated legal text | Signup checkbox and footer need real destinations; real content is blocker B-006 |
| 2026-09-05 | User feedback after Day 1 review: added real-time/inline field validation (`use-field-validation.ts`, validates on blur against the same zod schemas the server action uses), a confirm-password field, and visible password requirements text to the auth forms | Previously, form errors only appeared after a full submit + server round-trip; native `required` was the only pre-submit feedback |
| 2026-09-05 | Added `scripts/seed-admin.mjs` (`npm run seed:admin`) — creates or promotes an ADMIN user via the service-role client, generates a random password if none supplied, never hardcodes/commits credentials | User feedback: no way existed to get an admin account into the system at all, despite `DATABASE_MIGRATION_PLAN.md` §43 explicitly requiring a controlled bootstrap process (not a hardcoded migration password) — this was the missing piece |
| 2026-09-05 | Reinstated the login/signup hero panel's stats row ("12,400+ Cars listed / 800+ Verified dealers / 47 cities Across Kenya"), previously omitted on 2026-09-04 as fabricated-looking mockup numbers | Explicit user instruction to match the design as shown. Still logged here for traceability: these are the design mockup's own illustrative figures, not numbers backed by real platform data |
| 2026-09-05 | PR #7 code review found `scripts/seed-admin.mjs` had no technical guard against running against a non-local Supabase project (only a post-hoc warning) — fixed by refusing to run unless the URL is `localhost`/`127.0.0.1`, with an `ADMIN_SEED_ALLOW_REMOTE=true` override required otherwise | Script grants ADMIN via the service-role key; a misconfigured `.env.local` could otherwise silently create a live production admin account |
| 2026-09-05 | Login/signup hero stats figures (12,400+ / 800+ / 47 cities) now render in Fraunces (self-hosted via `next/font/google`), scoped only to those three values — the site-wide `--font-display` token is unchanged | Explicit user instruction: `('Fraunces', Georgia, serif)` for those figures specifically |
| 2026-09-05 | User feedback: added a show/hide (eye icon) toggle to every password field, built a real password-reset flow (`/forgot-password` → emailed link → `/reset-password`), and enabled real registration-confirmation emails (`supabase/config.toml` `auth.email.enable_confirmations` flipped to `true`) | Previously the "Forgot password?" link was an inert placeholder, password fields had no visibility toggle, and `enable_confirmations = false` meant signup never actually sent an email in local dev |
| 2026-09-05 | `supabase/config.toml` `auth.additional_redirect_urls` widened from a single exact `https://127.0.0.1:3000` entry to `["http://127.0.0.1:3000/**", "http://localhost:3000/**"]` | Needed so GoTrue accepts the `redirectTo`/`emailRedirectTo` URLs used by the new password-reset and email-confirmation flows regardless of which host the dev server is accessed through; the prior single `https` entry didn't match either |
| 2026-09-05 | ~~Found while writing E2E coverage for the new double-submit login scenario: React resets all uncontrolled fields in a `useActionState` form after every dispatch~~ | Resolved 2026-09-05: user reported the exact symptom independently ("server error empties the form; re-checking terms then submits an empty form"). Fixed by converting every login/signup field to controlled state — see the entry below. |
| 2026-09-05 | User feedback (three issues): (1) duplicate-email signup showed a raw "email rate limit exceeded" message instead of a proper "already exists" message; (2) after successful signup the form should stay visible with a reset state and a thank-you message, not be replaced by one; (3) after any server error the form goes partially empty, and re-checking the terms box then submits an effectively-empty form | User: "When user using same registered email error message should be proper... When user signup the form should be visible and thank you message should show and form state should be reset... When any server error happen form partial get empty and again submitting show terms field agree when selecting it empty form is submitting" |
| 2026-09-05 | Root cause for (1): `[auth.rate_limit] email_sent = 2`/hour in `supabase/config.toml` only became a *real* constraint once real SMTP was enabled (PR #10) — confirmed via GoTrue's own logs showing a genuine `429 over_email_send_rate_limit` on an actual signup attempt. Fixed by raising it to 30/hour for local/staging dev (Mailtrap-sandboxed, no real-recipient risk) and by having `signUpAction` catch that specific error code and return a friendly "we're sending a lot of emails, try again shortly" message instead of leaking GoTrue's raw text — verified live by temporarily dropping the limit to 1 and triggering the real 429 | Root-caused via GoTrue's actual audit log, not guessed |
| 2026-09-05 | Root cause for (2) and (3): all signup/login fields were uncontrolled inputs; React calls the DOM form's native `reset()` after every `useActionState` dispatch (success *or* failure), silently wiping every field regardless of which one the error was actually about. Fixed by converting every field (including the terms checkbox) to controlled React state — fields now persist across a failed submission, and are explicitly cleared (with the success banner shown, form kept visible) only on genuine success | Confirmed via direct testing that this is React's actual documented action-form behavior, not a bug specific to this codebase |
| 2026-09-05 | The terms checkbox needed an extra fix beyond just "make it controlled": React's native `form.reset()` still force-unchecks it in the DOM, and because the *React-side* `checked` prop value doesn't itself change on a failed submission, React skips re-applying it — checkbox and state silently desync. Fixed by keying the checkbox on a counter that increments every dispatch, forcing a fresh DOM node each time | Found via a failing E2E assertion (`toBeChecked()` after a failed submission), not caught by code review alone — reinforces why the value-preservation behavior needed real test coverage, not just visual inspection |
| 2026-09-05 | Wired up real SMTP (Mailtrap sandbox) for local/staging dev per user instruction — `supabase/config.toml` `[auth.email.smtp]` enabled, credentials in gitignored `.env.local` (`MAILTRAP_SMTP_USER`/`_PASS`, placeholders in `.env.example`). Production will use client-supplied Google SMTP later — see blocker B-007 | User: "for dev we can use mailtrap but for production i will provide the google smtp details" |
| 2026-09-05 | Real SMTP broke the E2E suite's email-fetching (it read from local Mailpit, which stops receiving mail once external SMTP is enabled). User explicitly declined wiring E2E to Mailtrap's own API. Fixed via `scripts/test-e2e.mjs`: `npm run test:e2e` now temporarily disables SMTP, restarts the local Supabase stack, runs Playwright against Mailpit, then always restores the Mailtrap config afterward (even on test failure) | Keeps E2E fast/offline (no external network dependency, no Mailtrap API token needed) while still giving the developer real-looking emails via Mailtrap during normal manual dev use |
| 2026-09-05 | Built branded HTML templates (`supabase/templates/*.html`, generated from `scripts/generate-email-templates.mjs`) for 6 Supabase Auth email types: `confirmation`, `recovery`, `email_change`, `invite`, `password_changed_notification`, `email_changed_notification`. Deliberately did NOT template the phone/SMS/MFA notification types (`phone_changed_notification`, `mfa_factor_enrolled/unenrolled_notification`) — phone auth and MFA are both disabled in `config.toml` (`auth.sms.enable_signup = false`, `auth.mfa.*.enroll_enabled = false`) and have zero chance of firing in this app | User: "design the email template according to the branding for all the emails current and future" — scoped to email types this app's actual auth configuration (email/password + Google OAuth) can realistically trigger, not GoTrue's full generic template catalog, per CLAUDE.md's "do not implement functionality that is not required" |
| 2026-09-05 | Added a fully separate admin login surface: `/admin/login` + `/admin` (minimal protected landing stub — not the real Day 2 "admin dashboard foundation" item, just enough for the login flow to land somewhere). `signInAction` (customer/showroom, `/login`) now rejects ADMIN accounts after successful auth (generic "Invalid email or password", not a role-revealing message); `adminSignInAction` (new, `src/features/admin/actions.ts`) rejects non-ADMIN accounts the same way. Both sign the wrong-role session back out immediately | User: "super admin should have a seprate login this login works for only showroom owner and customer only" |
| 2026-09-05 | Found while writing E2E coverage for the admin-login separation: every `supabase.auth.signOut()` call in the codebase (signOutAction, adminSignOutAction, and the two new wrong-role rejection paths) was using supabase-js's default **global** scope — meaning a rejected login attempt (or a normal "Log out" click) invalidated *every* session that account had on *every* device, not just the current one. Fixed all four call sites to `signOut({ scope: "local" })` | Found via a real, consistently-reproducible E2E failure (not a flake) — a rejected admin-login-attempt test was killing a *different* test's legitimate admin session when both ran in parallel, which is exactly the real-world scenario (a mistaken/malicious login attempt on the wrong surface silently logging out someone's active session elsewhere) |
| 2026-09-05 | Built a real admin dashboard shell — sidebar nav (real logo, `Dashboard` link, `Showrooms`/`Vehicles`/`Users` rendered inert with the same "Coming soon" treatment as the public header's Brands/Model/Type — those pages don't exist until Day 2/4), topbar, and a dashboard page with 4 real stat tiles (`showrooms`/`vehicles`/`profiles` counts — genuinely 0/0/0/111 right now, not fabricated) and honest empty states for "Pending approvals"/"Recent activity" (no submission flow or activity-log writer exists yet to populate them) | User approved a design-preview artifact first ("good go with this layout this is perfect"), then asked to build it for real. Deliberately did not fabricate example rows (Coastal Motors Ltd etc. from the preview) into production code — those were explicitly for design-preview purposes only |
| 2026-09-05 | Found while building the admin shell: the public `Header`/`Footer` were leaking into `/admin/*` pages, because they lived in the app-wide root layout (`src/app/layout.tsx`), which every route inherits by default. Fixed by moving all existing public routes (`/`, `/login`, `/forgot-password`, `/reset-password`, `/account`, `/terms`, `/privacy`, `/cookie-policy`) into a new `(site)` route group with its own layout carrying `Header`/`Footer`; the root layout is now just `<html>/<body>`, so `/admin/*` no longer inherits site chrome. Route groups don't affect URLs — confirmed via a full production build that every route still resolves to its original path | Real regression caught via direct browser testing before merge, not assumed fixed — `git mv` used to preserve file history for the moved routes |
| 2026-09-05 | The sitewide `not-found.tsx`/`loading.tsx`/`error.tsx` at the app root now render without `Header`/`Footer` for public routes too (previously always wrapped, since the old root layout wrapped everything) — deliberately not fixed with a duplicate `(site)`-scoped not-found page, since a minimal/bare 404 or loading state is a common, reasonable pattern and doing so would duplicate the file for marginal benefit | Judgment call, not an oversight — documented here so it doesn't get mistaken for one later |
| 2026-09-05 | Built `/admin/catalog` — admin CRUD for a vehicle taxonomy (Brands, Models nested under a Brand, Vehicle Types), ahead of the Day 2 vehicle-add flow it feeds | User: "also Brands, Model and Type Crud include as this is required for showrooms to add vehicles." Clarified via `AskUserQuestion`: Models nested under Brands (not a flat list); seeded with the same brands/models/types already shown as static placeholder text in the public header nav |
| 2026-09-05 | Catalog seed data corrects one factual error from the header's original placeholder list: "Supra GR" was positioned next to Porsche, but the Supra is a Toyota model — seeded under Toyota instead. Porsche seeded with zero models rather than inventing one | Caught while writing the seed migration; documented directly in the migration's own header comment for traceability |
| 2026-09-05 | Found while building the catalog page: a plain closure prop (e.g. a per-row confirm-delete message built as a function) cannot be passed from a Server Component to a Client Component in Next.js — only Server Actions or serializable data can cross that boundary. Fixed by passing a plain string (`deleteWarning?: string`) instead, with the message built inside the Client Component | Self-discovered and self-fixed during implementation, before ever reaching a runtime error in a test or by the user |
| 2026-09-05 | Found while writing E2E coverage for the catalog page: the Models list row shows its brand's name as visible meta text, so a bare `getByText(brandName)`/`li[hasText=brandName]` locator matched both the Brands list row and any Models row for that brand — a real test-locator bug (too broad a selector), not an app bug. Fixed by adding `data-testid` scoping (`catalog-list-brands`/`catalog-list-models`/`catalog-list-types`) to each CRUD card and scoping every E2E lookup to its own card | Caught via a genuine Playwright strict-mode-violation failure during the mandatory pre-PR E2E run, not assumed passing |
| 2026-09-05 | Found while writing E2E coverage: `admin-catalog.spec.ts` and `admin-auth.spec.ts` originally shared the exact same fixture admin email/password. Playwright runs spec files concurrently in separate workers, and one file's `beforeAll` resetting that shared account's password could invalidate a session the other file had just logged in with — a real cross-file race, reproduced live in a full-suite run (isolated single-file runs passed). Fixed by giving `admin-catalog.spec.ts` its own dedicated fixture account | Reproduced by running the full E2E suite (not just the new file in isolation) as required before opening the PR — the race only showed up under the full suite's parallel worker execution |
| 2026-09-05 | Code review (PR #15) found `update`/`delete` catalog server actions didn't check affected row count. Postgres RLS's `USING` clause silently filters rows on UPDATE/DELETE (unlike INSERT's `WITH CHECK`, which raises a real error) — an RLS-blocked or already-deleted row would return 0 rows changed with no error, so the action reported `{}` (success) even though nothing happened. Fixed by chaining `.select("id")` on every catalog update/delete and returning an error when the result is empty | Independent Code Review Agent finding, not self-caught during implementation — verified via the full test suite re-passing after the fix |
| 2026-09-05 | Built the showroom registration flow (SHR-001/SHR-002): `/ready-to-sell` chooser page (Individual Seller card shown but inert, per the confirmed Phase 2 deferral) → `/register-showroom` form (business name, license/registration document upload, location, business phone/email) → `registerShowroomAction`. Added a `showrooms_owner_user_id_active_unique` partial unique index (one PENDING/APPROVED/SUSPENDED showroom per owner; REJECTED doesn't block re-registration) and a "Sell your car" header link, since the flow was otherwise unreachable without typing the URL | User: "Now whats next?" → Day 2 plan's "Create showroom" |
| 2026-09-05 | Design adaptation: the mockup (`design/register-as-a-showroom.png`) shows one "Contact" field, but `showrooms.phone`/`showrooms.email` are both `NOT NULL` and distinct from the owner's personal contact info — split into separate "Business phone" (same Kenyan-number UX as signup) and "Business email" (prefilled from the account's email, editable) fields | Documented adaptation, not a silent deviation — schema correctness took priority over reproducing a single ambiguous mockup field literally |
| 2026-09-05 | Extracted the Kenyan-phone-number zod schema and the `fieldErrorsFrom()` helper out of `src/features/auth/schemas.ts` into `src/lib/validation/kenya-phone.ts` and `field-errors.ts` so the showroom feature (and future ones) can reuse them without an auth-specific import; `auth/schemas.ts` re-exports `fieldErrorsFrom` so existing importers are unaffected | Avoided duplicating validation logic per CLAUDE.md §14 DRY rules |
| 2026-09-05 | Found while writing E2E coverage: `registerShowroomAction` originally called `revalidatePath("/register-showroom")` on success, which immediately re-renders the parent Server Component — since the showroom row already exists by then, it finds it and swaps the registration form out for the page's "already registered" status card *before the client ever renders* the `useActionState` success message, silently discarding it (including any partial-upload-failure warning). Fixed by removing the `revalidatePath` call — the next real navigation to the page picks up the new showroom naturally, since it's a dynamically-rendered route | Caught via a genuine, reproducible Playwright failure during this PR's own mandatory pre-PR E2E run, not assumed passing |
| 2026-09-05 | A pre-existing fixture in `schema.integration.test.ts` (FND-003) created two showrooms under the *same* owner to test vehicle-inquiry-showroom derivation. The new one-showroom-per-owner unique index broke that fixture; fixed by giving the second showroom a distinct owner account | Regression caught by the full test suite, not assumed unaffected — this project's mandatory pre-PR verification pass exists precisely to catch this kind of cross-feature interaction |
| 2026-09-05 | Found while running the full E2E suite (not just the new file in isolation): `e2e/showroom-registration.spec.ts`'s 5 tests all share one fixture customer account and mutate the same `showrooms` row via `afterEach` cleanup — under Playwright's project-wide `fullyParallel: true` default, two of this file's own tests raced each other (one test's cleanup deleting a showroom another concurrently-running test had just inserted as its own setup). Fixed via `test.describe.configure({ mode: "serial" })`, forcing this file's tests to run one at a time | Reproducible only under the full 4-worker suite, not in single-file isolation — reinforces why the mandatory workflow re-runs the *full* E2E suite before every PR, not just the new spec file |
| 2026-09-05 | Code review (PR #16) found that if *every* uploaded document failed (e.g. a transient Storage error), `registerShowroomAction` still reported success, leaving the applicant with a documentless PENDING showroom they had no way to fix themselves (RLS's `showrooms_delete_admin_only` means only an admin can delete it, and there's no "add documents later" UI yet) — the new one-showroom-per-owner constraint would then block any clean retry. Fixed by rolling the showroom row back via the service-role client for that one specific case (0 of N documents succeeded) and returning a real error instead; also added a real assertion (via the service-role client) that a submitted registration's `showroom_documents` row actually exists, since nothing previously checked beyond the UI's own success message — exactly the gap that let this bug go unnoticed | Independent Code Review Agent finding, not self-caught during implementation — verified via the full test suite (including a new E2E document-persistence assertion) re-passing after the fix |
| 2026-09-05 | Noted but deliberately not fixed in PR #16: the site header shows "Log in"/"Sign up" even when the visitor is already authenticated — the `Header` component has no session-awareness anywhere on the site today, not something this PR introduced. Logged here rather than fixed incidentally, since it's a pre-existing, site-wide gap better addressed holistically (e.g. alongside a real account-menu / customer dashboard) than patched piecemeal inside an unrelated feature PR | Judgment call to keep PR scope focused, per CLAUDE.md §5/§25 scope-control rules — not an oversight |
| 2026-09-05 | Added an optional logo to each Brand in the admin catalog (PR #17): a new public `brand-logos` Storage bucket (admin-only write, matching the `brands` table's own RLS), `brands.logo_storage_path` (bucket-relative path, same convention as `vehicle_media.storage_path` — public URL built at render time via `getPublicUrl()`), and a dedicated `CatalogBrandsList` component (same reasoning as why Models needed its own component) | User: "Brand will have the logo also" |
| 2026-09-05 | `createBrandAction`/`updateBrandAction` switched from plain string arguments to `FormData` so they can carry an optional logo file alongside the name — only these two catalog actions changed; Models/Vehicle Types actions are untouched | Necessary to support a file upload through a Server Action; kept scoped to the two actions that actually need it |
| 2026-09-05 | Code review (PR #17) found `uploadBrandLogo` could orphan a file in Storage forever: it uploads the file, then updates `brands.logo_storage_path` in a separate call — if that second call failed, the file stayed in the bucket with nothing ever referencing or cleaning it up (a retry generates a fresh random path, so the orphan could never become reachable again). Fixed with a best-effort cleanup delete of the just-uploaded file in that failure branch | Independent Code Review Agent finding, not self-caught during implementation — verified via the full test suite re-passing after the fix |
| 2026-09-05 | Found while adding the brand-logo E2E test: `admin-catalog.spec.ts` (unlike `showroom-registration.spec.ts`, fixed earlier the same day) didn't yet run its tests serially, and a 7th test shifted worker distribution enough to trigger the same latent cross-worker `beforeAll` password-reset race — two workers concurrently resetting the shared fixture account's password invalidated each other's logins. Fixed with the same `test.describe.configure({ mode: "serial" })` applied to `showroom-registration.spec.ts` | Reproduced via the mandatory full-suite E2E run before opening PR #17, not assumed unaffected just because the isolated single-file run passed |
| 2026-09-05 | Redesigned the admin catalog page's visual treatment (PR #18): shared building blocks in a new `catalog-ui.tsx` (icon-badged card headers with an item-count pill, icon-only row-action buttons, pill-style meta badges, a name-initial avatar), and a real styled upload control replacing the raw native file input's default "Choose File / No file chosen" browser UI. Zero functional change — every icon-only button keeps the exact same `aria-label` the old text link had, so the existing E2E suite needed no edits | User: "UI/UX for admin catalog page is too unprofessional make it look like a professional" |
| 2026-09-05 | Code review (PR #18) found the new shared `TagIcon` duplicated `admin-sidebar.tsx`'s existing local `CatalogIcon` byte-for-byte (same SVG path data, two different call sites). Fixed by giving `TagIcon` an optional `className` and having the sidebar import and reuse it instead of maintaining a second copy | Independent Code Review Agent finding under the mandatory DRY review, not self-caught during implementation |
| 2026-09-05 | Reworked the admin catalog page's interaction model (PR #19): full-width tabs (Brands/Models/Types, one at a time) instead of three squeezed columns; modal dialogs for create/edit instead of an always-visible inline form; a confirm dialog for delete instead of `window.confirm()`; toast notifications for success/error instead of a static inline banner. New dependency-free primitives in `src/components/ui/` (`Dialog`, `ConfirmDialog`, `ToastProvider`/`useToast`) — no Radix/headlessui added, since the project has none yet and this admin UI's actual needs (portal, Escape/overlay-close, focus trap, auto-dismissing toasts) fit in ~150 lines | User: "UI/UX for admin catalog page is too unprofessional... three coloumns listting with above add field make the full width brand type and model form should open in popup and sucess and error toast messages" |
| 2026-09-05 | Found while building the toast portal: gating it on `typeof document !== "undefined"` checked directly during render caused a real hydration mismatch (confirmed via the Next.js dev overlay's error badge and a genuine `Uncaught Error: Hydration failed` in the server log). A `useEffect`-based "mounted" flag was rejected by this project's lint config as a setState-in-effect anti-pattern, so fixed with `useSyncExternalStore` and a `getServerSnapshot` returning `false` — the React-recommended way to gate client-only rendering without an effect | Self-caught during implementation, before the feature was ever presented as working |
| 2026-09-05 | Code review (PR #19) found `Dialog`'s focus-management effect depended on `onClose`, a plain function recreated on every render of the caller — every keystroke in a form field re-ran the effect and re-focused the dialog panel, stealing focus from the input after the first character. **Confirmed live**: typing "Toyota" via real per-keystroke events produced `"T"`, since the existing E2E suite's `.fill()` calls don't simulate real typing and never exercised this path. Fixed by keeping the latest `onClose` in a ref outside the effect's dependency array | Independent Code Review Agent finding, verified by direct browser reproduction (not just read from the code), not self-caught during implementation |
| 2026-09-05 | Code review (PR #19) found a Dialog's `document.body`-portaled overlay isn't hidden (or closed) by the `hidden` div `CatalogTabs` uses to hide an inactive tab, so leaving one open while switching tabs left its full-viewport overlay blocking whatever tab became active. A mouse user can't reach this directly (the overlay correctly blocks pointer clicks on background content — confirmed the click is blocked, not misdirected), but `Dialog` had no focus trap, so Tab-key navigation could walk focus into the visually-covered tab bar and activate it via keyboard. Fixed with a real Tab/Shift+Tab focus trap in `Dialog` (the more fundamental fix, independent of this specific scenario) plus a `useIsActiveCatalogTab` context hook that closes a list's own dialog the moment its tab stops being active. An earlier version of the second fix used `cloneElement` to inject an `isActive` prop into the Client Component elements `page.tsx` (a Server Component) passes down — that broke Next.js's element resolution and crashed the whole `/admin/catalog` page, reproducible even after a full `.next` cache clear, so a real incompatibility rather than a dev-server fluke; replaced with the context-based approach before merging | Independent Code Review Agent finding, verified by direct browser reproduction at every step (including the cloneElement dead end) rather than assumed fixed from the code alone |
| 2026-09-05 | Built the admin showroom approval workflow (PR #20, SHR-003/ADM-002): `/admin/showrooms` lists all showroom registrations (status-sorted, PENDING first, oldest first within a status), a "Review" button opens a dialog with full business details and submitted documents opened via short-lived Supabase Storage signed URLs (the bucket is private), and — for PENDING showrooms only — an inline Approve/Reject confirmation swapped into the same open dialog (not `window.confirm()`, not a second stacked modal). No role check is duplicated in `showroom-actions.ts` — enforcement is the existing `prevent_showroom_self_approval` trigger + the bucket's owner-or-admin `select` RLS policy, following the same `.select("id")`-then-empty-check convention as `catalog-actions.ts` | This was self-chosen as the next Day 2 priority (showroom registration from PR #16 had no way for an admin to actually approve/reject a submission), per a mid-task user instruction to move to the next task once PR #19 was fully wrapped up |
| 2026-09-05 | Renamed `src/components/admin/catalog-ui.tsx` → `admin-ui.tsx` (via `git mv`, preserving history) as part of PR #20, since its building blocks (`SectionHeader`, `TableShell`, icons, etc.) are now shared between the catalog and showroom admin screens, not catalog-specific; its one catalog-flavored export (`CatalogSectionHeader`) was renamed to `SectionHeader` | Judged as the correct non-premature generalization, rather than importing catalog-named utilities into an unrelated showroom module or duplicating the same building blocks into a second file |
| 2026-09-05 | Code review (PR #20) found the `.select("id")`-empty-check comment in `showroom-actions.ts` attributed the failure mode solely to RLS row-filtering, when the actual primary enforcement mechanism for approval-field changes is the `prevent_showroom_self_approval` trigger (which raises, rather than silently filtering). Not a functional bug — the exception path was already caught by the existing `error` branch — fixed the comment to describe both real rejection paths | Independent Code Review Agent finding (LOW), not self-caught during implementation — fixed and re-verified (typecheck/lint/unit tests) before merge |
| 2026-09-05 | Extended admin showrooms with full Create/Edit/Delete (PR #21), per explicit user request ("also want showroom crud on dashboard"). Create adds an "assign an existing user as owner" search picker (service-role-backed, since `profiles` has no email column — only `auth.users` does), gated by a new, purely additive `showrooms_insert_admin` RLS policy alongside the untouched `showrooms_insert_own`. Edit changes business details only, never `status`/`verified`. Delete removes the row and best-effort cleans up its documents' Storage objects | Clarified scope via `AskUserQuestion`: full Create+Edit+Delete (including an admin-side "create for an existing user" flow), not just Edit+Delete |
| 2026-09-05 | Code review (PR #21) found a real BLOCKER: the new `searchShowroomOwnerCandidatesAction` used the service-role client (bypasses RLS entirely) with no authorization check of its own — every other action in this file is safe without an explicit check only because it uses the RLS-scoped client, where the database's own `is_admin()` policy is the actual enforcement regardless of caller. A Next.js Server Action is directly POST-able independent of which page renders its calling button, so any signed-in non-admin could have invoked this one directly and received other users' emails/full names — confirmed live via a captured-and-replayed real request under a non-admin session. Fixed by checking the caller's own profile role via the RLS-scoped client before ever touching the admin client; verified the fix is actually effective (not just "looks right") by reverting it, re-running the new E2E regression test to confirm it fails with the leaked email in the response, then restoring the fix and confirming it passes | Independent Code Review Agent finding (BLOCKER), not self-caught during implementation — this is the first BLOCKER-severity finding since PR #4's RLS review; fixed, proven effective, and re-verified (full suite) before merge |
| 2026-09-05 | Code review (PR #21) also found a MEDIUM: the owner-search combobox's debounce only cancelled pending (not-yet-fired) timers via `clearTimeout`, not already-in-flight requests — a slower response for an earlier keystroke could resolve after a faster response for a later one and silently overwrite it with stale results. Fixed via a request-id ref that ignores a response once a newer search has been issued | Independent Code Review Agent finding under the mandatory async/race-condition review — not a security issue (selecting a candidate still requires an explicit click), but a real UX correctness bug |
| 2026-09-05 | Extended the admin Create Showroom form (PR #22) with an Existing/New owner toggle and optional document upload, per direct user feedback that the form should match the real registration design's fields and let an admin either pick an existing user or create one on the spot. New owner accounts are created via `supabase.auth.admin.inviteUserByEmail()` (a real branded invite email with a link to set their own password) rather than generating and emailing a plaintext password — a deliberate security choice, not what a literal reading of "send login credentials" might suggest | User: "i want to create a new showroom and its owner... check the showroom register design and check all fields are there in the showroom crud", followed by "after showroom is created from admin an email send to owner about their registration and login credentials so owner can login" |
| 2026-09-05 | Two new additive RLS policies added (`showroom_documents_insert_admin`, `showroom_documents_storage_insert_admin`) since the existing owner-only insert policies on `showroom_documents` and its Storage bucket had no path for an admin to attach a document on someone else's behalf | Needed the moment document upload was added to the admin-side create form — verified via integration tests that a non-admin is still rejected on both |
| 2026-09-05 | Found while implementing the invite flow: GoTrue's admin-triggered `inviteUserByEmail()` link returns session tokens as a URL hash fragment (implicit flow), not the `?code=` PKCE flow every other auth email in this app uses (confirmation, recovery) — because there's no originating browser request from the invitee to attach a PKCE challenge to. The existing `/auth/callback` route only handles `?code=`, so the real invite link dead-ended at `/login?error=auth_callback_failed`. Fixed with a new client-side `/auth/invite-callback` page that reads the fragment, calls `setSession()`, then hands off to the existing `/reset-password` page | Caught by actually clicking the real Mailpit-captured invite link end-to-end during manual QA, not assumed working from the code — the same "test the actual link, don't trust the SDK call succeeded" discipline used for every other email-based flow in this project |
| 2026-09-05 | Extracted the shared upload-then-record-document loop out of `registerShowroomAction` into `uploadShowroomDocuments()` (`src/features/showroom/document-upload.ts`) so the new admin-side document upload doesn't duplicate it — deliberately kept as a plain (non-`"use server"`) module, since every top-level export of a `"use server"` file becomes a directly client-invokable Server Action regardless of whether any UI calls it, per PR #21's BLOCKER finding | Applying the PR #21 lesson proactively rather than needing another review cycle to catch it |
| 2026-09-05 | Code review (PR #22) found 2 LOW issues: the new-owner name/email inputs were missing the `required` attribute every other field in the form has, and the Existing/New owner toggle had no `aria-pressed` state. Both fixed | Independent Code Review Agent finding, not self-caught during implementation |
| 2026-09-05 | Redesigned the showroom Review dialog (header card + icon-labeled info fields + nicer document rows) and moved document viewing from `window.open()` to an inline in-dialog preview (PDF via `<iframe>`, image via `next/image`), reusing the dialog's existing "swap content in place" pattern instead of stacking a second modal. Added a `size` prop to the shared `Dialog` component (`"md"`/`"lg"`) since the richer layout needed more room than the existing `max-w-md` forms | User: "Review popup UI should be more good and documents view should open a modal not in a new tab" |
| 2026-09-05 | Added an optional showroom logo (create/edit, shown in the table row and review header, falling back to the initials avatar) — mirrors the brand-logo feature (PR #17) exactly: a new `showroom-logos` public bucket (admin-only write) and a `logo_storage_path` column. Extracted the shared upload-then-record-logo-path logic into `uploadEntityLogo()` (`src/features/admin/logo-upload.ts`) so `catalog-actions.ts`'s brand-logo handling and the new showroom-logo handling don't duplicate it — `catalog-actions.ts` was refactored to call the shared helper too | User: "also business logo field should be there if logo is uploaded show logo other wise business name initials in the avatar" |
| 2026-09-05 | Code review (PR #23) found 1 LOW: the new `Dialog` `size` prop included an unused `"xl"` variant with no caller anywhere in the codebase. Removed, keeping only `"md"`/`"lg"` (both actually used). Also noted (informational, non-blocking) that the inline document preview trusts the client-reported Content-Type recorded at upload time rather than re-deriving it from actual file bytes — a pre-existing gap from the original document-upload feature, unchanged by this PR, not a regression | Independent Code Review Agent finding, not self-caught during implementation |
| 2026-09-05 | Fixed a real bug (PR #24): the showroom Create/Edit form and all three catalog forms (Brand/Model/Vehicle Type) relied entirely on native HTML5 constraint validation (`required`, `type="email"`) with no `noValidate` on the `<form>`. Since these forms use `onSubmit={handleSubmit}` (not Next.js's `action={formAction}` binding), the browser's own constraint validation silently intercepts an invalid submit *before* React's `onSubmit` ever runs — meaning any custom validation written inside `handleSubmit` was completely unreachable for exactly the cases native HTML5 gates. Confirmed live: with `type="email"` bypassed via devtools, an invalid business email was silently accepted end-to-end with zero validation anywhere. Fixed by adding `noValidate` to all four forms and wiring real zod-based validation via the existing `useFieldValidation` hook (already used by `register-showroom-form.tsx`) — on-blur inline errors plus an explicit `safeParse` gate in each `handleSubmit` | User: "again previous mistake no proper validation on showroom form?" then "also brand model and type forms have no validation" then "this is a required rule of having proper validation no html validation just" |
| 2026-09-05 | Every other polished form in this app (login, signup, forgot-password, reset-password, admin login) already used `noValidate` for the same reason — the four admin CRUD forms fixed in PR #24 were the only outliers that had never gotten this treatment | Root-cause note for future admin forms: any new form using `onSubmit`+`e.preventDefault()` (not `action={formAction}`) must include `noValidate` from the start, or its own custom validation will be silently unreachable for the cases native HTML5 already gates |
| 2026-09-05 | Fixed a real bug (PR #25), found from a user screenshot: PR #24's new validation showed the same message twice — a top banner and an inline per-field error simultaneously. Fixed by only setting the inline error for client-side validation failures with a per-field equivalent, reserving the banner for errors with no field to attach to (choose-a-brand/owner, logo upload, genuine server errors) | User: "Brand Model and Type forms have by default validation message showing under the field and click save with empty field another error on top show the same validation check" (with screenshot) |
| 2026-09-05 | While verifying the PR #25 fix, found two more real bugs, both in shared primitives rather than the forms themselves: (1) `Dialog`'s own initial-focus effect ran in a `useEffect` (after an `autoFocus` field's focus, which React applies during the commit phase) and stole focus back to the panel, firing a spurious blur that the new onBlur validation then correctly flagged as empty — a brand-new "New Brand" dialog showed "Name is required" before any interaction at all; (2) `useFieldValidation`'s internal touched/liveErrors state lives in a component instance that stays mounted between dialog opens (only `open` toggles), so closing a dialog after a failed attempt and reopening a fresh one showed the previous session's stale error. Fixed both in the shared `Dialog` component (skip panel focus if a descendant already has it) and the shared hook (`reset()`, called from every openCreate/openEdit) rather than patching each form individually | Self-caught while manually re-verifying the reported bug fix, not assumed working from the code alone — confirms both are pre-existing latent bugs in shared primitives, only exposed once real onBlur validation was wired up in PR #24 |
| 2026-09-05 | Built showroom-owner Vehicle Management (PR #26, SHR-004..008): a new `/dashboard` route group — dashboard home (showroom status + vehicle stat tiles), `/dashboard/vehicles` (create/edit vehicles, publish/mark sold/deactivate via a status dropdown, multi-photo upload with primary-image selection). No new migrations — reused the `vehicles`/`vehicle_media` schema, RLS policies, and `vehicle-media` Storage bucket that already existed from Day 1 foundation work; this PR was the first thing to actually exercise them. `signInAction` now sends a showroom owner straight to `/dashboard` instead of the generic `/account` page | User: "whats next?" → I recommended Vehicle management as the literal Day 2 gate item with no unbuilt dependencies (vs. showroom self-service profile editing); user: "start it" |
| 2026-09-05 | Confirmed by inspection before implementing: registering a showroom never actually sets `profiles.role` to `SHOWROOM` — it stays `CUSTOMER`. "Which showroom does this user own" is resolved by querying the `showrooms` table directly (`getOwnerShowroom()`, `src/features/showroom/my-showroom.ts`), not by role, matching how the `owns_showroom()` RLS helper itself already works | Root-cause note for any future feature gating on "is this user a showroom owner" — do not add role-based checks for this; the role enum value is currently unused in practice |
| 2026-09-05 | SHR-007 ("remove/deactivate" a listing) implemented as a status change to INACTIVE, not a hard delete, given `vehicle_media`/`vehicle_inquiries` FK references to a vehicle and the requirement's own "remove/deactivate" wording. Publishing (setting a vehicle ACTIVE) is re-checked server-side against the owning showroom's APPROVED status in `updateVehicleStatusAction`, since RLS itself only enforces ACTIVE+APPROVED at public SELECT time, not at write time — the `/dashboard/vehicles` page is also gated to APPROVED-only, but the action re-checks independently since it can be called directly | Design decision made during implementation planning, not dictated by the user |
| 2026-09-05 | Financing fields (down payment %, interest rate, tenure, financing partner) intentionally left unset by this feature — deferred to the Day 4 finance calculator, which is documented in the `vehicles` table's own migration comment as the actual consumer of those columns (with `system_settings` platform-default fallbacks when unset) | Code Review Agent's own suggestion to make this sequencing explicit rather than reading as scope silently dropped from SHR-005's acceptance criteria |
| 2026-09-05 | Code review (PR #26) found 2 HIGH bugs on first pass, both fixed and re-verified: (1) `setPrimaryVehiclePhotoAction` was missing the `.select("id")` + 0-row check that every other mutation in `src/features/vehicle/actions.ts` already follows, so a non-owned/gone media id was silently reported as success instead of `NOT_FOUND_ERROR`; (2) the Photos dialog captured a one-time snapshot of the vehicle object in `useState` when opened, which went stale after any photo mutation (upload/set-primary/delete) since `revalidatePath` refreshes the parent Server Component's data but not this already-mounted component's own local state — fixed by deriving the dialog's vehicle from the live `vehicles` prop by id on every render instead, and verified live via Playwright (upload → set-primary → delete, all within one open dialog, without closing/reopening) | Independent Code Review Agent finding, not self-caught during implementation — same "reviewer must verify independently, not trust the diff" discipline as PR #21's BLOCKER |
| 2026-09-05 | Built PR #27 in direct response to user feedback on PR #26: moved `/dashboard` out of the `(site)` route group (it was rendering the public site Header/Footer — the same mistake `/admin` had already avoided from day one), moved the vehicle form from a Dialog to its own page (`/dashboard/vehicles/new`, `.../[id]/edit` — the form had grown too large for a modal once specs/financing were added), made Brand/Model cascading dropdowns sourced from the existing admin catalog (Model filtered by selected Brand; both still write into the existing free-text `make`/`model` columns, no FK added — same pattern Body Type already used), and added a new migration for Engine/Interior/Doors/Seats/Country of Origin plus Installment/Bank-Finance toggles and a Fixed-or-Percentage deposit type — the financing config section only renders once "Available on installment" is checked | User: "Showroom Dashboard Layout should not include the website Header and Footer... Make the vehicle form a separate page not a popup managing all these in popup will be difficult to enter" — full request also specified Brand/Model/Type dropdowns, spec fields, and the financing fields listed above |
| 2026-09-05 | Clarified via `AskUserQuestion` before implementing PR #27: "Type" (the top-level Brand/Model/Type dropdown request) and "Body Type" (listed separately under Specification Fields) are the same field, not two — kept as the one existing Vehicle Types catalog dropdown, moved under Specifications. Also confirmed: Deposit "fixed or percentage" is a type-toggle next to one shared amount input (not two always-visible fields), and Engine is free text (not structured displacement+cylinder fields) | User selected the recommended option for all three; avoided guessing and building the wrong shape for a field that would have required another schema migration to fix |
| 2026-09-05 | Code review (PR #27) took two rounds. Round 1 found 2 HIGH + 2 MEDIUM, all fixed: `doors`/`seats` schemas had no lower bound (`0` passed client validation, failed only at the DB's `between 1-10`/`1-20` check constraints as a generic, unhelpful error) — added `.min(1, ...)`; the pre-submit validation gate omitted every new field, and four fields (`engine`/`interior`/`countryOfOrigin`/`financingPartner`) had schema validation with no onBlur/error UI wired at all — both fixed; the ~30-line DB-row→`VehicleListItem` mapping was duplicated verbatim across the list and edit pages — factored into one shared `vehicleRowToListItem()` + `VEHICLE_SELECT_COLUMNS` constant in `src/features/vehicle/types.ts`; missing doors/seats-zero and make-not-in-catalog test coverage — added. Round 2 found 1 HIGH — a regression introduced by round 1's own fix: financing fields were now validated unconditionally even though their inputs/errors live in a section that unmounts when "Available on installment" is unchecked, so a leftover invalid value silently blocked Save with no visible error anywhere — fixed at both the client (skip validating hidden fields) and the server (`readVehicleFormData` blanks financing fields whenever `installmentEnabled` is false, regardless of what a client sends, so a direct action call can't bypass it) | Independent Code Review Agent finding both rounds, not self-caught — round 2 in particular is a reminder that a fix for one finding can introduce a new one, which is exactly why re-review re-verifies the whole diff rather than just the specific lines changed |
| 2026-09-05 | While fixing PR #27's round-2 findings, found and fixed a real E2E test bug (not an app bug): the "switch deposit type" test's `<select>` is present in the very first paint after `page.reload()` (installment was already enabled from a prior save in the same test), so firing `selectOption()` the instant Playwright considers the page actionable can beat React's hydration attaching the change handler, and the DOM value gets silently reverted on the next render — reproduced directly (a bare `waitForTimeout` before interacting fixed it, confirming the mechanism), fixed properly via `expect(...).toPass()` retrying the interaction until the DOM genuinely reflects it, rather than trusting a single attempt or masking it with an arbitrary sleep | Self-caught while investigating a test failure that looked at first like a real app regression — bisected methodically (removing fields/steps one at a time) before concluding it was a test-timing artifact, not assumed |
| 2026-09-05 | Fixed a real bug (PR #28), found from a user report ("This field has some overlapting and gallery and featured image is missing"): the vehicle form's Save/Cancel action row was still `position: sticky bottom-0`, left over unchanged from PR #26's Dialog version — now that the form is a full page (PR #27), sticky pins it to the *viewport* bottom while the page scrolls, so it visibly overlapped the Specifications section (Body Type/Engine/Transmission row) and the Deposit input. Reproduced live via a full-page Playwright screenshot before concluding it was real, not assumed from the report alone. Also added an explicit "Save this vehicle first" placeholder card for Photo Gallery on the New vehicle page, which had no photo section at all (by design — a photo needs a real vehicle id) but read as missing rather than deferred | User: "This field has some overlapting and gallery and featured image is missing" |
| 2026-09-05 | Fixed two more real bugs (PR #29), found from a user report after PR #28 landed. (1) "Body exceeded 1 MB limit" on photo upload: Next.js Server Actions cap request bodies at 1MB by default — every file-upload action (vehicle photos, showroom documents, brand/showroom logos) posts multipart FormData straight to one, so this had likely been silently broken for any upload near or above 1MB since Day 1, just never hit by earlier E2E tests' tiny fixture files. Fixed via `next.config.ts`'s `experimental.serverActions.bodySizeLimit: "20mb"`. (2) The Deposit type/value fields still overlapped after PR #28 — root-caused (not assumed) via live bounding-box inspection to a *different* bug than PR #28's: a shared `selectClassName` Tailwind constant baked in `w-full`, which Tailwind's generated stylesheet always orders after `.w-32` regardless of class-list order, so an explicitly-appended `w-32` on the Deposit type select silently lost, leaving it full-width and squeezing its sibling input to ~26px | User: "Body exceeded 1 MB limit... When uploaded gallery photos give this error / Deposit value field width is overlaping to other field" |
| 2026-09-05 | Code Review Agent flagged (non-blocking, tracked as B-008) that PR #29's `bodySizeLimit` increase is a global Next.js setting — every Server Action in the app, not just uploads, now accepts request bodies up to 20MB instead of 1MB, with no rate limiting anywhere in the app to compensate | Independent Code Review Agent finding — accepted as a deliberate, necessary trade-off for uploads to work at all (Next.js exposes no per-action override), but logged as a real pre-production hardening item rather than dismissed |
| 2026-09-05 | Added a Status field to the vehicle create/edit form (PR #30), choosing "add a field" over "auto-publish on create": a brand-new vehicle has no photos yet (only addable once it has a real id), so auto-publishing would put an empty listing live immediately. The field reuses the existing `updateVehicleStatusAction` (same authorization path as the list's own status dropdown), called as a follow-up after the main create/update succeeds, only when the selected status actually changed | User: "when add a vechicle this should auto published or add a field on vehicle crud form which is good ux point of view" |
| 2026-09-05 | Code review (PR #30) found 1 HIGH, fixed and re-verified: the edit form's "did status change?" check compared against the `initialValues` prop, which is frozen at page-load time (neither `updateVehicleAction` nor `updateVehicleStatusAction` triggers a navigation/refresh) — a second status change in the same visit without a reload compared against the stale original status instead of the just-persisted one, silently failing to apply a real revert while still showing a success toast. Fixed by tracking a `lastKnownStatus` local state, updated only after a successful status change, instead of the frozen prop | Independent Code Review Agent finding, not self-caught — a reminder that any "did X change from its original value" check against a prop needs to ask what actually keeps that prop's value current across repeated saves without a full remount |
| 2026-09-05 | Built showroom self-service profile editing (PR #31) — the last open Day 2 gate item. New `/dashboard/profile` lets a showroom owner edit business name, logo, location, phone, email, address, and description themselves, instead of only via admin. The actual DB-write-and-logo-upload logic was extracted out of admin's existing `updateShowroomAction` into a shared `updateShowroomProfile()` helper (`src/features/showroom/profile.ts`), now called by both admin's action (form-supplied showroom id, page already admin-gated) and a new owner action (`updateMyShowroomProfileAction`) that never accepts a showroom id from the client at all — it always resolves the caller's own showroom server-side via the existing `getOwnerShowroom(user.id)`. Deliberately not gated to APPROVED-only (unlike vehicle management): a PENDING showroom can still correct its submitted details while awaiting review | User: "start showroom self service profile editing" |
| 2026-09-05 | While building PR #31, found and fixed a real, previously-undiscovered RLS gap: the `showroom-logos` Storage bucket's write policies were admin-only (`20260905060002_create_showroom_logos_storage_policies.sql`), with no owner-write path at all — confirmed live (not assumed) that a real showroom owner's logo upload failed with "new row violates row-level security policy" against the old policies. Fixed via new migration `20260905210000_showroom_logos_owner_write.sql`, extending insert/update/delete to owner-or-admin (mirroring `vehicle-media`'s existing pattern, using `owns_showroom()` on the path's showroom-id segment); `src/lib/supabase/storage-rls.integration.test.ts`'s `showroom-logos` block rewritten to cover the new shape. This would have blocked every real showroom owner's logo upload had it shipped without self-service profile editing surfacing it | Self-caught via live reproduction before writing the fix — the original migration's own comment had explicitly anticipated this exact moment ("extend additively... once that lands") |
| 2026-09-05 | Code review (PR #31) found 2 MEDIUM, both fixed and re-verified: (1) the admin/owner refactor changed `updateShowroomAction`'s prior behavior — `revalidatePath` now fired even when the DB update errored or matched 0 rows, where before it only fired on success/warning; fixed by returning early on `result.error` in both the admin and new owner actions before revalidating. (2) the extraction that unified admin's and owner's actual update-and-logo logic (into `updateShowroomProfile()`) left the smaller field-extraction step still duplicated between `readShowroomFormFields` (admin) and `readShowroomProfileFormFields` (owner) — unified into the one implementation in `src/features/showroom/profile.ts`, imported by both callers | Independent Code Review Agent finding, not self-caught — same "a refactor's own stated goal (preserve behavior / eliminate duplication) is itself something to verify, not just the new code" discipline as prior PRs |

Full rationale: `.claude/docs/requirements/MVP_REQUIREMENTS.md` §29 (Scope Decision Log) and §29.1 (Design Review Decisions).

---

# Production Release

**Release Version:** —

**Release Date:** —

**Deployed By:** —

**Production URL:** —

**Final Status:** ⬜ NOT RELEASED

---

# AI Progress Rules

Claude Code must update this file whenever:

1. A feature changes development status.
2. A test suite changes status.
3. An E2E flow is created or completed.
4. A PR is created, reviewed, approved, or merged.
5. A blocker is discovered or resolved.
6. A feature reaches production.
7. A significant engineering decision is made.

Never mark an item complete without actually verifying it.

Never mark a feature as `🚀 Production` until it has been deployed and production smoke-tested.

The progress tracker must reflect the **actual state of the codebase**, not the intended state.
