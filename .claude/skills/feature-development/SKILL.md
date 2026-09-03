# Feature Development Skill

## Purpose

This skill defines the mandatory workflow for implementing any feature in the Automobile Marketplace MVP.

Every feature must move from requirement → implementation → testing → review → merge.

The goal is to deliver the smallest correct implementation while maintaining production quality.

---

# 1. Before Starting

Before writing code:

1. Read `/CLAUDE.md`.
2. Read `/docs/MVP_PROGRESS.md`.
3. Read all relevant skills.
4. Inspect the existing codebase.
5. Identify existing components, utilities, types, database tables, queries, and patterns that can be reused.
6. If the feature contains frontend work, inspect the relevant Figma design using the configured Figma integration/MCP.
7. Identify dependencies and potential risks.

Do not start implementation based only on the feature description.

---

# 2. Understand the Requirement

Determine:

* What problem does the feature solve?
* Who uses it?
* What is the expected behavior?
* What are the inputs?
* What are the outputs?
* What permissions are required?
* What happens when something fails?
* What are the important edge cases?
* Which existing features does it interact with?

Do not invent requirements.

If something is genuinely ambiguous and affects implementation, stop and request clarification rather than making a major assumption.

---

# 3. Create the Implementation Plan

Before coding, create a concise plan.

The plan should identify:

```text
Feature
├── Frontend changes
├── Backend/data changes
├── Database changes
├── Validation
├── Authentication/authorization
├── Tests
├── E2E flow
└── Figma/visual requirements
```

Prefer modifying existing code over creating parallel implementations.

---

# 4. Check Existing Code

Before creating anything new, search for:

* Existing components
* Existing pages
* Existing hooks
* Existing utilities
* Existing types
* Existing schemas
* Existing database queries
* Existing Supabase helpers
* Existing validation
* Existing UI patterns

If an appropriate implementation already exists, reuse it.

Do not create duplicate:

* Components
* Functions
* Types
* Validation
* Business logic
* Queries
* Constants

unless there is a clear reason.

---

# 5. Figma Workflow

For frontend features:

```text
Figma
 ↓
Inspect Design
 ↓
Identify Components
 ↓
Identify Assets
 ↓
Identify Responsive Behavior
 ↓
Map to Existing Components
 ↓
Implement
 ↓
Visual Verification
 ↓
Fix Differences
```

Figma is the visual source of truth.

Inspect:

* Layout
* Spacing
* Typography
* Colors
* Borders
* Radius
* Shadows
* Icons
* Images
* States
* Responsive layouts

Do not approximate an existing Figma design unnecessarily.

---

# 6. Implementation

Implement the smallest complete solution that satisfies the requirement.

Follow:

* Existing architecture
* TypeScript conventions
* Component conventions
* Database patterns
* Security rules
* Design system
* Validation patterns

Do not:

* Add unrelated features
* Refactor unrelated modules
* Introduce unnecessary libraries
* Create premature abstractions
* Rewrite working code without reason
* Ignore existing patterns

Keep changes focused on the feature.

---

# 7. Database Changes

When database changes are required:

1. Inspect the existing schema.
2. Reuse existing tables where possible.
3. Define appropriate relationships.
4. Add required indexes.
5. Add constraints where appropriate.
6. Consider nullable/default behavior.
7. Consider data integrity.
8. Configure appropriate RLS policies.
9. Test authorized and unauthorized access.

Never expose protected data simply because the frontend hides it.

Security must be enforced at the data/access layer.

---

# 8. Authentication & Authorization

For every protected feature determine:

* Is authentication required?
* Which role can access it?
* Which records can the user access?
* Can the user modify another user's data?
* Does Supabase RLS enforce the rule?

Never rely solely on frontend checks.

Frontend permission checks improve UX.

Backend/database authorization provides security.

---

# 9. Validation

Validate all external input.

Consider:

* Required fields
* Data types
* String length
* Numeric ranges
* Invalid values
* Malicious input
* Duplicate records
* Missing relationships
* Unauthorized operations

Validation should exist at the appropriate boundary and must not depend solely on client-side validation.

---

# 10. Error Handling

Every feature must handle expected failures.

Consider:

* Network failure
* Database failure
* Authentication failure
* Authorization failure
* Invalid input
* Missing records
* Duplicate records
* Upload failure
* Unexpected server errors

Provide appropriate:

* Loading states
* Empty states
* Error states
* Success feedback

Do not silently swallow errors.

Do not expose sensitive internal errors to users.

---

# 11. Testing

Testing must be implemented as part of the feature.

Do not postpone testing until the final QA phase.

### Unit Tests

Test isolated logic such as:

* Calculations
* Validation
* Business rules
* Utility functions

### Integration Tests

Test important interactions such as:

* Database operations
* Authentication
* Data workflows
* Module interactions

### E2E

