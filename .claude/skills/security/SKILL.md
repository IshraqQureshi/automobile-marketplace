# Security Skill

## Purpose

This skill defines the mandatory security standards for the Automobile Marketplace.

Security is not a final-stage activity.

Every feature must be designed, implemented, tested, and reviewed with security in mind.

The application must never rely on the frontend alone for authorization or data protection.

The database and server-side boundaries must enforce security independently.

---

# 1. Core Security Principle

The security process is:

```text
Requirement
    ↓
Threat Identification
    ↓
Secure Design
    ↓
Implementation
    ↓
Security Tests
    ↓
Security Review
    ↓
Code Review
    ↓
PR Approval
    ↓
Merge
```

Security issues affecting authentication, authorization, data confidentiality, or data integrity are release blockers.

---

# 2. Security Responsibilities

## Developer Agent

Responsible for:

* Secure implementation
* Input validation
* Safe data handling
* Correct authentication usage
* Correct authorization
* Avoiding secrets in code
* Writing security-related tests

## Security Agent

Responsible for:

* Threat analysis
* Authentication review
* Authorization review
* RLS review
* Storage policy review
* Input validation review
* Sensitive-data review
* Security testing
* Vulnerability identification

## QA Agent

Responsible for:

* Unauthorized-user testing
* Invalid-input testing
* Permission-boundary testing
* Security regression testing

## Code Review Agent

Responsible for verifying that security requirements are actually implemented before approving the PR.

---

# 3. Security Priority

Security findings are classified as:

### P0 — Critical

Immediately blocks merge and release.

Examples:

* Authentication bypass
* Authorization bypass
* RLS bypass
* Cross-user data access
* Sensitive data exposure
* Privilege escalation
* Database manipulation by unauthorized users
* Exposed production secrets
* Critical injection vulnerability

### P1 — High

Blocks merge unless explicitly accepted by the project owner.

Examples:

* Missing authorization on important functionality
* Weak storage permissions
* Important input-validation bypass
* Sensitive information exposed unnecessarily
* Significant abuse/rate-limit vulnerability

### P2 — Medium

Must normally be fixed before release.

### P3 — Low

Non-blocking improvement unless combined with another vulnerability.

---

# 4. Threat Modeling

For every significant feature ask:

```text
Who can access this?
What can they read?
What can they create?
What can they modify?
What can they delete?
What happens if they manipulate the request?
What happens if they are not authenticated?
What happens if they have the wrong role?
What happens if they access another user's ID?
```

Think beyond the intended UI.

Assume a malicious user can:

* Inspect network requests
* Modify request parameters
* Modify IDs
* Call database/API operations directly
* Skip frontend validation
* Reuse old requests
* Submit requests repeatedly

Never trust the client.

---

# 5. Authentication

Authentication must be handled through the project's approved authentication mechanism.

Verify:

* Registration
* Login
* Logout
* Session persistence
* Session refresh
* Session expiration
* Invalid sessions
* Protected routes
* Protected mutations

Never implement custom password storage when the authentication provider already provides secure authentication.

Never store passwords in application tables.

---

# 6. Protected Routes

Every protected page/action must verify authentication.

Examples:

```text
Dashboard
Vehicle management
Showroom management
Admin functionality
User-specific data
```

Frontend route protection improves UX.

It must not be considered the security boundary.

The actual operation must also enforce authorization.

---

# 7. Authorization

Authorization answers:

> "Is this authenticated user allowed to perform this specific action on this specific resource?"

Check:

* Role
* Ownership
* Resource relationship
* Action
* Current state

Example:

```text
User A
    ↓
Vehicle belonging to User B
    ↓
Edit?
    ↓
MUST BE DENIED
```

Never authorize based solely on a client-provided role.

---

# 8. Role-Based Access Control

Where roles exist, define permissions explicitly.

Example:

```text
Public
    → Browse public content

Authenticated User
    → User-specific actions

Showroom User
    → Manage permitted showroom resources

Super Admin
    → Administrative functionality
```

Do not scatter role strings throughout the application.

Prefer centralized role/permission definitions.

---

# 9. Ownership Checks

For user-owned resources verify ownership at the data/security layer.

Example:

```text
UPDATE vehicle
WHERE id = requestedVehicleId
AND owner_id = authenticatedUserId
```

The client must never be trusted to provide:

```text
owner_id = currentUser
```

without server/database enforcement.

---

# 10. Supabase Row Level Security

RLS is a mandatory security boundary for protected database tables.

For every protected table determine:

```text
SELECT
INSERT
UPDATE
DELETE
```

