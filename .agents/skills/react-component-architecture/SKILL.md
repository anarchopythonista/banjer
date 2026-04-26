---
name: react-component-architecture
description: Use when designing, building, refactoring, or reviewing React components where composability, prop boundaries, component size, state ownership, coupling, or all-in-one component risk matters.
---

# React Component Architecture

## Goal

Build React components that are small enough to understand, composable enough to reuse, and explicit enough that data flow stays visible. Prefer clear ownership and boring props over clever implicit coupling.

## Working Model

Before editing, identify:

- **User workflow:** the interaction or screen the component supports.
- **State owner:** the smallest component or hook that can own mutable state honestly.
- **Domain shape:** the data types the UI should receive, not pixel or DOM-derived state.
- **Boundaries:** presentational components, interaction hooks, reducers/state helpers, and utility functions.

If one component owns fetching, reducer logic, pointer math, layout, modal state, and all JSX, split it before adding behavior.

## Component Boundaries

Use these defaults:

- **Container/screen components:** wire data, reducer/hooks, routing, persistence, and top-level layout.
- **Feature components:** implement a coherent user task and accept domain props plus callbacks.
- **Presentational components:** render from props only; avoid imports from stores, routers, or global app state.
- **Hooks:** own reusable interaction behavior, subscriptions, measurements, keyboard handling, or reducer wiring.
- **Utilities:** hold pure math, geometry, parsing, formatting, validation, and state transitions.

Prefer a component tree where each level answers one question: "what exists here?", "how does it behave?", or "how is it drawn?"

## Prop Design

- Pass domain values and named callbacks, not whole app objects by habit.
- Keep prop names specific to intent: `selectedNoteId`, `onFretChange`, `isDragging`.
- Avoid boolean piles. If booleans represent modes, use a discriminated union or explicit `variant`.
- Avoid prop drilling through indifferent components. Either move the component boundary or use local context for a narrow feature area.
- Do not pass setters like `setState` across component boundaries unless the child truly owns the state shape.
- Prefer callback props that describe events: `onNoteMove(noteId, position)` rather than `onChange(nextEditorState)`.

## State Ownership

- Store durable product state in domain units, not DOM pixels.
- Keep transient interaction state close to the interaction hook or feature component.
- Use reducers for multi-step interactions, replacement rules, undoable domain state, or cross-component updates.
- Keep derived values derived. Do not mirror props into state unless there is a real draft/edit lifecycle.
- Let pure state transitions be testable without rendering React.

## Splitting Heuristics

Split when a component:

- exceeds roughly 150-250 lines and has multiple responsibilities;
- contains nested JSX that needs comments to navigate;
- mixes pointer/keyboard math with rendering details;
- has effects that are unrelated to each other;
- passes many props to a repeated sub-tree;
- requires tests that must click through unrelated UI to verify pure behavior.

Do not split just to create tiny files. A split should improve naming, testing, reuse, or local reasoning.

## File Organization

Favor feature folders when the component has meaningful behavior:

```text
FeatureName/
  FeatureName.tsx
  FeaturePart.tsx
  useFeatureInteraction.ts
  featureReducer.ts
  featureGeometry.ts
  FeatureName.test.ts
  FeatureName.stories.tsx
```

Keep pure utility files framework-light so they can be unit tested directly.

## Review Checklist

- Does each component have one primary responsibility?
- Can presentational pieces be rendered from props without app setup?
- Are callbacks named after user/domain events?
- Is interaction math outside large JSX blocks?
- Is durable state represented in domain terms?
- Are replacement, deletion, snapping, validation, or reducer rules covered by pure tests?
- Do Storybook stories show important visual and interaction states?
- Can a future change land in one obvious place?

## Common Failures

- **Giant editor component:** Extract reducer/state helpers first, then geometry utilities, then presentational pieces.
- **Mystery props:** Rename vague props like `data`, `item`, `handleChange`, and `active` to domain terms.
- **Leaky children:** Replace child knowledge of parent state shape with event callbacks.
- **Over-contextualized UI:** Use context only for a narrow feature API, not as a bag of all state.
- **Premature abstraction:** Do not build generic component frameworks until two or three real use cases prove the shape.
