# Testing & QA Skill

## Purpose

This skill defines the mandatory testing process for the Automobile Marketplace.

Testing is not a final activity performed after development.

Testing happens continuously throughout feature development.

A feature is **not complete** because it works manually.

A feature is complete only when the required automated tests, edge-case tests, E2E flows, regression checks, and quality gates pass.

---

# 1. Core Testing Principle

Every feature follows:

```text
Requirement
    ↓
Implementation
    ↓
Unit Tests
    ↓
Integration Tests
    ↓
Edge-Case Tests
    ↓
E2E Tests
    ↓
Regression Tests
    ↓
Code Review
    ↓
PR Approval
    ↓
Merge
```

Never skip a testing stage because a feature appears simple.

---

# 2. Testing Responsibilities

## Development Agent

Responsible for:

* Writing unit tests
* Writing integration tests
* Testing normal and failure paths
* Fixing test failures
* Maintaining existing tests

## QA Agent

Responsible for:

* Functional testing
* Edge-case testing
* Regression testing
* Requirement verification
* Identifying missing test coverage
* Verifying error handling
* Verifying user-facing behavior

## E2E Agent

Responsible for:

* Complete user journeys
* Cross-page workflows
* Authentication flows
* Real application interactions
* Critical business flows
* Regression E2E tests

## Security Agent

Responsible for testing:

* Authentication
* Authorization
* RLS
* Privilege escalation
* Input validation
* Sensitive-data exposure
* Security-related failure paths

## Code Review Agent

Responsible for verifying:

* Tests exist
* Tests cover the requirement
* Tests cover important edge cases
* Tests are meaningful
* Existing tests still pass
* No functionality is bypassing test coverage

---

# 3. Test Pyramid

Use the appropriate level of testing.

```text
                 E2E
              /       \
         Integration
          /           \
       Unit Tests
```

Prefer many fast unit tests, appropriate integration tests, and focused E2E tests for critical user journeys.

Do not replace all testing with E2E tests.

---

# 4. Unit Testing

Unit tests should verify isolated business logic and reusable functionality.

Test:

* Utility functions
* Validation functions
* Data transformations
* Business rules
* Calculations
* Formatting
* Filtering
* Sorting
* Permission logic
* Form validation
* Reusable hooks
* Important component behavior

Examples:

```text
calculateFinancePayment()
validateVehicleData()
formatPrice()
canEditVehicle()
filterVehicles()
```

Each important business rule should have explicit tests.

---

# 5. Integration Testing

Integration tests verify that multiple parts of the application work together correctly.

Test combinations such as:

```text
Frontend
   ↓
Application logic
   ↓
Supabase
   ↓
PostgreSQL
```

Verify:

* Database queries
* Inserts
* Updates
* Deletes
* Authentication
* Authorization
* RLS
* Storage operations
* API/server interactions
* Validation
* Error handling

Do not mock away the entire system when the purpose of the test is to verify integration.

---

# 6. Database Testing

Database-related features must test:

### Create

* Valid data
* Missing required fields
* Invalid data
* Duplicate data
* Unauthorized user

### Read

* Correct records
* Empty results
* Pagination
* Filtering
* Sorting
* Unauthorized access

### Update

* Valid update
* Invalid update
* Non-existent record
* Unauthorized update
* Partial update

### Delete

* Valid deletion
* Non-existent record
* Unauthorized deletion
* Related records
* Repeated deletion

---

# 7. Supabase Testing

Because Supabase is the MVP backend, explicitly test:

* Authentication
* Session handling
* Database queries
* RLS policies
* Storage access
* Upload permissions
* User ownership
* Role-based access
* Unauthorized requests
* Expired/invalid sessions

Never assume that frontend restrictions provide security.

Security must be enforced at the data layer.

---

# 8. Edge-Case Testing

Every feature must identify realistic edge cases before being marked complete.

At minimum consider:

### Input

* Empty
* Null
* Undefined
* Minimum value
* Maximum value
* Very large value
* Invalid type
* Special characters
* Unexpected formatting
* Extremely long text

### Data

* No records
* One record
* Many records
* Duplicate records
* Missing optional fields
* Missing related records
* Deleted related record

### User

* Unauthenticated user
* Normal user
* Authorized user
* Unauthorized user
* Different roles

### Network

* Slow response
* Failed request
* Timeout
* Interrupted request
* Retry

### UI