and define who may perform each operation.

Do not enable RLS without actually defining the required policies.

Do not assume that hiding a UI action protects the database.

---

# 11. RLS Policy Review

For every RLS policy verify:

### SELECT

Can the user see only records they are permitted to see?

### INSERT

Can the user create only permitted records?

### UPDATE

Can the user modify only permitted records?

### DELETE

Can the user delete only permitted records?

Also verify:

* Ownership
* Roles
* Relationships
* Public/private visibility
* Administrative access

---

# 12. RLS Testing

Security tests must attempt unauthorized operations directly.

Examples:

```text
User A reads User B's private record
→ DENIED

User A updates User B's vehicle
→ DENIED

User A deletes User B's vehicle
→ DENIED

Unauthenticated user modifies vehicle
→ DENIED
```

Do not test only through the UI.

The security boundary must be tested directly.

---

# 13. Service-Role Keys

Supabase service-role credentials provide elevated privileges.

Rules:

* Never expose service-role keys to the browser.
* Never commit them to Git.
* Never place them in `NEXT_PUBLIC_*` variables.
* Use them only in trusted server-side environments.
* Minimize where elevated credentials are used.

If a service-role credential is exposed, treat it as a critical security incident.

---

# 14. Environment Variables

Separate public and private configuration.

Safe public configuration may include values intentionally designed for browser use.

Private secrets include:

* Service-role keys
* API secrets
* Signing secrets
* Private tokens
* Deployment credentials

Never hardcode secrets.

Never commit `.env` files containing secrets.

Verify `.gitignore` protects local secret files.

---

# 15. Input Validation

Validate all externally supplied data.

Sources include:

* Forms
* Query parameters
* URL parameters
* Request bodies
* File uploads
* Search strings
* IDs
* Filters
* Sorting parameters

Validate:

* Type
* Required fields
* Length
* Range
* Format
* Allowed values

Frontend validation is useful for UX.

Server/database validation is the security boundary.

---

# 16. Schema Validation

Use centralized schemas for important data structures.

Avoid repeating validation logic across:

```text
Frontend
API
Database
```

where a shared or appropriately layered schema can safely be used.

Validation must remain correct even when requests bypass the frontend.

---

# 17. Injection Protection

Never construct database queries by concatenating untrusted input.

Avoid unsafe dynamic query construction.

Use the project's supported query mechanisms and parameterized operations.

Be careful with:

* Search
* Sorting
* Filtering
* IDs
* Dynamic SQL
* Raw queries

User-controlled values must never become executable database syntax.

---

# 18. XSS Protection

Treat user-generated content as untrusted.

Do not render arbitrary HTML unless there is a clear, reviewed requirement.

Be especially careful with:

* Vehicle descriptions
* Showroom descriptions
* User names
* Inquiry content
* URLs
* Imported content

Avoid unsafe HTML rendering.

If HTML must be supported, sanitize it using an approved approach.

---

# 19. URL Security

User-controlled URLs must be validated where they are rendered or used.

Be careful with:

* External links
* Redirects
* Image URLs
* WhatsApp links
* Query parameters

Avoid open redirects.

Do not allow arbitrary protocols where only HTTP/HTTPS should be accepted.

---

# 20. File Upload Security

File uploads must be treated as untrusted.

Validate:

* File type
* MIME type
* File size
* Extension
* Number of files
* Storage path
* User permission

Do not trust only the filename extension.

Verify storage permissions through Supabase Storage policies.

---

# 21. Storage Security

For private files verify:

* User authentication
* Ownership
* Read permissions
* Upload permissions
* Delete permissions

Public assets should be intentionally public.

Do not accidentally make private user data publicly accessible through storage.

---

# 22. Vehicle Image Security

Vehicle images must:

* Be uploaded only by authorized users
* Respect file-size limits
* Respect supported formats
* Use controlled storage paths
* Not expose private files accidentally

Where possible, organize paths by resource/user ownership.

Example:

```text
vehicles/{vehicleId}/{imageId}
```

Access must still be enforced by policy.

A predictable path is not a security mechanism.

---

# 23. Sensitive Data

Do not collect or store information that the MVP does not require.

Minimize sensitive data.

Do not expose internal fields through public queries.

Review API/database responses for:

* Private user information
* Internal IDs where unnecessary
* Authentication metadata
* Administrative information
* Internal notes
* Secrets
* Private contact information

Return only what the client needs.

---

# 24. WhatsApp / Inquiry Flow

The MVP inquiry/chat functionality redirects users toward WhatsApp.

Verify:

