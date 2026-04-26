---
name: vitest-reducer-geometry-testing
description: Use when writing, reviewing, or fixing Vitest tests for React/TypeScript reducer logic, state transitions, selectors, snapping, coordinate conversion, hit testing, or geometry utilities before adding UI, DOM, Storybook, or Playwright tests.
---

# Vitest Reducer And Geometry Testing

## Goal

Protect editor behavior at the cheapest reliable layer first. For reducer rules, selectors, snapping, coordinate conversion, hit testing, and drag/drop validation, write Vitest unit tests against pure TypeScript before reaching for rendered UI tests.

Use this skill before adding or changing reducer, selector, or geometry behavior in the banjo tablature editor.

## Test Order

Default to this sequence:

1. **Reducer/state tests:** domain rules, action transitions, cancellation, replacement, deletion, and invalid actions.
2. **Geometry tests:** client/local coordinate conversion, slot/string snapping, bounds, hit testing, and trash-zone detection.
3. **Hook/component tests:** only when behavior depends on React lifecycle, DOM focus, timers, pointer capture, or keyboard wiring.
4. **Storybook tests:** visual states, accessibility surfaces, and user-facing interaction coverage after pure behavior is already covered.

Do not start with UI tests for rules that can be asserted by calling a reducer or utility directly.

## Vitest Defaults

- Use `describe`, `it`, `expect`, `beforeEach`, and `vi` from `vitest`.
- Keep fixtures small and domain-shaped.
- Prefer explicit expected objects over broad snapshots.
- Test public reducer/actions/selectors/utilities, not private implementation details.
- Use table tests for snapping, clamping, and coordinate boundaries.
- Avoid React Testing Library unless the assertion genuinely needs rendered DOM.
- Avoid Storybook or Playwright for pure state and math regressions.

## Reducer Coverage

For editor reducers, cover:

- initial state and adding a measure;
- opening the fret picker for an empty slot;
- opening the fret picker for an existing note;
- creating a note from a selected fret;
- editing an existing note's fret;
- replacing an occupied string/position on drop;
- allowing multiple strings at the same slot;
- preventing duplicate notes on the same string/position;
- drag start, valid drop, invalid drop cancellation, and trash drop deletion;
- Escape or cancellation actions closing transient modes without corrupting notes.

Assert durable state in product units such as measure index, string index, slot index, note id, and fret. Do not assert pixel coordinates as reducer state.

## Geometry Coverage

For geometry utilities, cover:

- converting `clientX/clientY` plus a rect-like value into local coordinates;
- snapping local coordinates to the nearest measure, slot, and string;
- rejecting points outside valid strings, slots, or measures;
- edge and midpoint behavior between slots;
- trash-zone hit detection;
- layout changes by passing different rects or dimensions;
- touch/mouse/stylus neutrality by keeping pointer type out of pure math.

Use plain rect fixtures rather than real DOM nodes when possible:

```ts
const rect = { left: 10, top: 20, width: 640, height: 120 };
```

## File Placement

Follow the feature's existing naming. For tablature editor work, prefer:

```text
TabEditor/
  tabEditorReducer.ts
  tabEditorGeometry.ts
  tabEditorReducer.test.ts
  tabEditorGeometry.test.ts
```

If the repo already colocates tests beside source files, keep that pattern. Keep pure test files free of React imports.

## Testing Style

- Name tests after product behavior: `drops a dragged note onto trash`, not `handles action type`.
- Arrange test data with helper builders only when duplication is meaningful.
- Use stable ids in tests so replacement and deletion assertions are readable.
- Include negative tests for invalid positions, occupied targets, and irrelevant actions.
- Verify object identity only when the reducer intentionally returns the same state for no-op actions.
- Keep fake timers scoped and restored when testing long-press or delayed behavior.

## Escalation To UI Tests

Move beyond pure Vitest tests only for behavior that requires:

- DOM focus or keyboard tab order;
- pointer capture or event propagation;
- timers tied to React effects;
- accessible names, roles, or live DOM semantics;
- visual state, layout, or a11y regression checks.

When UI states change, pair this skill with Storybook guidance and run focused story tests.

## Verification

Before finishing:

- Run the focused Vitest test file(s) you changed or added.
- Run the broader test command if the change touches shared reducer or geometry helpers.
- Run typecheck if available.
- If UI or stories changed too, run focused Storybook tests.
- Report commands that could not run and why.

## Review Checklist

- Are reducer and geometry rules tested before UI behavior?
- Do tests assert domain positions rather than pixels where durable state is involved?
- Are snapping, cancellation, deletion, replacement, and invalid drops covered?
- Can the tests run without rendering React?
- Are edge cases named in product language?
- Do UI tests cover only what pure tests cannot?
