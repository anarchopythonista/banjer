# Note Selection Copy Paste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build single-measure note selection plus internal copy/paste for repeating banjo licks across measures.

**Architecture:** Keep durable musical edits in `tabReducer.ts`, add pure selection helpers in a focused utility module, and isolate pointer selection behavior in a new hook beside the existing drag hooks. UI components render derived selection state, source-note highlighting, a compact pressed selection tool, a floating Copy button, and a non-interactive paste preview.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Storybook MCP, Storybook interaction tests.

---

## File Structure

- Create `src/components/BanjoTabEditor/selection.ts`: pure helper functions for selection bounds, note inclusion, copied-note payloads, paste clamping, and region percentages.
- Create `src/components/BanjoTabEditor/selection.test.ts`: Vitest coverage for selection helpers.
- Modify `src/components/BanjoTabEditor/types.ts`: add `SelectionPoint`, `SelectionBounds`, `PasteTarget`, `CopiedNote`, `CopiedNoteSelection`, and new `EditorMode` members.
- Modify `src/components/BanjoTabEditor/tabReducer.ts`: add `PASTE_NOTES` action and reducer branch.
- Modify `src/components/BanjoTabEditor/tabReducer.test.ts`: add paste reducer tests.
- Create `src/components/BanjoTabEditor/hooks/usePointerNoteSelection.ts`: pointer registration and Shift/tool-mode selection gestures.
- Modify `src/components/BanjoTabEditor/hooks/usePointerNoteDrag.ts`: ignore note drag starts when Shift is held or selection mode is active.
- Create `src/components/BanjoTabEditor/components/SelectionModeButton.tsx`: pressed tool button for selection mode.
- Create `src/components/BanjoTabEditor/components/SelectionRegionOverlay.tsx`: active selection region overlay for a string row.
- Create `src/components/BanjoTabEditor/components/SelectionCopyButton.tsx`: floating Copy button near a completed selection.
- Create `src/components/BanjoTabEditor/components/PastePreview.tsx`: faded copied notes and target-slot indicator in the target measure.
- Modify `src/components/BanjoTabEditor/components/TabNote.tsx`: accept selected and drag-disabled props, render `data-selected`.
- Modify `src/components/BanjoTabEditor/components/TabStringRow.tsx`: register selection geometry, suppress slot clicks after selection drags, render row overlay and paste preview notes.
- Modify `src/components/BanjoTabEditor/components/TabMeasure.tsx`: pass selection props and render copy button.
- Modify `src/components/BanjoTabEditor/components/TabStaff.tsx`: pass selection props through to measures.
- Modify `src/components/BanjoTabEditor/BanjoTabEditor.tsx`: own selected IDs, copied payload, selection tool state, copy/paste keyboard handling, and paste dispatch.
- Modify `src/components/BanjoTabEditor/BanjoTabEditor.css`: add selection cursor, pressed selection button, selected-note ring, region overlay, copy button, and paste preview styles.
- Modify `src/components/BanjoTabEditor/BanjoTabEditor.css.test.ts`: pin the selected-note ring and mobile action ordering styles.
- Modify `src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx`: add visual and interaction coverage for selection, copy, paste preview, and mobile pressed button.

---

### Task 1: Selection Types And Pure Helpers

**Files:**
- Modify: `src/components/BanjoTabEditor/types.ts`
- Create: `src/components/BanjoTabEditor/selection.ts`
- Create: `src/components/BanjoTabEditor/selection.test.ts`

- [ ] **Step 1: Write failing selection helper tests**

Create `src/components/BanjoTabEditor/selection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  clampPasteStart,
  createCopiedNoteSelection,
  getNotesInSelection,
  isNoteInSelection,
  normalizeSelectionBounds,
  slotRangeToPercentBounds,
} from "./selection";
import type { TabMeasureData, TabNoteData } from "./types";

describe("BanjoTabEditor selection helpers", () => {
  it("normalizes selection bounds when dragging in any direction", () => {
    expect(
      normalizeSelectionBounds(
        "measure-1",
        { stringIndex: 4, position: 12 },
        { stringIndex: 1, position: 3 },
      ),
    ).toEqual({
      measureId: "measure-1",
      minStringIndex: 1,
      maxStringIndex: 4,
      minPosition: 3,
      maxPosition: 12,
    });
  });

  it("selects notes by starting string and slot", () => {
    const bounds = normalizeSelectionBounds(
      "measure-1",
      { stringIndex: 1, position: 3 },
      { stringIndex: 3, position: 8 },
    );

    expect(isNoteInSelection(note("note-1", 2, 4, 5), bounds)).toBe(true);
    expect(isNoteInSelection(note("note-2", 4, 4, 5), bounds)).toBe(false);
    expect(isNoteInSelection(note("note-3", 2, 9, 5), bounds)).toBe(false);
    expect(
      isNoteInSelection(
        { id: "note-4", stringIndex: 2, position: 8, fret: 2, durationSlots: 4, articulation: { type: "slide", targetFret: 5 } },
        bounds,
      ),
    ).toBe(true);
  });

  it("returns notes inside a selection for one measure", () => {
    const measure = makeMeasure([
      note("note-1", 0, 2, 3),
      note("note-2", 1, 4, 5),
      note("note-3", 4, 10, 7),
    ]);
    const bounds = normalizeSelectionBounds(
      "measure-1",
      { stringIndex: 0, position: 1 },
      { stringIndex: 2, position: 5 },
    );

    expect(getNotesInSelection(measure, bounds).map((selectedNote) => selectedNote.id)).toEqual([
      "note-1",
      "note-2",
    ]);
  });

  it("creates copied notes with offsets from the left-most selected note", () => {
    const copied = createCopiedNoteSelection("measure-1", [
      note("note-1", 3, 9, 5),
      {
        id: "note-2",
        stringIndex: 1,
        position: 6,
        fret: 2,
        durationSlots: 3,
        articulation: { type: "hammer-on", targetFret: 4 },
      },
    ]);

    expect(copied).toEqual({
      sourceMeasureId: "measure-1",
      sourceNoteIds: ["note-2", "note-1"],
      minPosition: 6,
      maxPosition: 9,
      notes: [
        {
          stringIndex: 1,
          positionOffset: 0,
          fret: 2,
          durationSlots: 3,
          articulation: { type: "hammer-on", targetFret: 4 },
        },
        {
          stringIndex: 3,
          positionOffset: 3,
          fret: 5,
        },
      ],
    });
  });

  it("does not create a copied selection for no notes", () => {
    expect(createCopiedNoteSelection("measure-1", [])).toBeNull();
  });

  it("clamps paste start so copied notes fit in the measure", () => {
    const copied = createCopiedNoteSelection("measure-1", [
      note("note-1", 1, 4, 2),
      note("note-2", 2, 7, 5),
    ]);

    if (!copied) {
      throw new Error("Expected copied selection");
    }

    expect(clampPasteStart(15, copied, 16)).toBe(12);
    expect(clampPasteStart(-3, copied, 16)).toBe(0);
    expect(clampPasteStart(6, copied, 16)).toBe(6);
  });

  it("maps a selected slot range to edge percentages", () => {
    expect(slotRangeToPercentBounds(4, 7, 16)).toEqual({
      left: 25,
      width: 25,
    });
  });
});

function makeMeasure(notes: TabNoteData[]): TabMeasureData {
  return {
    id: "measure-1",
    title: "Measure 1",
    beats: 4,
    subdivision: 4,
    notes,
  };
}

function note(id: string, stringIndex: number, position: number, fret: number): TabNoteData {
  return {
    id,
    stringIndex,
    position,
    fret,
  };
}
```

