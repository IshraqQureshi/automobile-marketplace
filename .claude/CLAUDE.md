# CLAUDE.md

# Automobile Marketplace MVP — Engineering Constitution

## 1. Project Mission

Build and release the Automobile Marketplace MVP within:

* **5 development days**
* **2 QA, testing, and deployment days**

The objective is to deliver a working, production-ready MVP without unnecessary over-engineering.

The MVP must be:

* Functional
* Secure
* Tested
* Maintainable
* Responsive
* Visually aligned with Figma
* Ready for real users

Do not expand MVP scope without explicit approval.

---

# 2. Engineering Philosophy

Claude Code operates as an AI-assisted engineering team.

Optimize for:

> **Correct implementation + clean architecture + passing tests + production readiness.**

Rules:

1. Never implement functionality that is not required.
2. Inspect existing code before creating new code.
3. Reuse existing components, utilities, types, schemas, queries, and business logic.
4. Avoid unnecessary duplication.
5. Prefer the simplest correct solution.
6. Do not prematurely implement Phase 2 architecture.
7. Every feature must be testable.
8. Every critical user journey must have E2E coverage.
9. Security and authorization must never be bypassed for convenience.
10. Never mark work complete while required tests are failing.
11. Never merge feature work without required PR review.
12. Never release while a mandatory release gate is failing.

---

# 3. Technology

## MVP Stack

* Next.js
* TypeScript
* Tailwind CSS
* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Storage where required
* Playwright for E2E testing

Supabase is intentionally used for the MVP to maximize delivery speed.

## Phase 2 Direction

The architecture should allow migration toward:

* NestJS backend
* PostgreSQL
* Dedicated backend business logic
* Scalable infrastructure

Do not build Phase 2 infrastructure unless explicitly required for the MVP.

Do NOT prematurely introduce:

* Microservices
* Redis
* RabbitMQ
* Kubernetes
* API gateways
* Event buses
* Separate backend services

Phase 2 readiness means **clean boundaries**, not premature infrastructure.

---

# 4. Architecture Principles

Use a modular-monolith approach.

Preferred responsibility flow:

```text
UI / Presentation
        ↓
Application / Business Logic
        ↓
Data Access
        ↓
Supabase / PostgreSQL
```

Keep appropriately separated:

* UI components
* Business logic
* Data access
* Validation
* Types
* Utilities
* Database concerns

Rules:

* Avoid giant components.
* Avoid giant files.
* Avoid duplicated business rules.
* Avoid duplicated components.
* Avoid unnecessary abstractions.
* Avoid tight coupling.
* Avoid unnecessary global state.
* Do not put significant business logic directly into UI components when it can be separated cleanly.

Before introducing a new abstraction, inspect existing patterns and determine whether reuse is possible.

---

# 5. Figma Is the Frontend Visual Source of Truth

Figma is the authoritative source for frontend visual implementation.

When Figma is available, Claude Code must use the configured Figma integration/MCP before implementing the corresponding UI.

Do not recreate designs from memory or approximate important UI.

## Before Frontend Implementation

Inspect:

* Layout
* Spacing
* Typography
* Font sizes
* Font weights
* Colors
* Borders
* Radius
* Shadows
* Icons
* Images
* Assets
* Components
* Interactive states
* Forms
* Loading states
* Empty states
* Error states
* Responsive behavior

Identify reusable project and design components before creating new ones.

## Implementation Rules

1. Reuse existing project components where appropriate.
2. Reuse established design patterns.
3. Use actual provided assets when available.
4. Do not replace important assets with approximations.
5. Follow project design tokens.
6. Do not invent visual patterns where Figma already defines them.
7. Implement responsive behavior intentionally.
8. Support appropriate accessibility semantics.

## Visual QA

After implementation, compare the running application against Figma.

Verify:

* Layout
* Alignment
* Spacing
* Typography
* Component sizing
* Colors
* Images
* Icons
* Responsive behavior
* Interactive states

Material visual differences must be corrected before completion.

---

# 6. Agent System

The project uses specialized agents.

Each agent has a defined responsibility and must not bypass another agent's required authority.

## 6.1 Architect Agent

Responsible for:

* Architecture
* Technical decisions
* Technical planning
* Module boundaries
* Database architecture
* Integration boundaries
* Identifying technical risks
* Architecture validation

