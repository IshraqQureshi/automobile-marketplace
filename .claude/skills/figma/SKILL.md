# Figma → Frontend Development Skill

## Purpose

This skill defines the mandatory process for converting Figma designs into production-quality frontend implementation.

Figma is the **visual source of truth**.

Business requirements determine what the feature does.

Figma determines how the interface should look and behave.

The existing application architecture determines how it should be implemented technically.

---

# 1. Before Implementation

For every frontend task:

1. Read `/CLAUDE.md`.
2. Read `/docs/MVP_PROGRESS.md`.
3. Read the relevant feature requirements.
4. Inspect the existing frontend code.
5. Identify reusable components.
6. Access the relevant Figma frame using the configured Figma integration/MCP.
7. Inspect the complete design before writing UI code.

Do not begin implementation from a screenshot or assumption when the actual Figma design is available.

---

# 2. Identify the Correct Figma Design

Locate the exact:

* Page
* Frame
* Component
* Variant
* Desktop design
* Mobile design

Confirm that the selected Figma design corresponds to the feature being implemented.

If multiple variants exist, determine which one belongs to the MVP.

Do not implement unrelated Figma screens.

---

# 3. Extract Design Requirements

Before coding, inspect:

## Layout

* Page width
* Container width
* Grid
* Columns
* Flex behavior
* Alignment
* Positioning
* Section spacing

## Typography

* Font family
* Font size
* Font weight
* Line height
* Letter spacing
* Text hierarchy

## Visual Design

* Colors
* Backgrounds
* Borders
* Border radius
* Shadows
* Dividers

## Components

Identify:

* Buttons
* Inputs
* Selects
* Cards
* Modals
* Navigation
* Tabs
* Dropdowns
* Badges
* Alerts
* Tables
* Pagination
* Images
* Icons

## States

Look for:

* Default
* Hover
* Focus
* Active
* Disabled
* Loading
* Empty
* Error
* Success

Do not implement only the default state if Figma provides other states.

---

# 4. Responsive Design

Inspect all available responsive Figma designs.

Determine:

* Breakpoints
* Layout changes
* Hidden elements
* Stacked elements
* Mobile navigation
* Font changes
* Image behavior
* Card behavior
* Spacing changes
* Table behavior

If desktop and mobile designs are both provided, implement both.

Do not simply shrink the desktop layout.

---

# 5. Figma Assets

Use actual Figma assets whenever they are available.

Inspect:

* Logos
* Vehicle images
* Icons
* Illustrations
* Background images
* Avatars
* SVGs

Do not replace an available project asset with:

* Emoji
* Placeholder icon
* Random internet image
* Approximate SVG
* CSS recreation

unless explicitly required.

Store assets according to the project's existing asset structure.

---

# 6. Component Mapping

Before creating a new component, search the existing codebase.

Example:

```text
Figma Button
      ↓
Existing Button component?
      ↓
YES → Reuse/extend it
NO  → Create reusable component
```

Do not create separate components for visually identical patterns without a reason.

Prefer:

```text
components/
├── Button
├── Input
├── Select
├── VehicleCard
├── ShowroomCard
└── ...
```

over duplicating the same UI inside individual pages.

---

# 7. Design Tokens

Use existing project design tokens where available.

If the project already defines:

* Colors
* Typography
* Spacing
* Radius
* Shadows
* Breakpoints

reuse them.

If a Figma value is not represented in the design system and is genuinely required, add it consistently rather than scattering arbitrary values throughout the codebase.

Avoid unnecessary one-off values.

---

# 8. Implementation Rules

Implement the Figma design using:

* Existing project architecture
* Existing component patterns
* TypeScript
* Tailwind/project styling conventions
* Reusable components

Do not:

* Hardcode unnecessary content
* Duplicate components
* Use absolute positioning for layouts that should use normal CSS layout
* Add unnecessary dependencies
* Rewrite unrelated components
* Ignore responsive behavior
* Approximate important visual details

The goal is **design accuracy without sacrificing maintainability**.

---

# 9. Dynamic Data

Figma contains static design data.

