---
name: accessibility-controls
description: Use when designing, implementing, debugging, or reviewing UI controls, popovers, dialogs, menus, pickers, keyboard interactions, focus management, drag or gesture interactions, or any React feature that must not be gesture-only.
---

# Accessibility Controls

## Goal

Make interactive UI operable by keyboard, understandable to assistive technology, and usable without gesture-only paths. Treat accessibility as interaction design, not polish after the fact.

## Working Model

Before editing, identify:

- **Control type:** button, toggle, tab, menu, dialog, popover, picker, grid, listbox, slider, drag handle, or custom widget.
- **User task:** what the user must be able to do without a mouse or touch gesture.
- **Focus owner:** which element receives focus when the UI opens, changes mode, and closes.
- **Escape path:** how users cancel or leave the interaction with keyboard and pointer.
- **Announced state:** selected, expanded, pressed, disabled, invalid, current value, or drag status.

Prefer native HTML controls first. Add ARIA only when native semantics cannot express the interaction.

## Keyboard Access

Use these defaults:

- Every clickable command is a `button` or link with a real `href`; avoid clickable `div` or `span`.
- Every pointer-only action has an equivalent keyboard path.
- `Enter` and `Space` activate buttons and custom button-like controls.
- Arrow keys move within composite widgets such as tabs, menus, listboxes, grids, and pickers.
- `Escape` closes transient UI such as popovers, dialogs, menus, and pickers.
- `Tab` order follows the visual workflow and never traps users unless a modal dialog is open.
- Disabled controls use the native `disabled` attribute when possible; otherwise expose `aria-disabled` and prevent activation.
- Visible focus styles remain obvious against the actual UI colors.

For drag interactions, provide at least one non-drag path such as move buttons, keyboard nudging, pick-and-place mode, or editable fields.

## Popovers, Pickers, And Dialogs

Choose semantics by behavior:

- **Modal dialog:** use `role="dialog"` or native `<dialog>` with `aria-modal="true"`, label it, move focus inside on open, trap focus while open, restore focus to the opener on close.
- **Non-modal popover or picker:** label the trigger with `aria-haspopup` when useful, reflect open state with `aria-expanded`, associate trigger and panel with `aria-controls` when practical, and restore focus predictably on close.
- **Menu:** use menu semantics only for command menus, not general navigation or arbitrary content.
- **Listbox/grid picker:** use listbox or grid semantics when arrow-key selection is central to the control.

When a popover opens from an existing value, focus the current option or the first meaningful control. Do not leave focus behind on the page while visual focus appears elsewhere.

## Focus Behavior

Apply focus rules deliberately:

- Move focus only when opening, closing, changing interaction mode, or after destructive removal where the focused item disappears.
- Restore focus to the opener when closing a popover or dialog unless the user completed an action that has a more logical destination.
- Keep focus within modal dialogs.
- Let non-modal popovers close on `Escape`, outside pointer down, or selection, but avoid stealing normal page tab flow unexpectedly.
- After deletion, focus the nearest remaining relevant control or the container command that can continue the workflow.
- Avoid relying on `autoFocus` if rendering order, animation, or conditional content makes it flaky; use a ref and effect when needed.

## Pointer And Gesture Parity

Do not make functionality gesture-only:

- Click, tap, drag, long-press, and hover behaviors need keyboard-accessible alternatives.
- Hover-only content must also appear on focus or be available through a button.
- Long-press should never be the only way to enter a mode.
- Drag-to-delete needs an alternate delete command.
- Drag-to-move needs an alternate move or edit command.
- Touch targets should be comfortably sized and not require pixel-perfect gestures.

For custom pointer interactions, prefer Pointer Events, pointer capture during drags, explicit cancellation, and domain state rather than durable pixel state.

## React Implementation Guidance

Keep accessibility behavior close to interaction state:

- Model open/closed, selected option, highlighted option, drag mode, and focus return target explicitly.
- Keep keyboard handlers named after user intent, such as `handlePickerKeyDown` or `moveNoteToSlot`.
- Use stable IDs for `aria-labelledby`, `aria-describedby`, and trigger-panel relationships.
- Avoid hiding focusable content with CSS alone. If content is visually hidden and inactive, make it unfocusable or unmount it.
- Use `aria-live` sparingly for important async or mode-change announcements, not for every visual update.
- Use `useId` for generated relationships, but keep domain IDs for durable data.

## Banjo Editor Defaults

For tablature editor work:

- The add-measure control is a reachable native button with an accessible label.
- Empty string slots can be reached or selected by keyboard, not only clicked.
- Existing notes expose enough text to identify string, rhythmic slot, and fret.
- The fret picker opens from click, tap, `Enter`, or `Space`; `Escape` closes it.
- The fret picker focuses the current fret when editing and restores focus when dismissed.
- Moving notes by drag has a keyboard alternative.
- Deleting notes by drag-to-trash has a keyboard alternative and confirmation only if destructive mistakes are likely.
- Replacing an occupied string/slot is reflected in state and, when useful, announced.

## Testing Checklist

Before finishing, verify:

- Can the full workflow be completed with keyboard only?
- Does `Escape` close every transient surface?
- Does focus land somewhere sensible after opening, closing, selecting, deleting, and canceling?
- Do controls have accessible names that match their visible purpose?
- Are roles and ARIA states accurate for the actual widget behavior?
- Is there no pointer-only, hover-only, drag-only, or long-press-only functionality?
- Do tests cover pure state transitions for keyboard alternatives and deletion/move rules?
- Do Storybook stories show open picker, focused states, selected states, and any disabled/error states touched by the change?