Significant features should receive architectural planning before implementation.

---

## 6.2 Frontend Agent

Responsible for:

* Next.js pages
* Components
* Forms
* Responsive UI
* Frontend state
* Client-side validation
* Figma implementation
* Visual QA
* Frontend tests

Must inspect Figma before implementing designed UI.

Must not independently make database/RLS architecture changes outside its responsibility.

---

## 6.3 Backend/Data Agent

Responsible for:

* Supabase
* PostgreSQL
* Database schema
* Migrations
* Queries
* Data access
* RLS
* Authentication integration
* Authorization
* Validation
* Storage
* Database constraints
* Indexes
* Data integrity

Must protect service-role credentials and enforce authorization at the data boundary.

---

## 6.4 Full-Stack Agent

Responsible for cross-layer feature integration:

```text
UI
 ↓
Application Logic
 ↓
Data Access
 ↓
Database
```

Responsible for:

* Feature integration
* Cross-layer contracts
* Authentication flows
* Authorization
* Forms
* File uploads
* Finance flows
* Inquiry flows
* State synchronization
* Integration tests
* E2E coordination

Must ensure all layers work together correctly.

---

## 6.5 Code Agent

Responsible for focused implementation work:

* Feature implementation
* Bug fixes
* Refactoring
* TypeScript correctness
* Reusable code
* Error handling
* Async behavior
* Validation
* Regression tests
* Dependency/configuration safety

Rules:

* Inspect existing code first.
* Avoid `any` as a shortcut.
* Avoid unnecessary refactoring.
* Keep changes focused.
* Do not introduce duplication.

---

## 6.6 QA Agent

Responsible for independent quality verification:

* Acceptance criteria
* Functional testing
* Edge cases
* Negative testing
* Regression testing
* Manual exploratory testing
* Accessibility awareness
* Loading/empty/error states
* Authentication/authorization validation
* Release-blocking defects

Severity:

```text
P0 — Critical / Release Blocker
P1 — High / Must Fix Before Release
P2 — Medium
P3 — Low
```

QA may BLOCK release when mandatory requirements are not satisfied.

---

## 6.7 E2E Agent

Responsible for complete user journeys.

Must create and maintain realistic browser-based E2E tests covering critical business flows.

Examples:

* Customer discovery
* Vehicle inquiry
* Showroom management
* Vehicle management
* Admin workflows
* Finance calculator

Must test:

* Happy paths
* Invalid inputs
* Permission failures
* Empty states
* Error recovery
* Important edge cases
* Responsive/mobile behavior

No release without required E2E flows passing.

---

## 6.8 Security Agent

Responsible for independent security verification:

* Authentication
* Authorization
* RBAC
* Supabase RLS
* Ownership checks
* IDOR prevention
* Privilege escalation
* Input validation
* SQL injection
* XSS
* URL/open redirect risks
* File/storage security
* Sensitive data exposure
* Admin security
* Service-role protection
* Secrets
* Rate limiting where required
* Race conditions
* Dependency security
* Security regression

Unauthorized paths must be tested directly.

Security issues that violate release requirements are release blockers.

---

## 6.9 Performance Agent

Responsible for measurement-driven performance validation.

Review:

* Database queries
* Indexes
* Pagination
* Network requests
* Frontend rendering
* Bundle size
* Images/assets
* Unnecessary client-side work
* Performance regressions

Rule:

> **Measure → identify bottleneck → apply smallest effective fix → measure again.**

Do not introduce caching, Redis, queues, or infrastructure merely because they might improve theoretical scalability.

---

## 6.10 Code Review Agent

Every feature, bug fix, refactor, security change, or meaningful code change must go through a PR.

The Code Review Agent independently reviews the actual diff for:

* Requirements compliance
* Correctness
* Architecture
* Maintainability
* DRY/reuse
* TypeScript quality
* Frontend/Figma compliance
* Database correctness
* RLS/authentication/authorization
* Security
* Error handling
* Async/race conditions
* Performance
* Unit/integration tests
* E2E coverage
* Dependencies
* Environment configuration
* Git hygiene
* Scope control

Findings are classified as:

```text
BLOCKER
HIGH
MEDIUM
LOW
```

A PR cannot be merged while unresolved BLOCKER/HIGH issues remain.

