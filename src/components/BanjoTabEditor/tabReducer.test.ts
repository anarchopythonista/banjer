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
      measures: [
        {
          id: "measure-1",
          beats: 4,
          subdivision: 4,
          notes,
        },
      ],
    },
  };
}
