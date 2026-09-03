# Git & Pull Request Skill

## Purpose

This skill defines the mandatory Git workflow for the Automobile Marketplace.

Every feature, bug fix, refactor, security change, database change, and significant configuration change must follow the project's PR workflow.

No direct commits to the protected main branch.

No feature is considered complete until its PR is reviewed and approved.

---

# 1. Core Workflow

Every change follows:

```text
Task
 ↓
Create Branch
 ↓
Implement
 ↓
Test
 ↓
Self Review
 ↓
Commit
 ↓
Push
 ↓
Open PR
 ↓
Automated Checks
 ↓
Code Review Agent
 ↓
Changes Required?
 ↙              ↘
YES              NO
 ↓                ↓
Fix              APPROVE
 ↓                ↓
Push             Merge
 ↓
Re-review
```

---

# 2. Protected Branches

The primary production branch must be protected.

The default branch should be:

```text
main
```

Rules:

* No direct feature commits to `main`.
* No direct force pushes to `main`.
* No bypassing required checks.
* No merging without Code Review approval.
* No merging with failing required tests.

If a different branch strategy is explicitly configured, follow that configuration.

---

# 3. Branch Naming

Use predictable branch names.

### Feature

```text
feature/<short-description>
```

Example:

```text
feature/vehicle-search
```

### Bug Fix

```text
fix/<short-description>
```

Example:

```text
fix/vehicle-filter-reset
```

### Security

```text
security/<short-description>
```

### Refactor

```text
refactor/<short-description>
```

### Chore

```text
chore/<short-description>
```

Use lowercase and hyphens.

Keep names short and meaningful.

---

# 4. One Feature, One Branch

A branch should represent one logical change.

Avoid combining:

```text
Vehicle search
+
Authentication refactor
+
Unrelated UI redesign
```

into one PR.

Separate unrelated work.

This keeps:

* Reviews smaller
* Testing clearer
* Rollbacks safer
* Debugging easier

---

# 5. Before Creating a Branch

Before starting:

1. Check current branch.
2. Check working-tree status.
3. Ensure existing changes are understood.
4. Update from the latest approved `main`.
5. Read `/CLAUDE.md`.
6. Read `/docs/MVP_PROGRESS.md`.
7. Read the relevant feature requirements.

Never accidentally overwrite existing work.

---

# 6. Working Tree Protection

Before changing branches:

```text
git status
```

must be inspected.

If uncommitted work exists:

* Understand what it belongs to.
* Do not discard it.
* Do not overwrite it.
* Do not mix unrelated changes into the new task.

Never run destructive Git commands without a clear reason.

Avoid commands such as:

```text
git reset --hard
git clean -fd
```

unless explicitly required and the affected changes are understood.

---

# 7. Branch Creation

Create the branch from the latest appropriate base.

Example:

```text
git checkout main
git pull
git checkout -b feature/vehicle-search
```

Use the project's configured Git commands if they differ.

After creation verify:

```text
git branch
git status
```

---

# 8. Development Rules

During implementation:

* Keep changes scoped.
* Commit logically.
* Do not commit secrets.
* Do not commit temporary files.
* Do not commit debugging artifacts.
* Do not modify unrelated files.
* Follow project architecture.
* Follow applicable Claude skills.

The feature-development skill remains the primary implementation workflow.

---

# 9. Commit Strategy

Commits should represent meaningful logical changes.

Good:

```text
feat: add vehicle search filters
test: add vehicle search coverage
fix: handle empty vehicle results
```

Avoid:

```text
update
changes
stuff
final
final2
fix again
```

Commit messages should explain what changed.

---

# 10. Commit Frequency

Do not commit every tiny edit.

Commit after meaningful milestones.

Example:

```text
Implementation
 ↓
Commit

Tests
 ↓
Commit

Bug fixes/refinement
 ↓
Commit
```

The exact number of commits is less important than maintaining a clear history.

---

# 11. Conventional Commit Format

Prefer:

```text
<type>: <description>
```

Common types:

```text
feat
fix
refactor
test
docs
chore
security
perf
```

Examples:

```text
feat: add showroom vehicle management
fix: prevent unauthorized vehicle updates
test: add finance calculator edge cases
security: enforce showroom ownership
perf: add vehicle listing pagination
```

---

# 12. Commit Safety

Before committing:

```text
git status
git diff
```

Review exactly what will be committed.

Never blindly run:

```text
git add .
```

when unrelated files may exist.

Prefer intentionally staging relevant files.

---

# 13. Secrets Protection

Before every commit verify that no secrets are included.

Never commit:

* `.env`
* Service-role keys
* API keys
* Passwords
* Tokens
* Private certificates
* Deployment credentials

Check:

```text
git diff
git status
```

If a secret was committed, treat it as a security incident.

Removing it from the latest commit may not be enough if it entered Git history.

---

# 14. Generated Files

