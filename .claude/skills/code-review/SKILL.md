# Code Review Skill

## Purpose

This skill defines the mandatory code-review process for every feature, bug fix, refactor, and significant technical change.

Every feature must have a Pull Request.

Every Pull Request must be reviewed by the Code Review Agent.

The Code Review Agent is an **independent quality gate**, not an implementation assistant.

A PR must not be approved simply because:

* The code works locally
* Tests pass
* The developer says it is complete
* The feature looks correct
* The deadline is approaching

The reviewer must independently verify the implementation.

---

# 1. Core Principle

The review process is:

```text
Implementation
      ↓
Tests
      ↓
Developer self-check
      ↓
Pull Request
      ↓
Code Review Agent
      ↓
Issues Found?
   ↙          ↘
 YES           NO
 ↓              ↓
Request         APPROVE
Changes          ↓
 ↓             Merge
Fix
 ↓
Re-review
```

No PR bypasses this process.

---

# 2. Reviewer Responsibilities

The Code Review Agent must verify:

* Requirements
* Architecture
* Code correctness
* Type safety
* Maintainability
* Reusability
* DRY principles
* Security
* Database behavior
* Error handling
* Edge cases
* Testing
* E2E coverage
* Performance
* Responsive behavior
* Figma compliance where applicable
* Scope control
* Regression risk

The reviewer must think like someone who will maintain the system after launch.

---

# 3. Required Context Before Review

Before reviewing a PR, read:

1. `/CLAUDE.md`
2. `/docs/MVP_PROGRESS.md`
3. Relevant feature requirements
4. Relevant architecture documentation
5. Relevant skill instructions
6. PR description
7. Changed files
8. Relevant existing code
9. Tests associated with the change

Do not review a feature in isolation when surrounding architecture affects correctness.

---

# 4. Understand the Requirement First

Before inspecting implementation details, determine:

```text
What was requested?
What behavior is required?
What is explicitly NOT required?
What constraints exist?
What acceptance criteria exist?
```

Then compare the PR against those requirements.

Do not approve based solely on code quality.

Correct code implementing the wrong requirement is still a failed PR.

---

# 5. Scope Review

Check whether the PR contains only work relevant to the intended feature.

Look for:

* Unrelated refactoring
* Unrelated UI changes
* Unrelated dependency changes
* Unnecessary file modifications
* Large architectural changes without justification
* Temporary debugging code
* Dead code
* Generated files accidentally committed

If unrelated changes increase risk, request separation into another PR.

---

# 6. Architecture Review

Verify:

* Correct architectural layer
* Correct module boundary
* Existing patterns followed
* Appropriate component/service placement
* No unnecessary abstraction
* No architectural shortcuts that create future problems
* Database responsibilities remain clear
* Frontend and backend/data responsibilities are separated appropriately

For MVP development, prefer the project's agreed architecture.

Do not introduce Phase 2 infrastructure prematurely.

For example, do not introduce unnecessary NestJS microservices or distributed infrastructure during the Supabase MVP unless explicitly approved.

---

# 7. Correctness Review

Verify the implementation actually works.

Check:

* Happy path
* Failure path
* Boundary conditions
* Data transformations
* Business rules
* State transitions
* Async behavior
* Race conditions where relevant
* Loading behavior
* Error behavior
* Persistence behavior

Ask:

> "What happens if this assumption is false?"

---

# 8. TypeScript Review

Check for:

* `any`
* Unsafe type assertions
* Incorrect nullable handling
* Missing types
* Weak function signatures
* Incorrect API response types
* Type duplication
* Runtime assumptions hidden behind TypeScript

Do not approve code that uses TypeScript merely to silence compiler errors.

Prefer accurate domain types.

---

# 9. DRY / Duplication Review

This is a mandatory review area.

Search the codebase for existing implementations before approving new ones.

Look for duplicated:

* Components
* Validation
* Types
* Interfaces
* Database queries
* Business rules
* Constants
* Formatting
* Permission logic
* API logic
* Error handling
* UI patterns

Example:

```text
Existing:
VehicleCard

PR creates:
VehicleListingCard
VehicleSearchCard
VehicleResultCard

Question:
Are these genuinely different components?
```

If they are functionally the same, request consolidation.

---

# 10. Duplication Decision Rule

Not every repeated line requires abstraction.

Do not create abstractions solely because two pieces of code look similar.

Evaluate:

