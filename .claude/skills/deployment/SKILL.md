# Deployment Skill

## Purpose

This skill defines the mandatory deployment and release process for the Automobile Marketplace MVP.

The goal is to ensure every deployment is:

* Tested
* Reviewed
* Traceable
* Reproducible
* Secure
* Reversible where technically possible
* Verified after deployment

**Fast delivery does not justify bypassing release gates.**

---

# 1. Deployment Responsibilities

The Release/Deployment Agent is responsible for:

1. Validating release readiness.
2. Verifying all required checks passed.
3. Building the production application.
4. Applying database changes safely.
5. Deploying the application.
6. Running post-deployment smoke tests.
7. Monitoring for immediate failures.
8. Recording the release.
9. Initiating rollback when required.

The Deployment Agent must not override failed quality gates without explicit documented emergency approval.

---

# 2. Environment Strategy

Use three environments:

```text
Local
  ↓
Preview / Staging
  ↓
Production
```

## Local

Used for:

* Development
* Unit tests
* Integration tests
* Local E2E testing where applicable
* Linting
* Type checking
* Build validation

Never use production credentials or production data locally.

## Preview / Staging

Used for:

* PR validation
* Integration verification
* E2E testing
* Database/RLS verification
* Visual verification
* Release candidate validation

Preview/staging should closely match production configuration.

## Production

Used only for approved releases.

Production deployments must occur only after all mandatory release gates pass.

---

# 3. Required Release Gates

A production deployment is **BLOCKED** if any required gate fails.

Before deployment, verify:

* [ ] Feature requirements completed
* [ ] Architecture/implementation review completed
* [ ] PR created
* [ ] Code Review Agent approved PR
* [ ] No unresolved BLOCKER issues
* [ ] No unresolved HIGH issues
* [ ] TypeScript passes
* [ ] ESLint passes
* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] Required E2E flows pass
* [ ] Regression tests pass
* [ ] Security checks pass
* [ ] Build succeeds
* [ ] Database/RLS changes tested
* [ ] Environment variables verified
* [ ] No secrets committed
* [ ] MVP progress updated
* [ ] Release scope is known

**No production deployment is allowed when mandatory tests or reviews are failing.**

---

# 4. Pre-Deployment Validation

Run the project's configured validation commands.

At minimum:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If the project defines additional commands, they are also mandatory.

Run:

```bash
npm run test:e2e
```

when E2E tests are configured.

Do not assume a command passed because it passed previously.

Run validation against the current release commit.

---

# 5. Git and Release Verification

Before deployment:

```bash
git status
git branch --show-current
git log -n 5 --oneline
```

Verify:

* Correct branch/commit is being released.
* Working tree is clean.
* Intended PR was merged.
* No unexpected files are included.
* No debug code remains.
* No temporary test data remains.
* No credentials/secrets are committed.

Never deploy from an uncommitted working tree.

Production should be traceable to a specific commit.

---

# 6. Environment Variables and Secrets

Verify all required production environment variables exist.

Examples:

```text
NEXT_PUBLIC_*
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Use only variables actually required by the application.

Rules:

* Never commit secrets.
* Never print secrets in logs.
* Never expose service-role credentials to the browser.
* Never use development credentials in production.
* Never copy production secrets into source code.
* Verify client/server environment boundaries.

If an environment variable is missing or incorrectly configured:

**BLOCK deployment.**

---

# 7. Database and Supabase Deployment

Database changes require additional verification.

Before applying migrations:

1. Review migration files.
2. Verify migration ordering.
3. Check backward compatibility where applicable.
4. Verify indexes and constraints.
5. Verify RLS policies.
6. Verify affected queries.
7. Run database tests.
8. Confirm the migration targets the intended environment.

Never manually modify production data as a substitute for a migration unless it is a documented emergency operation.

## RLS

Any change involving:

* Users
* Vehicles
* Showrooms
* Inquiries
* Favorites
* Admin data
* Private records

must verify authorization and RLS behavior.

Test both:

```text
Authorized user → allowed
Unauthorized user → denied
```

## Migration Safety

Prefer migrations that can be safely applied without breaking the currently deployed application.

For risky schema changes:

```text
Expand
  ↓
Deploy compatible code
  ↓
Migrate data
  ↓
Switch usage
  ↓
Contract/remove old structure
```

Do not perform destructive schema changes casually.

Database rollback is not always equivalent to application rollback. If a migration is irreversible, document the recovery strategy before deployment.

---

# 8. Build and Deployment

The production build must be generated from the exact release commit.

Verify:

* Build succeeds.
* Required environment variables resolve correctly.
* No TypeScript errors exist.
* No unexpected build warnings indicate functional problems.
* Static assets are generated correctly.
* Server/client boundaries are correct.
* Production configuration is active.

Deploy using the project's configured hosting/CI/CD mechanism.

Do not introduce a new hosting provider or infrastructure pattern during a feature deployment unless explicitly approved.

---

# 9. Preview / Staging Validation

Before production, validate the release candidate.

Minimum checks:

### Application

* Homepage loads.
* Authentication works.
* Protected routes work.
* Main navigation works.
* Critical feature works.
* Forms submit correctly.
* Error states work.
* Loading states work.

### Database

* Reads work.
* Writes work.
* Authorization works.
* RLS works.
* No unexpected database errors occur.

### Critical User Journeys

Run the complete E2E flows defined by the Testing Skill.

Examples:

```text
User registration/login
    ↓
