import { describe, expect, it } from "vitest";
import { banjoTabReducer } from "./tabReducer";
import type { BanjoTabEditorState, NoteLocation } from "./types";

describe("banjoTabReducer", () => {
  it("adds a note at a string and position", () => {
    const state = reducerWith(baseState(), {
      type: "ADD_OR_UPDATE_NOTE",
      location: location(0, 4),
      fret: 2,
    });

    expect(state.tab.measures[0].notes).toMatchObject([
      { stringIndex: 0, position: 4, fret: 2 },
    ]);
  });

  it("updates an existing note on the same string and position", () => {
    const state = reducerWith(stateWithNotes([{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }]), {
      type: "ADD_OR_UPDATE_NOTE",
      location: location(0, 4),
      fret: 5,
    });

    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-1", stringIndex: 0, position: 4, fret: 5 },
    ]);
  });

  it("adds a hammer-on articulation to a note", () => {
    const state = reducerWith(baseState(), {
      type: "ADD_OR_UPDATE_NOTE",
      location: location(0, 4),
      fret: 2,
      articulation: { type: "hammer-on", targetFret: 4 },
    });

    expect(state.tab.measures[0].notes).toMatchObject([
      {
        stringIndex: 0,
        position: 4,
        fret: 2,
        durationSlots: 2,
        articulation: { type: "hammer-on", targetFret: 4 },
      },
    ]);
  });

  it.each([
    ["pull-off", 4, { type: "pull-off" as const, targetFret: 2 }],
    ["slide up", 2, { type: "slide" as const, targetFret: 5 }],
    ["slide down", 5, { type: "slide" as const, targetFret: 2 }],
    ["bend", 7, { type: "bend" as const }],
  ])("adds a %s articulation to a note", (_label, fret, articulation) => {
    const state = reducerWith(baseState(), {
      type: "ADD_OR_UPDATE_NOTE",
      location: location(0, 4),
      fret,
      articulation,
    });

    expect(state.tab.measures[0].notes).toMatchObject([
      {
        stringIndex: 0,
        position: 4,
        fret,
        ...(articulation.type === "bend" ? {} : { durationSlots: 2 }),
        articulation,
      },
    ]);
  });

  it("clamps a new targeted articulation span at the end of the measure", () => {
    const state = reducerWith(baseState(), {
      type: "ADD_OR_UPDATE_NOTE",
      location: location(0, 15),
      fret: 10,
      articulation: { type: "slide", targetFret: 12 },
    });

    expect(state.tab.measures[0].notes).toMatchObject([
      {
        stringIndex: 0,
        position: 15,
        fret: 10,
        durationSlots: 1,
        articulation: { type: "slide", targetFret: 12 },
      },
    ]);
  });

  it("resizes an articulated note from the right edge", () => {
    const state = reducerWith(
      stateWithNotes([
        {
          id: "note-1",
          stringIndex: 0,
          position: 4,
          fret: 2,
          durationSlots: 2,
          articulation: { type: "hammer-on", targetFret: 4 },
        },
      ]),
      {
        type: "RESIZE_ARTICULATION_SPAN",
        noteId: "note-1",
        edge: "end",
        targetPosition: 7,
      } as never,
    );

    expect(state.tab.measures[0].notes).toEqual([
      {
        id: "note-1",
        stringIndex: 0,
        position: 4,
        fret: 2,
        durationSlots: 4,
        articulation: { type: "hammer-on", targetFret: 4 },
      },
    ]);
  });

  it("resizes an articulated note from the left edge", () => {
    const state = reducerWith(
      stateWithNotes([
        {
          id: "note-1",
          stringIndex: 0,
          position: 4,
          fret: 2,
          durationSlots: 4,
          articulation: { type: "slide", targetFret: 5 },
        },
      ]),
      {
        type: "RESIZE_ARTICULATION_SPAN",
        noteId: "note-1",
        edge: "start",
        targetPosition: 2,
      } as never,
    );

    expect(state.tab.measures[0].notes).toEqual([
      {
        id: "note-1",
        stringIndex: 0,
        position: 2,
        fret: 2,
        durationSlots: 6,
        articulation: { type: "slide", targetFret: 5 },
      },
    ]);
  });

  it("replaces an articulated note with a plain note", () => {
    const state = reducerWith(
      stateWithNotes([
        {
          id: "note-1",
          stringIndex: 0,
          position: 4,
          fret: 2,
          articulation: { type: "hammer-on", targetFret: 4 },
        },
      ]),
      {
        type: "ADD_OR_UPDATE_NOTE",
        location: location(0, 4),
        fret: 7,
      },
    );

    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-1", stringIndex: 0, position: 4, fret: 7 },
    ]);
  });

  it("allows notes on multiple strings at the same rhythmic position", () => {
    const state = reducerWith(stateWithNotes([{ id: "note-1", stringIndex: 0, position: 6, fret: 2 }]), {
      type: "ADD_OR_UPDATE_NOTE",
      location: location(2, 6),
      fret: 0,
    });

    expect(state.tab.measures[0].notes).toMatchObject([
      { stringIndex: 0, position: 6, fret: 2 },
      { stringIndex: 2, position: 6, fret: 0 },
    ]);
  });

  it("moves a note to a new string and position", () => {
    const state = reducerWith(stateWithNotes([{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }]), {
      type: "MOVE_NOTE",
      noteId: "note-1",
      target: location(3, 12),
    });

    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-1", stringIndex: 3, position: 12, fret: 2 },
    ]);
  });

  it("moves an articulated note without losing articulation", () => {
    const state = reducerWith(
      stateWithNotes([
        {
          id: "note-1",
          stringIndex: 0,
          position: 4,
          fret: 5,
          articulation: { type: "slide", targetFret: 2 },
        },
      ]),
      {
        type: "MOVE_NOTE",
        noteId: "note-1",
        target: location(3, 12),
      },
    );

    expect(state.tab.measures[0].notes).toEqual([
      {
        id: "note-1",
        stringIndex: 3,
        position: 12,
        fret: 5,
        articulation: { type: "slide", targetFret: 2 },
      },
    ]);
  });

  it("moves a note to a different slot on the current string", () => {
    const state = reducerWith(stateWithNotes([{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }]), {
      type: "MOVE_NOTE",
      noteId: "note-1",
      target: location(0, 9),
    });

    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-1", stringIndex: 0, position: 9, fret: 2 },
    ]);
  });

  it("keeps notes unchanged while dragging over an occupied target", () => {
    const state = reducerWith(
      stateWithNotes([
        { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
        { id: "note-2", stringIndex: 2, position: 9, fret: 5 },
      ]),
      {
        type: "SET_EDITOR_MODE",
        mode: {
          type: "dragging-note",
          noteId: "note-1",
          origin: location(0, 4),
          currentTarget: location(2, 9),
          pointer: { x: 200, y: 200 },
          overTrash: false,
        },
      },
    );

    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
      { id: "note-2", stringIndex: 2, position: 9, fret: 5 },
    ]);
  });

  it("replaces a conflicting note when moving onto an occupied string and position", () => {
    const state = reducerWith(
      stateWithNotes([
        { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
        { id: "note-2", stringIndex: 3, position: 12, fret: 5 },
      ]),
      {
        type: "MOVE_NOTE",
        noteId: "note-1",
        target: location(3, 12),
      },
    );

    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-1", stringIndex: 3, position: 12, fret: 2 },
    ]);
  });

  it("deletes a note", () => {
    const state = reducerWith(
      stateWithNotes([
        { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
        { id: "note-2", stringIndex: 3, position: 12, fret: 5 },
      ]),
      { type: "DELETE_NOTE", noteId: "note-1" },
    );

    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-2", stringIndex: 3, position: 12, fret: 5 },
    ]);
  });

  it("deletes an articulated note", () => {
    const state = reducerWith(
      stateWithNotes([
        {
          id: "note-1",
          stringIndex: 0,
          position: 4,
          fret: 7,
          articulation: { type: "bend" },
        },
      ]),
      { type: "DELETE_NOTE", noteId: "note-1" },
    );

    expect(state.tab.measures[0].notes).toEqual([]);
  });

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

  it("moves a measure to a new index", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }]),
      measure("measure-2", [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }]),
      measure("measure-3", []),
    ]), {
      type: "MOVE_MEASURE",
      measureId: "measure-1",
      targetIndex: 2,
    });

    expect(state.tab.measures.map((item) => item.id)).toEqual(["measure-2", "measure-3", "measure-1"]);
  });

  it("creates new measures with durable default titles", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", []),
    ]), {
      type: "ADD_MEASURE",
    });

    expect(state.tab.measures.map((item) => item.title)).toEqual(["Measure 1", "Measure 2"]);
  });

  it("keeps default measure titles with their measure data when rearranging measures", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }]),
      measure("measure-2", [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }]),
    ]), {
      type: "MOVE_MEASURE",
      measureId: "measure-1",
      targetIndex: 1,
    });

    expect(state.tab.measures.map((item) => item.title)).toEqual(["Measure 2", "Measure 1"]);
    expect(state.tab.measures[0].notes).toEqual([
      { id: "note-2", stringIndex: 1, position: 8, fret: 3 },
    ]);
  });

  it("renames a measure", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", []),
    ]), {
      type: "RENAME_MEASURE",
      measureId: "measure-1",
      title: "Break",
    });

    expect(state.tab.measures[0]).toMatchObject({ id: "measure-1", title: "Break" });
  });

  it("trims measure titles and resets blank titles to the measure default", () => {
    const renamedState = reducerWith(stateWithMeasures([
      measure("measure-1", [], "Verse"),
    ]), {
      type: "RENAME_MEASURE",
      measureId: "measure-1",
      title: "  Chorus  ",
    });
    const clearedState = reducerWith(renamedState, {
      type: "RENAME_MEASURE",
      measureId: "measure-1",
      title: "   ",
    });

    expect(renamedState.tab.measures[0]).toMatchObject({ title: "Chorus" });
    expect(clearedState.tab.measures[0]).toMatchObject({ title: "Measure 1" });
  });

  it("preserves articulated notes when rearranging measures", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", [
        {
          id: "note-1",
          stringIndex: 0,
          position: 4,
          fret: 10,
          articulation: { type: "hammer-on", targetFret: 12 },
        },
      ]),
      measure("measure-2", [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }]),
    ]), {
      type: "MOVE_MEASURE",
      measureId: "measure-1",
      targetIndex: 1,
    });

    expect(state.tab.measures[1].notes).toEqual([
      {
        id: "note-1",
        stringIndex: 0,
        position: 4,
        fret: 10,
        articulation: { type: "hammer-on", targetFret: 12 },
      },
    ]);
  });

  it("preserves custom measure titles when rearranging measures", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", [], "Intro"),
      measure("measure-2", [], "Break"),
    ]), {
      type: "MOVE_MEASURE",
      measureId: "measure-1",
      targetIndex: 1,
    });

    expect(state.tab.measures.map((item) => item.title)).toEqual(["Break", "Intro"]);
  });

  it("deletes a measure when more than one measure exists", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }]),
      measure("measure-2", [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }]),
    ]), {
      type: "DELETE_MEASURE",
      measureId: "measure-1",
    });

    expect(state.tab.measures).toEqual([
      measure("measure-2", [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }]),
    ]);
  });

  it("removes articulated notes when deleting their measure", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", [
        {
          id: "note-1",
          stringIndex: 0,
          position: 4,
          fret: 4,
          articulation: { type: "pull-off", targetFret: 2 },
        },
      ]),
      measure("measure-2", [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }]),
    ]), {
      type: "DELETE_MEASURE",
      measureId: "measure-1",
    });

    expect(state.tab.measures).toEqual([
      measure("measure-2", [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }]),
    ]);
  });

  it("clears notes instead of deleting the only measure", () => {
    const state = reducerWith(stateWithMeasures([
      measure("measure-1", [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }]),
    ]), {
      type: "DELETE_MEASURE",
      measureId: "measure-1",
    });

    expect(state.tab.measures).toEqual([measure("measure-1", [])]);
  });
});

