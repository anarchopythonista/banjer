---
name: typescript-state-modeling
description: Use when designing, implementing, or reviewing TypeScript state for React editors, reducers, domain models, workflows, or interaction modes; guides Codex to define domain types first, use discriminated unions for modes/actions, and avoid loose any/object state.
---

# TypeScript State Modeling

## Goal

Model application state so impossible states are hard to represent, reducer behavior is explicit, and UI code works with domain concepts instead of loose bags of data.

Use this skill before creating or changing TypeScript state shapes, reducers, editor modes, interaction state, or domain data passed through React components.

## Working Model

Before editing, identify:

- **Domain entities:** durable things the product stores or manipulates.
- **Domain positions:** coordinates in product units, not pixels or DOM measurements.
- **State owner:** reducer, hook, context, store, or component that owns each piece of state.
- **Modes:** mutually exclusive UI or workflow states.
- **Events/actions:** user or system events that transition state.
- **Derived values:** values that should be computed from state rather than stored.

Define domain types first, then write reducer/actions/selectors, then wire React rendering.

## Type Defaults

- Prefer named domain types over anonymous object literals in state.
- Prefer `type` aliases for unions and object shapes unless the codebase consistently uses interfaces.
- Use branded or constrained primitives when plain `string`/`number` would blur important concepts.
- Use readonly arrays/objects when mutation would make reducer behavior harder to reason about.
- Keep IDs explicit: `NoteId`, `MeasureId`, `TrackId`, not generic `id: string` everywhere.
- Keep pixel geometry separate from domain state. Convert at the edge with utility functions.

Example:

```ts
type StringIndex = 0 | 1 | 2 | 3 | 4;
type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

type TabPosition = {
  measureIndex: number;
  stringIndex: StringIndex;
  slotIndex: SlotIndex;
};

type TabNote = {
  id: NoteId;
  position: TabPosition;
  fret: number;
};
```

## Discriminated Unions

Use discriminated unions for mutually exclusive states. Avoid parallel booleans such as `isDragging`, `isPickerOpen`, `selectedNote`, and `dragNote` when only one mode can be active.

Example:

```ts
type EditorMode =
  | { type: "idle" }
  | { type: "picking-fret"; target: TabPosition; noteId?: NoteId }
  | { type: "dragging-note"; noteId: NoteId; origin: TabPosition; pointerId: number }
  | { type: "keyboard-moving-note"; noteId: NoteId };
```

When rendering or reducing, switch on the discriminant. Use exhaustive checks for important unions:

```ts
const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
};
```

## Reducers And Actions

Use reducers when transitions involve rules, replacement, deletion, snapping, or several related fields.

- Name actions as events: `noteMoved`, `fretSelected`, `dragCancelled`.
- Keep action payloads domain-shaped.
- Validate replacement and uniqueness rules in pure reducer helpers.
- Return unchanged state when an action is invalid or irrelevant.
- Test reducers without React.

Example:

```ts
type EditorAction =
  | { type: "slotPressed"; position: TabPosition }
  | { type: "fretSelected"; fret: number }
  | { type: "noteDragStarted"; noteId: NoteId; pointerId: number }
  | { type: "noteDropped"; position: TabPosition }
  | { type: "noteDroppedOnTrash" }
  | { type: "interactionCancelled" };
```

## Avoid Loose State

Reject these patterns unless there is a narrow, documented boundary:

- `any`, `object`, `Record<string, any>`, or untyped JSON as app state.
- Optional fields that only exist for some modes when a union would say that directly.
- Booleans that can conflict with each other.
- Pixel positions stored as source-of-truth domain state.
- Duplicated source-of-truth collections that can drift apart.
- Reducers that accept generic `payload: unknown` and cast internally.

If external data is unknown, decode or normalize it at the boundary, then keep internal state typed.

## Derived State

Derive values when possible:

- note lookup maps from `notes`
- selected note from `mode`
- occupied positions from `notes`
- visual coordinates from domain position plus layout geometry
- whether the trash zone is visible from drag mode

Store derived values only when there is a measured performance need or a real draft lifecycle.

## File Organization

For editor-like features, prefer:

```text
FeatureName/
  featureTypes.ts
  featureReducer.ts
  featureSelectors.ts
  featureGeometry.ts
  featureReducer.test.ts
  featureGeometry.test.ts
```

Keep `featureTypes.ts` free of React imports when practical.

## Review Checklist

- Are core domain types defined before reducer and component work?
- Are modes and actions discriminated unions?
- Can TypeScript prevent conflicting UI states?
- Is durable state stored in domain units?
- Are `any`, `object`, broad records, and internal casts avoided?
- Are replacement, deletion, cancellation, and invalid-transition rules tested?
- Are derived values computed through selectors or utilities?
- Do component props expose domain events instead of raw state setters?