- [ ] **Step 2: Run helper tests to verify they fail**

Run:

```bash
npm test -- src/components/BanjoTabEditor/selection.test.ts
```

Expected: FAIL with an import error for `./selection`.

- [ ] **Step 3: Add selection and clipboard types**

Modify `src/components/BanjoTabEditor/types.ts` by adding these exported types after `ScreenPoint`:

```ts
export type SelectionPoint = {
  stringIndex: number;
  position: number;
};

export type SelectionBounds = {
  measureId: string;
  minStringIndex: number;
  maxStringIndex: number;
  minPosition: number;
  maxPosition: number;
};

export type PasteTarget = {
  measureId: string;
  position: number;
};

export type CopiedNote = {
  stringIndex: number;
  positionOffset: number;
  fret: number;
  durationSlots?: number;
  articulation?: TabArticulation;
};

export type CopiedNoteSelection = {
  sourceMeasureId: string;
  sourceNoteIds: string[];
  minPosition: number;
  maxPosition: number;
  notes: CopiedNote[];
};
```

Then extend `EditorMode` with these members:

```ts
  | {
      type: "selecting-notes";
      measureId: string;
      start: SelectionPoint;
      current: SelectionPoint;
      pointer: ScreenPoint;
      pointerId?: number;
    }
  | {
      type: "paste-preview";
      target: PasteTarget | null;
      pointer: ScreenPoint | null;
    }
```

- [ ] **Step 4: Implement pure selection helpers**

Create `src/components/BanjoTabEditor/selection.ts`:

```ts
import { clamp } from "./geometry";
import type {
  CopiedNoteSelection,
  SelectionBounds,
  SelectionPoint,
  TabMeasureData,
  TabNoteData,
} from "./types";

export function normalizeSelectionBounds(
  measureId: string,
  start: SelectionPoint,
  current: SelectionPoint,
): SelectionBounds {
  return {
    measureId,
    minStringIndex: Math.min(start.stringIndex, current.stringIndex),
    maxStringIndex: Math.max(start.stringIndex, current.stringIndex),
    minPosition: Math.min(start.position, current.position),
    maxPosition: Math.max(start.position, current.position),
  };
}

export function isNoteInSelection(note: TabNoteData, bounds: SelectionBounds): boolean {
  return (
    note.stringIndex >= bounds.minStringIndex &&
    note.stringIndex <= bounds.maxStringIndex &&
    note.position >= bounds.minPosition &&
    note.position <= bounds.maxPosition
  );
}

export function getNotesInSelection(
  measure: TabMeasureData,
  bounds: SelectionBounds,
): TabNoteData[] {
  if (measure.id !== bounds.measureId) {
    return [];
  }

  return measure.notes.filter((note) => isNoteInSelection(note, bounds));
}

export function createCopiedNoteSelection(
  sourceMeasureId: string,
  notes: TabNoteData[],
): CopiedNoteSelection | null {
  if (notes.length === 0) {
    return null;
  }

  const orderedNotes = [...notes].sort(
    (left, right) => left.position - right.position || left.stringIndex - right.stringIndex,
  );
  const minPosition = Math.min(...orderedNotes.map((note) => note.position));
  const maxPosition = Math.max(...orderedNotes.map((note) => note.position));

  return {
    sourceMeasureId,
    sourceNoteIds: orderedNotes.map((note) => note.id),
    minPosition,
    maxPosition,
    notes: orderedNotes.map((note) => ({
      stringIndex: note.stringIndex,
      positionOffset: note.position - minPosition,
      fret: note.fret,
      ...(note.durationSlots !== undefined ? { durationSlots: note.durationSlots } : {}),
      ...(note.articulation ? { articulation: note.articulation } : {}),
    })),
  };
}

export function clampPasteStart(
  targetStart: number,
  selection: CopiedNoteSelection,
  slotCount: number,
): number {
  const maxOffset = Math.max(...selection.notes.map((note) => note.positionOffset));
  const maxStart = Math.max(slotCount - maxOffset - 1, 0);

  return clamp(targetStart, 0, maxStart);
}

export function slotRangeToPercentBounds(
  minPosition: number,
  maxPosition: number,
  slotCount: number,
): { left: number; width: number } {
  const start = clamp(minPosition, 0, Math.max(slotCount - 1, 0));
  const end = clamp(maxPosition, start, Math.max(slotCount - 1, 0));

  return {
    left: (start / slotCount) * 100,
    width: ((end - start + 1) / slotCount) * 100,
  };
}
```

- [ ] **Step 5: Run helper tests to verify they pass**

Run:

```bash
npm test -- src/components/BanjoTabEditor/selection.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit selection helpers**

Run:

```bash
git add src/components/BanjoTabEditor/types.ts src/components/BanjoTabEditor/selection.ts src/components/BanjoTabEditor/selection.test.ts
git commit -m "Add note selection helpers"
```

Expected: commit succeeds.

---

### Task 2: Paste Reducer Action

**Files:**
- Modify: `src/components/BanjoTabEditor/tabReducer.ts`
- Modify: `src/components/BanjoTabEditor/tabReducer.test.ts`

- [ ] **Step 1: Add failing paste reducer tests**

Append these tests inside the existing `describe("banjoTabReducer", () => { ... })` block in `src/components/BanjoTabEditor/tabReducer.test.ts`:

```ts
  it("pastes copied notes into a target measure", () => {
    const copiedSelection = {
      sourceMeasureId: "measure-1",
      sourceNoteIds: ["note-1", "note-2"],
      minPosition: 4,
      maxPosition: 6,
      notes: [
        { stringIndex: 0, positionOffset: 0, fret: 2 },
        { stringIndex: 2, positionOffset: 2, fret: 5 },
      ],
    };
    const state = reducerWith(
      stateWithMeasures([
        measure("measure-1", [
          { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
          { id: "note-2", stringIndex: 2, position: 6, fret: 5 },
        ]),
        measure("measure-2", []),
      ]),
      {
        type: "PASTE_NOTES",
        target: { measureId: "measure-2", position: 8 },
        selection: copiedSelection,
      },
    );

    expect(state.tab.measures[1].notes).toMatchObject([
      { stringIndex: 0, position: 8, fret: 2 },
      { stringIndex: 2, position: 10, fret: 5 },
    ]);
    expect(state.tab.measures[1].notes[0].id).not.toBe("note-1");
    expect(state.tab.measures[1].notes[1].id).not.toBe("note-2");
  });

  it("replaces conflicting notes when pasting", () => {
    const copiedSelection = {
      sourceMeasureId: "measure-1",
      sourceNoteIds: ["note-1"],
      minPosition: 4,
      maxPosition: 4,
      notes: [{ stringIndex: 1, positionOffset: 0, fret: 7 }],
    };
    const state = reducerWith(
      stateWithMeasures([
        measure("measure-1", [{ id: "note-1", stringIndex: 1, position: 4, fret: 7 }]),
        measure("measure-2", [
          { id: "note-2", stringIndex: 1, position: 8, fret: 2 },
          { id: "note-3", stringIndex: 2, position: 8, fret: 5 },
        ]),
      ]),
      {
        type: "PASTE_NOTES",
        target: { measureId: "measure-2", position: 8 },
        selection: copiedSelection,
      },
    );

    expect(state.tab.measures[1].notes).toMatchObject([
      { id: "note-3", stringIndex: 2, position: 8, fret: 5 },
      { stringIndex: 1, position: 8, fret: 7 },
    ]);
  });

  it("clamps paste start when copied notes would exceed the measure", () => {
    const copiedSelection = {
      sourceMeasureId: "measure-1",
      sourceNoteIds: ["note-1", "note-2"],
      minPosition: 3,
      maxPosition: 7,
      notes: [
        { stringIndex: 0, positionOffset: 0, fret: 2 },
        { stringIndex: 4, positionOffset: 4, fret: 9 },
      ],
    };
    const state = reducerWith(
      stateWithMeasures([
        measure("measure-1", []),
        measure("measure-2", []),
      ]),
      {
        type: "PASTE_NOTES",
        target: { measureId: "measure-2", position: 15 },
        selection: copiedSelection,
      },
    );

    expect(state.tab.measures[1].notes).toMatchObject([
      { stringIndex: 0, position: 11, fret: 2 },
      { stringIndex: 4, position: 15, fret: 9 },
    ]);
  });

  it("pastes articulated notes with duration and articulation data intact", () => {
    const copiedSelection = {
      sourceMeasureId: "measure-1",
      sourceNoteIds: ["note-1"],
      minPosition: 2,
      maxPosition: 2,
      notes: [
        {
          stringIndex: 2,
          positionOffset: 0,
          fret: 3,
          durationSlots: 3,
          articulation: { type: "slide" as const, targetFret: 5 },
        },
      ],
    };
    const state = reducerWith(
      stateWithMeasures([
        measure("measure-1", []),
        measure("measure-2", []),
      ]),
      {
        type: "PASTE_NOTES",
        target: { measureId: "measure-2", position: 9 },
        selection: copiedSelection,
      },
    );

    expect(state.tab.measures[1].notes).toMatchObject([
      {
        stringIndex: 2,
        position: 9,
        fret: 3,
        durationSlots: 3,
        articulation: { type: "slide", targetFret: 5 },
      },
    ]);
  });
```

- [ ] **Step 2: Run reducer tests to verify paste action fails**

Run:

```bash
npm test -- src/components/BanjoTabEditor/tabReducer.test.ts
```

Expected: FAIL with TypeScript or reducer errors for `PASTE_NOTES`.

- [ ] **Step 3: Add the reducer action and paste implementation**

Modify imports in `src/components/BanjoTabEditor/tabReducer.ts`:

```ts
import { clampPasteStart } from "./selection";
import type {
  BanjoTabEditorState,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  TabArticulation,
  TabMeasureData,
  TabNoteData,
} from "./types";
```

Add this action to `BanjoTabAction`:

```ts
  | {
      type: "PASTE_NOTES";
      target: PasteTarget;
      selection: CopiedNoteSelection;
    }
```

Add this reducer case before `DELETE_NOTE`:

```ts
    case "PASTE_NOTES":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: pasteNotes(state.tab.measures, action.target, action.selection),
        },
      };
```

Add this helper near `moveNote`:

```ts
function pasteNotes(
  measures: TabMeasureData[],
  target: PasteTarget,
  selection: CopiedNoteSelection,
): TabMeasureData[] {
  const targetStart = clampPasteStart(target.position, selection, SLOTS_PER_MEASURE);
  const pastedNotes: TabNoteData[] = selection.notes.map((note) => ({
    id: createNoteId(),
    stringIndex: note.stringIndex,
    position: targetStart + note.positionOffset,
    fret: note.fret,
    ...(note.durationSlots !== undefined ? { durationSlots: note.durationSlots } : {}),
    ...(note.articulation ? { articulation: note.articulation } : {}),
  }));

  return measures.map((measure) => {
    if (measure.id !== target.measureId) {
      return measure;
    }

    const nonConflictingNotes = measure.notes.filter(
      (existingNote) =>
        !pastedNotes.some(
          (pastedNote) =>
            pastedNote.stringIndex === existingNote.stringIndex &&
            pastedNote.position === existingNote.position,
        ),
    );

    return {
      ...measure,
      notes: [...nonConflictingNotes, ...pastedNotes],
    };
  });
}
```

- [ ] **Step 4: Run reducer tests to verify they pass**

Run:

```bash
npm test -- src/components/BanjoTabEditor/tabReducer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run helper tests again**

Run:

```bash
npm test -- src/components/BanjoTabEditor/selection.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit reducer paste behavior**

Run:

```bash
git add src/components/BanjoTabEditor/tabReducer.ts src/components/BanjoTabEditor/tabReducer.test.ts
git commit -m "Add paste notes reducer action"
```

Expected: commit succeeds.

---

### Task 3: Pointer Selection Hook

**Files:**
- Create: `src/components/BanjoTabEditor/hooks/usePointerNoteSelection.ts`
- Modify: `src/components/BanjoTabEditor/hooks/usePointerNoteDrag.ts`

- [ ] **Step 1: Add the selection hook**

Create `src/components/BanjoTabEditor/hooks/usePointerNoteSelection.ts`:

```ts
import { useCallback, useRef } from "react";
import type { Dispatch, PointerEvent as ReactPointerEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import { findNoteLocationFromPoint, type StringTrackGeometry } from "../geometry";
import type { BanjoTabAction } from "../tabReducer";
import type {
  BanjoTabEditorState,
  NoteLocation,
  ScreenPoint,
  SelectionBounds,
  SelectionPoint,
} from "../types";
import { normalizeSelectionBounds } from "../selection";

type ActiveSelectionPointer = {
  measureId: string;
  pointerId: number;
  start: SelectionPoint;
  current: SelectionPoint;
  captureElement: HTMLElement;
  didDrag: boolean;
};

type UsePointerNoteSelectionArgs = {
  state: BanjoTabEditorState;
  dispatch: Dispatch<BanjoTabAction>;
  isSelectionModeEnabled: boolean;
  onSelectionComplete: (bounds: SelectionBounds) => void;
  onSelectionClear: () => void;
};

const SELECTION_DRAG_THRESHOLD_PX = 4;

export function usePointerNoteSelection({
  state,
  dispatch,
  isSelectionModeEnabled,
  onSelectionComplete,
  onSelectionClear,
}: UsePointerNoteSelectionArgs) {
  const stringTrackElementsRef = useRef(new Map<string, HTMLElement>());
  const activeSelectionRef = useRef<ActiveSelectionPointer | null>(null);
  const suppressNextClickRef = useRef(false);
  const startPointRef = useRef<ScreenPoint | null>(null);

  const registerStringTrack = useCallback(
    (measureId: string, stringIndex: number, element: HTMLElement | null) => {
      const key = makeTrackKey(measureId, stringIndex);

      if (element) {
        stringTrackElementsRef.current.set(key, element);
      } else {
        stringTrackElementsRef.current.delete(key);
      }
    },
    [],
  );

  const shouldSuppressClick = useCallback(() => {
    if (!suppressNextClickRef.current) {
      return false;
    }

    suppressNextClickRef.current = false;
    return true;
  }, []);

  const startSelection = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || state.mode.type !== "idle") {
        return;
      }

      if (!event.shiftKey && !isSelectionModeEnabled) {
        return;
      }

      const point = getPointerPoint(event);
      const location = getSelectionLocation(point, stringTrackElementsRef.current);

      if (!location) {
        return;
      }

      event.preventDefault();
      safeSetPointerCapture(event.currentTarget, event.pointerId);
      onSelectionClear();

      const start = {
        stringIndex: location.stringIndex,
        position: location.position,
      };
      const activeSelection: ActiveSelectionPointer = {
        measureId: location.measureId,
        pointerId: event.pointerId,
        start,
        current: start,
        captureElement: event.currentTarget,
        didDrag: false,
      };

      activeSelectionRef.current = activeSelection;
      startPointRef.current = point;
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "selecting-notes",
          measureId: location.measureId,
          start,
          current: start,
          pointer: point,
          pointerId: event.pointerId,
        },
      });
    },
    [dispatch, isSelectionModeEnabled, onSelectionClear, state.mode.type],
  );

  const updateSelection = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeSelection = activeSelectionRef.current;

      if (!activeSelection || activeSelection.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const point = getPointerPoint(event);
      const startPoint = startPointRef.current;
      const location = getSelectionLocation(point, stringTrackElementsRef.current, activeSelection.measureId);

      if (startPoint && getDistance(startPoint, point) >= SELECTION_DRAG_THRESHOLD_PX) {
        activeSelection.didDrag = true;
      }

      if (!location) {
        return;
      }

      activeSelection.current = {
        stringIndex: location.stringIndex,
        position: location.position,
      };
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "selecting-notes",
          measureId: activeSelection.measureId,
          start: activeSelection.start,
          current: activeSelection.current,
          pointer: point,
          pointerId: activeSelection.pointerId,
        },
      });
    },
    [dispatch],
  );

  const finishSelection = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeSelection = activeSelectionRef.current;

      if (!activeSelection || activeSelection.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releasePointerCapture(activeSelection);

      if (activeSelection.didDrag) {
        onSelectionComplete(
          normalizeSelectionBounds(
            activeSelection.measureId,
            activeSelection.start,
            activeSelection.current,
          ),
        );
        suppressNextClickRef.current = true;
      } else {
        onSelectionClear();
      }

      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
      activeSelectionRef.current = null;
      startPointRef.current = null;
    },
    [dispatch, onSelectionClear, onSelectionComplete],
  );

  const cancelSelection = useCallback(
    (event?: ReactPointerEvent<HTMLElement>) => {
      const activeSelection = activeSelectionRef.current;

      if (!activeSelection || (event && activeSelection.pointerId !== event.pointerId)) {
        return;
      }

      releasePointerCapture(activeSelection);
      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
      activeSelectionRef.current = null;
      startPointRef.current = null;
    },
    [dispatch],
  );

  return {
    registerStringTrack,
    shouldSuppressClick,
    stringTrackPointerHandlers: {
      onPointerDown: startSelection,
      onPointerMove: updateSelection,
      onPointerUp: finishSelection,
      onPointerCancel: cancelSelection,
      onLostPointerCapture: cancelSelection,
    },
  };
}

function getSelectionLocation(
  point: ScreenPoint,
  trackElements: Map<string, HTMLElement>,
  measureId?: string,
): NoteLocation | null {
  const tracks: StringTrackGeometry[] = Array.from(trackElements.entries())
    .map(([key, element]) => {
      const [trackMeasureId, stringIndex] = key.split(":");
      return {
        measureId: trackMeasureId,
        stringIndex: Number(stringIndex),
        rect: element.getBoundingClientRect(),
      };
    })
    .filter((track) => !measureId || track.measureId === measureId);

  return findNoteLocationFromPoint(point, tracks, SLOTS_PER_MEASURE);
}

function getPointerPoint(event: ReactPointerEvent<HTMLElement>): ScreenPoint {
  return { x: event.clientX, y: event.clientY };
}

function getDistance(start: ScreenPoint, current: ScreenPoint): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

function releasePointerCapture(activeSelection: ActiveSelectionPointer) {
  if (activeSelection.captureElement.hasPointerCapture(activeSelection.pointerId)) {
    activeSelection.captureElement.releasePointerCapture(activeSelection.pointerId);
  }
}

function safeSetPointerCapture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Synthetic pointer events in tests may not have an active browser pointer.
  }
}

