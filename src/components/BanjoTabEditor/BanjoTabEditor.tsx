import { useReducer } from "react";
import { AddMeasureButton } from "./components/AddMeasureButton";
import { EditableDocumentTitle } from "./components/EditableDocumentTitle";
import { FretPickerPopover } from "./components/FretPickerPopover";
import { TabStaff } from "./components/TabStaff";
import { TrashDropZone } from "./components/TrashDropZone";
import "./BanjoTabEditor.css";
import { usePointerMeasureDrag } from "./hooks/usePointerMeasureDrag";
import { usePointerNoteDrag } from "./hooks/usePointerNoteDrag";
import { banjoTabReducer, createInitialEditorState } from "./tabReducer";
import type {
  BanjoTabEditorState,
  EditorMode,
  NoteLocation,
  ScreenPoint,
  TabNoteData,
} from "./types";

type BanjoTabEditorProps = {
  initialState?: BanjoTabEditorState;
};

export function BanjoTabEditor({ initialState }: BanjoTabEditorProps) {
  const [state, dispatch] = useReducer(
    banjoTabReducer,
    initialState ?? createInitialEditorState(),
  );
  const dragApi = usePointerNoteDrag({ state, dispatch });
  const measureDragApi = usePointerMeasureDrag({ state, dispatch });
  const notes = state.tab.measures.flatMap((measure) => measure.notes);
  const currentPickerNoteId = state.mode.type === "fret-picker" ? state.mode.noteId : undefined;
  const draggedNoteId = state.mode.type === "dragging-note" ? state.mode.noteId : undefined;
  const currentPickerNote = findNoteById(notes, currentPickerNoteId);
  const draggedNote = findNoteById(notes, draggedNoteId);
  const trashDropZoneState = getTrashDropZoneState(state.mode);

  const openFretPicker = (
    location: NoteLocation,
    screenPoint: ScreenPoint,
    noteId?: string,
  ) => {
    dispatch({
      type: "SET_EDITOR_MODE",
      mode: {
        type: "fret-picker",
        location,
        noteId,
        screenPoint,
      },
    });
  };

  const handleSlotPress = (location: NoteLocation, screenPoint: ScreenPoint) => {
    const measure = state.tab.measures.find((item) => item.id === location.measureId);
    const existingNote = measure?.notes.find(
      (note) => note.stringIndex === location.stringIndex && note.position === location.position,
    );

    openFretPicker(location, screenPoint, existingNote?.id);
  };

  const handleNotePress = (
    note: TabNoteData,
    location: NoteLocation,
    screenPoint: ScreenPoint,
  ) => {
    openFretPicker(location, screenPoint, note.id);
  };

  const handleSelectFret = (fret: number) => {
    if (state.mode.type !== "fret-picker") {
      return;
    }

    dispatch({
      type: "ADD_OR_UPDATE_NOTE",
      location: state.mode.location,
      noteId: state.mode.noteId,
      fret,
    });
    dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
  };

  const closeFretPicker = () => {
    dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
  };

  return (
    <main className="banjo-tab-editor" aria-labelledby="banjo-tab-editor-title">
      <header className="banjo-tab-editor-header">
        <EditableDocumentTitle />
        <AddMeasureButton onAddMeasure={() => dispatch({ type: "ADD_MEASURE" })} />
      </header>
      <TabStaff
        tab={state.tab}
        mode={state.mode}
        onSlotPress={handleSlotPress}
        onNotePress={handleNotePress}
        dragApi={dragApi}
        measureDragApi={measureDragApi}
      />
      <FretPickerPopover
        mode={state.mode}
        currentNote={currentPickerNote}
        onSelectFret={handleSelectFret}
        onClose={closeFretPicker}
      />
      <TrashDropZone
        isActive={trashDropZoneState.isActive}
        isOverTrash={trashDropZoneState.isOverTrash}
        label={trashDropZoneState.label}
        onRegister={(element) => {
          dragApi.registerTrashZone(element);
          measureDragApi.registerTrashZone(element);
        }}
      />
      {state.mode.type === "dragging-note" && draggedNote && (
        <div
          className="banjo-tab-drag-preview"
          style={{ left: state.mode.pointer.x, top: state.mode.pointer.y }}
          aria-hidden="true"
        >
          {draggedNote.fret}
        </div>
      )}
      {state.mode.type === "dragging-measure" && (
        <div
          className="banjo-tab-measure-drag-preview"
          style={{ left: state.mode.pointer.x, top: state.mode.pointer.y }}
          aria-hidden="true"
        >
          Measure {state.mode.originIndex + 1}
        </div>
      )}
    </main>
  );
}

function findNoteById(notes: TabNoteData[], noteId?: string) {
  return noteId ? notes.find((note) => note.id === noteId) : undefined;
}

function getTrashDropZoneState(mode: EditorMode) {
  switch (mode.type) {
    case "dragging-measure":
      return {
        isActive: true,
        isOverTrash: mode.overTrash,
        label: "Drop measure to delete",
      };
    case "dragging-note":
      return {
        isActive: true,
        isOverTrash: mode.overTrash,
        label: "Drop note to delete",
      };
    case "fret-picker":
    case "idle":
      return {
        isActive: false,
        isOverTrash: false,
        label: "Drop note to delete",
      };
  }
}
