import { useReducer } from "react";
import { AddMeasureButton } from "./components/AddMeasureButton";
import { FretPickerPopover } from "./components/FretPickerPopover";
import { TabStaff } from "./components/TabStaff";
import { TrashDropZone } from "./components/TrashDropZone";
import "./BanjoTabEditor.css";
import { usePointerNoteDrag } from "./hooks/usePointerNoteDrag";
import { banjoTabReducer, createInitialEditorState } from "./tabReducer";
import type { BanjoTabEditorState, NoteLocation, ScreenPoint, TabNoteData } from "./types";

type BanjoTabEditorProps = {
  initialState?: BanjoTabEditorState;
};

export function BanjoTabEditor({ initialState }: BanjoTabEditorProps) {
  const [state, dispatch] = useReducer(
    banjoTabReducer,
    initialState ?? createInitialEditorState(),
  );
  const dragApi = usePointerNoteDrag({ state, dispatch });
  const currentPickerNote =
    state.mode.type === "fret-picker" && state.mode.noteId
      ? state.tab.measures
          .flatMap((measure) => measure.notes)
          .find((note) => note.id === state.mode.noteId)
      : undefined;
  const draggedNote =
    state.mode.type === "dragging-note"
      ? state.tab.measures
          .flatMap((measure) => measure.notes)
          .find((note) => note.id === state.mode.noteId)
      : undefined;

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
        <div>
          <h1 id="banjo-tab-editor-title">Banjo Tab Editor</h1>
          <p>5-string open-G tablature, 16 slots per measure.</p>
        </div>
        <AddMeasureButton onAddMeasure={() => dispatch({ type: "ADD_MEASURE" })} />
      </header>
      <TabStaff
        tab={state.tab}
        mode={state.mode}
        onSlotPress={handleSlotPress}
        onNotePress={handleNotePress}
        dragApi={dragApi}
      />
      <FretPickerPopover
        mode={state.mode}
        currentNote={currentPickerNote}
        onSelectFret={handleSelectFret}
        onClose={closeFretPicker}
      />
      <TrashDropZone
        isActive={state.mode.type === "dragging-note"}
        isOverTrash={state.mode.type === "dragging-note" && state.mode.overTrash}
        onRegister={dragApi.registerTrashZone}
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
    </main>
  );
}