function makeTrackKey(measureId: string, stringIndex: number) {
  return `${measureId}:${stringIndex}`;
}
```

- [ ] **Step 2: Add a note-drag disable argument**

Modify `src/components/BanjoTabEditor/hooks/usePointerNoteDrag.ts`:

```ts
type UsePointerNoteDragArgs = {
  state: BanjoTabEditorState;
  dispatch: Dispatch<BanjoTabAction>;
  isNoteDragDisabled?: boolean;
};
```

Change the hook signature:

```ts
export function usePointerNoteDrag({
  state,
  dispatch,
  isNoteDragDisabled = false,
}: UsePointerNoteDragArgs) {
```

At the top of `handleNotePointerDown`, after the button check, add:

```ts
      if (event.shiftKey || isNoteDragDisabled) {
        return;
      }
```

Update the `handleNotePointerDown` dependency list:

```ts
    [isNoteDragDisabled, startDragging],
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit pointer selection hook**

Run:

```bash
git add src/components/BanjoTabEditor/hooks/usePointerNoteSelection.ts src/components/BanjoTabEditor/hooks/usePointerNoteDrag.ts
git commit -m "Add note selection pointer hook"
```

Expected: commit succeeds.

---

### Task 4: Selection Visual Components

**Files:**
- Create: `src/components/BanjoTabEditor/components/SelectionModeButton.tsx`
- Create: `src/components/BanjoTabEditor/components/SelectionRegionOverlay.tsx`
- Create: `src/components/BanjoTabEditor/components/SelectionCopyButton.tsx`
- Create: `src/components/BanjoTabEditor/components/PastePreview.tsx`
- Modify: `src/components/BanjoTabEditor/components/TabNote.tsx`
- Modify: `src/components/BanjoTabEditor/BanjoTabEditor.css`
- Modify: `src/components/BanjoTabEditor/BanjoTabEditor.css.test.ts`

- [ ] **Step 1: Add failing CSS tests for selected notes and mobile control order**

Append to `src/components/BanjoTabEditor/BanjoTabEditor.css.test.ts`:

```ts
describe("BanjoTabEditor note selection CSS", () => {
  it("renders selected notes with the same ring treatment as hover", () => {
    expect(css).toContain(".banjo-tab-note[data-selected=\"true\"]");
    expect(css).toContain("box-shadow: 0 0 0 3px var(--tab-drag-ring);");
  });

  it("keeps Add Measure as the right-most mobile action", () => {
    expect(css).toContain(".banjo-tab-add-measure {\n  order: 20;");
    expect(css).toContain(".banjo-tab-selection-mode-button {\n  order: 10;");
  });
});
```

- [ ] **Step 2: Run CSS tests to verify they fail**

Run:

```bash
npm test -- src/components/BanjoTabEditor/BanjoTabEditor.css.test.ts
```

Expected: FAIL because the new CSS selectors do not exist.

- [ ] **Step 3: Create the selection mode button**

Create `src/components/BanjoTabEditor/components/SelectionModeButton.tsx`:

```tsx
type SelectionModeButtonProps = {
  isPressed: boolean;
  onToggle: () => void;
};

export function SelectionModeButton({ isPressed, onToggle }: SelectionModeButtonProps) {
  return (
    <button
      type="button"
      className="banjo-tab-selection-mode-button"
      aria-label="Select notes"
      aria-pressed={isPressed}
      title="Select notes"
      onClick={onToggle}
    >
      <span aria-hidden="true">|</span>
    </button>
  );
}
```

- [ ] **Step 4: Create the selection region overlay**

Create `src/components/BanjoTabEditor/components/SelectionRegionOverlay.tsx`:

```tsx
import { SLOTS_PER_MEASURE } from "../constants";
import { slotRangeToPercentBounds } from "../selection";
import type { SelectionBounds } from "../types";

type SelectionRegionOverlayProps = {
  bounds: SelectionBounds;
  stringIndex: number;
};

export function SelectionRegionOverlay({ bounds, stringIndex }: SelectionRegionOverlayProps) {
  if (stringIndex < bounds.minStringIndex || stringIndex > bounds.maxStringIndex) {
    return null;
  }

  const percentBounds = slotRangeToPercentBounds(
    bounds.minPosition,
    bounds.maxPosition,
    SLOTS_PER_MEASURE,
  );

  return (
    <span
      className="banjo-tab-selection-region"
      style={{
        left: `${percentBounds.left}%`,
        width: `${percentBounds.width}%`,
      }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 5: Create the floating Copy button**

Create `src/components/BanjoTabEditor/components/SelectionCopyButton.tsx`:

```tsx
import { SLOTS_PER_MEASURE } from "../constants";
import { slotRangeToPercentBounds } from "../selection";
import type { SelectionBounds } from "../types";

type SelectionCopyButtonProps = {
  bounds: SelectionBounds;
  onCopy: () => void;
};

export function SelectionCopyButton({ bounds, onCopy }: SelectionCopyButtonProps) {
  const percentBounds = slotRangeToPercentBounds(
    bounds.minPosition,
    bounds.maxPosition,
    SLOTS_PER_MEASURE,
  );
  const left = Math.min(percentBounds.left + percentBounds.width, 96);

  return (
    <button
      type="button"
      className="banjo-tab-selection-copy-button"
      style={{
        left: `${left}%`,
      }}
      aria-label="Copy selected notes"
      onClick={onCopy}
    >
      Copy
    </button>
  );
}
```

- [ ] **Step 6: Create the paste preview**

Create `src/components/BanjoTabEditor/components/PastePreview.tsx`:

```tsx
import { SLOTS_PER_MEASURE } from "../constants";
import { slotToPercent } from "../geometry";
import { clampPasteStart } from "../selection";
import { formatNoteLabel } from "../noteFormatting";
import type { CopiedNoteSelection, PasteTarget } from "../types";
import { SlotHighlight } from "./SlotHighlight";

type PastePreviewProps = {
  measureId: string;
  stringIndex: number;
  copiedSelection: CopiedNoteSelection | null;
  target: PasteTarget | null;
};

export function PastePreview({
  measureId,
  stringIndex,
  copiedSelection,
  target,
}: PastePreviewProps) {
  if (!copiedSelection || !target || target.measureId !== measureId) {
    return null;
  }

  const targetStart = clampPasteStart(target.position, copiedSelection, SLOTS_PER_MEASURE);
  const notes = copiedSelection.notes.filter((note) => note.stringIndex === stringIndex);

  return (
    <>
      <SlotHighlight position={targetStart} />
      {notes.map((note) => {
        const position = targetStart + note.positionOffset;
        return (
          <span
            key={`${stringIndex}-${note.positionOffset}-${note.fret}`}
            className="banjo-tab-note banjo-tab-note--paste-preview"
            style={{ left: `${slotToPercent(position, SLOTS_PER_MEASURE)}%` }}
            aria-hidden="true"
          >
            {formatNoteLabel({
              id: "preview",
              stringIndex: note.stringIndex,
              position,
              fret: note.fret,
              ...(note.durationSlots !== undefined ? { durationSlots: note.durationSlots } : {}),
              ...(note.articulation ? { articulation: note.articulation } : {}),
            })}
          </span>
        );
      })}
    </>
  );
}
```

- [ ] **Step 7: Add selected and drag-disabled props to notes**

Modify `src/components/BanjoTabEditor/components/TabNote.tsx`:

```ts
  isSelected: boolean;
  isNoteDragDisabled: boolean;
```

Add the props to `TabNote` destructuring:

```ts
  isSelected,
  isNoteDragDisabled,
```

Change `handlePointerDown`:

```ts
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (isNoteDragDisabled) {
      return;
    }

    onNotePointerDown(note, location, event);
  };
```

Add `data-selected={isSelected || undefined}` to both rendered note roots:

```tsx
        data-selected={isSelected || undefined}
```

```tsx
      data-selected={isSelected || undefined}
```

- [ ] **Step 8: Add selection CSS**

Modify `src/components/BanjoTabEditor/BanjoTabEditor.css`:

```css
.banjo-tab-editor[data-selection-cursor="true"] .banjo-tab-slot-button,
.banjo-tab-editor[data-selection-cursor="true"] .banjo-tab-string-track,
.banjo-tab-editor[data-selection-mode="true"] .banjo-tab-slot-button,
.banjo-tab-editor[data-selection-mode="true"] .banjo-tab-string-track {
  cursor: text;
}

.banjo-tab-selection-mode-button {
  order: 10;
  display: inline-grid;
  place-items: center;
  min-width: 38px;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid var(--tab-measure-handle-border);
  border-radius: 6px;
  color: var(--tab-muted);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 850;
}

.banjo-tab-add-measure {
  order: 20;
}

.banjo-tab-selection-mode-button:hover,
.banjo-tab-selection-mode-button:focus-visible {
  border-color: var(--tab-accent);
  outline: none;
}

.banjo-tab-selection-mode-button:focus-visible {
  box-shadow: 0 0 0 3px var(--tab-drag-ring);
}

.banjo-tab-selection-mode-button[aria-pressed="true"] {
  border-color: var(--tab-accent);
  color: #ffffff;
  background: var(--tab-accent);
}

.banjo-tab-selection-region {
  position: absolute;
  top: 4px;
  bottom: 4px;
  z-index: 2;
  display: block;
  border: 1px solid var(--tab-highlight-border);
  border-radius: 6px;
  background: var(--tab-highlight-bg);
  pointer-events: none;
}

.banjo-tab-note[data-selected="true"] {
  border-color: var(--tab-accent);
  box-shadow: 0 0 0 3px var(--tab-drag-ring);
  outline: none;
}

.banjo-tab-selection-copy-button {
  position: absolute;
  top: 8px;
  z-index: 5;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--tab-accent);
  border-radius: 6px;
  color: #ffffff;
  background: var(--tab-accent);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  transform: translateX(-50%);
  cursor: pointer;
  box-shadow: var(--tab-floating-shadow);
}

.banjo-tab-selection-copy-button:focus-visible {
  outline: 3px solid var(--tab-focus);
  outline-offset: 2px;
}

