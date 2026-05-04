import { useEffect, useRef } from "react";
import { AddMeasureButton } from "./components/AddMeasureButton";
import { DocumentMenuButton } from "./components/DocumentMenuButton";
import { EditableDocumentTitle } from "./components/EditableDocumentTitle";
import { FretPickerPopover } from "./components/FretPickerPopover";
import { TabStaff } from "./components/TabStaff";
import { TrashDropZone } from "./components/TrashDropZone";
import { UndoRedoControls } from "./components/UndoRedoControls";
import "./BanjoTabEditor.css";
import { getDefaultMeasureTitle } from "./constants";
import { useBanjoTabDocuments } from "./hooks/useBanjoTabDocuments";
import { usePointerDocumentDrag } from "./hooks/usePointerDocumentDrag";
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
    undoTabChange,
    redoTabChange,
    deleteDocument,
    loadDocument,
    startNewDraft,
    canUndo,
    canRedo,
    shouldConfirmDiscard,
  } = useBanjoTabDocuments(initialState);
  const dragApi = usePointerNoteDrag({ state, dispatch });
  const measureDragApi = usePointerMeasureDrag({ state, dispatch });
  const documentDragApi = usePointerDocumentDrag({
    onDeleteDocument: (id) => {
      void deleteDocument(id);
    },
    confirmDeleteDocument: (document) =>
      window.confirm(`Delete "${document.title}"? This cannot be undone.`),
  });
  const notes = state.tab.measures.flatMap((measure) => measure.notes);
  const currentPickerNoteId = state.mode.type === "fret-picker" ? state.mode.noteId : undefined;
  const draggedNoteId = state.mode.type === "dragging-note" ? state.mode.noteId : undefined;
  const currentPickerNote = findNoteById(notes, currentPickerNoteId);
  const draggedNote = findNoteById(notes, draggedNoteId);
  const draggedMeasure =
    state.mode.type === "dragging-measure"
      ? state.tab.measures.find((measure) => measure.id === state.mode.measureId)
      : undefined;
  const trashDropZoneState = getTrashDropZoneState(state.mode, documentDragApi.dragState);
  const pickerReturnFocusRef = useRef<HTMLElement | null>(null);
  const quickFretTargetRef = useRef<NoteLocation | null>(null);

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

  const handleQuickFretTargetClear = (location: NoteLocation) => {
    if (locationsMatch(quickFretTargetRef.current, location)) {
      quickFretTargetRef.current = null;
    }
  };

  const handleQuickFretTarget = (location: NoteLocation) => {
    quickFretTargetRef.current = location;
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) {
        return;
      }

      const quickFretTarget = quickFretTargetRef.current;

      if (
        state.mode.type === "idle" &&
        quickFretTarget &&
        isSingleDigitShortcut(event)
      ) {
        event.preventDefault();
        dispatch({
          type: "ADD_OR_UPDATE_NOTE",
          location: quickFretTarget,
          fret: Number(event.key),
        });
        return;
      }

      if (!isUndoRedoShortcut(event)) {
        return;
      }

      if (event.key.toLowerCase() === "z" && !event.shiftKey && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (canUndo) {
          undoTabChange();
        }
        return;
      }

      if (
        (event.key.toLowerCase() === "z" && event.shiftKey && (event.metaKey || event.ctrlKey)) ||
        (event.key.toLowerCase() === "y" && event.ctrlKey)
      ) {
        event.preventDefault();
        if (canRedo) {
          redoTabChange();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRedo, canUndo, dispatch, redoTabChange, state.mode.type, undoTabChange]);

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
            documentDragApi={documentDragApi}
          />
          {documentState.storageError && (
            <p className="banjo-tab-storage-status" role="status">
              {documentState.storageError}
            </p>
          )}
        </div>
        <div className="banjo-tab-header-actions">
          <UndoRedoControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoTabChange}
            onRedo={redoTabChange}
          />
          <AddMeasureButton onAddMeasure={() => dispatch({ type: "ADD_MEASURE" })} />
        </div>
      </header>
      <TabStaff
        tab={state.tab}
        mode={state.mode}
        onSlotPress={handleSlotPress}
        onNotePress={handleNotePress}
        onQuickFretTarget={handleQuickFretTarget}
        onQuickFretTargetClear={handleQuickFretTargetClear}
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
          documentDragApi.registerTrashZone(element);
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
          {draggedMeasure?.title || getDefaultMeasureTitle(state.mode.measureId)}
        </div>
      )}
      {documentDragApi.dragState && (
        <div
          className="banjo-tab-document-drag-preview"
          style={{
            left: documentDragApi.dragState.pointer.x,
            top: documentDragApi.dragState.pointer.y,
          }}
          aria-hidden="true"
        >
          {documentDragApi.dragState.document.title}
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

function isUndoRedoShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return (
    ((event.metaKey || event.ctrlKey) && key === "z") ||
    (event.ctrlKey && key === "y")
  );
}

function isSingleDigitShortcut(event: KeyboardEvent): boolean {
  return (
    !event.repeat &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.key.length === 1 &&
    event.key >= "0" &&
    event.key <= "9"
  );
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function locationsMatch(left: NoteLocation | null, right: NoteLocation): boolean {
  return Boolean(
    left &&
      left.measureId === right.measureId &&
      left.stringIndex === right.stringIndex &&
      left.position === right.position,
  );
}

function getTrashDropZoneState(
  mode: EditorMode,
  documentDragState: ReturnType<typeof usePointerDocumentDrag>["dragState"],
) {
  if (documentDragState) {
    return {
      isActive: true,
      isOverTrash: documentDragState.overTrash,
      label: "Drop tab to delete",
    };
  }

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