The Code Review Agent must re-review changes after fixes.

---

## 6.11 Release Agent

Responsible for the final production release gate.

Verifies:

* Approved commit
* Required tests
* E2E suite
* QA status
* Security status
* Performance status
* Code Review approval
* Production build
* Environment configuration
* Database/RLS/storage changes
* Deployment
* Smoke tests
* Production verification
* Monitoring
* Rollback readiness

The Release Agent can BLOCK production deployment.

---

# 7. Skills

Reusable engineering knowledge lives under:

```text
.claude/skills/
├── architecture/
├── feature-development/
├── figma/
├── testing/
├── code-review/
├── security/
├── performance/
├── git-pr/
└── deployment/
```

Agents must use relevant skills instead of duplicating large instruction sets.

Skills define **how work should be performed**.

Agents define **who is responsible for the work**.

---

# 8. Required Documentation

Project documentation lives under:

```text
.claude/docs/
├── requirements/
├── architecture/
└── MVP_PROGRESS.md
```

Important architecture decisions should be recorded under:

```text
.claude/docs/architecture/ADRs/
```

The progress tracker is:

```text
.claude/docs/MVP_PROGRESS.md
```

This is the single source of truth for actual project progress.

---

# 9. Feature Development Lifecycle

Every feature follows:

```text
Requirement
    ↓
Inspect Existing Code
    ↓
Inspect Figma (if frontend)
    ↓
Architecture / Technical Plan
    ↓
Implementation
    ↓
Unit / Integration Tests
    ↓
E2E Flow
    ↓
Visual QA (if frontend)
    ↓
Security Review
    ↓
Performance Review
    ↓
Self-Review
    ↓
PR Created
    ↓
Code Review Agent
    ↓
Fix Review Findings
    ↓
Re-review
    ↓
Approval
    ↓
Merge
    ↓
Regression Verification
    ↓
Progress Update
```

A feature is not complete merely because it works locally.

---

# 10. Mandatory PR Rules

Every feature must:

1. Use its own branch.
2. Have a PR.
3. Pass required automated checks.
4. Include appropriate tests.
5. Include/update E2E coverage where required.
6. Pass required security checks.
7. Pass required performance checks.
8. Receive Code Review Agent approval.
9. Have all BLOCKER/HIGH issues resolved.
10. Be merged only after approval.

No direct feature commits to `main`.

No bypassing Code Review Agent approval.

---

# 11. Testing Strategy

Testing is mandatory.

## Unit Tests

Use for:

* Calculations
* Business rules
* Validation
* Utilities
* Isolated logic

## Integration Tests

Use for:

* Database operations
* Authentication
* Authorization
* Important module interactions
* Data workflows
* Storage workflows where appropriate

## E2E Tests

Test complete realistic user journeys.

### Customer Journey

```text
Registration
→ Login
→ Browse Vehicles
→ Search
→ Filter
→ Vehicle Details
→ Showroom
→ WhatsApp Inquiry
```

### Showroom Journey

```text
Login
→ Manage Profile
→ Add Vehicle
→ Upload Images
→ Edit Vehicle
→ Publish Vehicle
```

### Admin Journey

```text
Admin Login
→ Review Showroom
→ Approve/Reject
→ Manage Vehicles
→ Manage Users
```

### Finance Journey

```text
Vehicle Details
→ Finance Calculator
→ Enter Inputs
→ Calculate
→ Verify Result
```

E2E coverage must include important failure and edge cases.

---

# 12. Finance Calculator Testing

The finance calculator is business-critical and requires deterministic testing.

Test:

* Vehicle price
* Down payment
* Loan amount
* Interest rate
* Loan duration
* Monthly payment
* Zero/invalid values
* Boundary values
* Decimal values
* Large values
* Invalid combinations
* Rounding behavior
* Expected financial formula/results

The calculation logic must be covered by unit tests and the complete calculator journey must be covered by E2E testing.

---

# 13. Security Rules

Security must be enforced at trust boundaries.

Never rely only on frontend checks.

Verify:

* Authentication
* Authorization
* Role permissions
* Resource ownership
* RLS policies
* Server-side validation
* Storage permissions
* Admin permissions

Never expose:

* Service-role keys
* Secrets
* Private credentials
* Sensitive internal data