.banjo-tab-note--paste-preview {
  opacity: 0.42;
  border-color: var(--tab-accent);
  color: var(--tab-accent);
  background: var(--tab-note-bg);
  pointer-events: none;
}
```

- [ ] **Step 9: Run CSS tests**

Run:

```bash
npm test -- src/components/BanjoTabEditor/BanjoTabEditor.css.test.ts
```

Expected: PASS.

- [ ] **Step 10: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: FAIL until components are wired in Task 5 if `TabNote` call sites have missing props.

- [ ] **Step 11: Commit visual components**

Run:

```bash
git add src/components/BanjoTabEditor/components/SelectionModeButton.tsx src/components/BanjoTabEditor/components/SelectionRegionOverlay.tsx src/components/BanjoTabEditor/components/SelectionCopyButton.tsx src/components/BanjoTabEditor/components/PastePreview.tsx src/components/BanjoTabEditor/components/TabNote.tsx src/components/BanjoTabEditor/BanjoTabEditor.css src/components/BanjoTabEditor/BanjoTabEditor.css.test.ts
git commit -m "Add note selection visual components"
```

Expected: commit succeeds.

---

### Task 5: Editor Integration And Keyboard Flow

**Files:**
- Modify: `src/components/BanjoTabEditor/BanjoTabEditor.tsx`
- Modify: `src/components/BanjoTabEditor/components/TabStaff.tsx`
- Modify: `src/components/BanjoTabEditor/components/TabMeasure.tsx`
- Modify: `src/components/BanjoTabEditor/components/TabStringRow.tsx`

- [ ] **Step 1: Wire selection props through `TabStaff`**

Modify `src/components/BanjoTabEditor/components/TabStaff.tsx` imports:

```ts
import type {
  BanjoTab,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  ScreenPoint,
  SelectionBounds,
  TabNoteData,
} from "../types";
import type { usePointerNoteSelection } from "../hooks/usePointerNoteSelection";
```

Add props:

```ts
  selectedNoteIds: Set<string>;
  completedSelectionBounds: SelectionBounds | null;
  copiedSelection: CopiedNoteSelection | null;
  pasteTarget: PasteTarget | null;
  isSelectionModeEnabled: boolean;
  onCopySelection: () => void;
  selectionApi: ReturnType<typeof usePointerNoteSelection>;
```

Pass these props to each `TabMeasure`:

```tsx
            selectedNoteIds={selectedNoteIds}
            completedSelectionBounds={completedSelectionBounds}
            copiedSelection={copiedSelection}
            pasteTarget={pasteTarget}
            isSelectionModeEnabled={isSelectionModeEnabled}
            onCopySelection={onCopySelection}
            selectionApi={selectionApi}
```

- [ ] **Step 2: Wire selection props through `TabMeasure`**

Modify `src/components/BanjoTabEditor/components/TabMeasure.tsx` imports:

```ts
import { normalizeSelectionBounds } from "../selection";
import type {
  BanjoString,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  ScreenPoint,
  SelectionBounds,
  TabMeasureData,
  TabNoteData,
} from "../types";
import { SelectionCopyButton } from "./SelectionCopyButton";
import type { usePointerNoteSelection } from "../hooks/usePointerNoteSelection";
```

Add props:

```ts
  selectedNoteIds: Set<string>;
  completedSelectionBounds: SelectionBounds | null;
  copiedSelection: CopiedNoteSelection | null;
  pasteTarget: PasteTarget | null;
  isSelectionModeEnabled: boolean;
  onCopySelection: () => void;
  selectionApi: ReturnType<typeof usePointerNoteSelection>;
```

Inside the component, derive the active row bounds:

```ts
  const activeSelectionBounds =
    mode.type === "selecting-notes" && mode.measureId === measure.id
      ? normalizeSelectionBounds(measure.id, mode.start, mode.current)
      : null;
  const copyButtonBounds =
    completedSelectionBounds?.measureId === measure.id ? completedSelectionBounds : null;
```

Render `SelectionCopyButton` inside `.banjo-tab-measure-grid` after string rows:

```tsx
        {copyButtonBounds && (
          <SelectionCopyButton bounds={copyButtonBounds} onCopy={onCopySelection} />
        )}
```

Pass new props to `TabStringRow`:

```tsx
            activeSelectionBounds={activeSelectionBounds}
            selectedNoteIds={selectedNoteIds}
            copiedSelection={copiedSelection}
            pasteTarget={pasteTarget}
            isSelectionModeEnabled={isSelectionModeEnabled}
            selectionApi={selectionApi}
```

- [ ] **Step 3: Wire selection into `TabStringRow`**

Modify `src/components/BanjoTabEditor/components/TabStringRow.tsx` imports:

```ts
import type {
  BanjoString,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  ScreenPoint,
  SelectionBounds,
  TabNoteData,
} from "../types";
import { PastePreview } from "./PastePreview";
import { SelectionRegionOverlay } from "./SelectionRegionOverlay";
import type { usePointerNoteSelection } from "../hooks/usePointerNoteSelection";
```

Add props:

```ts
  activeSelectionBounds: SelectionBounds | null;
  selectedNoteIds: Set<string>;
  copiedSelection: CopiedNoteSelection | null;
  pasteTarget: PasteTarget | null;
  isSelectionModeEnabled: boolean;
  selectionApi: ReturnType<typeof usePointerNoteSelection>;
```

Change `handleSlotClick` to suppress selection clicks:

```ts
    if (selectionApi.shouldSuppressClick()) {
      return;
    }
```

Replace the string track `ref`:

```tsx
        ref={(element) => {
          dragApi.registerStringTrack(measureId, stringIndex, element);
          selectionApi.registerStringTrack(measureId, stringIndex, element);
        }}
```

Add pointer handlers to `.banjo-tab-string-track`:

```tsx
        onPointerDown={selectionApi.stringTrackPointerHandlers.onPointerDown}
        onPointerMove={selectionApi.stringTrackPointerHandlers.onPointerMove}
        onPointerUp={selectionApi.stringTrackPointerHandlers.onPointerUp}
        onPointerCancel={selectionApi.stringTrackPointerHandlers.onPointerCancel}
        onLostPointerCapture={selectionApi.stringTrackPointerHandlers.onLostPointerCapture}
```

Render the active overlay and paste preview after the slot grid:

```tsx
        {activeSelectionBounds && (
          <SelectionRegionOverlay bounds={activeSelectionBounds} stringIndex={stringIndex} />
        )}
        <PastePreview
          measureId={measureId}
          stringIndex={stringIndex}
          copiedSelection={copiedSelection}
          target={pasteTarget}
        />
```

Pass new props to `TabNote`:

```tsx
            isSelected={selectedNoteIds.has(note.id)}
            isNoteDragDisabled={isSelectionModeEnabled || mode.type === "selecting-notes"}
```

- [ ] **Step 4: Integrate state and handlers in `BanjoTabEditor`**

Modify `src/components/BanjoTabEditor/BanjoTabEditor.tsx` imports:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SelectionModeButton } from "./components/SelectionModeButton";
import { usePointerNoteSelection } from "./hooks/usePointerNoteSelection";
import {
  createCopiedNoteSelection,
  getNotesInSelection,
  normalizeSelectionBounds,
} from "./selection";
import type {
  BanjoTabEditorState,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  ScreenPoint,
  SelectionBounds,
  TabArticulation,
  TabNoteData,
} from "./types";
```

Add state after refs:

```ts
  const [isSelectionModeEnabled, setIsSelectionModeEnabled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [completedSelectionBounds, setCompletedSelectionBounds] = useState<SelectionBounds | null>(null);
  const [copiedSelection, setCopiedSelection] = useState<CopiedNoteSelection | null>(null);
```

Add helpers before `openFretPicker`:

