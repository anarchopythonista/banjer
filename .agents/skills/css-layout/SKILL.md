---
name: css-layout
description: Use when designing, implementing, debugging, or reviewing CSS layout, responsive screens, narrow viewport behavior, readable class naming, spacing systems, or brittle pixel-based sizing assumptions.
---

# CSS Layout

## Goal

Build layouts that flex with real content, survive narrow screens, and communicate structure through readable class names.

## Working Model

Before editing, identify:

- **Content priority:** what must remain visible and usable first on small screens.
- **Breakpoints:** where content actually needs a new arrangement, not arbitrary device names.
- **Failure mode:** overflow, overlap, cramped controls, unreadable text, or unreachable actions.

Prefer resilient constraints (`minmax`, `clamp`, `max-width`, `min-width: 0`, wrapping) over pixel-perfect placement.

## Responsive Defaults

- Start with a narrow-screen layout, then add space and columns as room allows.
- Use `gap`, grid tracks, and flex wrapping instead of margin chains for repeated spacing.
- Use fluid width plus `max-width` for readable text columns and tool surfaces.
- Add `min-width: 0` to flex/grid children with long text, controls, or scrollable regions.
- Prefer `auto-fit`, `minmax()`, `fit-content()`, and `clamp()` over hard breakpoints when possible.
- Avoid horizontal page scrolling unless the product is intentionally a scrollable workspace.

## Class Naming

Use names that describe role and structure, not current appearance:

- Good: `editor-shell`, `measure-grid`, `fret-picker`, `toolbar-actions`, `note-button`
- Avoid: `blue-box`, `left-div`, `small-card`, `thing`, `container2`
- Give layout wrappers names that explain their job.
- Name repeated children by domain role.
- Avoid breakpoint names like `desktop-only-panel` unless the behavior is semantic.

## Pixel Assumptions

Fixed sizes are acceptable for icons, borders, known instrument geometry, and minimum touch targets. They are risky for whole screens, panels, text blocks, and dynamic content.

Before using fixed pixels for layout, ask whether the value represents a real object size or just a screenshot match. Prefer fluid units, `fr`, `minmax()`, `clamp()`, or a CSS custom property when they express the intent.

Store durable product state in domain units. Do not save CSS pixels as the source of truth for user-created positions.

## Narrow Screen Checklist

Verify common small widths:

- No text overlaps, clips awkwardly, or escapes controls.
- Primary actions remain reachable without horizontal scrolling.
- Toolbars wrap, collapse, or scroll intentionally.
- Sticky/fixed regions do not cover content or trap scrolling.

## Common Failures

- **Screenshot CSS:** Replace fixed offsets with grid, flex, or anchored positioning.
- **Desktop-first squeeze:** Define the stacked layout first, then enhance with queries.
- **Invisible overflow:** Add `min-width: 0`, wrapping, or bounded scroll regions.
- **Magic spacing:** Promote repeated spacing to named custom properties or local layout rules.
- **Class soup:** Rename classes around domain and layout roles before adding more selectors.

## Review Checks

- Does the layout still work around 320-390px wide?
- Are class names readable to someone scanning only CSS and JSX?
- Are fixed pixels limited to things with real fixed meaning?
- Are repeated layouts using grid/flex relationships instead of manual offsets?
- Are scroll regions intentional and bounded?