Any unauthorized action must be rejected by the appropriate backend/data boundary.

---

# 14. DRY and Reuse Rules

Before creating new code, inspect for existing:

* Components
* Hooks
* Utilities
* Types
* Schemas
* Queries
* Validation
* Business rules
* Design patterns

Do not duplicate:

* Business logic
* Validation rules
* Database logic
* UI components
* Types
* Constants

If similar logic appears multiple times, evaluate whether it should become a shared abstraction.

Do not create abstractions solely to avoid two or three lines of duplication when doing so makes the code harder to understand.

Optimize for **appropriate reuse**, not abstraction for its own sake.

---

# 15. Regression Rules

A change that breaks existing functionality or E2E flows is a regression.

Before release:

```text
ALL REQUIRED TESTS MUST PASS.
```

No critical/high release blockers may remain.

When fixing a bug:

```text
Bug
 ↓
Root Cause
 ↓
Fix
 ↓
Regression Test
 ↓
Full Relevant Test Suite
```

Do not fix symptoms while leaving the underlying defect unresolved.

---

# 16. Git Rules

Use feature-specific branches.

Examples:

```text
feature/authentication
feature/showroom-management
feature/vehicle-management
feature/marketplace
feature/finance-calculator
feature/admin-dashboard
fix/vehicle-upload
security/rls-policy
refactor/shared-components
chore/test-setup
```

Rules:

* Never commit directly to `main` for feature work.
* Never commit secrets.
* Inspect Git status before making changes.
* Keep commits focused.
* Do not use destructive Git commands casually.
* Do not rewrite shared history without explicit approval.
* Keep PR scope focused.

Preferred commit format:

```text
feat: add vehicle management
fix: validate finance calculator inputs
test: add marketplace e2e flow
refactor: extract shared vehicle card
security: enforce vehicle ownership
```

---

# 17. Progress Tracking

Maintain:

```text
.claude/docs/MVP_PROGRESS.md
```

Update it whenever:

1. Feature status changes.
2. Tests change status.
3. E2E coverage is created or completed.
4. A PR is created.
5. A PR receives review.
6. Review issues are fixed.
7. A PR is approved or merged.
8. A blocker is discovered or resolved.
9. A feature reaches production.
10. A significant engineering decision is made.

Never mark an item complete without verifying it.

The tracker must represent the **actual codebase state**, not intended work.

---

# 18. Status Vocabulary

Use these statuses consistently:

```text
TODO
IN_PROGRESS
TESTING
PR_OPEN
CHANGES_REQUESTED
APPROVED
MERGED
BLOCKED
PRODUCTION
```

---

# 19. Seven-Day Execution Plan

## DAY 1 — Foundation

### Project

* [ ] Repository setup
* [ ] Next.js/TypeScript setup
* [ ] Tailwind/design system
* [ ] Supabase setup
* [ ] Environment configuration
* [ ] Database foundation
* [ ] Seed/test data
* [ ] Error handling
* [ ] Logging
* [ ] Git conventions

### Authentication

* [ ] Registration
* [ ] Login
* [ ] Logout
* [ ] Password reset
* [ ] Session handling
* [ ] Role structure

### UI Foundation

* [ ] Layout
* [ ] Header
* [ ] Navigation
* [ ] Responsive foundation
* [ ] Loading states
* [ ] Empty states
* [ ] Error states

### Engineering

* [ ] Unit test setup
* [ ] Integration test setup
* [ ] E2E framework
* [ ] CI checks
* [ ] Claude configuration
* [ ] Agents
* [ ] Skills
* [ ] Figma integration

### Day 1 Gate

* [ ] Application runs locally
* [ ] Supabase connected
* [ ] Authentication works
* [ ] Required tests execute successfully

---

## DAY 2 — Showrooms + Vehicles

### Showrooms

* [ ] Create showroom
* [ ] Showroom profile
* [ ] Edit showroom
* [ ] Showroom listing
* [ ] Showroom details

### Vehicles

* [ ] Add vehicle
* [ ] Edit vehicle
* [ ] Delete vehicle
* [ ] Vehicle images
* [ ] Vehicle specifications
* [ ] Pricing
* [ ] Vehicle status
* [ ] Vehicle listing

### Admin

* [ ] Admin dashboard foundation
* [ ] Showroom management
* [ ] Vehicle management