Do not commit generated files unless the project explicitly requires them.

Examples:

* Build output
* Temporary logs
* Local cache
* Debug screenshots
* Test artifacts
* IDE files

Follow the project's `.gitignore`.

---

# 15. Pre-PR Validation

Before opening a PR, run the required project checks.

At minimum:

```text
TypeScript
+
Lint
+
Unit Tests
+
Integration Tests
+
Relevant E2E Tests
+
Production Build
```

Also run security checks when applicable.

All required checks must pass before requesting review.

---

# 16. Self Review

Before opening the PR, review the branch as if you were the Code Review Agent.

Check:

* Requirements
* Architecture
* Duplication
* Security
* Error handling
* Edge cases
* Tests
* E2E
* Responsive behavior
* Figma compliance
* Scope
* Unnecessary files

Run:

```text
git diff main...HEAD
```

or the project's equivalent comparison.

---

# 17. PR Creation

Every completed feature must create a Pull Request.

PR title should be concise and descriptive.

Examples:

```text
feat: add vehicle search and filtering
feat: add showroom management
fix: prevent unauthorized vehicle deletion
```

Do not create vague PR titles such as:

```text
Update
Changes
MVP work
Feature
```

---

# 18. PR Description

Every PR must contain:

```text
## Summary

What changed?

## Requirements

Which requirement does this implement?

## Implementation

How was it implemented?

## Testing

What tests were added/run?

## E2E

Which user journeys were tested?

## Security

What security considerations apply?

## Known Limitations

What is intentionally deferred?
```

Keep the description factual.

---

# 19. PR Checklist

Every PR should include:

```text
- [ ] Requirement implemented
- [ ] No unrelated changes
- [ ] TypeScript passes
- [ ] Lint passes
- [ ] Unit tests pass
- [ ] Integration tests pass where applicable
- [ ] E2E tests pass where applicable
- [ ] Security checks completed
- [ ] Production build passes
- [ ] Figma verified where applicable
- [ ] Responsive behavior verified
- [ ] No secrets committed
- [ ] Self-review completed
```

---

# 20. Automated Checks

The PR must run the project's automated checks.

Typical pipeline:

```text
Install
 ↓
Lint
 ↓
Type Check
 ↓
Unit Tests
 ↓
Integration Tests
 ↓
E2E Tests
 ↓
Build
```

If a required check fails:

```text
PR → BLOCKED
```

Do not bypass the failure.

---

# 21. Code Review Agent

Every PR must be reviewed by the Code Review Agent.

The reviewer must inspect:

* Requirements
* Architecture
* Code
* DRY
* Security
* Database
* Error handling
* Performance
* Tests
* E2E
* Scope

The Code Review Agent must independently verify the work.

See:

```text
.claude/skills/code-review/SKILL.md
```

for the full review process.

---

# 22. Review Outcomes

The Code Review Agent may return:

### APPROVED

No blocking issues remain.

### CHANGES REQUESTED

One or more issues must be fixed.

### BLOCKED

A critical issue prevents safe merge.

The PR cannot merge while changes are requested or blocked.

---

# 23. Handling Review Changes

When review feedback arrives:

```text
Review Finding
 ↓
Understand Root Cause
 ↓
Fix
 ↓
Add/Update Tests
 ↓
Run Relevant Tests
 ↓
Commit
 ↓
Push
 ↓
Re-review
```

Do not argue around a legitimate defect.

Do not simply modify code until the comment disappears.

Fix the underlying problem.

---

# 24. Review Comment Resolution

A review comment can be considered resolved only when:

* The underlying issue is fixed.
* Appropriate tests exist.
* Relevant tests pass.
* The change does not introduce a new issue.

The developer should not manually mark critical issues resolved without implementing the requested fix.

---

# 25. New Changes After Review

Whenever code changes after review:

1. Re-run relevant tests.
2. Review the new diff.
3. Ensure previous fixes remain correct.
4. Request another Code Review Agent pass when the change is material.

Do not assume the previous approval covers new code.

---

# 26. Merge Rules

Merge only when:

```text
PR Open
+
Required Checks PASS
+
Code Review APPROVED
+
No unresolved BLOCKER
+
No unresolved HIGH finding
```

Then:

```text
MERGE
```

Never merge because:

* The deadline is close.
* The feature is small.
* The developer says it is safe.
* QA says it looks good.
* It has been waiting for a long time.

---

# 27. Merge Strategy

Use the project's configured merge strategy.

For a small MVP team, prefer a strategy that keeps the main branch understandable.

Squash merging is generally preferred when individual development commits are noisy.

Example:

```text
feature branch
   ↓
multiple development commits
   ↓
PR
   ↓
review
   ↓
squash merge
   ↓
main
```

Do not rewrite shared branch history unnecessarily.

---

# 28. Merge Conflicts

When conflicts occur:

