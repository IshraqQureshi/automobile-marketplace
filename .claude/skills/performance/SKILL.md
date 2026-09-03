# Performance Skill

## Purpose

This skill defines the mandatory performance engineering process for the Automobile Marketplace MVP.

The goal is not premature optimization. The goal is to prevent obvious performance problems while keeping the MVP fast, simple, and maintainable.

**Optimize measurable bottlenecks, not theoretical ones.**

---

# 1. Performance Responsibilities

The Performance Agent is responsible for:

1. Identifying performance risks.
2. Measuring critical paths.
3. Reviewing frontend performance.
4. Reviewing database/query performance.
5. Reviewing network/API behavior.
6. Reviewing image and asset loading.
7. Detecting unnecessary renders and requests.
8. Validating performance before release.
9. Preventing performance regressions.

Performance issues must be reported with evidence whenever possible.

---

# 2. Performance Priorities

Prioritize performance in this order:

```text
User-visible critical paths
        ↓
Database/query performance
        ↓
Network/request performance
        ↓
Frontend rendering
        ↓
Assets/images
        ↓
Background/non-critical work
```

Do not spend significant development time optimizing code that has no measurable impact.

---

# 3. Critical User Journeys

The following flows should receive priority:

* Homepage loading
* Vehicle listing
* Vehicle search/filtering
* Vehicle detail page
* Authentication
* Finance calculator
* Inquiry/contact flow
* Admin vehicle management
* Image/file upload
* Any other journey identified as critical in requirements

These flows must remain usable under realistic data volumes.

---

# 4. Frontend Performance

Review:

* Unnecessary client components
* Excessive JavaScript
* Large dependencies
* Unnecessary re-renders
* Expensive computations
* Excessive state updates
* Duplicate API requests
* Waterfall requests
* Blocking operations
* Poor loading states
* Large images
* Missing image optimization
* Excessive DOM complexity

Prefer:

```text
Server rendering where appropriate
        ↓
Small client boundaries
        ↓
Efficient data fetching
        ↓
Optimized assets
        ↓
Minimal JavaScript
```

Do not convert server components to client components without a reason.

---

# 5. Next.js Performance

Review:

* Server vs Client Component usage
* Data-fetching strategy
* Route-level rendering
* Dynamic imports where justified
* Image optimization
* Font loading
* Metadata
* Caching strategy
* Static generation where appropriate
* Unnecessary client-side fetching

Avoid:

* Fetching data in the browser when server-side retrieval is more appropriate.
* Loading large libraries for simple functionality.
* Client-side rendering entire pages unnecessarily.
* Duplicate fetching between components.

Do not introduce complex caching infrastructure for the MVP without measurable need.

---

# 6. Database Performance

Supabase/PostgreSQL performance is a major priority.

Review:

* Query complexity
* Missing indexes
* Unnecessary columns
* Excessive joins
* Repeated queries
* N+1 queries
* Large result sets
* Inefficient filtering
* Sorting without appropriate indexes
* Pagination
* RLS query impact

Never retrieve an entire table when only a small subset is required.

Prefer:

```text
SELECT required fields
WHERE required conditions
ORDER BY indexed field where appropriate
LIMIT/PAGINATION
```

over unrestricted queries.

---

# 7. Pagination

Large datasets must not be loaded entirely into the browser.

Vehicle listings, inquiries, users, showroom data, and other growing datasets should use pagination when appropriate.

Example:

```text
Database
    ↓
Paginated query
    ↓
API/server layer
    ↓
Limited response
    ↓
UI
```

Pagination strategy should match the expected dataset and UX.

---

# 8. Search and Filtering

Vehicle search/filtering must be reviewed for:

* Query efficiency
* Index usage
* Number of filters
* Sorting
* Pagination
* Duplicate requests
* Debouncing where appropriate
* URL/state synchronization
* Empty results

Do not trigger a database request on every keystroke unless there is a clear requirement.

For search inputs, use appropriate debouncing or submit-based filtering.

---

# 9. Image and Asset Performance

Automobile listings may contain many images.

Review:

* Image dimensions
* Image format
* Compression
* Responsive sizing
* Lazy loading
* Thumbnail usage
* Gallery loading
* Storage/CDN behavior
* Duplicate image downloads

Do not load every full-resolution vehicle image immediately.

Prefer:

```text
Thumbnail → Listing
Optimized image → Detail
Full resolution → Explicit user action
```

where appropriate.

---

# 10. Network Performance

Review:

* Number of requests
* Request payload sizes
* Response sizes
* Duplicate requests
* Sequential request waterfalls
* Unnecessary polling
* API latency
* Failed/retried requests

Combine requests only when it meaningfully reduces latency without creating an unnecessarily complex API.

Avoid premature WebSockets, queues, or background infrastructure for MVP requirements.

---

# 11. API / Server Performance

Review:

* Slow server operations
* Repeated database calls
* Unnecessary serialization
* Large responses
* Blocking operations
* Error/retry behavior
* Expensive synchronous processing

Server operations should return only the data required by the consumer.

Never expose unnecessary database fields.

---

# 12. Finance Calculator Performance

The finance calculator should normally perform calculations locally when no server-side requirement exists.

Review:

* Excessive recalculation
* Unnecessary network requests
* Input handling
* Rendering performance
* Numerical correctness

Performance optimization must never change financial calculation accuracy.

Correctness takes priority over micro-optimizations.

---

# 13. Caching

Use caching only where there is a clear benefit.

Potential candidates:

* Mostly static vehicle/showroom information
* Public content
* Repeated expensive reads

Before introducing caching, identify:

