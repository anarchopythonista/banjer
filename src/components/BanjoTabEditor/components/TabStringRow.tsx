import type { MouseEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import type {
  BanjoString,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  ScreenPoint,
  SelectionBounds,
  TabNoteData,
} from "../types";
import { PastePreview } from "./PastePreview";
import { SelectionRegionOverlay } from "./SelectionRegionOverlay";
import { SlotHighlight } from "./SlotHighlight";
import { TabNote } from "./TabNote";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";
import type { usePointerNoteSelection } from "../hooks/usePointerNoteSelection";

type TabStringRowProps = {
  measureId: string;
  string: BanjoString;
  stringIndex: number;
  notes: TabNoteData[];
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
  onQuickFretTarget: (location: NoteLocation, element?: HTMLElement) => void;
  onQuickFretTargetClear: (location: NoteLocation) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
  activeSelectionBounds: SelectionBounds | null;
  selectedNoteIds: Set<string>;
  copiedSelection: CopiedNoteSelection | null;
  pasteTarget: PasteTarget | null;
  isSelectionModeEnabled: boolean;
  selectionApi: ReturnType<typeof usePointerNoteSelection>;
};

export function TabStringRow({
  measureId,
  string,
  stringIndex,
  notes,
  mode,
  onSlotPress,
  onNotePress,
  onQuickFretTarget,
  onQuickFretTargetClear,
  dragApi,
  activeSelectionBounds,
  selectedNoteIds,
  copiedSelection,
  pasteTarget,
  isSelectionModeEnabled,
  selectionApi,
}: TabStringRowProps) {
  const handleSlotClick = (position: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (selectionApi.shouldSuppressClick()) {
      return;
    }

    onSlotPress(
      {
        measureId,
        stringIndex,
        position,
      },
      getEventPoint(event),
      event.currentTarget,
      event.metaKey || event.ctrlKey,
    );
  };

  const noteLocation = (position: number) => ({
    measureId,
    stringIndex,
    position,
  });

  return (
    <div className="banjo-tab-string-row" role="row">
      <div className="banjo-tab-string-label" role="rowheader" aria-label={`String ${string.order}`}>
        {string.label}
      </div>
      <div
        className="banjo-tab-string-track"
        role="gridcell"
        aria-label={`String ${string.order}, ${string.label}`}
        ref={(element) => {
          dragApi.registerStringTrack(measureId, stringIndex, element);
          selectionApi.registerStringTrack(measureId, stringIndex, element);
        }}
      >
        <div className="banjo-tab-slot-grid">
          {Array.from({ length: SLOTS_PER_MEASURE }).map((_, index) => (
            <button
              key={index}
              type="button"
              className="banjo-tab-slot-button"
              aria-label={`Set string ${string.order} slot ${index + 1}`}
              onClick={handleSlotClick(index)}
              onPointerOver={(event) => onQuickFretTarget(noteLocation(index), event.currentTarget)}
              onPointerOut={() => onQuickFretTargetClear(noteLocation(index))}
              onFocus={(event) => onQuickFretTarget(noteLocation(index), event.currentTarget)}
              onBlur={() => onQuickFretTargetClear(noteLocation(index))}
            />
          ))}
        </div>
        {activeSelectionBounds && (
          <SelectionRegionOverlay bounds={activeSelectionBounds} stringIndex={stringIndex} />
        )}
        <PastePreview
          measureId={measureId}
          stringIndex={stringIndex}
          copiedSelection={copiedSelection}
          target={pasteTarget}
        />
        {mode.type === "dragging-note" &&
          mode.currentTarget?.measureId === measureId &&
          mode.currentTarget.stringIndex === stringIndex && (
            <SlotHighlight position={mode.currentTarget.position} />
          )}
        {notes.map((note) => (
          <TabNote
            key={note.id}
            note={note}
            measureId={measureId}
            onNotePress={onNotePress}
            onQuickFretTarget={onQuickFretTarget}
            onQuickFretTargetClear={onQuickFretTargetClear}
            onNotePointerDown={dragApi.notePointerHandlers.onPointerDown}
            onNotePointerMove={dragApi.notePointerHandlers.onPointerMove}
            onNotePointerUp={dragApi.notePointerHandlers.onPointerUp}
            onNotePointerCancel={dragApi.notePointerHandlers.onPointerCancel}
            onNoteLostPointerCapture={dragApi.notePointerHandlers.onLostPointerCapture}
            onArticulationResizePointerDown={dragApi.articulationResizePointerHandlers.onPointerDown}
            onArticulationResizePointerMove={dragApi.articulationResizePointerHandlers.onPointerMove}
            onArticulationResizePointerUp={dragApi.articulationResizePointerHandlers.onPointerUp}
            onArticulationResizePointerCancel={dragApi.articulationResizePointerHandlers.onPointerCancel}
            onArticulationResizeLostPointerCapture={dragApi.articulationResizePointerHandlers.onLostPointerCapture}
            onMoveNoteByKeyboard={dragApi.moveNoteByKeyboard}
            onResizeArticulationByKeyboard={dragApi.resizeArticulationByKeyboard}
            onDeleteNoteByKeyboard={dragApi.deleteNoteByKeyboard}
            shouldSuppressClick={dragApi.shouldSuppressClick}
            isDragging={mode.type === "dragging-note" && mode.noteId === note.id}
            isSelected={selectedNoteIds.has(note.id)}
            isNoteDragDisabled={isSelectionModeEnabled || mode.type === "selecting-notes"}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}

function getEventPoint(event: MouseEvent<HTMLElement>) {
  if (event.detail !== 0) {
    return { x: event.clientX, y: event.clientY };
  }

  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