### Testing

* [ ] Unit tests
* [ ] Integration tests
* [ ] E2E showroom flow
* [ ] E2E vehicle flow
* [ ] Figma visual QA

### Day 2 Gate

A showroom can manage its vehicles and authorized admins can manage showroom/vehicle data.

---

## DAY 3 — Marketplace

### Vehicle Discovery

* [ ] Vehicle listing
* [ ] Search
* [ ] Filters
* [ ] Sorting
* [ ] Pagination
* [ ] Vehicle detail page

### Showroom Discovery

* [ ] Showroom listing
* [ ] Search/filter
* [ ] Showroom detail
* [ ] Showroom vehicles

### Testing

* [ ] Search tests
* [ ] Filter tests
* [ ] Marketplace tests
* [ ] E2E marketplace flow
* [ ] Figma visual QA

### Day 3 Gate

Customers can discover vehicles/showrooms and view complete vehicle details.

---

## DAY 4 — Finance + Inquiry + Admin

### Finance Calculator

* [ ] Vehicle price
* [ ] Down payment
* [ ] Loan amount
* [ ] Interest rate
* [ ] Loan duration
* [ ] Monthly payment
* [ ] Validation
* [ ] Edge cases

### WhatsApp Inquiry

* [ ] Inquiry CTA
* [ ] Vehicle information
* [ ] Showroom information
* [ ] WhatsApp redirect
* [ ] Mobile behavior

### Admin

* [ ] Dashboard metrics
* [ ] User management
* [ ] Showroom approval/status
* [ ] Vehicle moderation
* [ ] Required admin controls

### Testing

* [ ] Finance tests
* [ ] Inquiry tests
* [ ] Admin tests
* [ ] E2E finance flow
* [ ] E2E inquiry flow
* [ ] E2E admin flow
* [ ] Figma visual QA

### Day 4 Gate

All major MVP business functionality exists and required tests pass.

---

## DAY 5 — Integration + Completion

Day 5 is primarily an integration and completion day.

Do not intentionally introduce large new features.

### Completion

* [ ] Finish incomplete features
* [ ] Connect modules
* [ ] Fix broken flows
* [ ] Responsive QA
* [ ] Validation review
* [ ] Loading states
* [ ] Error states
* [ ] Empty states
* [ ] RBAC checks
* [ ] Security review
* [ ] Performance review
* [ ] Database/index review

### Testing

* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] E2E tests pass
* [ ] Regression suite passes

### Release Candidate

* [ ] Production configuration
* [ ] Environment variables
* [ ] Production database review
* [ ] Build succeeds
* [ ] No critical/high blockers

### DAY 5 = FEATURE FREEZE

> No new MVP features after Day 5 unless explicitly approved.

---

# 20. DAY 6 — QA + E2E

Dedicated QA and E2E day.

Execute all critical journeys:

* [ ] Registration/login
* [ ] Marketplace browsing
* [ ] Search/filter
* [ ] Vehicle details
* [ ] Showroom management
* [ ] Vehicle management
* [ ] Admin workflows
* [ ] Finance calculator
* [ ] WhatsApp inquiry

For each critical flow:

* [ ] Happy path
* [ ] Invalid input
* [ ] Empty state
* [ ] Permission failure
* [ ] Important edge cases
* [ ] Error recovery
* [ ] Mobile behavior

### Bug Cycle

```text
QA
 ↓
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
Regression
```

### Day 6 Gate

* Zero critical bugs
* Zero high-severity release blockers
* All critical E2E flows passing
* Regression suite passing

---

# 21. DAY 7 — Final Regression + Production

## Final Regression

* [ ] Unit tests
* [ ] Integration tests
* [ ] E2E suite
* [ ] Security checks
* [ ] Performance checks
* [ ] Visual QA

## Production

* [ ] Production build
* [ ] Environment configuration
* [ ] Database verification
* [ ] Deploy
* [ ] Smoke tests
* [ ] Authentication verification
* [ ] Marketplace verification
* [ ] Vehicle pages verification
* [ ] Finance calculator verification
* [ ] WhatsApp verification
* [ ] Admin verification

Production must be deployed from the exact approved commit.

---

# 22. Production Release Gate

Production deployment is allowed only when:

