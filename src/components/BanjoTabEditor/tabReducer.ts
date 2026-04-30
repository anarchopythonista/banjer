import { createInitialTab, createMeasureWithId, createNoteId } from "./constants";
import type {
  BanjoTabEditorState,
  EditorMode,
  NoteLocation,
  TabArticulation,
  TabMeasureData,
  TabNoteData,
} from "./types";

export type BanjoTabAction =
  | { type: "ADD_MEASURE" }
  | {
      type: "ADD_OR_UPDATE_NOTE";
      location: NoteLocation;
      fret: number;
      articulation?: TabArticulation;
      noteId?: string;
    }
  | { type: "MOVE_NOTE"; noteId: string; target: NoteLocation }
  | { type: "DELETE_NOTE"; noteId: string }
  | { type: "MOVE_MEASURE"; measureId: string; targetIndex: number }
  | { type: "RENAME_MEASURE"; measureId: string; title: string }
  | { type: "DELETE_MEASURE"; measureId: string }
  | { type: "SET_EDITOR_MODE"; mode: EditorMode };

export function createInitialEditorState(): BanjoTabEditorState {
  return {
    tab: createInitialTab(),
    mode: { type: "idle" },
  };
}

export function banjoTabReducer(
  state: BanjoTabEditorState,
  action: BanjoTabAction,
): BanjoTabEditorState {
  switch (action.type) {
    case "ADD_MEASURE":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: [...state.tab.measures, createMeasureWithId(getNextMeasureId(state.tab.measures))],
        },
      };

    case "ADD_OR_UPDATE_NOTE":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: state.tab.measures.map((measure) =>
            updateMeasureNote(
              measure,
              action.location,
              action.fret,
              action.articulation,
              action.noteId,
            ),
          ),
        },
      };

    case "MOVE_NOTE":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: moveNote(state.tab.measures, action.noteId, action.target),
        },
      };

    case "DELETE_NOTE":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: state.tab.measures.map((measure) => ({
            ...measure,
            notes: measure.notes.filter((note) => note.id !== action.noteId),
          })),
        },
      };

    case "MOVE_MEASURE":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: moveMeasure(state.tab.measures, action.measureId, action.targetIndex),
        },
      };

    case "RENAME_MEASURE":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: state.tab.measures.map((measure) =>
            measure.id === action.measureId
              ? renameMeasure(measure, action.title)
              : measure,
          ),
        },
      };

    case "DELETE_MEASURE":
      return {
        ...state,
        tab: {
          ...state.tab,
          measures: deleteMeasure(state.tab.measures, action.measureId),
        },
      };

    case "SET_EDITOR_MODE":
      return {
        ...state,
        mode: action.mode,
      };

    default:
      return state;
  }
}

function updateMeasureNote(
  measure: TabMeasureData,
  location: NoteLocation,
  fret: number,
  articulation?: TabArticulation,
  noteId?: string,
): TabMeasureData {
  if (measure.id !== location.measureId) {
    return measure;
  }

  const existingNote = measure.notes.find((note) =>
    noteMatchesLocation(note, location) || note.id === noteId
  );

  if (existingNote) {
    return {
      ...measure,
      notes: measure.notes.map((note) =>
        note.id === existingNote.id
          ? makeUpdatedNote(note, location, fret, articulation)
          : note,
      ),
    };
  }

  return {
    ...measure,
    notes: [
      ...measure.notes,
      {
        id: createNoteId(),
        stringIndex: location.stringIndex,
        position: location.position,
        fret,
        ...(articulation ? { articulation } : {}),
      },
    ],
  };
}

function makeUpdatedNote(
  note: TabNoteData,
  location: NoteLocation,
  fret: number,
  articulation?: TabArticulation,
): TabNoteData {
  return {
    id: note.id,
    stringIndex: location.stringIndex,
    position: location.position,
    fret,
    ...(articulation ? { articulation } : {}),
  };
}

function moveNote(
  measures: TabMeasureData[],
  noteId: string,
  target: NoteLocation,
): TabMeasureData[] {
  const sourceNote = measures.flatMap((measure) => measure.notes).find((note) => note.id === noteId);

  if (!sourceNote) {
    return measures;
  }

  return measures.map((measure) => {
    const notes = measure.notes.filter((note) => {
      if (note.id === noteId) {
        return false;
      }

      return !(
        measure.id === target.measureId &&
        note.stringIndex === target.stringIndex &&
        note.position === target.position
      );
    });

    if (measure.id !== target.measureId) {
      return { ...measure, notes };
    }

    return {
      ...measure,
      notes: [
        ...notes,
        {
          ...sourceNote,
          stringIndex: target.stringIndex,
          position: target.position,
        },
      ],
    };
  });
}

function noteMatchesLocation(note: TabNoteData, location: NoteLocation): boolean {
  return note.stringIndex === location.stringIndex && note.position === location.position;
}

function moveMeasure(
  measures: TabMeasureData[],
  measureId: string,
  targetIndex: number,
): TabMeasureData[] {
  const sourceIndex = measures.findIndex((measure) => measure.id === measureId);

  if (sourceIndex === -1) {
    return measures;
  }

  const nextMeasures = [...measures];
  const [movedMeasure] = nextMeasures.splice(sourceIndex, 1);
  const clampedTargetIndex = Math.min(Math.max(targetIndex, 0), nextMeasures.length);
  nextMeasures.splice(clampedTargetIndex, 0, movedMeasure);
  return nextMeasures;
}

function renameMeasure(measure: TabMeasureData, title: string): TabMeasureData {
  const normalizedTitle = title.trim();
  const { title: _previousTitle, ...measureWithoutTitle } = measure;

  return normalizedTitle
    ? { ...measureWithoutTitle, title: normalizedTitle }
    : measureWithoutTitle;
}

function deleteMeasure(measures: TabMeasureData[], measureId: string): TabMeasureData[] {
  if (measures.length === 1) {
    return measures.map((measure) =>
      measure.id === measureId ? { ...measure, notes: [] } : measure,
    );
  }

  return measures.filter((measure) => measure.id !== measureId);
}

function getNextMeasureId(measures: TabMeasureData[]): string {
  const usedNumbers = measures
    .map((measure) => /^measure-(\d+)$/.exec(measure.id)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number);
  const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : measures.length + 1;

  return `measure-${nextNumber}`;
}