```ts
  const activeSelectionBounds =
    state.mode.type === "selecting-notes"
      ? normalizeSelectionBounds(state.mode.measureId, state.mode.start, state.mode.current)
      : completedSelectionBounds;
  const selectedNoteIds = useMemo(
    () => new Set(getSelectedNoteIds(state, activeSelectionBounds, copiedSelection)),
    [activeSelectionBounds, copiedSelection, state],
  );
  const pasteTarget = state.mode.type === "paste-preview" ? state.mode.target : null;

  const clearSelection = useCallback(() => {
    setCompletedSelectionBounds(null);
    setCopiedSelection(null);
    if (state.mode.type === "paste-preview" || state.mode.type === "selecting-notes") {
      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
    }
  }, [dispatch, state.mode.type]);

  const completeSelection = useCallback((bounds: SelectionBounds) => {
    const measure = state.tab.measures.find((item) => item.id === bounds.measureId);
    const selectedNotes = measure ? getNotesInSelection(measure, bounds) : [];

    if (selectedNotes.length === 0) {
      setCompletedSelectionBounds(null);
      return;
    }

    setCompletedSelectionBounds(bounds);
  }, [state.tab.measures]);

  const copySelection = useCallback(() => {
    if (!completedSelectionBounds) {
      return;
    }

    const measure = state.tab.measures.find((item) => item.id === completedSelectionBounds.measureId);
    const selectedNotes = measure ? getNotesInSelection(measure, completedSelectionBounds) : [];
    const nextCopiedSelection = createCopiedNoteSelection(completedSelectionBounds.measureId, selectedNotes);

    if (!nextCopiedSelection) {
      return;
    }

    setCopiedSelection(nextCopiedSelection);
    dispatch({
      type: "SET_EDITOR_MODE",
      mode: {
        type: "paste-preview",
        target: quickFretTargetRef.current
          ? {
              measureId: quickFretTargetRef.current.measureId,
              position: quickFretTargetRef.current.position,
            }
          : null,
        pointer: null,
      },
    });
  }, [completedSelectionBounds, dispatch, state.tab.measures]);

  const pasteCopiedSelection = useCallback((target: PasteTarget, keepPreviewActive: boolean) => {
    if (!copiedSelection) {
      return;
    }

    dispatch({ type: "PASTE_NOTES", target, selection: copiedSelection });
    if (!keepPreviewActive) {
      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
      setCompletedSelectionBounds(null);
      setCopiedSelection(null);
    }
  }, [copiedSelection, dispatch]);
```

Create `selectionApi` before `dragApi`, and pass drag disabled into `usePointerNoteDrag`:

```ts
  const selectionApi = usePointerNoteSelection({
    state,
    dispatch,
    isSelectionModeEnabled,
    onSelectionComplete: completeSelection,
    onSelectionClear: clearSelection,
  });
  const dragApi = usePointerNoteDrag({
    state,
    dispatch,
    isNoteDragDisabled: isSelectionModeEnabled || state.mode.type === "selecting-notes",
  });
```

Update `openFretPicker` to clear completed selection before opening:

```ts
    setCompletedSelectionBounds(null);
    setCopiedSelection(null);
```

At the top of `handleSlotPress`, add paste handling:

```ts
    if (state.mode.type === "paste-preview" && copiedSelection) {
      pasteCopiedSelection(
        { measureId: location.measureId, position: location.position },
        false,
      );
      return;
    }
```

Update `handleQuickFretTarget`:

```ts
  const handleQuickFretTarget = (location: NoteLocation) => {
    quickFretTargetRef.current = location;
    if (state.mode.type === "paste-preview") {
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "paste-preview",
          target: { measureId: location.measureId, position: location.position },
          pointer: state.mode.pointer,
        },
      });
    }
  };
```

Render root attributes:

```tsx
    <main
      className="banjo-tab-editor"
      data-selection-cursor={state.mode.type === "idle" && isShiftPressed ? true : undefined}
      data-selection-mode={isSelectionModeEnabled || undefined}
      aria-labelledby="banjo-tab-editor-title"
    >
```

Add a Shift-key tracking effect near the existing keyboard shortcut effect:

```ts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift" && !event.repeat) {
        setIsShiftPressed(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
```

Render the selection button before Add Measure:

```tsx
          <SelectionModeButton
            isPressed={isSelectionModeEnabled}
            onToggle={() => {
              const nextEnabled = !isSelectionModeEnabled;
              setIsSelectionModeEnabled(nextEnabled);
              if (!nextEnabled) {
                clearSelection();
              }
            }}
          />
```

Pass new props to `TabStaff`:

```tsx
        selectedNoteIds={selectedNoteIds}
        completedSelectionBounds={completedSelectionBounds}
        copiedSelection={copiedSelection}
        pasteTarget={pasteTarget}
        isSelectionModeEnabled={isSelectionModeEnabled}
        onCopySelection={copySelection}
        selectionApi={selectionApi}
```

Add helper functions near the bottom of the file:

```ts
function getSelectedNoteIds(
  state: BanjoTabEditorState,
  bounds: SelectionBounds | null,
  copiedSelection: CopiedNoteSelection | null,
): string[] {
  const ids = new Set<string>();

  if (bounds) {
    const measure = state.tab.measures.find((item) => item.id === bounds.measureId);
    if (measure) {
      getNotesInSelection(measure, bounds).forEach((note) => ids.add(note.id));
    }
  }

  copiedSelection?.sourceNoteIds.forEach((id) => ids.add(id));
  return Array.from(ids);
}

function isCopyShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";
}

function isPasteShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v";
}
```

- [ ] **Step 5: Add copy, paste, and Escape to keyboard handling**

Inside `handleKeyDown`, after editable/default-prevented checks and before quick fret digit entry, add:

```ts
      if (event.key === "Escape") {
        if (
          state.mode.type === "paste-preview" ||
          state.mode.type === "selecting-notes" ||
          completedSelectionBounds ||
          copiedSelection ||
          isSelectionModeEnabled
        ) {
          event.preventDefault();
          setIsSelectionModeEnabled(false);
          clearSelection();
        }
        return;
      }

      if (isCopyShortcut(event)) {
        if (completedSelectionBounds) {
          event.preventDefault();
          copySelection();
        }
        return;
      }

      if (isPasteShortcut(event)) {
        const quickFretTarget = quickFretTargetRef.current;
        if (copiedSelection && quickFretTarget) {
          event.preventDefault();
          pasteCopiedSelection(
            { measureId: quickFretTarget.measureId, position: quickFretTarget.position },
            false,
          );
        }
        return;
      }
```

Update the `useEffect` dependency list to include:

```ts
completedSelectionBounds,
copiedSelection,
copySelection,
pasteCopiedSelection,
clearSelection,
isSelectionModeEnabled,
```

- [ ] **Step 6: Support repeat paste with modifier-click**

Change `handleSlotPress` signature to accept a keep-preview flag:

```ts
  const handleSlotPress = (
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
    keepPastePreviewActive = false,
  ) => {
```

Use the flag in paste handling:

```ts
      pasteCopiedSelection(
        { measureId: location.measureId, position: location.position },
        keepPastePreviewActive,
      );
```

Update `TabStringRow` `onSlotPress` type and call:

```ts
    onSlotPress(
      {
        measureId,
        stringIndex,
        position,
      },
      getEventPoint(event),
      event.currentTarget,
      event.metaKey || event.ctrlKey,
    );
```

Propagate the extra optional parameter through `TabStaff` and `TabMeasure` types.