* No unnecessary sensitive data is exposed
* User-controlled values are encoded safely
* URLs are constructed safely
* Redirect behavior is predictable
* No unauthorized private data is included in the generated message

Do not place secrets or internal application data into WhatsApp URLs.

---

# 25. Super Admin Security

Super Admin functionality requires strict authorization.

Verify:

```text
Normal User
    → Admin page DENIED

Showroom User
    → Admin page DENIED

Unauthenticated User
    → Admin page DENIED

Super Admin
    → Allowed
```

Do not rely on:

```text
if (isAdmin) {
   showAdminPage()
}
```

alone.

The underlying data operations must also enforce administrative authorization.

---

# 26. IDOR Protection

Protect against Insecure Direct Object Reference vulnerabilities.

Example attack:

```text
/user/123
```

changed to:

```text
/user/124
```

The application must verify whether the authenticated user is allowed to access resource `124`.

Never assume that knowing an ID grants access.

Test manipulated:

* User IDs
* Vehicle IDs
* Showroom IDs
* Image IDs
* Inquiry IDs
* Administrative resource IDs

---

# 27. Enumeration Protection

Consider whether users can discover sensitive information by changing IDs or iterating through predictable resources.

Do not expose unnecessary:

* User existence information
* Private vehicle records
* Internal identifiers
* Administrative records

Public resources can remain intentionally discoverable when required by the marketplace.

---

# 28. Rate Limiting and Abuse

For public or abuse-sensitive operations consider:

* Login attempts
* Registration
* Search
* Inquiry submission
* File uploads
* Expensive database operations
* Admin operations

The MVP should avoid obvious abuse paths.

If a limitation is not implemented because of MVP scope, document it rather than pretending the risk does not exist.

---

# 29. Duplicate Submission Protection

Important mutations should handle repeated requests safely.

Examples:

```text
Double-click submit
Refresh after submission
Repeated request
Network retry
```

Where appropriate, use:

* Idempotency
* Unique constraints
* Duplicate detection
* Transactional logic

Do not rely only on disabling a button.

---

# 30. Race Conditions

Security-sensitive operations must consider concurrent requests.

Example:

```text
Request A → authorized
Request B → modifies same resource
```

Check whether concurrent requests can bypass:

* Ownership
* State restrictions
* Limits
* Business rules

Database constraints should be used where appropriate.

---

# 31. Business Logic Security

Security is not only authentication.

Protect business rules such as:

```text
Who can create?
Who can edit?
Who can delete?
Who can publish?
Who can view private information?
Who can manage a showroom?
Who can perform administrative actions?
```

Never assume that because a user is authenticated, they can perform every operation.

---

# 32. Finance Calculator Security

The finance calculator is primarily a correctness feature, but inputs must still be validated.

Protect against:

* Negative prices
* Negative down payments
* Invalid interest rates
* Invalid loan terms
* Extremely large numbers
* Non-numeric input
* Infinity/NaN
* Malformed decimal values

Do not allow malformed values to crash the application or produce unsafe downstream behavior.

---

# 33. Client-Side Security

Never treat these as security boundaries:

```text
Hidden button
Disabled button
Hidden page
Client-side role check
Client-side validation
Obfuscated URL
```

They improve user experience.

Security must exist behind the client.

---

# 34. Logging

Never log:

* Passwords
* Authentication tokens
* Service-role keys
* API secrets
* Sensitive personal information

Logs should contain enough context to debug issues without exposing sensitive data.

---

# 35. Error Messages

Errors must be useful without leaking internal details.

Avoid exposing:

* SQL errors
* Database schema
* Internal stack traces
* Secrets
* Authentication internals
* Sensitive identifiers

Production users should receive safe application-level errors.

Detailed debugging belongs in controlled server logs.

---

# 36. Dependency Security

Before adding a dependency:

* Determine whether it is necessary.
* Check maintenance status.
* Check known security concerns.
* Avoid unnecessary packages.
* Prefer existing project dependencies where appropriate.

Do not add a dependency for functionality that can reasonably be implemented using existing project capabilities.

---

# 37. Security Testing

Security testing must include:

### Authentication

* Unauthenticated access
* Invalid session
* Expired session

### Authorization

* Wrong role
* Non-owner
* Manipulated resource ID

### Database

* Unauthorized SELECT
* Unauthorized INSERT
* Unauthorized UPDATE
* Unauthorized DELETE

### Storage

* Unauthorized upload
* Unauthorized read
* Unauthorized delete

### Input

* Invalid data
* Oversized data
* Malformed data
* Unexpected characters

### Abuse

* Duplicate requests
* Repeated submissions
* Large input
* Excessive requests where relevant

