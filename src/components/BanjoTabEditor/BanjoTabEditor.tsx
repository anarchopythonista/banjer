import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AddMeasureButton } from "./components/AddMeasureButton";
import { DocumentMenuButton } from "./components/DocumentMenuButton";
import { EditableDocumentTitle } from "./components/EditableDocumentTitle";
import { FretPickerPopover } from "./components/FretPickerPopover";
import { SelectionModeButton } from "./components/SelectionModeButton";
import { TabStaff } from "./components/TabStaff";
import { TrashDropZone } from "./components/TrashDropZone";
import { UndoRedoControls } from "./components/UndoRedoControls";
import "./BanjoTabEditor.css";
import { getDefaultMeasureTitle } from "./constants";
import { useBanjoTabDocuments } from "./hooks/useBanjoTabDocuments";
import { usePointerDocumentDrag } from "./hooks/usePointerDocumentDrag";
import { usePointerMeasureDrag } from "./hooks/usePointerMeasureDrag";
import { usePointerNoteDrag } from "./hooks/usePointerNoteDrag";
import { usePointerNoteSelection } from "./hooks/usePointerNoteSelection";
import { getQuickArticulationIntent } from "./articulationHotkeys";
import { formatNoteLabel } from "./noteFormatting";
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
  TargetedArticulationType,
} from "./types";

type BanjoTabEditorProps = {
  initialState?: BanjoTabEditorState;
};

type CopyPasteDragState = {
  pointerId: number;
  bounds: SelectionBounds;
  captureElement: HTMLElement;
  startPoint: ScreenPoint;
  currentTarget: PasteTarget | null;
  copiedSelection: CopiedNoteSelection | null;
  longPressTimer: ReturnType<typeof window.setTimeout>;
  isActive: boolean;
  shouldSuppressClick: boolean;
};