* Mobile viewport
* Desktop viewport
* Long text
* Missing image
* Broken image
* Loading state
* Empty state
* Error state

---

# 9. Negative Testing

Do not test only what should work.

Test what should fail.

Examples:

```text
Invalid login → rejected
Unauthorized edit → rejected
Unauthorized delete → rejected
Invalid vehicle data → rejected
Duplicate submission → handled
Missing required field → rejected
Invalid file → rejected
Expired session → handled
Non-existent record → handled
```

A feature that fails safely is preferable to a feature that simply works in the happy path.

---

# 10. Authentication Testing

Authentication flows must include:

### Registration

* Valid registration
* Invalid email
* Weak password
* Existing email
* Missing fields
* Password mismatch

### Login

* Valid credentials
* Invalid password
* Unknown user
* Empty fields
* Session creation

### Logout

* Session removed
* Protected pages inaccessible
* UI reflects logged-out state

### Session

* Refresh
* Expiration
* Invalid session
* Unauthorized access

---

# 11. Authorization Testing

For every protected operation verify:

```text
Can this user perform this action?
```

Test:

* Correct role
* Incorrect role
* Resource owner
* Non-owner
* Unauthenticated user
* Manipulated IDs
* Direct database access attempts

Never trust IDs or permissions supplied by the client.

---

# 12. Form Testing

Every important form must test:

* Initial state
* Required fields
* Validation
* Invalid input
* Valid input
* Submit
* Loading state
* Duplicate submit
* Server error
* Success
* Reset/cancel behavior

Example:

```text
Fill form
    ↓
Submit
    ↓
Button disabled/loading
    ↓
Validation
    ↓
Database operation
    ↓
Success/error
    ↓
UI updated correctly
```

---

# 13. File Upload Testing

For image/file uploads test:

* Valid file
* Invalid file type
* Oversized file
* Empty file
* Multiple files
* Upload failure
* Storage permission failure
* Broken upload
* Delete/replacement
* Missing image

Never rely exclusively on frontend file validation.

---

# 14. E2E Testing

E2E testing must represent real user journeys.

Do not create E2E tests that simply verify individual pages load.

Example:

```text
Open website
    ↓
Register/Login
    ↓
Search vehicles
    ↓
Apply filters
    ↓
Open vehicle
    ↓
View showroom
    ↓
Calculate finance
    ↓
Submit inquiry/contact action
    ↓
Verify expected result
```

Each critical journey should be automated.

---

# 15. MVP E2E Flow Requirements

Create E2E flows for the actual MVP requirements.

At minimum identify flows for:

### Public User

* Visit homepage
* Browse vehicles
* Search vehicles
* Filter vehicles
* Open vehicle details
* View showroom
* Use finance calculator
* Start WhatsApp/chat inquiry flow

### Authentication

* Register
* Login
* Logout
* Access protected functionality

### Vehicle Management

Where applicable:

```text
Authorized user
→ create vehicle
→ verify vehicle
→ edit vehicle
→ verify update
→ delete/archive vehicle
→ verify removal
```

### Showroom Management

Where applicable:

```text
Authorized showroom user
→ create/update showroom information
→ manage vehicles
→ verify public showroom
```

### Super Admin

Test critical administrative journeys defined by the requirements.

Do not invent admin functionality that is not part of the MVP.

---

# 16. E2E Test Rules

E2E tests must:

* Start from a clean/known state
* Use predictable test data
* Avoid depending on another unrelated test
* Clean up created data where necessary
* Verify actual user-visible outcomes
* Test both success and important failure paths

Avoid:

```text
click button
→ wait 2 seconds
→ assume success
```

Prefer:

```text
click button
→ wait for expected application state
→ verify visible result
```

Do not use arbitrary sleeps when a deterministic wait/assertion is available.

---

# 17. Test Data

Test data must be controlled.

Use dedicated test users and test records.

Do not use real customer data.

Tests should not randomly modify production data.

Where practical:

```text
Test setup
    ↓
Create required data
    ↓
Run test
    ↓
Verify result
    ↓
Cleanup
```

---

# 18. Test Isolation

Tests must not depend on execution order.

Bad:

```text
Test A creates user
Test B assumes user exists
```

Better:

```text
Test A creates its own user
Test B creates its own user
```

Tests should be independently executable whenever practical.

---

# 19. Regression Testing

Whenever a feature changes existing functionality:

