# Architecture Skill

## Purpose

This skill defines how architecture decisions are made, documented, reviewed, and implemented for the Automobile Marketplace MVP.

The objective is to build a **production-quality but appropriately simple MVP** that can evolve into the Phase 2 NestJS architecture without prematurely implementing Phase 2 infrastructure.

**Architecture must serve the product, not the other way around.**

---

# 1. Architectural Principles

All architectural decisions must follow these principles:

1. Prefer simplicity.
2. Prefer modularity.
3. Avoid premature infrastructure.
4. Keep business logic separated from UI concerns.
5. Keep database access organized.
6. Reuse shared logic and components.
7. Make security boundaries explicit.
8. Make important decisions traceable.
9. Design for change where change is reasonably expected.
10. Do not build Phase 2 before Phase 2 is required.

---

# 2. MVP Architecture

The MVP stack is:

```text
Next.js
TypeScript
Tailwind CSS
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
```

The default architectural approach is:

```text
Next.js Application
        ↓
Application / Feature Modules
        ↓
Supabase
        ↓
PostgreSQL
```

Use a modular application structure rather than creating a distributed architecture.

Do not introduce microservices for the MVP.

Do not introduce a separate NestJS backend unless explicitly required.

---

# 3. Modular Monolith Principle

The MVP should behave as a modular monolith.

Organize functionality around business domains/features rather than creating one large undifferentiated codebase.

Potential modules include:

```text
Authentication
Vehicles
Showrooms
Search
Favorites
Inquiries
Finance Calculator
Admin
Users
Media
```

The actual module list must follow the approved requirements.

Each module should have clear responsibilities.

Avoid unnecessary coupling between modules.

---

# 4. Separation of Responsibilities

Keep responsibilities separated.

```text
UI
 ↓
Application logic
 ↓
Data access
 ↓
Database
```

Do not put complex business rules directly into UI components.

Do not duplicate database queries across unrelated components when a shared data-access abstraction is appropriate.

Do not create abstractions merely for theoretical purity.

Use the simplest structure that keeps responsibilities clear.

---

# 5. Feature Boundaries

Each feature should define:

* Requirements
* User flows
* Data requirements
* UI components
* Business rules
* Validation
* Authorization
* Database interactions
* Tests
* E2E coverage

A feature must not silently modify unrelated domains.

If a feature requires changes across multiple modules, document the dependency.

---

# 6. Component Architecture

Frontend components should be divided logically.

Prefer:

```text
Shared UI components
        ↓
Feature components
        ↓
Page/route composition
```

Examples of shared components:

* Button
* Input
* Modal
* Card
* Table
* Pagination
* Form controls
* Loading states
* Error states
* Empty states

Do not create multiple components that perform essentially the same job.

Follow the DRY principle.

However:

**Do not create a generic abstraction before there is meaningful reuse.**

---

# 7. Business Logic

Business rules must have a clear home.

Examples:

* Finance calculations
* Vehicle validation
* Inquiry rules
* Permission checks
* Status transitions
* Filtering logic

Business logic should not be duplicated across:

```text
Page
Component
API/data layer
Admin interface
Tests
```

Create shared logic when the same rule is required in multiple places.

The Finance Calculator is particularly sensitive:

**A UI refactor must never silently change financial calculation behavior.**

---

# 8. Data Access

Database access must be organized consistently.

Avoid scattering raw database operations throughout UI components.

Prefer a predictable pattern such as:

```text
Feature
  ↓
Data access function
  ↓
Supabase
  ↓
PostgreSQL
```

Data-access functions should:

* Request only required fields.
* Apply appropriate filters.
* Respect authorization.
* Handle errors.
* Avoid unnecessary queries.
* Avoid N+1 patterns.
* Support pagination where required.

---

# 9. Database Architecture

PostgreSQL is the primary persistence layer.

Database design must consider:

* Correct relationships
* Primary keys
* Foreign keys
* Constraints
* Indexes
* Nullable fields
* Unique constraints
* Timestamps
* Appropriate data types
* RLS policies

Do not duplicate information unnecessarily.

Prefer relational integrity over application-only assumptions.

For important business rules, enforce correctness at the database level where appropriate.

---

# 10. Supabase Architecture

Supabase provides:

```text
Authentication
Database
Storage
Row Level Security
```

Treat Supabase as infrastructure, not as a place to put uncontrolled application logic.

The application must maintain clear boundaries around:

* Authentication
* Authorization
* Database access
* Storage access
* Server-only operations

The service-role key must never be exposed to client-side code.

---

# 11. Authentication and Authorization

Authentication answers:

> Who is the user?

Authorization answers:

> What is the user allowed to do?

These are separate concerns.

Every protected operation must verify authorization.

Examples:

```text
Unauthenticated user
    ↓
Access denied

Authenticated user
    ↓
Ownership/role checked
    ↓
Operation allowed
```

