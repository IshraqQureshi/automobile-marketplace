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
| Authentication     | ⬜           | ⬜  | ⬜  | ⬜          |
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
* [ ] Error handling (ongoing per-feature)
* [ ] Logging
* [x] Git workflow (feature branch created; no direct commits to `main` for feature work)

## Authentication

* [ ] Registration
* [ ] Login
* [ ] Logout
* [ ] Password reset
* [ ] Session handling
* [ ] User roles

## UI Foundation

* [ ] Application layout
* [ ] Header
* [ ] Navigation
* [ ] Responsive foundation
* [ ] Loading states
* [ ] Empty states
* [ ] Error states

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
* [ ] Authentication works (AUTH-001/002 — not started)
* [x] Tests execute successfully (typecheck, lint, `npm test` (11/11), `npm run build`, and `npm run test:e2e` all verified passing)

**Status:** 🟡 In Progress — FND-001/FND-002/FND-003/FND-004 complete, AUTH-001/AUTH-002 remain for Day 1 gate to fully close

---

# DAY 2 — Showrooms + Vehicles

## Showrooms

* [ ] Create showroom
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

* [ ] Admin dashboard foundation
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

---

# Blockers

| ID | Blocker | Impact | Owner | Status |
| -- | ------- | ------ | ----- | ------ |
| B-001 | Meta Business Manager verification + WhatsApp Cloud API template approval not yet started | NTF-002 is now P0; Meta approval lead time is outside dev control and could block Day 5 if not started Day 1 | Client (access) + Full-Stack Agent (integration) | ⬜ Not started |
| B-002 | ~~Figma/Figma Make access not yet confirmed available~~ | Resolved 2026-09-04: Figma Make view-only link isn't fetchable (JS-rendered SPA), but client supplied 7 static screen exports in `/design` (homepage, car-detail, showroom-detail, login-page, register-as-a-showroom, register-individual-seller, ready-to-sell). Screens not covered by an export must be built following the same branding (teal `#2f6f68`-ish primary, dark navy/charcoal nav+footer, serif display headlines, sans-serif body) per user instruction 2026-09-04. | Client / Frontend Agent | 🟢 Resolved |
| B-003 | Original client requirements review found the Proposal doc (`Automotive_Marketplace_Proposal (2).docx`) is missing body content for Sections 10, 12–14, 16–17 (Monetization, Tech Stack, Hosting, Cost, Dev Phases, Assumptions) — headings exist in the TOC but no text follows in the extracted document | Cannot independently verify the client's own document specifies Next.js/Supabase/Vercel; currently relying on `CLAUDE.md`/Scope doc only | Client (re-supply complete doc if available) | ⬜ Not started |
| B-004 | ~~`main` branch protection (required PR review) couldn't be satisfied — GitHub blocks an account from approving its own PR, and this repo currently has one collaborator~~ | Resolved 2026-09-04: branch protection removed by repo owner to unblock merging PR #1. Still enforced in practice: no direct commits to `main` for feature work (git-pr workflow followed manually); Code Review Agent verdicts recorded as PR comments instead of formal GitHub approvals. Revisit real branch protection (PR required, 0 approvals) once decided whether to add a second collaborator or accept comment-based review as the standing process. | Client / repo owner | 🟢 Resolved (process, not tooling) |

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