Browse vehicles
    ↓
View vehicle details
    ↓
Use finance calculator
    ↓
Submit inquiry
    ↓
Redirect/contact through WhatsApp
```

The exact flows must come from the current requirements.

---

# 10. Production Deployment

Deployment sequence:

```text
Release validation
      ↓
Final CI checks
      ↓
Database migration (if required)
      ↓
Production application deployment
      ↓
Deployment health check
      ↓
Smoke tests
      ↓
Monitoring
      ↓
Release marked successful
```

Do not declare success immediately after the hosting platform reports deployment success.

A successful deployment means:

> The application is deployed AND the critical user journeys work in production.

---

# 11. Production Smoke Tests

Immediately after deployment, verify critical functionality.

Minimum smoke-test categories:

* [ ] Homepage
* [ ] Authentication
* [ ] Protected route access
* [ ] Vehicle listing
* [ ] Vehicle detail
* [ ] Search/filtering
* [ ] Finance calculator
* [ ] Inquiry/contact flow
* [ ] WhatsApp redirect
* [ ] Admin functionality relevant to the release
* [ ] Database reads/writes
* [ ] Storage/file access where applicable

Also verify browser console and server logs for unexpected critical errors.

Smoke tests should use controlled test accounts/data where possible.

Do not create unnecessary real customer data.

---

# 12. Deployment Failure

If deployment fails:

1. Stop further release activity.
2. Capture the failure.
3. Identify whether application, database, configuration, or infrastructure caused it.
4. Do not repeatedly redeploy blindly.
5. Fix the root cause.
6. Re-run required validation.
7. Deploy again only after gates pass.

Status:

```text
BLOCKED
```

until the release is safe.

---

# 13. Rollback Strategy

Rollback should be considered when production has:

* Critical functionality broken
* Authentication failure
* Data corruption risk
* Security vulnerability
* Major database failure
* Widespread application errors
* Broken critical E2E journey
* Severe performance degradation

Preferred rollback:

```text
Identify bad release
      ↓
Restore previous known-good application version
      ↓
Verify production
      ↓
Assess database changes
      ↓
Monitor
```

Never automatically roll back database migrations without understanding their consequences.

If the database has changed incompatibly, application rollback alone may make the situation worse.

For irreversible migrations, use a forward-fix/recovery migration when appropriate.

---

# 14. Emergency Hotfix

Emergency deployment is allowed only for genuine production incidents.

Process:

```text
Incident identified
      ↓
Create hotfix branch
      ↓
Implement smallest safe fix
      ↓
Run targeted tests
      ↓
Run required regression tests
      ↓
Code Review Agent review
      ↓
Deploy
      ↓
Production smoke test
      ↓
Document incident
```

Never use "hotfix" as an excuse to bypass code review or testing for normal feature work.

---

# 15. Monitoring After Release

Immediately monitor:

* Application errors
* Authentication failures
* Database errors
* API failures
* Storage failures
* Unexpected client errors
* Performance degradation
* Failed critical workflows

If monitoring reveals a release-related critical issue, stop the release and evaluate rollback.

---

# 16. Release Tracking

After successful deployment, update:

```text
docs/MVP_PROGRESS.md
```

Record:

```text
Release:
Version/Commit:
Date:
Features:
PR:
Code Review:
Tests:
E2E:
Security:
Deployment:
Smoke Test:
Status:
Known Issues:
```

Recommended status:

```text
RELEASED
```

If any critical verification fails:

```text
BLOCKED
```

---

# 17. Release Agent Final Checklist

Before declaring RELEASED:

```text
[ ] Correct commit deployed
[ ] PR merged
[ ] Code Review approved
[ ] No BLOCKER/HIGH review issues
[ ] Lint passed
[ ] Typecheck passed
[ ] Unit tests passed
[ ] Integration tests passed
[ ] E2E passed
[ ] Regression tests passed
[ ] Security checks passed
[ ] Production build passed
[ ] Database migrations verified
[ ] RLS verified
[ ] Environment variables verified
[ ] Production deployment succeeded
[ ] Smoke tests passed
[ ] Critical logs checked
[ ] MVP_PROGRESS.md updated
```

If any mandatory item is unchecked:

**DO NOT RELEASE.**

---

# 18. Release Report

Every production release should produce a concise report:

```text
## Release Report

Release:
Commit:
Date:

### Included
- Feature:
- Feature:

### Quality Gates
- Code Review: APPROVED
- Unit Tests: PASS
- Integration Tests: PASS
- E2E: PASS
- Regression: PASS
- Security: PASS
- Build: PASS

### Deployment
- Database Migration: PASS / N/A
- Application Deployment: PASS
- Smoke Tests: PASS

### Result
RELEASED

### Known Issues
- None
```

---

# 19. Definition of Done

A deployment is complete only when:

1. The intended code is deployed.
2. All mandatory quality gates passed.
3. Database changes are verified.
4. Security checks passed.
5. E2E journeys passed.
6. Production smoke tests passed.
7. No critical production errors are detected.
8. The release is recorded in `MVP_PROGRESS.md`.

Deployment success is **not** determined solely by CI or the hosting platform.

---

# Golden Rule

**No unreviewed code, failed required tests, failed E2E flows, unresolved security blockers, or unverified database changes may reach production.**

**Build → Test → Review → Deploy → Verify → Monitor → Record.**