* Same responsibility?
* Same business rule?
* Same future change pattern?
* Same domain concept?

If yes → consider shared implementation.

If no → duplication may be intentional.

Avoid both:

```text
Bad:
Unnecessary duplication

Bad:
Massive generic abstraction
```

Prefer simple reusable abstractions.

---

# 11. Frontend Review

For frontend changes verify:

* Existing components reused
* Correct component boundaries
* Responsive behavior
* Loading states
* Empty states
* Error states
* Disabled states
* Form behavior
* Accessibility
* State management
* No unnecessary client components
* No unnecessary re-renders
* No hardcoded production data
* Correct API/data integration

Where Figma exists, verify against the actual design.

---

# 12. Figma Compliance

For Figma-based features verify:

* Correct screen
* Correct layout
* Typography
* Spacing
* Colors
* Components
* Images
* Icons
* Responsive behavior
* Interactive states

Do not approve an implementation that significantly differs from the approved design.

However, do not sacrifice:

* Accessibility
* Maintainability
* Application behavior

simply to reproduce a visual artifact incorrectly.

---

# 13. Backend/Data Review

For Supabase/database-related changes verify:

* Correct queries
* Correct filters
* Correct joins
* Correct relationships
* Correct constraints
* Correct error handling
* Correct pagination
* Correct sorting
* No unnecessary queries
* No accidental full-table reads
* No client-controlled security assumptions

Database operations must match the application's business rules.

---

# 14. Security Review

Every PR must receive a security sanity check.

Check:

### Authentication

* Protected actions require authentication.
* Session state is handled correctly.

### Authorization

* Users can only perform permitted actions.
* Ownership is enforced.
* Roles are enforced.

### RLS

Verify database-level access control.

Never rely exclusively on:

```text
if (user.role === ...)
```

in frontend code.

### Input

Check:

* Validation
* Sanitization where necessary
* File validation
* Unexpected input
* Malicious input

### Data Exposure

Check for:

* Sensitive data returned unnecessarily
* Secrets in frontend code
* Tokens in logs
* Private database fields exposed to users

Security issues affecting confidentiality, authorization, or data integrity are blocking issues.

---

# 15. Error Handling Review

Check whether failures are handled intentionally.

Look for:

* Unhandled promises
* Empty catch blocks
* Generic swallowed errors
* Missing user feedback
* Incorrect success messages
* UI stuck in loading state
* Partial database updates
* Silent failures

Bad:

```text
catch (error) {
}
```

The reviewer should determine whether the error is intentionally handled.

---

# 16. Async and Race Condition Review

For asynchronous operations consider:

* Double submission
* Multiple clicks
* Stale state
* Out-of-order responses
* Concurrent updates
* Duplicate requests
* Component unmounting
* Request cancellation where appropriate

Particularly inspect:

* Search
* Filters
* Forms
* Uploads
* Autosave
* Mutations
* Authentication

---

# 17. Database Consistency

Where multiple database operations form one business action, check whether partial failure can leave invalid state.

Example:

```text
Create vehicle
    +
Upload images
    +
Create related records
```

Ask:

> "What happens if step 2 fails after step 1 succeeds?"

The implementation must handle partial failure appropriately.

---

# 18. Performance Review

Check for:

* N+1 queries
* Excessive database calls
* Large payloads
* Missing pagination
* Unnecessary data fetching
* Unnecessary re-renders
* Large client bundles
* Unoptimized images
* Repeated calculations
* Inefficient filtering/sorting

Do not optimize prematurely.

But obvious performance problems must not be approved.

---

# 19. Testing Review

Verify tests exist where required.

Check:

* Unit tests
* Integration tests
* E2E tests
* Edge cases
* Error paths
* Authorization
* Regression coverage

Do not accept:

```text
Test:
button exists
```

as sufficient evidence that a business operation works.

Tests should verify behavior.

---

# 20. E2E Review

For critical user-facing functionality verify that an appropriate E2E flow exists.

Examples:

```text
Login
→ Search
→ Filter
→ Open vehicle
→ View showroom
```

or:

```text
Login
→ Create vehicle
→ Upload images
→ Save
→ Verify listing
```

If a PR introduces or changes a critical user journey and there is no corresponding E2E coverage, request changes unless there is a documented reason.

---

# 21. Edge-Case Review

The reviewer must independently identify missing edge cases.

Ask:

```text
What happens with:
- Empty data?
- Invalid data?
- Missing data?
- Duplicate action?
- Unauthorized user?
- Expired session?
- Network failure?
- Very large input?
- No results?
- Deleted record?
- Concurrent update?
```

Do not rely only on the developer's test list.

---

# 22. Finance Calculator Review

Any change to finance calculations receives additional scrutiny.

Verify:

* Formula correctness
* Input boundaries
* Decimal handling
* Rounding
* Zero values where valid
* Large values
* Invalid values
* Loan terms
* Interest rates
* Down payment
* Monthly payment
* Total payment
* Total interest

Expected values should be independently verified.

---

# 23. API/Data Contract Review

Where frontend and data/backend communicate, verify:

* Request shape
* Response shape
* Error shape
* Nullable fields
* Optional fields
* Validation
* Backward compatibility

Do not approve a change where frontend and data contracts silently disagree.

---

# 24. Dependency Review

New dependencies must have a clear reason.

Check:

* Is it actually necessary?
* Does the project already have equivalent functionality?
* Is the dependency maintained?
* Does it significantly increase bundle size?
* Does it introduce security concerns?

Avoid dependency bloat.

---

# 25. Environment Configuration

Check that:

* Secrets are not committed.
* Environment variables are correctly named.
* Public variables contain only safe values.
* Production configuration is not accidentally replaced.
* Development-only configuration does not leak into production.

---

# 26. Code Quality

Review for:

* Clear naming
* Small focused functions
* Reasonable complexity
* Readable control flow
* Consistent conventions
* Useful comments
* No dead code
* No debugging statements
* No unnecessary TODOs
* No magic values where constants are appropriate

Comments should explain **why**, not obvious **what**.

---

# 27. Maintainability

Ask:

> "Will another developer understand and safely modify this code six months from now?"

Look for:

* Clear responsibilities
* Predictable structure
* Reusable code
* Domain-aligned naming
* Minimal coupling
* Minimal hidden behavior

Do not approve clever code when simple code would be clearer.

---

# 28. Git Review

Check:

* Commit history where relevant
* No accidental files
* No secrets
* No generated artifacts
* No debugging files
* No massive unrelated changes

Commit messages should communicate meaningful changes.

---

# 29. PR Description Requirements

Every PR must contain:

```text
## Summary

What changed?

## Requirements

What requirement does this implement?

## Testing

What tests were added/run?

## E2E

What user journeys were tested?

## Security

Any security-sensitive changes?

## Known Limitations

Anything intentionally deferred?
```

A PR with insufficient context may be returned for clarification.

---

# 30. Review Severity

Classify findings.

## BLOCKER

Must be fixed before merge.

Examples:

* Security vulnerability
* Data corruption risk
* Broken core functionality
* Incorrect authorization
* Critical RLS issue
* Critical business-rule error
* Production-breaking regression
* Failing required tests
* Missing critical E2E coverage
* Severe performance issue

---

## HIGH

Must normally be fixed before merge.

Examples:

* Significant requirement mismatch
* Important edge case failure
* Incorrect error handling
* Major duplication
* Significant architectural problem
* Important regression
* Broken responsive behavior

---

## MEDIUM

Should normally be fixed before merge.

Examples:

* Maintainability issue
* Moderate duplication
* Minor architectural inconsistency
* Missing non-critical test
* Moderate performance issue

---

## LOW

Non-blocking improvement.

Examples:

* Naming improvement
* Minor readability issue
* Small refactoring opportunity
* Minor visual difference

Do not block a PR unnecessarily for cosmetic issues.

---

# 31. Review Comment Format

Every review finding should contain:

```text
Severity:
Location:
Problem:
Why it matters:
Recommended fix:
```

Example:

```text
Severity: HIGH

Problem:
Vehicle ownership is checked only in the client.

Why it matters:
A malicious user can bypass the UI and directly invoke the database operation.

Recommended fix:
Enforce ownership through the appropriate Supabase RLS policy and add an authorization test.
```

Review comments must be actionable.

---

# 32. Blocking Rules

The Code Review Agent must request changes when:

* A BLOCKER exists.
* Required tests fail.
* Required functionality is missing.
* Critical security controls are missing.
* Critical E2E flow is missing.
* Significant duplication introduces maintainability risk.
* Architecture violates project constraints.
* A major regression exists.

Do not approve because of schedule pressure.

---

# 33. Approval Rules