Production UI must use real application data.

For example:

```text
Figma:
Vehicle Name = "Toyota Corolla"

Implementation:
vehicle.name
```

Do not hardcode Figma example data when the application should load dynamic data.

Maintain the visual structure while connecting it to real data.

---

# 10. Loading, Empty, Error and Success States

Figma may not always contain every state.

Where necessary, implement appropriate application states:

### Loading

* Skeleton
* Spinner
* Disabled interaction

### Empty

* Clear message
* Appropriate CTA where applicable

### Error

* User-friendly message
* Retry/action where appropriate

### Success

* Confirmation
* Updated state
* Appropriate feedback

These states must follow the existing design system.

---

# 11. Forms

For Figma forms:

Implement:

* Labels
* Inputs
* Placeholder
* Required indicators
* Validation
* Error messages
* Disabled states
* Loading states
* Success behavior

Client-side validation must not replace server/data-layer validation.

---

# 12. Accessibility

Figma accuracy does not override accessibility.

Implement:

* Semantic HTML
* Proper labels
* Keyboard navigation
* Focus states
* Accessible buttons
* Accessible form controls
* Appropriate alt text
* Sufficient interaction targets

Do not remove accessibility behavior simply because it is not visible in the Figma design.

---

# 13. Visual Verification

After implementation:

1. Start the application.
2. Navigate to the implemented screen.
3. Compare the implementation against Figma.
4. Check desktop.
5. Check mobile.
6. Check important interactive states.

Review:

```text
Layout
Typography
Spacing
Colors
Sizing
Alignment
Images
Icons
Borders
Radius
Shadows
Responsive behavior
```

Fix material differences.

---

# 14. Visual QA Checklist

Before marking the frontend feature complete:

* [ ] Correct page/frame implemented
* [ ] Layout matches Figma
* [ ] Container dimensions correct
* [ ] Spacing matches
* [ ] Typography matches
* [ ] Colors match
* [ ] Buttons match
* [ ] Inputs match
* [ ] Cards match
* [ ] Images/assets match
* [ ] Icons match
* [ ] Borders/radius match
* [ ] Shadows match
* [ ] Responsive behavior verified
* [ ] Loading state verified
* [ ] Empty state verified
* [ ] Error state verified
* [ ] Interactive states verified
* [ ] Accessibility verified

---

# 15. Visual Difference Severity

Classify differences as:

### Critical

* Wrong page structure
* Missing major section
* Incorrect responsive layout
* Wrong primary CTA
* Incorrect navigation
* Major functionality/UI mismatch

Must fix before PR.

### High

* Significant spacing/layout difference
* Incorrect typography
* Wrong component sizing
* Incorrect imagery
* Major color mismatch

Must fix before feature completion.

### Medium

* Minor spacing difference
* Small alignment issue
* Minor visual inconsistency

Fix before release where practical.

### Low

* Pixel-level differences with negligible user impact

Can be deferred only if fixing them threatens the MVP schedule.

---

# 16. Figma vs Existing Design System

When Figma and existing components differ:

1. Determine whether the Figma design represents a new approved design.
2. Check whether the existing component can be safely extended.
3. Avoid creating duplicate components.
4. Update the shared component if the change is intended globally.
5. If the change is feature-specific, use a controlled variant.

Do not silently change shared components in a way that breaks existing screens.

---

# 17. Frontend Feature Completion

A Figma-based feature is complete only when:

```text
Figma inspected
      ↓
Existing components checked
      ↓
Implementation complete
      ↓
Real data connected
      ↓
Responsive UI complete
      ↓
States handled
      ↓
Visual QA passed
      ↓
Tests passed
      ↓
E2E passed
      ↓
Code Review passed
```

Only then update `MVP_PROGRESS.md`.

---

# 18. Important Rule

Never report:

> "Figma matched"

without actually inspecting and verifying the implemented screen.

The implementation must be judged against the actual Figma design, not against memory or the original task description.

---

# 19. Golden Rule

> **Build the interface from Figma, build the behavior from the requirements, and build the implementation according to the project's architecture.**