```text
Stop
 ↓
Understand both changes
 ↓
Resolve intentionally
 ↓
Run tests
 ↓
Review resulting diff
 ↓
Push
 ↓
Re-run required checks
 ↓
Code Review if material
```

Never blindly accept:

```text
ours
```

or:

```text
theirs
```

without understanding the functional consequences.

---

# 29. Main Branch Protection

After merge, verify:

* PR merged successfully
* CI passed
* Main branch is healthy
* No unexpected files were merged
* Progress tracker can be updated

Do not immediately start unrelated cleanup on `main`.

---

# 30. Hotfix Workflow

Critical production bugs may require an expedited workflow.

Use:

```text
hotfix/<short-description>
```

Process:

```text
Identify production issue
 ↓
Create hotfix branch
 ↓
Implement minimal fix
 ↓
Add regression test
 ↓
Run required tests
 ↓
Security review if applicable
 ↓
Code Review
 ↓
PR
 ↓
Merge
 ↓
Deploy
 ↓
Smoke test
```

A hotfix may be expedited.

It must not bypass security or code review for critical changes unless there is an explicitly documented emergency procedure.

---

# 31. Database Changes

Database changes must receive additional review.

A database PR should include:

* Schema changes
* Migration
* RLS changes
* Index changes
* Constraints
* Data migration where applicable
* Rollback considerations
* Tests

Do not manually change production schema without a tracked migration/process.

---

# 32. RLS Changes

Any RLS policy change must be treated as security-sensitive.

The PR must include:

* Policy change
* Reason
* Affected tables
* Allowed operations
* Security tests
* Unauthorized-access tests

Code Review and Security Review must verify the change.

---

# 33. Shared Component Changes

If a PR changes shared components:

```text
Identify consumers
 ↓
Check affected screens
 ↓
Run regression tests
 ↓
Verify visual behavior
 ↓
Run relevant E2E flows
```

A shared component PR has a larger regression surface.

---

# 34. Figma-Based PRs

For UI features, verify:

* Figma inspected
* Correct frame implemented
* Desktop verified
* Mobile verified
* States handled
* Assets correct
* Visual QA completed

The PR should mention the Figma source when applicable.

---

# 35. E2E Changes

When a PR adds or modifies a critical user journey:

* Add/update E2E test.
* Run the affected flow.
* Run related regression flows.
* Include E2E coverage in the PR description.

Do not merge critical user-flow changes without appropriate E2E coverage.

---

# 36. Progress Tracking

After successful merge:

Update:

```text
/docs/MVP_PROGRESS.md
```

Only mark the feature complete when:

```text
Implementation
+
Tests
+
E2E
+
Code Review
+
PR Approval
+
Merge
```

are complete.

Do not mark a feature complete when its PR is still open.

---

# 37. Task Status

Use clear states:

```text
TODO
IN_PROGRESS
TESTING
PR_OPEN
CHANGES_REQUESTED
APPROVED
MERGED
BLOCKED
```

Example:

```text
Vehicle Search

IN_PROGRESS
    ↓
TESTING
    ↓
PR_OPEN
    ↓
CHANGES_REQUESTED
    ↓
TESTING
    ↓
PR_OPEN
    ↓
APPROVED
    ↓
MERGED
```

---

# 38. PR Size

Prefer small, focused PRs.

Avoid enormous PRs containing multiple unrelated features.

If a feature is large, divide it into logical slices that can be independently tested.

However, do not split tightly coupled changes so aggressively that the repository spends time in invalid intermediate states.

---

# 39. Dependency Changes

Dependency changes must be clearly identified in the PR.

Explain:

* Why the dependency is needed.
* Where it is used.
* Why existing functionality is insufficient.

Run:

* Tests
* Build
* Security checks

after dependency changes.

---

# 40. No Bypass Rule

Never bypass:

* Branch protection
* Required CI checks
* Code review
* Security review where required
* Required E2E tests
* Failed build
* Failed critical tests

unless there is a formally defined emergency procedure.

A deadline is not an emergency procedure.

---

# 41. Emergency Procedure

If a true production emergency requires an exception:

```text
Incident
 ↓
Minimal safe fix
 ↓
Document reason
 ↓
Emergency review
 ↓
Deploy
 ↓
Immediate regression test
 ↓
Follow-up PR
```

The exception must be documented.

Normal development must return to the standard workflow immediately afterward.

---

# 42. Final PR Gate

Before merge:

```text
Requirement       ✓
Scope             ✓
Architecture      ✓
Implementation    ✓
DRY               ✓
Security          ✓
Tests             ✓
E2E               ✓
Build             ✓
Code Review       ✓
PR Approval       ✓
```

Only then:

```text
MERGE
```

---

# 43. Golden Rule

> **No code enters `main` without being tested, reviewed, approved, and traceable to a specific piece of work.**

The PR is not bureaucracy.

It is the project's controlled entry point into the shared codebase.