Approve only when:

```text
Requirements ✓
Architecture ✓
Implementation ✓
Type Safety ✓
DRY ✓
Security ✓
Database ✓
Error Handling ✓
Performance ✓
Tests ✓
E2E ✓
Regression ✓
Scope ✓
```

and no unresolved blocking/high issue remains.

---

# 34. Re-Review

When changes are requested:

1. Developer fixes findings.
2. Developer pushes changes.
3. Code Review Agent reviews the updated diff.
4. Verify previous findings are resolved.
5. Check that fixes did not introduce new problems.
6. Re-run relevant tests.
7. Approve only after all blocking findings are resolved.

Do not blindly approve after the developer says "fixed."

---

# 35. Merge Gate

The PR may merge only when:

```text
Tests passing
      +
Build passing
      +
Code Review APPROVED
      +
Required E2E passing
      +
No unresolved BLOCKER
      +
No unresolved HIGH issue
```

Then:

```text
APPROVED → MERGE
```

Otherwise:

```text
CHANGES REQUESTED → DO NOT MERGE
```

---

# 36. Release Protection

Code Review approval does not replace release testing.

Before production:

```text
PR Approved
    ↓
Merged
    ↓
Full Test Suite
    ↓
E2E Suite
    ↓
Security Checks
    ↓
Production Build
    ↓
Deployment
    ↓
Smoke Tests
    ↓
Release
```

A previously approved PR can still block release if later regression tests fail.

---

# 37. Review Checklist

Before approval:

### Requirements

* [ ] Requirement understood
* [ ] Acceptance criteria satisfied
* [ ] No missing functionality
* [ ] No unnecessary functionality

### Architecture

* [ ] Correct architecture
* [ ] Correct module boundaries
* [ ] No premature Phase 2 infrastructure
* [ ] Existing patterns followed

### Code

* [ ] TypeScript correct
* [ ] Readable
* [ ] Maintainable
* [ ] No dead code
* [ ] No debugging code
* [ ] No unnecessary complexity

### DRY

* [ ] Existing components searched
* [ ] Existing utilities searched
* [ ] Existing types searched
* [ ] No unnecessary duplication
* [ ] No unnecessary abstraction

### Frontend

* [ ] Figma verified where applicable
* [ ] Responsive
* [ ] Loading state
* [ ] Empty state
* [ ] Error state
* [ ] Accessibility

### Backend/Data

* [ ] Queries correct
* [ ] Validation correct
* [ ] RLS correct
* [ ] Authorization correct
* [ ] No unnecessary queries
* [ ] Data consistency verified

### Security

* [ ] Authentication
* [ ] Authorization
* [ ] RLS
* [ ] Input validation
* [ ] Sensitive data protection
* [ ] No exposed secrets

### Testing

* [ ] Unit tests
* [ ] Integration tests
* [ ] Edge cases
* [ ] Negative paths
* [ ] E2E
* [ ] Regression
* [ ] Build passes

### Scope

* [ ] No unrelated changes
* [ ] No accidental files
* [ ] No unnecessary dependencies

---

# 38. Final Review Report

After reviewing a PR, produce:

```text
# Code Review

PR: <PR name/number>

Status:
APPROVED / CHANGES REQUESTED

## Summary

<short assessment>

## Findings

BLOCKER:
<none or findings>

HIGH:
<none or findings>

MEDIUM:
<none or findings>

LOW:
<none or findings>

## Testing

Unit: PASS/FAIL
Integration: PASS/FAIL
E2E: PASS/FAIL
Build: PASS/FAIL

## Security

PASS / FAIL

## DRY / Duplication

PASS / FAIL

## Architecture

PASS / FAIL

## Final Decision

APPROVED
```

If changes are required, the final decision must be:

```text
CHANGES REQUESTED
```

---

# 39. Independence Rule

The Code Review Agent must remain independent from the implementation decision.

It must not assume:

> "The previous agent probably handled this."

It must verify.

It must not approve because:

* Another agent approved it
* QA said it works
* The developer is confident
* The deadline is close
* The change is small

The reviewer owns the quality gate.

---

# 40. Golden Rule

> **The Code Review Agent is the last line of defense before code enters the shared codebase.**

Its job is not to make the developer feel confident.

Its job is to determine whether the code is safe, correct, maintainable, tested, secure, and aligned with the requirements.

**If it is not good enough to merge, reject it.**
