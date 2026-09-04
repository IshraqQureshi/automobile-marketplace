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
| Showrooms          | ⬜           | ⬜  | ⬜  | ⬜          |
| Vehicles           | ⬜           | ⬜  | ⬜  | ⬜          |
| Marketplace        | ⬜           | ⬜  | ⬜  | ⬜          |
| Finance Calculator | ⬜           | ⬜  | ⬜  | ⬜          |
| WhatsApp Inquiry   | ⬜           | ⬜  | ⬜  | ⬜          |
| Admin              | ⬜           | ⬜  | ⬜  | ⬜          |

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
* [ ] Showroom profile
* [ ] Edit showroom
* [ ] Showroom listing
* [ ] Showroom details

## Vehicles

* [ ] Add vehicle
* [ ] Edit vehicle
* [ ] Delete vehicle
* [ ] Vehicle images
* [ ] Vehicle specifications
* [ ] Pricing
* [ ] Vehicle status
* [ ] Vehicle listing

## Admin

* [x] Admin dashboard foundation (built ahead of schedule, per explicit user request before starting Day 2 — sidebar/topbar shell, real auth-gated `/admin` layout, dashboard stat tiles wired to real `showrooms`/`vehicles`/`profiles` counts, honest empty states for pending-approvals/activity since no submission flow exists yet)
* [x] Vehicle catalog management (`/admin/catalog` — Brands/Models(nested under Brand)/Vehicle Types CRUD, built ahead of schedule per explicit user request as a prerequisite for the vehicle-add flow below — see PR #15)
* [ ] Showroom management
* [ ] Vehicle management

## Testing

* [ ] Unit tests
* [ ] Integration tests
* [ ] E2E showroom flow
* [ ] E2E vehicle flow
* [ ] Figma visual QA

### Day 2 Gate

* [ ] Showroom can manage its profile
* [ ] Showroom can manage vehicles
* [ ] Admin can manage showroom/vehicle data
* [ ] Required tests pass

**Status:** ⬜

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
