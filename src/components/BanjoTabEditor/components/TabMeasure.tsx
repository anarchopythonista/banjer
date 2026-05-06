import type { KeyboardEvent, PointerEvent } from "react";
import { getDefaultMeasureTitle } from "../constants";
import { normalizeSelectionBounds } from "../selection";
import type {
  BanjoString,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  ScreenPoint,
  SelectionBounds,
  TabMeasureData,
  TabNoteData,
} from "../types";
import { EditableMeasureTitle } from "./EditableMeasureTitle";
import { SelectionCopyButton } from "./SelectionCopyButton";
import { TabStringRow } from "./TabStringRow";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";
import type { usePointerMeasureDrag } from "../hooks/usePointerMeasureDrag";
import type { usePointerNoteSelection } from "../hooks/usePointerNoteSelection";

type TabMeasureProps = {
  measure: TabMeasureData;
  measureNumber: number;
  measureIndex: number;
  tuning: BanjoString[];
  mode: EditorMode;
  onSlotPress: (
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
    keepPastePreviewActive?: boolean,
  ) => void;
  onNotePress: (
    note: TabNoteData,
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
  ) => void;
  onQuickFretTarget: (location: NoteLocation) => void;
  onQuickFretTargetClear: (location: NoteLocation) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
  measureDragApi: ReturnType<typeof usePointerMeasureDrag>;
  onRenameMeasure: (measureId: string, title: string) => void;
  selectedNoteIds: Set<string>;
  completedSelectionBounds: SelectionBounds | null;
  copiedSelection: CopiedNoteSelection | null;
  pasteTarget: PasteTarget | null;
  isSelectionModeEnabled: boolean;
  onCopySelection: () => void;
  onCopySelectionPointerDown: (
    bounds: SelectionBounds,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onCopySelectionPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onCopySelectionPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onCopySelectionPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onCopySelectionLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => void;
  selectionApi: ReturnType<typeof usePointerNoteSelection>;
};

export function TabMeasure({
  measure,
  measureNumber,
  measureIndex,
  tuning,
  mode,
  onSlotPress,
  onNotePress,
  onQuickFretTarget,
  onQuickFretTargetClear,
  dragApi,
  measureDragApi,
  onRenameMeasure,
  selectedNoteIds,
  completedSelectionBounds,
  copiedSelection,
  pasteTarget,
  isSelectionModeEnabled,
  onCopySelection,
  onCopySelectionPointerDown,
  onCopySelectionPointerMove,
  onCopySelectionPointerUp,
  onCopySelectionPointerCancel,
  onCopySelectionLostPointerCapture,
  selectionApi,
}: TabMeasureProps) {
  const measureTitle = measure.title || getDefaultMeasureTitle(measure.id);
  const activeSelectionBounds =
    mode.type === "selecting-notes" && mode.measureId === measure.id
      ? normalizeSelectionBounds(measure.id, mode.start, mode.current)
      : null;
  const copyButtonBounds =
    completedSelectionBounds?.measureId === measure.id ? completedSelectionBounds : null;

  const startMeasureDrag = (event: PointerEvent<HTMLElement>) => {
    measureDragApi.measurePointerHandlers.onPointerDown(measure.id, measureIndex, event);
  };

  const handleHeaderPointerDown = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("[data-measure-header-interactive]")) {
      return;
    }

    startMeasureDrag(event);
  };

  const handleMeasureGripPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    startMeasureDrag(event);
  };
  const handleMeasureKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      measureDragApi.moveMeasureByKeyboard(measure.id, measureIndex, "up");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      measureDragApi.moveMeasureByKeyboard(measure.id, measureIndex, "down");
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      measureDragApi.deleteMeasureByKeyboard(measure.id);
    }
  };

  return (
    <section
      ref={(element) => measureDragApi.registerMeasure(measure.id, element)}
      className="banjo-tab-measure"
      data-dragging={
        mode.type === "dragging-measure" && mode.measureId === measure.id ? true : undefined
      }
      aria-label={measureTitle}
    >
      <div
        className="banjo-tab-measure-header"
        aria-label={`Drag ${measureTitle}`}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={measureDragApi.measurePointerHandlers.onPointerMove}
        onPointerUp={measureDragApi.measurePointerHandlers.onPointerUp}
        onPointerCancel={measureDragApi.measurePointerHandlers.onPointerCancel}
        onLostPointerCapture={measureDragApi.measurePointerHandlers.onLostPointerCapture}
      >
        <button
          type="button"
          className="banjo-tab-measure-handle"
          aria-label={`Drag ${measureTitle}`}
          onKeyDown={handleMeasureKeyDown}
          onPointerDown={handleMeasureGripPointerDown}
          onPointerMove={measureDragApi.measurePointerHandlers.onPointerMove}
          onPointerUp={measureDragApi.measurePointerHandlers.onPointerUp}
          onPointerCancel={measureDragApi.measurePointerHandlers.onPointerCancel}
          onLostPointerCapture={measureDragApi.measurePointerHandlers.onLostPointerCapture}
        >
          <span aria-hidden="true">::</span>
        </button>
        <EditableMeasureTitle
          title={measureTitle}
          measureNumber={measureNumber}
          onCommitTitle={(title) => onRenameMeasure(measure.id, title)}
        />
        <span>{measure.beats}/{measure.subdivision}</span>
      </div>
      <div
        className="banjo-tab-measure-grid"
        onPointerDown={selectionApi.selectionPointerHandlers.onPointerDown}
        onPointerMove={selectionApi.selectionPointerHandlers.onPointerMove}
        onPointerUp={selectionApi.selectionPointerHandlers.onPointerUp}
        onPointerCancel={selectionApi.selectionPointerHandlers.onPointerCancel}
        onLostPointerCapture={selectionApi.selectionPointerHandlers.onLostPointerCapture}
      >
        <div className="banjo-tab-string-grid" role="grid" aria-label={`Tablature ${measureTitle}`}>
          {tuning.map((string, stringIndex) => (
            <TabStringRow
              key={string.id}
              measureId={measure.id}
              string={string}
              stringIndex={stringIndex}
              notes={measure.notes.filter((note) => note.stringIndex === stringIndex)}
              mode={mode}
              onSlotPress={onSlotPress}
              onNotePress={onNotePress}
              onQuickFretTarget={onQuickFretTarget}
              onQuickFretTargetClear={onQuickFretTargetClear}
              dragApi={dragApi}
              activeSelectionBounds={activeSelectionBounds}
              selectedNoteIds={selectedNoteIds}
              copiedSelection={copiedSelection}
              pasteTarget={pasteTarget}
              isSelectionModeEnabled={isSelectionModeEnabled}
              selectionApi={selectionApi}
            />
          ))}
        </div>
        {copyButtonBounds && (
          <SelectionCopyButton
            bounds={copyButtonBounds}
            onCopy={onCopySelection}
            onCopyPointerDown={onCopySelectionPointerDown}
            onCopyPointerMove={onCopySelectionPointerMove}
            onCopyPointerUp={onCopySelectionPointerUp}
            onCopyPointerCancel={onCopySelectionPointerCancel}
            onCopyLostPointerCapture={onCopySelectionLostPointerCapture}
          />
        )}
      </div>
    </section>
  );
}
