import { useRef } from "react";
import { AddMeasureButton } from "./components/AddMeasureButton";
import { DocumentMenuButton } from "./components/DocumentMenuButton";
import { EditableDocumentTitle } from "./components/EditableDocumentTitle";
import { FretPickerPopover } from "./components/FretPickerPopover";
import { TabStaff } from "./components/TabStaff";
import { TrashDropZone } from "./components/TrashDropZone";
import "./BanjoTabEditor.css";
import { useBanjoTabDocuments } from "./hooks/useBanjoTabDocuments";
import { usePointerMeasureDrag } from "./hooks/usePointerMeasureDrag";
import { usePointerNoteDrag } from "./hooks/usePointerNoteDrag";
import { formatNoteLabel } from "./noteFormatting";
import type {
  BanjoTabEditorState,
  EditorMode,
  NoteLocation,
  ScreenPoint,
  TabArticulation,
  TabNoteData,
} from "./types";

type BanjoTabEditorProps = {
  initialState?: BanjoTabEditorState;
};

export function BanjoTabEditor({ initialState }: BanjoTabEditorProps) {
  const {
    documentState,
    editorState: state,
    commitTitle,
    dispatchTabAction: dispatch,
    loadDocument,
    startNewDraft,
    shouldConfirmDiscard,
  } = useBanjoTabDocuments(initialState);
  const dragApi = usePointerNoteDrag({ state, dispatch });
  const measureDragApi = usePointerMeasureDrag({ state, dispatch });
  const notes = state.tab.measures.flatMap((measure) => measure.notes);
  const currentPickerNoteId = state.mode.type === "fret-picker" ? state.mode.noteId : undefined;
  const draggedNoteId = state.mode.type === "dragging-note" ? state.mode.noteId : undefined;
  const currentPickerNote = findNoteById(notes, currentPickerNoteId);
  const draggedNote = findNoteById(notes, draggedNoteId);
  const trashDropZoneState = getTrashDropZoneState(state.mode);
  const pickerReturnFocusRef = useRef<HTMLElement | null>(null);

  const openFretPicker = (
    location: NoteLocation,
    screenPoint: ScreenPoint,
    noteId?: string,
    returnFocusElement?: HTMLElement,
  ) => {
    pickerReturnFocusRef.current = returnFocusElement ?? null;
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

  const handleSlotPress = (
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
  ) => {
    const measure = state.tab.measures.find((item) => item.id === location.measureId);
    const existingNote = measure?.notes.find(
      (note) => note.stringIndex === location.stringIndex && note.position === location.position,
    );

    openFretPicker(location, screenPoint, existingNote?.id, returnFocusElement);
  };

  const handleNotePress = (
    note: TabNoteData,
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
  ) => {
    openFretPicker(location, screenPoint, note.id, returnFocusElement);
  };

  const handleSelectFret = (fret: number, articulation?: TabArticulation) => {
    if (state.mode.type !== "fret-picker") {
      return;
    }

    dispatch({
      type: "ADD_OR_UPDATE_NOTE",
      location: state.mode.location,
      noteId: state.mode.noteId,
      fret,
      articulation,
    });
    closeFretPicker();
  };

  const closeFretPicker = () => {
    dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
    restorePickerFocus(pickerReturnFocusRef);
  };

  const handleRenameMeasure = (measureId: string, title: string) => {
    dispatch({ type: "RENAME_MEASURE", measureId, title });
  };

  const confirmDiscard = () =>
    !shouldConfirmDiscard ||
    window.confirm("Discard the current unsaved draft?");

  const handleStartNewDraft = () => {
    if (confirmDiscard()) {
      startNewDraft();
    }
  };

  const handleLoadDocument = (id: string) => {
    if (id === documentState.activeDocument.id) {
      return;
    }

    if (confirmDiscard()) {
      void loadDocument(id);
    }
  };

  return (
    <main className="banjo-tab-editor" aria-labelledby="banjo-tab-editor-title">
      <header className="banjo-tab-editor-header">
        <div className="banjo-tab-document-controls">
          <EditableDocumentTitle
            title={documentState.activeDocument.title}
            onCommitTitle={commitTitle}
          />
          <DocumentMenuButton
            savedTabs={documentState.savedTabs}
            activeDocumentId={documentState.activeDocument.id}
            onNewFile={handleStartNewDraft}
            onLoadFile={handleLoadDocument}
          />
          {documentState.storageError && (
            <p className="banjo-tab-storage-status" role="status">
              {documentState.storageError}
            </p>
          )}
        </div>
        <AddMeasureButton onAddMeasure={() => dispatch({ type: "ADD_MEASURE" })} />
      </header>
      <TabStaff
        tab={state.tab}
        mode={state.mode}
        onSlotPress={handleSlotPress}
        onNotePress={handleNotePress}
        onRenameMeasure={handleRenameMeasure}
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
          {formatNoteLabel(draggedNote)}
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

function restorePickerFocus(ref: { current: HTMLElement | null }) {
  const element = ref.current;
  ref.current = null;

  window.setTimeout(() => {
    if (element?.isConnected) {
      element.focus();
    }
  }, 0);
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
