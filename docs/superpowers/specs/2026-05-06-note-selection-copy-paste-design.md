# Note Selection Copy Paste Design

## Goal

Add a note selection and copy/paste workflow to the main banjo tab editor so users can quickly repeat licks. Desktop users select notes by Shift-dragging across one measure. Touch users select notes with a pressed selection tool button. Copied notes can be pasted into another measure while preserving the original rhythmic shape and string lanes.

## Decisions

- Selection is limited to one measure for the MVP.
- Desktop selection starts with Shift + click-drag while the editor is idle.
- Mobile selection uses a pressed tool button in the header actions. It is not a switch, slider, or checkbox.
- The selection tool button appears before Add Measure so Add Measure remains the right-most control.
- Active selection drag shows a subtle measure-region overlay.
- Completed selection removes the region overlay and leaves selected notes visually highlighted.
- Selected notes use the same ring treatment as note hover or focus.
- A floating Copy button appears near selected notes.
- `Ctrl`/`Cmd+C` copies selected notes into an internal app clipboard only.
- The browser or operating-system clipboard is not used for this structured note copy feature.
- Copying enters paste-preview mode and shows faded copied notes following the current target slot.
- Source notes remain highlighted while paste-preview mode is active.
- Escape clears selection and paste-preview state and returns to idle.
- Clicking a selected note opens the fret picker and clears selection unless paste-preview mode is active.
- Keyboard paste uses the current quick fret target: the hovered or focused slot.
- Pasted notes preserve their original string indexes and relative timing.
- The target string under the cursor does not transpose the copied lick to different strings.
- If paste would run past the end of the target measure, the paste start clamps to the last slot where the full copied shape fits.
- Pasting over existing notes on the same string and slot replaces those notes.
- Normal click or `Ctrl`/`Cmd+V` pastes once and exits paste-preview mode.
- Holding `Ctrl`/`Cmd` while clicking pastes and keeps paste-preview mode active for repeated stamping.
- Articulated notes are selected by their starting slot. Their articulation and duration data are copied with the note.

## Data Model

`BanjoTab` remains the durable musical model. Selection and paste-preview state are transient editor state.

`EditorMode` should gain interaction states similar to the existing drag and fret-picker modes:

```ts
type EditorMode =
  | { type: "idle" }
  | { type: "fret-picker"; location: NoteLocation; noteId?: string; screenPoint: ScreenPoint }
  | { type: "dragging-note"; noteId: string; origin: NoteLocation; currentTarget: NoteLocation | null; pointer: ScreenPoint; pointerId?: number; overTrash: boolean }
  | { type: "resizing-articulation"; noteId: string; edge: "start" | "end"; measureId: string; stringIndex: number; startPosition: number; endPosition: number; currentPosition: number; pointer: ScreenPoint; pointerId?: number }
  | { type: "dragging-measure"; measureId: string; originIndex: number; currentTargetIndex: number | null; pointer: ScreenPoint; pointerId?: number; overTrash: boolean }
  | { type: "selecting-notes"; measureId: string; start: SelectionPoint; current: SelectionPoint; pointer: ScreenPoint; pointerId?: number }
  | { type: "paste-preview"; target: PasteTarget | null; pointer: ScreenPoint | null };
```

`SelectionPoint` should store musical coordinates, not pixels:

```ts
type SelectionPoint = {
  stringIndex: number;
  position: number;
};
```

The app clipboard can live as local UI state near `BanjoTabEditor` because it is not persisted and does not belong in saved tab data:

```ts
type CopiedNoteSelection = {
  sourceMeasureId: string;
  sourceNoteIds: string[];
  minPosition: number;
  maxPosition: number;
  notes: CopiedNote[];
};

type CopiedNote = {
  stringIndex: number;
  positionOffset: number;
  fret: number;
  durationSlots?: number;
  articulation?: TabArticulation;
};
```

`sourceNoteIds` keeps source notes highlighted while paste-preview mode is active. `positionOffset` is measured from the left-most selected note and drives paste placement.

## State Ownership

`tabReducer.ts` should continue to own durable tab mutations. Add a `PASTE_NOTES` action that receives a target measure and target start position plus copied note payload. The reducer should:

- clamp the target start so the copied shape fits inside 16 slots
- remove same-measure notes that conflict with pasted string/slot targets
- create new note IDs for pasted notes
- preserve fret, string index, duration, and articulation fields
- leave other measures and non-conflicting notes unchanged

Selection drag, copy button visibility, highlighted selected note IDs, and paste preview targeting are UI concerns. They should be derived from `EditorMode`, current tab data, and local copied-selection state rather than persisted in `BanjoTab`.