Do not rely solely on UI visibility for authorization.

Use Supabase RLS and server-side checks where required.

Detailed security requirements belong to `security/SKILL.md`.

---

# 12. RLS Architecture

Every Supabase table containing protected data must be evaluated for RLS.

For each policy define:

* Who can read?
* Who can insert?
* Who can update?
* Who can delete?
* Which records can they access?

Test:

```text
Correct user → allowed
Incorrect user → denied
Unauthenticated user → denied where required
Admin → appropriate access
```

Never assume an RLS policy works simply because it exists.

Test it.

---

# 13. Routing Architecture

Routes should reflect the application's business structure.

Separate:

```text
Public routes
Protected user routes
Admin routes
```

Protected routes must enforce authorization.

Do not rely on frontend navigation restrictions alone.

Route protection should be consistent across direct URL access, browser navigation, and programmatic requests.

---

# 14. State Management

Use the simplest state-management approach that satisfies the feature.

Prefer:

```text
Local state
        ↓
Server state/data fetching
        ↓
Shared state only when genuinely required
```

Do not introduce a global state library merely because one component needs shared state.

Before adding global state, determine whether the state can be handled through:

* URL state
* Server state
* Component state
* Context
* Existing application patterns

Consistency is more important than introducing another library.

---

# 15. API Boundaries

For MVP functionality that can safely operate directly through Supabase, do not create unnecessary API layers.

Create server-side boundaries when required for:

* Sensitive operations
* Service-role operations
* External integrations
* Server-only secrets
* Complex business logic
* Operations that should not be exposed to the client

Every new API endpoint should have a clear reason to exist.

---

# 16. Phase 2 NestJS Migration

The MVP may later migrate application/backend logic to NestJS.

Design today's code so the migration is practical without implementing NestJS prematurely.

Good boundaries include:

```text
UI
 ↓
Feature/Application Logic
 ↓
Data Access
 ↓
Supabase
```

The future architecture may become:

```text
Next.js
 ↓
NestJS
 ↓
Application Services
 ↓
PostgreSQL
```

Avoid tightly coupling UI components to deeply embedded database logic.

However:

**Do not create artificial interfaces, repositories, service layers, or abstractions solely because NestJS may exist later.**

Migration readiness means clean boundaries—not duplicated architecture.

---

# 17. Shared Types and Schemas

Types and validation schemas should have a clear source of truth.

Avoid defining the same domain shape repeatedly.

For example:

```text
Vehicle
VehicleCreateInput
VehicleUpdateInput
Inquiry
Showroom
User
```

should have consistent definitions.

Validation must exist at appropriate boundaries.

TypeScript types alone are not runtime validation.

Use runtime schemas where untrusted input enters the system.

---

# 18. Error Handling Architecture

Errors must be predictable.

Distinguish:

```text
Validation Error
Authentication Error
Authorization Error
Not Found
Database Error
External Service Error
Unexpected Error
```

Do not expose sensitive internal errors to users.

Do not silently swallow errors.

Logging and user-facing messages should have separate concerns.

---

# 19. Loading, Empty, and Error States

Every asynchronous feature must consider:

```text
Loading
Success
Empty
Error
```

Where applicable also handle:

```text
Unauthorized
Not Found
Partial failure
Retry
```

These states are part of architecture because they affect data flow and component boundaries.

They must not be treated as an afterthought.

---

# 20. File and Image Architecture

Vehicle images and other uploaded files should use the application's configured storage mechanism.

Architecture must define:

* Who can upload?
* Who can access?
* Where files are stored?
* File naming strategy
* Allowed file types
* Size limits
* Ownership
* Deletion behavior

Do not store large binary files directly in PostgreSQL.

Storage authorization must be tested.

---

# 21. Performance-Aware Architecture

Architecture decisions must consider:

* Query count
* Dataset size
* Request count
* Rendering strategy
* Image size
* Pagination
* Dependency cost

But performance must not become an excuse for unnecessary infrastructure.

Do not introduce:

* Redis
* RabbitMQ
* Microservices
* Kubernetes
* Complex caching
* Event buses
* Dedicated API gateways

unless an actual MVP requirement demands them.

Performance-specific decisions belong to `performance/SKILL.md`.

---

# 22. Security-Aware Architecture

Every architectural decision involving data or permissions must consider security.

Review:

* Trust boundaries
* Client/server boundaries
* Authentication
* Authorization
* RLS
* Secrets
* Input validation
* File access
* Admin operations
* Sensitive data

Security must be designed into the architecture rather than patched in afterward.

Detailed security requirements belong to `security/SKILL.md`.

---

# 23. Architecture Decision Records

Significant architectural decisions should be documented.

Use:

```text
docs/architecture/
```

when architectural documentation is required.

An Architecture Decision Record should contain:

```text
# Decision

## Context
What problem are we solving?

## Decision
What are we choosing?

## Alternatives
What alternatives were considered?

## Reason
Why was this selected?

## Consequences
What does this make easier/harder?

## Migration Impact
Does this affect future architecture?

## Status
Proposed / Accepted / Superseded
```

Do not create ADRs for trivial implementation choices.

---

# 24. Architecture Review Process

The Architect Agent should review significant features before implementation.

Process:

```text
Requirement
    ↓
Understand existing architecture
    ↓
Identify affected modules
    ↓
Identify data changes
    ↓
Identify security boundaries
    ↓
Identify performance implications
    ↓
Evaluate reuse
    ↓
Choose simplest viable design
    ↓
Document significant decisions
    ↓
Implementation
```

The Architect Agent should inspect the existing codebase before proposing new structures.

Never design in isolation from the current implementation.

---

# 25. Existing Code First

Before creating:

* New component
* New utility
* New hook
* New data-access function
* New validation schema
* New type
* New helper
* New library

search the codebase first.

If an existing solution can reasonably be reused, reuse it.

If the existing abstraction is unsuitable, explain why before replacing it.

This prevents architectural drift and duplication.

---

# 26. Dependency Decisions

Before introducing a new dependency:

1. Check whether the project already provides the functionality.
2. Check existing dependencies.
3. Evaluate package size.
4. Evaluate maintenance/reliability.
5. Evaluate security.
6. Determine whether the dependency is genuinely necessary.

Avoid adding libraries for trivial functionality.

Every dependency increases maintenance and security surface.

---

# 27. Architecture Change Risk

Classify architectural changes:

### LOW

Local implementation change with no meaningful architectural impact.

### MEDIUM

Changes shared components, data access, or multiple modules.

### HIGH

Changes:

* Database schema
* Authentication
* Authorization
* RLS
* Storage
* Core data flow
* Routing architecture
* Major dependencies

### CRITICAL

Changes that could:

* Break production data
* Weaken security
* Require migration
* Affect most application modules
* Change the fundamental deployment architecture

HIGH and CRITICAL changes require explicit Architect Agent review.

---

# 28. Anti-Patterns

Avoid:

* God components
* God modules
* Duplicate business logic
* Duplicate types
* Random utility folders
* Circular dependencies
* Direct database calls everywhere
* Client-side authorization as the only protection
* Unnecessary global state
* Premature abstraction
* Premature microservices
* Premature caching
* Over-engineered repository/service layers
* Copy-pasted feature implementations
* Hidden business rules

When an anti-pattern is discovered, fix the underlying architectural problem rather than adding another abstraction around it.

---

# 29. Architecture + Code Review

Code Review must verify that implementation follows the approved architecture.

Review:

* Module boundaries
* Reuse
* DRY
* Data access
* Types
* Business logic placement
* Security boundaries
* Database changes
* Dependencies
* Performance implications
* Future migration impact

Architecture approval does not replace Code Review approval.

---

# 30. Architecture + Testing

Architecture must make testing practical.

Features should allow testing of:

* Business rules
* Data access
* Authorization
* Validation
* Error handling
* UI behavior
* Complete E2E journeys

If a design makes testing unnecessarily difficult, reconsider the design.

---

# 31. Architecture + Deployment

Deployment architecture must remain simple for the MVP.

Every production dependency must have a clear operational reason.

Before introducing infrastructure, answer:

```text
Why is it required?
What problem does it solve?
Can the MVP work without it?
What is the operational cost?
What is the failure mode?
How will it be monitored?
How will it be removed or migrated later?
```

If these questions cannot be answered clearly:

**Do not introduce the infrastructure.**

---

# 32. Definition of Done

An architecture review is complete when:

* Requirements are understood.
* Existing code was inspected.
* Affected modules are identified.
* Data changes are understood.
* Security boundaries are defined.
* Performance implications are considered.
* Existing reusable code was evaluated.
* No unnecessary infrastructure was introduced.
* Architecture is testable.
* Significant decisions are documented.
* Implementation follows the approved design.

---

# 33. Architect Agent Final Decision

The Architect Agent should produce one of:

```text
APPROVED
```

or

```text
CHANGES_REQUIRED
```

or

```text
BLOCKED
```

### APPROVED

Architecture is appropriate and implementation may proceed.

### CHANGES_REQUIRED

The design needs modification before implementation.

### BLOCKED

The requirement is unclear, unsafe, contradictory, or requires a major architectural decision that has not been resolved.

---

# Golden Rule

**Build the simplest architecture that solves today's problem cleanly while keeping tomorrow's change possible.**

Do not build Phase 2 today.

Do not sacrifice maintainability for speed.

Do not sacrifice security for convenience.

Do not sacrifice correctness for architecture purity.

**Simple → Modular → Testable → Secure → Performant → Evolvable.**
