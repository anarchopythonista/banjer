---
name: pointer-interactions
description: Use when designing, implementing, debugging, or reviewing mouse, touch, stylus, drag, resize, drawing, canvas, editor, game, or gesture interactions in web apps; guides Codex to use Pointer Events, pointer capture, explicit cancellation, keyboard-accessible alternatives, and mobile scroll/selection prevention without storing pixel positions as durable state.
---

# Pointer Interactions

## Goal

Build pointer interactions that work consistently across mouse, touch, and stylus, while preserving accessibility, predictable cancellation, and clean separation between DOM geometry and domain state.

Use Pointer Events by default. Avoid parallel mouse/touch handlers unless supporting a narrow legacy boundary that the project already uses.

## Working Model

Before editing, identify:

- **Interaction:** click, press, drag, draw, resize, long-press, lasso, scrub, or reorder.
- **Domain result:** the product state that changes, expressed in app units rather than pixels.
- **Transient state:** pointer id, origin point, latest point, capture target, pending long-press timer, drag preview, and cancellation reason.
- **Geometry boundary:** the utility or hook that converts client coordinates to domain coordinates.
- **Cancellation paths:** Escape, `pointercancel`, lost capture, unmount, invalid drop target, scroll interruption, and modal/picker dismissal.
- **Accessible path:** keyboard controls, buttons, focus states, ARIA labels, and non-gesture alternatives.

Keep durable state in domain terms. Store pixels only as transient interaction state or derived render geometry.

## Event Defaults

- Use `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, and `onLostPointerCapture` in React.
- Record and check `event.pointerId`; ignore move/up events from other pointers.
- Call `setPointerCapture(event.pointerId)` on the element that owns the drag after the interaction is accepted.
- Release capture on successful drop, cancellation, and cleanup when the element still has capture.
- Use `event.currentTarget`, not `event.target`, for capture and stable handler ownership.
- Read coordinates from `clientX` and `clientY`; convert through geometry utilities.
- Use `event.button === 0` for primary mouse button starts unless secondary input is intentionally supported.
- Keep pointer handlers small; dispatch domain-shaped events to reducers or hooks.

## Pointer Capture

Use pointer capture when a gesture should continue after the pointer leaves the starting element, such as dragging a note, slider thumb, resize handle, or canvas object.

Pattern:

```ts
const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
  if (event.button !== 0) return;

  event.currentTarget.setPointerCapture(event.pointerId);
  dispatch({
    type: "dragStarted",
    pointerId: event.pointerId,
    origin: toDomainPoint(event.clientX, event.clientY),
  });
};
```

On move/up/cancel, first verify the pointer id matches the active interaction. Treat `lostpointercapture` as cancellation unless the reducer already completed the interaction.

## Cancellation

Make cancellation explicit in state and tests.

- `pointerup` over a valid target commits.
- `pointerup` outside a valid target cancels or reverts, according to product rules.
- `pointercancel` cancels and cleans up previews/timers.
- `lostpointercapture` cancels if the interaction is still active.
- Escape cancels the active gesture or closes transient UI.
- Unmount/effect cleanup clears timers and releases capture if possible.
- Starting a second pointer during a single-pointer interaction should be ignored or cancel deterministically.

Name reducer actions as events, such as `dragStarted`, `dragMoved`, `dragDropped`, `dragCancelled`, and `longPressTriggered`.

## Mobile Scroll And Selection

Prevent accidental page scrolling only where the interaction needs it.

- Prefer CSS `touch-action` on the interactive surface over calling `preventDefault`.
- Use `touch-action: none` for freeform drag/draw surfaces that must own both axes.
- Use `touch-action: pan-y` for horizontal drags inside vertically scrollable pages.
- Use `touch-action: pan-x` for vertical drags inside horizontally scrollable areas.
- Add `user-select: none` only to active drag surfaces or handles where text selection would interfere.
- Avoid global `touchmove` blockers and document-level passive listener hacks unless the app has no safer boundary.
- For long-press on touch, delay drag start until the timer fires; cancel the timer on movement beyond a small threshold, `pointerup`, `pointercancel`, or scroll/lost capture.

## Geometry

Keep coordinate math pure and testable.

- Convert `clientX/clientY` plus `getBoundingClientRect()` to local coordinates at the edge.
- Snap to domain positions in utilities, not JSX.
- Clamp, validate, and reject invalid targets in pure helpers.
- Do not store DOMRect, pixel coordinates, or element refs in reducers.
- Recompute geometry after resize, zoom, layout changes, and scrolling when needed.

Example file split:

```text
FeatureName/
  useFeaturePointerInteraction.ts
  featureGeometry.ts
  featureReducer.ts
  featureGeometry.test.ts
  featureReducer.test.ts
```

## Accessibility

Do not make the experience gesture-only.

- Provide keyboard operations for the same durable state changes.
- Keep focus visible on handles, notes, buttons, and picker controls.
- Give icon-only controls accessible names.
- Ensure Escape cancels drag-like modes and closes popovers/pickers.
- Preserve click/tap behavior for simple selection when movement stays below the drag threshold.
- Avoid stealing focus on pointer down unless focus is part of the interaction design.

## Review Checklist

- Are Pointer Events used instead of duplicate mouse/touch logic?
- Is pointer capture set, released, and handled on loss?
- Is the active `pointerId` checked before move/up work?
- Are cancellation paths explicit and tested?
- Does CSS `touch-action` match the intended mobile scroll behavior?
- Is durable state stored in domain units rather than pixels?
- Are geometry helpers pure and covered by tests?
- Can keyboard users complete the same core task?
- Are timers, listeners, capture, and previews cleaned up on cancel/unmount?