## Pointer And Keyboard Flow

A new `usePointerNoteSelection` hook should own pointer selection behavior. It should register measure or string-track geometry, convert pointer points to musical selection points, and dispatch `SET_EDITOR_MODE` for selection and paste-preview updates.

Desktop flow:

1. The user holds Shift while the editor is idle.
2. The editor root uses a selection cursor.
3. Pointer down on a measure grid starts `selecting-notes`.
4. Pointer move updates the current selection point.
5. Pointer up finalizes selected notes, clears empty selections, and returns to idle if nothing was selected.

Mobile flow:

1. The user presses the selection tool button.
2. The button shows a pressed state with `aria-pressed="true"`.
3. Dragging across a measure starts and updates selection without requiring Shift.
4. Pressing the tool button again exits selection mode.
5. Escape also exits selection mode when a keyboard is present.

Copy and paste flow:

1. Copy button or `Ctrl`/`Cmd+C` creates `CopiedNoteSelection`.
2. The editor enters `paste-preview`.
3. Hovered or focused slots update the preview target.
4. Clicking a slot pastes at the current target and normally exits paste-preview.
5. Holding `Ctrl`/`Cmd` while clicking keeps paste-preview active after paste.
6. `Ctrl`/`Cmd+V` pastes at the current quick fret target and exits paste-preview.

## Visual Design

The active selection region should be a subtle overlay on the selected slots and strings within the measure. It should slightly change the measure background without obscuring string lines, slot borders, or fret numbers.

Selected notes should use a `data-selected` styling hook and share the hover/focus ring treatment:

```css
.banjo-tab-note[data-selected="true"] {
  border-color: var(--tab-accent);
  box-shadow: 0 0 0 3px var(--tab-drag-ring);
}
```

The paste preview should render faded notes over the target measure. It should preserve the copied note shape, align the left-most copied note to the target slot, and visually indicate the current target measure and paste slot. The preview should not intercept pointer events.

The selection tool button should visually match the existing compact editor controls, with a clear pressed state. It should use an insertion-point-like glyph, `aria-label="Select notes"`, `aria-pressed`, and a tooltip via `title="Select notes"`.

## Components And Utilities

Add or update these pieces:

- `usePointerNoteSelection.ts` for selection drag and paste-preview pointer behavior.
- `selection.ts` or `geometry.ts` helpers for normalizing selection bounds, note inclusion, paste span calculation, and paste-start clamping.
- `SelectionModeButton.tsx` for the mobile-friendly pressed selection tool.
- `SelectionRegionOverlay.tsx` for the active drag region.
- `SelectionCopyButton.tsx` for the floating Copy action.
- `PastePreview.tsx` for faded copied notes at the current paste target.
- `TabNote.tsx` to accept selected state and render the selected visual hook.
- `TabMeasure.tsx` and `TabStringRow.tsx` to pass selection and paste-preview props and register geometry.

Keep components small. Pointer math should remain outside JSX-heavy rendering components.

## Accessibility

- Selection mode must not be gesture-only.
- The selection button must be keyboard reachable and expose pressed state through `aria-pressed`.
- The Copy button must be a real button with an accessible label.
- `Ctrl`/`Cmd+C`, `Ctrl`/`Cmd+V`, and Escape should be ignored when focus is inside editable text inputs.
- Focused slots should be valid keyboard paste targets through the existing quick fret target behavior.
- Existing fret picker keyboard navigation and Escape behavior must continue to work.
- Add Measure must remain keyboard reachable and right-most in the header actions.

## Testing

Add unit tests for pure reducer and selection behavior:

- `PASTE_NOTES` duplicates selected notes into a target measure.
- Paste preserves string indexes and relative timing across multiple strings.
- Paste replaces conflicting notes on the same string and slot.
- Paste clamps target start when the copied shape would exceed the measure.
- Articulated notes paste with duration and articulation data intact.
- Selection bounds normalize correctly when dragging in any direction.
- Note inclusion uses the note starting slot.

Add Storybook coverage for:

- active selection drag region
- completed selection with selected note highlights and Copy button
- paste preview over another measure
- mobile/narrow viewport with selection button pressed and Add Measure still right-most
- keyboard copy and paste
- repeat paste with `Ctrl`/`Cmd` click

Run typecheck, unit tests, and focused Storybook tests before finishing implementation.

## Out Of Scope

- Multi-measure selection.
- Cross-measure paste overflow.
- Automatic measure creation during paste.
- String transposition when pasting.
- Operating-system clipboard integration.
- Text tab export or import.
- Advanced notation changes.