1. Run the feature tests.
2. Run related module tests.
3. Run the full relevant test suite.
4. Run critical E2E flows.
5. Verify no existing functionality broke.

Regression testing is mandatory before merge for changes affecting shared components, database schema, authentication, navigation, or business logic.

---

# 20. Shared Component Regression

If a shared component changes:

```text
Button
Input
Modal
Card
Navigation
VehicleCard
Form components
```

identify every important consumer and test affected screens.

Never assume a shared component change is isolated.

---

# 21. Test Coverage

Coverage is a signal, not the only quality metric.

Prioritize coverage for:

* Business logic
* Authentication
* Authorization
* Database operations
* Financial calculations
* Data validation
* Critical user journeys
* Security-sensitive functionality

Do not write meaningless tests merely to increase coverage percentage.

---

# 22. Finance Calculator Testing

The finance calculator is a business-critical MVP feature.

Test:

* Minimum vehicle price
* Large vehicle price
* Different down payments
* Zero/maximum down payment where valid
* Different loan terms
* Different interest rates
* Boundary values
* Invalid values
* Decimal values
* Rounding
* Monthly payment calculation
* Total payment
* Interest calculation

Verify calculations independently against known expected values.

A finance calculation must not be accepted merely because the UI displays a number.

---

# 23. Error Handling

Every important failure must produce predictable behavior.

Verify:

* User receives useful feedback
* No sensitive information is exposed
* Loading state ends
* Buttons become usable again where appropriate
* Partial state is not incorrectly saved
* Retry is possible where appropriate
* Application does not crash

---

# 24. Performance-Related Testing

For important data-heavy screens test:

* Pagination
* Large result sets
* Filtering
* Sorting
* Image loading
* Repeated requests
* Duplicate requests

Avoid loading an entire large dataset when pagination/filtering can be performed at the database level.

Performance issues discovered during testing must be reported rather than hidden.

---

# 25. Browser Testing

Critical E2E flows should be tested in the project's supported browsers.

At minimum verify the primary supported browser and responsive layouts.

If browser-specific behavior is discovered, document it and fix it when it affects MVP functionality.

---

# 26. Test Failure Rules

When a test fails:

```text
Test failure
    ↓
Determine root cause
    ↓
Fix implementation/test
    ↓
Run failed test
    ↓
Run related tests
    ↓
Run regression suite
```

Never:

* Delete a failing test without justification
* Weaken an assertion simply to make it pass
* Skip a test without documenting why
* Ignore intermittent failures
* Mark a feature complete with known critical failures

---

# 27. Flaky Tests

A flaky test is a defect in the testing system.

If a test passes and fails without a legitimate application change:

1. Identify the cause.
2. Fix the test/environment.
3. Make execution deterministic.
4. Re-run it repeatedly.
5. Only then mark it stable.

Do not permanently ignore flaky tests.

---

# 28. Feature Completion Gate

A feature cannot be marked complete until:

* [ ] Requirements implemented
* [ ] Unit tests written
* [ ] Integration tests written where applicable
* [ ] Positive paths tested
* [ ] Negative paths tested
* [ ] Edge cases tested
* [ ] Authentication tested where applicable
* [ ] Authorization tested where applicable
* [ ] Database behavior tested
* [ ] Error states tested
* [ ] Loading states tested
* [ ] Empty states tested
* [ ] E2E flow created where required
* [ ] E2E flow passes
* [ ] Relevant regression tests pass
* [ ] No critical test failures
* [ ] No known critical bugs

Only then can the feature proceed to PR.

---

# 29. PR Testing Gate

Before opening a PR:

```text
Lint
+
TypeScript
+
Unit Tests
+
Integration Tests
+
Relevant E2E Tests
+
Build
```

must pass.

The PR description must include:

* What was implemented
* Tests added
* Tests executed
* E2E flows covered
* Known limitations
* Any intentionally deferred issues

---

# 30. Code Review Testing Gate

The Code Review Agent must verify:

### Test Existence

Are tests present?

### Test Quality

Do tests verify actual behavior?

### Coverage

Are important paths covered?

### Edge Cases

Are realistic failure cases covered?

### Regression

Could the change break existing functionality?

### E2E

Are critical user journeys covered?

### Maintainability

Are tests understandable and maintainable?

The Code Review Agent must request changes when critical testing is missing.

---

# 31. Release Testing Gate