```text
What is slow?
Why is it slow?
How often is it requested?
Can the data become stale?
What invalidates the cache?
```

Do not introduce complicated cache invalidation for a simple MVP feature.

---

# 14. Bundle and Dependency Review

For significant dependencies, evaluate:

* Bundle size
* Runtime cost
* Duplicate dependencies
* Whether the functionality can be implemented simply without the dependency

Do not add a large package for a small utility.

Every dependency should have a clear purpose.

---

# 15. Performance Testing

Performance testing should include realistic conditions.

Test:

* Normal dataset
* Larger realistic dataset
* Slow network
* Mobile viewport
* Multiple concurrent requests where relevant
* Large vehicle image sets
* Search/filter operations
* Database-heavy pages

Do not benchmark only against an empty database.

---

# 16. Performance Regression Testing

For every significant feature, compare performance before and after implementation when applicable.

Watch for:

* Increased bundle size
* Increased request count
* Increased database latency
* Increased page load time
* Increased image payload
* Increased memory usage
* New rendering bottlenecks

A feature that introduces a significant regression must be fixed or explicitly accepted before release.

---

# 17. Performance Budgets

Use practical budgets rather than arbitrary perfection.

Flag:

* Very large JavaScript bundles
* Very large images
* Excessive network requests
* Slow critical database queries
* Noticeable interaction delays
* Long loading states
* Significant performance regressions

Exact thresholds should be based on the application's actual requirements and measured baseline.

If a measurable project-specific performance budget is established, treat it as a release gate.

---

# 18. Production Verification

After deployment, verify critical performance characteristics:

* Homepage response
* Vehicle listing load
* Search/filter response
* Vehicle detail load
* Image loading
* Authentication flow
* Database operations
* Finance calculator interaction

Check production logs/monitoring for:

* Slow requests
* Database errors
* Repeated failures
* Timeouts
* Unexpected traffic-related issues

Production verification is part of the Deployment Skill.

---

# 19. Performance Issue Severity

Classify findings:

### BLOCKER

Performance makes the application unusable or creates serious operational risk.

Examples:

* Production page consistently fails to load.
* Database query causes severe production degradation.
* Critical flow times out.

### HIGH

Significant performance problem affecting an important user journey.

Examples:

* Vehicle listing becomes extremely slow with realistic data.
* Large images make mobile usage impractical.
* Major N+1 query.

### MEDIUM

Noticeable but non-critical performance issue.

Examples:

* Duplicate requests.
* Unnecessary re-rendering.
* Oversized dependency.

### LOW

Minor optimization opportunity with limited user impact.

Examples:

* Small bundle optimization.
* Non-critical rendering improvement.

---

# 20. Performance Review Process

For significant features:

```text
Feature implemented
        ↓
Measure critical path
        ↓
Inspect frontend
        ↓
Inspect database
        ↓
Inspect network
        ↓
Check assets
        ↓
Run realistic tests
        ↓
Identify regressions
        ↓
Fix significant issues
        ↓
Final performance review
```

The Performance Agent should work independently from the implementation agent where practical.

---

# 21. Performance + Code Review

Performance findings must be communicated to the Code Review Agent.

Code Review should verify:

* No obvious performance regressions.
* No unnecessary queries.
* No N+1 patterns.
* No unnecessary client-side processing.
* No excessive dependencies.
* No obvious large asset problems.
* No unnecessary network calls.

Performance approval does not replace Code Review approval.

---

# 22. Performance + E2E

E2E tests must verify that critical flows remain functional after performance-related changes.

Performance optimization must never break:

* Authentication
* Vehicle browsing
* Search/filtering
* Vehicle details
* Finance calculations
* Inquiry flow
* Admin workflows

After significant optimization, run the relevant regression E2E flows.

---

# 23. Performance + Security

Never sacrifice security for performance.

Do not:

* Remove authorization checks.
* Bypass RLS.
* Expose sensitive fields.
* Disable validation.
* Move sensitive operations to the client.
* Expose service-role credentials.

If security and performance conflict:

**Security wins.**

---

# 24. Phase 2 Considerations

The MVP uses Supabase.

Do not build Phase 2 infrastructure prematurely.

When migrating to NestJS later, preserve performance principles:

* Efficient PostgreSQL queries
* Proper indexing
* Pagination
* Query optimization
* API response minimization
* Caching only when justified
* Background processing only when justified
* Connection management
* Observability

The migration must not introduce unnecessary performance complexity.

---

# 25. Performance Report

The Performance Agent should produce a concise report:

```text
## Performance Report

Feature:
Commit:

### Frontend
Status:
Findings:

### Database
Status:
Findings:

### Network
Status:
Findings:

### Assets
Status:
Findings:

### Regression
Status:
Findings:

### Severity
BLOCKER / HIGH / MEDIUM / LOW / NONE

### Recommendation
APPROVED / CHANGES_REQUIRED
```

---

# 26. Definition of Done

Performance review is complete when:

* Critical paths were evaluated.
* No BLOCKER performance issues exist.
* No unresolved HIGH performance issues exist unless explicitly accepted.
* Database queries are appropriate for expected data volume.
* Large datasets are paginated where required.
* Images/assets are reasonably optimized.
* No obvious request waterfalls or duplicate requests remain.
* No significant regression was introduced.
* Relevant E2E tests pass.
* Findings are documented.

---

# Golden Rule

**Measure first. Optimize second.**

Do not turn a simple MVP into a distributed performance-engineering project.

Build the simplest architecture that performs well for the expected MVP scale, measure real bottlenecks, fix meaningful problems, and avoid premature infrastructure.
