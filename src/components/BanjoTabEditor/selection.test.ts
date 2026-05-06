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
        {
          id: "note-4",
          stringIndex: 2,
          position: 8,
          fret: 2,
          durationSlots: 4,
          articulation: { type: "slide", targetFret: 5 },
        },
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