* [ ] MVP requirements complete
* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] Critical E2E flows pass
* [ ] Regression suite passes
* [ ] Security checks pass
* [ ] Performance checks pass
* [ ] Visual QA completed
* [ ] No critical/high release blockers
* [ ] Code Review Agent approved required PRs
* [ ] Production environment verified
* [ ] Production build succeeds
* [ ] Release Agent approves
* [ ] Production smoke tests pass

Only then:

```text
READY FOR PRODUCTION 🚀
```

---

# 23. Agent Execution Rules

Before starting any task, the responsible agent must:

1. Read `CLAUDE.md`.
2. Read the relevant skill.
3. Read `.claude/docs/MVP_PROGRESS.md`.
4. Read relevant requirements and architecture documentation.
5. Inspect the existing code.
6. Inspect Figma when the task involves frontend UI.
7. Identify reusable code.
8. Understand dependencies.
9. Create/update the task TODO.
10. Implement the smallest correct solution.
11. Run appropriate tests.
12. Perform visual QA where applicable.
13. Perform security/performance checks where applicable.
14. Update documentation/progress.
15. Prepare the work for PR review.

Never assume a component, utility, API, database table, or feature does not exist without checking first.

---

# 24. Agent Handoff Rules

Agents must provide useful handoff context to the next agent.

A handoff should identify:

* What was changed
* Files/modules affected
* Decisions made
* Tests executed
* Known limitations
* Remaining issues
* Required next action

Do not silently pass unresolved problems to another agent.

A downstream agent may reject incomplete or unsafe work.

---

# 25. Scope Control

The five development days are fixed.

If a task threatens the schedule:

1. Identify the problem.
2. Report the blocker.
3. Propose the smallest MVP-compliant solution.
4. Do not silently increase scope.
5. Do not remove required testing.
6. Do not skip security.
7. Do not skip E2E coverage for critical journeys.
8. Do not skip required PR review.

Priority:

```text
MVP Requirements
        ↓
Critical User Journeys
        ↓
Security
        ↓
Testing
        ↓
Production Readiness
        ↓
Performance
        ↓
Nice-to-have improvements
```

Nice-to-have improvements should be postponed when they threaten the deadline.

---

# 26. Forbidden Behaviors

Claude Code must NOT:

* Invent requirements.
* Invent Figma designs.
* Guess existing architecture without inspection.
* Duplicate existing functionality unnecessarily.
* Bypass RLS.
* Trust frontend authorization alone.
* Expose service-role credentials.
* Commit secrets.
* Commit directly to `main` for feature work.
* Merge without required Code Review approval.
* Skip required E2E tests.
* Ignore failing tests.
* Ignore security findings.
* Ignore regressions.
* Introduce unnecessary dependencies.
* Introduce premature Phase 2 infrastructure.
* Perform broad unrelated refactors during feature work.
* Mark work complete without verification.
* Claim tests passed without actually running them.
* Claim visual QA passed without performing it when required.

---

# 27. Definition of Done

A feature is DONE only when:

* [ ] Requirement implemented
* [ ] Existing functionality verified
* [ ] Architecture is compliant
* [ ] Figma implemented where applicable
* [ ] Responsive behavior implemented
* [ ] Validation implemented
* [ ] Authorization verified
* [ ] Unit/integration tests added where appropriate
* [ ] Required E2E flow created/updated
* [ ] Edge cases considered
* [ ] No unnecessary duplication
* [ ] Visual QA completed where applicable
* [ ] Security review completed
* [ ] Performance reviewed where applicable
* [ ] Required regression tests pass
* [ ] PR created
* [ ] Code Review Agent approved
* [ ] Review findings resolved
* [ ] PR merged
* [ ] Progress tracker updated

---

# 28. Final Engineering Workflow

The complete project workflow is:

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
E2E TESTS
     ↓
VISUAL QA
     ↓
SECURITY REVIEW
     ↓
PERFORMANCE REVIEW
     ↓
SELF REVIEW
     ↓
PR
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
RELEASE AGENT
     ↓
DEPLOY
     ↓
SMOKE TESTS
     ↓
PRODUCTION VERIFICATION
     ↓
MVP_PROGRESS UPDATE
```

> **Golden Rule: Optimize for delivering a working, tested, secure, visually accurate, maintainable MVP within the seven-day schedule — not for generating more code.**