function reducerWith(
  state: BanjoTabEditorState,
  action: Parameters<typeof banjoTabReducer>[1],
) {
  return banjoTabReducer(state, action);
}

function location(stringIndex: number, position: number): NoteLocation {
  return {
    measureId: "measure-1",
    stringIndex,
    position,
  };
}

function baseState(): BanjoTabEditorState {
  return stateWithNotes([]);
}

function stateWithNotes(notes: BanjoTabEditorState["tab"]["measures"][number]["notes"]): BanjoTabEditorState {
  return stateWithMeasures([measure("measure-1", notes)]);
}

function measure(
  id: string,
  notes: BanjoTabEditorState["tab"]["measures"][number]["notes"],
  title?: string,
) {
  return {
    id,
    title: title ?? `Measure ${id.split("-").at(-1) ?? "1"}`,
    beats: 4,
    subdivision: 4,
    notes,
  };
}

function stateWithMeasures(measures: BanjoTabEditorState["tab"]["measures"]): BanjoTabEditorState {
  return {
    mode: { type: "idle" },
    tab: {
      tuning: [
        { id: "string-1", label: "D", order: 1 },
        { id: "string-2", label: "B", order: 2 },
        { id: "string-3", label: "G", order: 3 },
        { id: "string-4", label: "D", order: 4 },
        { id: "string-5", label: "g", order: 5 },
      ],
      measures,
    },
  };
}