Create or update the relevant complete user journey.

At minimum cover:

* Happy path
* Important invalid input
* Important permission failure
* Important edge case

---

# 12. E2E Flow Requirement

Every significant feature must map to an E2E flow.

Example:

```text
Vehicle Management

Login
 ↓
Open Vehicle Management
 ↓
Create Vehicle
 ↓
Enter Details
 ↓
Upload Images
 ↓
Save
 ↓
Verify Vehicle Appears
 ↓
Edit Vehicle
 ↓
Verify Changes
 ↓
Publish
 ↓
Verify Marketplace
```

The E2E test should validate the actual business outcome, not merely whether buttons can be clicked.

---

# 13. Visual QA

For frontend features:

1. Run the application.
2. Navigate to the implemented feature.
3. Compare against Figma.
4. Check desktop layout.
5. Check mobile layout.
6. Check important states.

Verify:

* Positioning
* Spacing
* Typography
* Sizing
* Colors
* Images
* Icons
* Responsive behavior

Fix material differences before proceeding.

---

# 14. Self-Review

Before creating the PR, perform a self-review.

Ask:

### Requirements

* Did I implement exactly what was requested?

### Architecture

* Did I follow existing architecture?
* Did I introduce unnecessary complexity?

### Code Quality

* Is the code readable?
* Is anything duplicated?
* Can existing code be reused?

### Security

* Are authorization rules enforced?
* Are RLS policies correct?
* Can unauthorized users access or modify data?

### Testing

* Are required tests present?
* Do they actually test meaningful behavior?
* Does the E2E flow pass?

### UI

* Does the implementation match Figma?
* Is it responsive?
* Are loading/error/empty states handled?

---

# 15. Run Verification

Before creating a PR, run the appropriate checks.

At minimum:

```text
TypeScript
Lint
Unit Tests
Integration Tests
E2E Tests
Build
```

If one fails:

1. Identify the cause.
2. Fix it.
3. Re-run the failed test.
4. Re-run the relevant regression tests.

Do not ignore failures.

---

# 16. Update Progress

Update:

```text
/docs/MVP_PROGRESS.md
```

Only mark development complete after verification.

Example:

```text
Feature: Finance Calculator

Development: 🔵
Tests: 🟢
E2E: 🟢
Visual QA: 🟢
Security: 🟢
PR: 🟡
Production: ⬜
```

Do not mark PR or production status until those stages actually occur.

---

# 17. Create the PR

Every feature requires its own PR.

PR should contain:

* What changed
* Why it changed
* Tests performed
* E2E flow
* Database changes
* Security considerations
* Screenshots/video where useful for frontend work

Keep the PR focused.

Do not mix unrelated features into the same PR.

---

# 18. Code Review Agent

After creating the PR:

```text
Developer
   ↓
PR
   ↓
Code Review Agent
```

The Code Review Agent must inspect:

* Requirements
* Architecture
* Code quality
* Duplication
* Security
* Database/RLS
* Error handling
* Tests
* E2E
* Performance
* Figma implementation

If issues are found:

```text
Review
 ↓
Fix
 ↓
Tests
 ↓
Review Again
```

Do not merge until the required review passes.

---

# 19. Merge

Only merge when:

* [ ] Implementation complete
* [ ] Tests pass
* [ ] E2E passes
* [ ] Visual QA passes where applicable
* [ ] Security checks pass where applicable
* [ ] Code Review Agent approves
* [ ] CI passes

Then:

```text
PR Approved
 ↓
Merge
 ↓
Update MVP_PROGRESS.md
```

---

# 20. Production Status

A merged feature is NOT automatically production.

Production status becomes:

```text
🚀 Production
```

only after:

1. Deployment succeeds.
2. Production smoke test passes.
3. The feature is verified in production.

---

# 21. Timebox Rule

The MVP has a fixed five-day development window.

If implementation starts consuming excessive time:

* Stop unnecessary refinement.
* Identify the blocker.
* Reduce complexity.
* Use the simplest MVP-compliant approach.
* Escalate genuine scope problems.

Never solve schedule pressure by removing:

* Security
* Required tests
* E2E testing
* Code review
* Critical validation

---

# 22. Final Feature Lifecycle

Every feature must follow:

```text
TODO
 ↓
Requirement Understood
 ↓
Figma Inspected
 ↓
Plan Created
 ↓
Implementation
 ↓
Unit/Integration Tests
 ↓
E2E
 ↓
Visual QA
 ↓
Security Review
 ↓
Self Review
 ↓
PR
 ↓
Code Review Agent
 ↓
Fixes
 ↓
Approval
 ↓
Merge
 ↓
Regression
 ↓
Deploy
 ↓
Production Smoke Test
 ↓
🚀 PRODUCTION
```

This workflow is mandatory unless the project owner explicitly approves an exception.