Before every production release:

```text
Install dependencies
    ↓
TypeScript check
    ↓
Lint
    ↓
Unit tests
    ↓
Integration tests
    ↓
E2E tests
    ↓
Production build
    ↓
Security checks
    ↓
Smoke test
    ↓
Release
```

A release must not proceed when critical tests fail.

---

# 32. Smoke Testing

Immediately after deployment verify critical functionality.

At minimum:

* Application loads
* Authentication works
* Homepage works
* Vehicle browsing works
* Vehicle detail works
* Showroom works
* Finance calculator works
* Critical database operations work
* No major console/runtime errors
* Critical E2E/smoke journey succeeds

---

# 33. Production Verification

After deployment:

1. Verify deployment succeeded.
2. Run smoke tests.
3. Check critical flows.
4. Check logs/errors.
5. Confirm database connectivity.
6. Confirm authentication.
7. Confirm storage where applicable.

If a critical production issue is discovered:

```text
Stop release
    ↓
Assess severity
    ↓
Fix or rollback
    ↓
Test fix
    ↓
Re-deploy
    ↓
Repeat smoke tests
```

---

# 34. Definition of Done

A feature is **DONE** only when:

```text
Implementation
      +
Automated Tests
      +
Edge Cases
      +
Integration
      +
E2E
      +
Regression
      +
Security
      +
Code Review
      +
PR Approval
```

are complete.

"Works on my machine" is not a completion criterion.

---

# 35. MVP Testing Strategy

Because the MVP has a compressed development schedule:

### Development Days 1–5

Testing happens alongside implementation.

Each completed feature must immediately receive:

* Unit tests
* Integration tests where applicable
* Edge-case tests
* Required E2E coverage

Do not postpone all testing until Day 6.

### QA Days 6–7

Perform:

* Full regression
* Full E2E suite
* Cross-feature testing
* Edge-case testing
* Security verification
* Performance sanity checks
* Production build verification
* Deployment smoke testing

---

# 36. Testing Priority

When time is constrained, prioritize:

### P0 — Must Pass

* Authentication
* Authorization
* Core vehicle browsing
* Vehicle details
* Showroom functionality
* Finance calculator
* Critical database operations
* Critical E2E journeys
* Security-sensitive functionality

### P1 — Must Pass Before Release

* Forms
* Search/filtering
* Responsive behavior
* Error handling
* File uploads
* Secondary user flows

### P2 — Polish

* Minor visual differences
* Non-critical edge cases
* Low-impact browser differences

P0 failures block release.

P1 failures normally block release.

P2 issues may be deferred only with explicit documentation.

---

# 37. Testing Documentation

When a new important E2E flow is created, document:

```text
Flow:
User:
Preconditions:
Steps:
Expected Result:
Test Data:
Cleanup:
```

Example:

```text
Flow: Vehicle Search

User: Public visitor

Preconditions:
Vehicles exist in test database.

Steps:
1. Open vehicle listing.
2. Enter search term.
3. Apply filter.
4. Submit search.

Expected:
Only matching vehicles are displayed.
```

---

# 38. Test Naming

Test names must describe behavior.

Good:

```text
should prevent unauthorized user from deleting vehicle
should calculate monthly payment correctly
should display empty state when no vehicles match
```

Bad:

```text
test1
vehicleTest
works
shouldWork
```

---

# 39. Testing Anti-Patterns

Never:

* Test only the happy path
* Test only manually
* Skip E2E for critical flows
* Mock everything
* Use production data
* Depend on test execution order
* Ignore flaky tests
* Disable validation to pass tests
* Remove assertions to make tests pass
* Skip regression after shared-code changes
* Mark features complete with failing tests
* Create tests that merely reproduce implementation details

---

# 40. Final Quality Gate

Before the project can be released, the Testing/QA Agent must provide a final report containing:

```text
Total tests:
Passed:
Failed:
Skipped:
E2E flows:
E2E passed:
Critical bugs:
High bugs:
Medium bugs:
Low bugs:
Known limitations:
Release recommendation:
```

The release recommendation must be one of:

```text
APPROVED
```

or

```text
BLOCKED
```

The Testing/QA Agent must not approve a release with unresolved P0 failures.

---

# Golden Rule

> **Every feature must prove that it works, prove that it fails safely, prove that it works with real integrations, and prove that existing functionality still works.**

Testing is a release gate, not a checkbox.