---

# 38. Security Regression

When modifying:

* Auth
* Roles
* RLS
* Storage policies
* Shared authorization logic
* Database schema
* User-owned resources

run the relevant security regression suite.

Security regressions are release blockers.

---

# 39. Security Review Checklist

Before approving a security-sensitive feature:

### Authentication

* [ ] Protected functionality requires authentication
* [ ] Session handling is correct
* [ ] Logout works
* [ ] Expired sessions are handled

### Authorization

* [ ] Role permissions verified
* [ ] Ownership verified
* [ ] Unauthorized access denied
* [ ] IDs cannot bypass authorization

### Database

* [ ] RLS enabled where required
* [ ] SELECT policy reviewed
* [ ] INSERT policy reviewed
* [ ] UPDATE policy reviewed
* [ ] DELETE policy reviewed

### Storage

* [ ] Upload permissions correct
* [ ] Read permissions correct
* [ ] Delete permissions correct
* [ ] File validation implemented

### Input

* [ ] Input validated
* [ ] Length/range limits applied
* [ ] Unsafe values handled

### Secrets

* [ ] No secrets in source
* [ ] No service-role key exposed
* [ ] Environment variables correct

### Data

* [ ] No unnecessary sensitive data
* [ ] Public/private data boundaries verified

### Testing

* [ ] Security tests exist
* [ ] Unauthorized paths tested
* [ ] Regression tests pass

---

# 40. Security Feature Completion Gate

A security-sensitive feature cannot be marked complete until:

```text
Threats identified
      ↓
Authentication verified
      ↓
Authorization verified
      ↓
RLS verified
      ↓
Input validation verified
      ↓
Storage verified where applicable
      ↓
Security tests pass
      ↓
Regression tests pass
      ↓
Code Review approved
```

---

# 41. Security Incident Rule

If a critical vulnerability is discovered:

```text
STOP
 ↓
Do not merge/release
 ↓
Determine impact
 ↓
Fix vulnerability
 ↓
Add regression test
 ↓
Security review
 ↓
Full relevant test suite
 ↓
Code review
 ↓
Resume release
```

If the vulnerability may already exist in production:

* Determine affected resources.
* Rotate exposed secrets where necessary.
* Restrict affected access.
* Patch the vulnerability.
* Verify the patch.
* Document the incident.

---

# 42. MVP Security Priorities

Because this is an MVP, prioritize security around:

### P0

* Authentication
* Authorization
* Supabase RLS
* Super Admin protection
* User/resource ownership
* Sensitive data exposure
* Service-role key protection
* Storage permissions

### P1

* Input validation
* File upload security
* Duplicate submissions
* Abuse protection
* Safe errors
* Logging

### P2

* Advanced rate limiting
* Advanced monitoring
* Additional hardening

MVP speed must never justify bypassing P0 security.

---

# 43. Phase 2 Migration Rule

The MVP uses Supabase.

Phase 2 may introduce a NestJS backend.

Security responsibilities must migrate with the architecture.

Do not assume:

```text
Supabase → NestJS
```

automatically preserves security.

Before migration verify:

* Authentication model
* Authorization model
* Database access
* RLS strategy
* Server-side authorization
* API validation
* Storage access
* Secrets
* Logging
* Security tests

Security behavior must remain equivalent or stronger after migration.

---

# 44. Security Sign-Off

For significant security changes, the Security Agent must provide:

```text
# Security Review

Feature:
Status:

## Threats Identified

<summary>

## Authentication

PASS / FAIL

## Authorization

PASS / FAIL

## RLS

PASS / FAIL

## Storage

PASS / FAIL / N/A

## Input Validation

PASS / FAIL

## Sensitive Data

PASS / FAIL

## Secrets

PASS / FAIL

## Security Tests

PASS / FAIL

## Findings

P0:
<none or findings>

P1:
<none or findings>

P2:
<none or findings>

## Final Decision

APPROVED / BLOCKED
```

---

# 45. Final Security Gate

A feature must not merge when:

* P0 vulnerability exists
* Authentication can be bypassed
* Authorization can be bypassed
* RLS is incorrectly configured
* Unauthorized users can access protected data
* Sensitive data is exposed
* Secrets are exposed
* Critical security tests fail

The Security Agent must explicitly mark the feature:

```text
SECURITY APPROVED
```

before a security-sensitive feature proceeds through the final merge/release process.

---

# 46. Golden Rule

> **Never trust the client. Never assume authorization. Enforce security at the data/server boundary, test the boundary directly, and treat security failures as release blockers.**