const COPY_LONG_PRESS_DELAY_MS = 360;
const COPY_LONG_PRESS_CANCEL_DISTANCE_PX = 10;

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
  const notes = state.tab.measures.flatMap((measure) => measure.notes);
  const currentPickerNoteId = state.mode.type === "fret-picker" ? state.mode.noteId : undefined;
  const draggedNoteId = state.mode.type === "dragging-note" ? state.mode.noteId : undefined;
  const currentPickerNote = findNoteById(notes, currentPickerNoteId);
  const draggedNote = findNoteById(notes, draggedNoteId);
  const draggedMeasure =
    state.mode.type === "dragging-measure"
      ? state.tab.measures.find((measure) => measure.id === state.mode.measureId)
      : undefined;
  const pickerReturnFocusRef = useRef<HTMLElement | null>(null);
  const quickFretTargetRef = useRef<NoteLocation | null>(null);
  const quickFretTargetElementRef = useRef<HTMLElement | null>(null);
  const [isSelectionModeEnabled, setIsSelectionModeEnabled] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [completedSelectionBounds, setCompletedSelectionBounds] = useState<SelectionBounds | null>(null);
  const [copiedSelection, setCopiedSelection] = useState<CopiedNoteSelection | null>(null);
  const copyPasteDragRef = useRef<CopyPasteDragState | null>(null);
  const lastCopyPointerTypeRef = useRef<string | null>(null);
  const suppressNextCopyClickRef = useRef(false);
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

  const copySelectionFromBounds = useCallback((
    bounds: SelectionBounds,
    options: { preferPreviewTarget?: boolean; target?: PasteTarget | null } = {},
  ) => {
    const measure = state.tab.measures.find((item) => item.id === bounds.measureId);
    const selectedNotes = measure ? getNotesInSelection(measure, bounds) : [];
    const nextCopiedSelection = createCopiedNoteSelection(bounds.measureId, selectedNotes);

    if (!nextCopiedSelection) {
      return null;
    }

    const previewTarget =
      options.target !== undefined
        ? options.target
        : options.preferPreviewTarget !== false && quickFretTargetRef.current
          ? {
              measureId: quickFretTargetRef.current.measureId,
              position: quickFretTargetRef.current.position,
            }
          : null;

    setCopiedSelection(nextCopiedSelection);
    dispatch({
      type: "SET_EDITOR_MODE",
      mode: {
        type: "paste-preview",
        target: previewTarget,
        pointer: null,
      },
    });

    return nextCopiedSelection;
  }, [dispatch, state.tab.measures]);

  const copySelection = useCallback(() => {
    if (suppressNextCopyClickRef.current) {
      suppressNextCopyClickRef.current = false;
      return;
    }

    if (!completedSelectionBounds) {
      return;
    }

    copySelectionFromBounds(completedSelectionBounds, {
      preferPreviewTarget: lastCopyPointerTypeRef.current === "mouse",
    });
  }, [completedSelectionBounds, copySelectionFromBounds]);

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

  const selectionApi = usePointerNoteSelection({
    state,
    dispatch,
    isSelectionModeEnabled,
    onSelectionComplete: completeSelection,
    onSelectionClear: clearSelection,
  });
  const getPasteTargetFromPoint = useCallback((point: ScreenPoint): PasteTarget | null => {
    const location = selectionApi.getLocationFromPoint(point);

    return location
      ? {
          measureId: location.measureId,
          position: location.position,
        }
      : null;
  }, [selectionApi]);
  const updateCopyPastePreview = useCallback((
    target: PasteTarget | null,
    point: ScreenPoint | null,
  ) => {
    dispatch({
      type: "SET_EDITOR_MODE",
      mode: {
        type: "paste-preview",
        target,
        pointer: point,
      },
    });
  }, [dispatch]);
  const handleCopySelectionPointerDown = useCallback((
    bounds: SelectionBounds,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    lastCopyPointerTypeRef.current = event.pointerType;

    if (event.button !== 0) {
      return;
    }

    const point = getPointerEventPoint(event);
    const captureElement = event.currentTarget;

    safeSetPointerCapture(captureElement, event.pointerId);
    copyPasteDragRef.current = {
      pointerId: event.pointerId,
      bounds,
      captureElement,
      startPoint: point,
      currentTarget: null,
      copiedSelection: null,
      isActive: false,
      shouldSuppressClick: false,
      longPressTimer: window.setTimeout(() => {
        const activeDrag = copyPasteDragRef.current;

        if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
          return;
        }

        const initialTarget =
          getPasteTargetFromPoint(activeDrag.startPoint) ??
          getFallbackPasteTarget(activeDrag.bounds);
        const nextCopiedSelection = copySelectionFromBounds(activeDrag.bounds, {
          target: initialTarget,
        });

        if (!nextCopiedSelection) {
          return;
        }

        activeDrag.isActive = true;
        activeDrag.shouldSuppressClick = true;
        activeDrag.currentTarget = initialTarget;
        activeDrag.copiedSelection = nextCopiedSelection;
      }, COPY_LONG_PRESS_DELAY_MS),
    };
  }, [copySelectionFromBounds, getPasteTargetFromPoint]);
  const handleCopySelectionPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const activeDrag = copyPasteDragRef.current;

    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    const point = getPointerEventPoint(event);

    if (!activeDrag.isActive) {
      if (getDistance(activeDrag.startPoint, point) > COPY_LONG_PRESS_CANCEL_DISTANCE_PX) {
        window.clearTimeout(activeDrag.longPressTimer);
        releasePointerCapture(activeDrag);
        copyPasteDragRef.current = null;
      }
      return;
    }

    event.preventDefault();
    const target = getPasteTargetFromPoint(point);
    activeDrag.currentTarget = target;
    updateCopyPastePreview(target, point);
  }, [getPasteTargetFromPoint, updateCopyPastePreview]);
  const finishCopyPasteDrag = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    shouldPaste: boolean,
  ) => {
    const activeDrag = copyPasteDragRef.current;

    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    window.clearTimeout(activeDrag.longPressTimer);
    releasePointerCapture(activeDrag);

    if (!activeDrag.isActive) {
      copyPasteDragRef.current = null;
      return;
    }

    event.preventDefault();
    suppressNextCopyClickRef.current = activeDrag.shouldSuppressClick;

    if (shouldPaste && activeDrag.currentTarget && activeDrag.copiedSelection) {
      pasteCopiedSelection(activeDrag.currentTarget, false);
    } else {
      updateCopyPastePreview(null, null);
    }

    copyPasteDragRef.current = null;
  }, [pasteCopiedSelection, updateCopyPastePreview]);
  const handleCopySelectionPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => finishCopyPasteDrag(event, true),
    [finishCopyPasteDrag],
  );
  const handleCopySelectionPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => finishCopyPasteDrag(event, false),
    [finishCopyPasteDrag],
  );
  const dragApi = usePointerNoteDrag({
    state,
    dispatch,
    isNoteDragDisabled: isSelectionModeEnabled || state.mode.type === "selecting-notes",
  });
  const measureDragApi = usePointerMeasureDrag({ state, dispatch });
  const documentDragApi = usePointerDocumentDrag({
    onDeleteDocument: (id) => {
      void deleteDocument(id);
    },
    confirmDeleteDocument: (document) =>
      window.confirm(`Delete "${document.title}"? This cannot be undone.`),
  });
  const trashDropZoneState = getTrashDropZoneState(state.mode, documentDragApi.dragState);

  const openFretPicker = useCallback((
    location: NoteLocation,
    screenPoint: ScreenPoint,
    noteId?: string,
    returnFocusElement?: HTMLElement,
    initialTargetedArticulation?: TargetedArticulationType,
  ) => {
    setCompletedSelectionBounds(null);
    setCopiedSelection(null);
    pickerReturnFocusRef.current = returnFocusElement ?? null;
    dispatch({
      type: "SET_EDITOR_MODE",
      mode: {
        type: "fret-picker",
        location,
        noteId,
        screenPoint,
        ...(initialTargetedArticulation ? { initialTargetedArticulation } : {}),
      },
    });
  }, [dispatch]);

  const handleSlotPress = (
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
    keepPastePreviewActive = false,
  ) => {
    if (state.mode.type === "paste-preview" && copiedSelection) {
      pasteCopiedSelection(
        { measureId: location.measureId, position: location.position },
        keepPastePreviewActive,
      );
      return;
    }

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
    if (state.mode.type === "paste-preview" && copiedSelection) {
      pasteCopiedSelection(
        { measureId: location.measureId, position: location.position },
        false,
      );
      return;
    }

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
      quickFretTargetElementRef.current = null;
    }
  };

  const handleQuickFretTarget = (location: NoteLocation, element?: HTMLElement) => {
    quickFretTargetRef.current = location;
    quickFretTargetElementRef.current = element ?? null;
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

  useEffect(() => () => {
    const activeDrag = copyPasteDragRef.current;

    if (activeDrag) {
      window.clearTimeout(activeDrag.longPressTimer);
      copyPasteDragRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) {
        return;
      }

      if (event.defaultPrevented) {
        return;
      }

      const quickFretTarget = quickFretTargetRef.current;

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
        if (copiedSelection && quickFretTarget) {
          event.preventDefault();
          pasteCopiedSelection(
            { measureId: quickFretTarget.measureId, position: quickFretTarget.position },
            false,
          );
        }
        return;
      }

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

      if (
        state.mode.type === "idle" &&
        quickFretTarget &&
        isDeleteShortcut(event)
      ) {
        const note = findNoteAtLocation(state.tab.measures, quickFretTarget);

        if (note) {
          event.preventDefault();
          dispatch({ type: "DELETE_NOTE", noteId: note.id });
        }

        return;
      }

      if (
        state.mode.type === "idle" &&
        quickFretTarget
      ) {
        const articulationIntent = getQuickArticulationIntent(event);

        if (articulationIntent) {
          const note = findNoteAtLocation(state.tab.measures, quickFretTarget);

          if (!note || note.articulation) {
            return;
          }

          event.preventDefault();
          if (articulationIntent.type === "bend") {
            dispatch({
              type: "ADD_OR_UPDATE_NOTE",
              location: quickFretTarget,
              noteId: note.id,
              fret: note.fret,
              articulation: { type: "bend" },
            });
            return;
          }

          const anchorElement = quickFretTargetElementRef.current;
          openFretPicker(
            quickFretTarget,
            getElementCenter(anchorElement),
            note.id,
            anchorElement ?? undefined,
            articulationIntent.articulationType,
          );
          return;
        }
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
  }, [
    canRedo,
    canUndo,
    clearSelection,
    completedSelectionBounds,
    copiedSelection,
    copySelection,
    dispatch,
    isSelectionModeEnabled,
    openFretPicker,
    pasteCopiedSelection,
    redoTabChange,
    state.mode.type,
    state.tab.measures,
    undoTabChange,
  ]);

  return (
    <main
      className="banjo-tab-editor"
      data-selection-cursor={state.mode.type === "idle" && isShiftPressed ? true : undefined}
      data-selection-mode={isSelectionModeEnabled || undefined}
      aria-labelledby="banjo-tab-editor-title"
    >
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
          <SelectionModeButton
            isPressed={isSelectionModeEnabled || isShiftPressed}
            onToggle={() => {
              const nextEnabled = !isSelectionModeEnabled;
              setIsSelectionModeEnabled(nextEnabled);
              if (!nextEnabled) {
                clearSelection();
              }
            }}
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
        selectedNoteIds={selectedNoteIds}
        completedSelectionBounds={completedSelectionBounds}
        copiedSelection={copiedSelection}
        pasteTarget={pasteTarget}
        isSelectionModeEnabled={isSelectionModeEnabled}
        onCopySelection={copySelection}
        onCopySelectionPointerDown={handleCopySelectionPointerDown}
        onCopySelectionPointerMove={handleCopySelectionPointerMove}
        onCopySelectionPointerUp={handleCopySelectionPointerUp}
        onCopySelectionPointerCancel={handleCopySelectionPointerCancel}
        onCopySelectionLostPointerCapture={handleCopySelectionPointerCancel}
        selectionApi={selectionApi}
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

function findNoteAtLocation(
  measures: BanjoTabEditorState["tab"]["measures"],
  location: NoteLocation,
) {
  return measures
    .find((measure) => measure.id === location.measureId)
    ?.notes.find(
      (note) =>
        note.stringIndex === location.stringIndex &&
        note.position === location.position,
    );
}

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

function isCopyShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";
}

function isPasteShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v";
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

function isDeleteShortcut(event: KeyboardEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    (event.key === "Backspace" || event.key === "Delete")
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

function getFallbackPasteTarget(bounds: SelectionBounds): PasteTarget {
  return {
    measureId: bounds.measureId,
    position: bounds.maxPosition + 1,
  };
}

function getPointerEventPoint(event: ReactPointerEvent<HTMLElement>): ScreenPoint {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

function getElementCenter(element: HTMLElement | null): ScreenPoint {
  if (!element) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getDistance(start: ScreenPoint, current: ScreenPoint): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

function safeSetPointerCapture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Synthetic pointer events in tests may not have an active browser pointer.
  }
}

function releasePointerCapture(activeDrag: CopyPasteDragState) {
  if (activeDrag.captureElement.hasPointerCapture(activeDrag.pointerId)) {
    activeDrag.captureElement.releasePointerCapture(activeDrag.pointerId);
  }
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
    case "resizing-articulation":
    case "selecting-notes":
    case "paste-preview":
    case "idle":
      return {
        isActive: false,
        isOverTrash: false,
        label: "Drop note to delete",
      };
  }
}
