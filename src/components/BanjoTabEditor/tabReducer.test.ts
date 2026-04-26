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
) {
  return {
    id,
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