- [ ] **Step 7: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Run unit tests**

Run:

```bash
npm test -- src/components/BanjoTabEditor/selection.test.ts src/components/BanjoTabEditor/tabReducer.test.ts src/components/BanjoTabEditor/BanjoTabEditor.css.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit editor integration**

Run:

```bash
git add src/components/BanjoTabEditor/BanjoTabEditor.tsx src/components/BanjoTabEditor/components/TabStaff.tsx src/components/BanjoTabEditor/components/TabMeasure.tsx src/components/BanjoTabEditor/components/TabStringRow.tsx
git commit -m "Wire note selection copy paste UI"
```

Expected: commit succeeds.

---

### Task 6: Storybook Stories And Interaction Coverage

**Files:**
- Modify: `src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx`

- [ ] **Step 1: Fetch Storybook instructions**

Run the Storybook MCP tool:

```text
get_storybook_story_instructions
```

Expected: instructions confirm `Meta` and `StoryObj` come from `@storybook/react-vite`, and test helpers come from `storybook/test`.

- [ ] **Step 2: Add story data for selection scenarios**

In `src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx`, add this helper near the other helper functions:

```ts
function selectionEditorState(): BanjoTabEditorState {
  return makeEditorState([
    {
      id: "measure-1",
      title: "Intro",
      notes: [
        { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
        { id: "note-2", stringIndex: 1, position: 5, fret: 3 },
        { id: "note-3", stringIndex: 3, position: 7, fret: 5 },
      ],
    },
    {
      id: "measure-2",
      title: "Repeat",
      notes: [{ id: "note-4", stringIndex: 2, position: 8, fret: 7 }],
    },
  ]);
}
```

- [ ] **Step 3: Add visual state stories**

Add these stories:

```tsx
export const SelectingNotesVisualState: Story = {
  args: {
    initialState: {
      ...selectionEditorState(),
      mode: {
        type: "selecting-notes",
        measureId: "measure-1",
        start: { stringIndex: 0, position: 4 },
        current: { stringIndex: 3, position: 7 },
        pointer: { x: 460, y: 280 },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".banjo-tab-selection-region")).toBeInTheDocument();
  },
};

export const MobileSelectionButtonPressed: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  play: async ({ canvas }) => {
    const selectionButton = canvas.getByRole("button", { name: "Select notes" });
    const addMeasureButton = canvas.getByRole("button", { name: "Add measure" });

    await userEvent.click(selectionButton);
    await expect(selectionButton).toHaveAttribute("aria-pressed", "true");
    await expect(addMeasureButton).toBeInTheDocument();
  },
};
```

- [ ] **Step 4: Add selection copy and keyboard paste stories**

Add these stories:

```tsx
export const SelectAndCopyNotesInteraction: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  play: async ({ canvas, canvasElement }) => {
    const startSlot = canvas.getByLabelText("Set string 1 slot 5");
    const endSlot = canvas.getByLabelText("Set string 4 slot 8");
    const startRect = startSlot.getBoundingClientRect();
    const endRect = endSlot.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };
    const endPoint = {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
    };

    fireEvent.pointerDown(startSlot, {
      ...startPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerMove(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerUp(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
      shiftKey: true,
    });

    await expect(canvas.getByRole("button", { name: "Copy selected notes" })).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll(".banjo-tab-note[data-selected='true']").length).toBe(3);
    await userEvent.click(canvas.getByRole("button", { name: "Copy selected notes" }));
    await expect(canvasElement.querySelector(".banjo-tab-note--paste-preview")).toBeInTheDocument();
  },
};

export const KeyboardCopyPasteInteraction: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  play: async ({ canvas }) => {
    const startSlot = canvas.getByLabelText("Set string 1 slot 5");
    const endSlot = canvas.getByLabelText("Set string 4 slot 8");
    const pasteSlot = canvas.getByLabelText("Set string 1 slot 11");
    const startRect = startSlot.getBoundingClientRect();
    const endRect = endSlot.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };
    const endPoint = {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
    };

    fireEvent.pointerDown(startSlot, {
      ...startPoint,
      button: 0,
      pointerId: 10,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerMove(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 10,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerUp(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 10,
      pointerType: "mouse",
      shiftKey: true,
    });

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    pasteSlot.focus();
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 11" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 3 on string 2, slot 12" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 4, slot 14" })).toBeInTheDocument();
  },
};
```

- [ ] **Step 5: Add repeat paste story**

Add this story:

```tsx
export const RepeatPasteWithModifierClickInteraction: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  play: async ({ canvas }) => {
    const startSlot = canvas.getByLabelText("Set string 1 slot 5");
    const endSlot = canvas.getByLabelText("Set string 4 slot 8");
    const firstPasteSlot = canvas.getByLabelText("Set string 1 slot 9");
    const secondPasteSlot = canvas.getByLabelText("Set string 1 slot 13");
    const startRect = startSlot.getBoundingClientRect();
    const endRect = endSlot.getBoundingClientRect();

    fireEvent.pointerDown(startSlot, {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
      button: 0,
      pointerId: 11,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerMove(startSlot, {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
      button: 0,
      pointerId: 11,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerUp(startSlot, {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
      button: 0,
      pointerId: 11,
      pointerType: "mouse",
      shiftKey: true,
    });

    await userEvent.click(canvas.getByRole("button", { name: "Copy selected notes" }));
    await userEvent.click(firstPasteSlot, { ctrlKey: true });
    await userEvent.click(secondPasteSlot);

    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 9" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 13" })).toBeInTheDocument();
  },
};
```

- [ ] **Step 6: Run focused Storybook tests**

Run the Storybook MCP `run_story_tests` tool with these story IDs:

```json
{
  "stories": [
    { "storyId": "components-banjotabeditor--selecting-notes-visual-state" },
    { "storyId": "components-banjotabeditor--mobile-selection-button-pressed" },
    { "storyId": "components-banjotabeditor--select-and-copy-notes-interaction" },
    { "storyId": "components-banjotabeditor--keyboard-copy-paste-interaction" },
    { "storyId": "components-banjotabeditor--repeat-paste-with-modifier-click-interaction" }
  ]
}
```

Expected: PASS with no accessibility violations.

- [ ] **Step 7: Get preview links**

Run the Storybook MCP `preview_stories` tool with the same story IDs.

Expected: preview URLs are returned for the final handoff.

- [ ] **Step 8: Commit Storybook coverage**

Run:

```bash
git add src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx
git commit -m "Add note selection story coverage"
```

Expected: commit succeeds.

---

### Task 7: Final Verification

**Files:**
- Verify all changed files from Tasks 1-6.

- [ ] **Step 1: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run unit tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run full Storybook tests**

Run the Storybook MCP `run_story_tests` tool without a `stories` filter.

Expected: PASS with no accessibility violations.

- [ ] **Step 4: Check git status**

Run:

```bash
git status --short
```

Expected: no uncommitted changes unless final Storybook links or a follow-up note are being added outside the repository.

- [ ] **Step 5: Final handoff summary**

Report:

```text
Implemented note selection copy/paste.
Verified with npm run typecheck, npm test, and Storybook run_story_tests.
Preview stories:
- <preview URL for SelectingNotesVisualState>
- <preview URL for SelectAndCopyNotesInteraction>
- <preview URL for KeyboardCopyPasteInteraction>
- <preview URL for MobileSelectionButtonPressed>
```
