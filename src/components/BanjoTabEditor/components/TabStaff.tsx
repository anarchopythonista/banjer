import type {
  PointerEvent,
} from "react";
import type {
  BanjoTab,
  CopiedNoteSelection,
  EditorMode,
  NoteLocation,
  PasteTarget,
  ScreenPoint,
  SelectionBounds,
  TabNoteData,
} from "../types";
import { TabMeasure } from "./TabMeasure";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";
import type { usePointerMeasureDrag } from "../hooks/usePointerMeasureDrag";
import type { usePointerNoteSelection } from "../hooks/usePointerNoteSelection";

type TabStaffProps = {
  tab: BanjoTab;
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
  onRenameMeasure: (measureId: string, title: string) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
  measureDragApi: ReturnType<typeof usePointerMeasureDrag>;
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

export function TabStaff({
  tab,
  mode,
  onSlotPress,
  onNotePress,
  onQuickFretTarget,
  onQuickFretTargetClear,
  onRenameMeasure,
  dragApi,
  measureDragApi,
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
}: TabStaffProps) {
  const targetIndex = mode.type === "dragging-measure" ? mode.currentTargetIndex : null;

  return (
    <div className="banjo-tab-staff" aria-label="Banjo tablature">
      {tab.measures.map((measure, index) => (
        <div key={measure.id} className="banjo-tab-measure-slot">
          {targetIndex === index && <div className="banjo-tab-measure-drop-indicator" />}
          <TabMeasure
            measure={measure}
            measureNumber={index + 1}
            measureIndex={index}
            tuning={tab.tuning}
            mode={mode}
            onSlotPress={onSlotPress}
            onNotePress={onNotePress}
            onQuickFretTarget={onQuickFretTarget}
            onQuickFretTargetClear={onQuickFretTargetClear}
            onRenameMeasure={onRenameMeasure}
            dragApi={dragApi}
            measureDragApi={measureDragApi}
            selectedNoteIds={selectedNoteIds}
            completedSelectionBounds={completedSelectionBounds}
            copiedSelection={copiedSelection}
            pasteTarget={pasteTarget}
            isSelectionModeEnabled={isSelectionModeEnabled}
            onCopySelection={onCopySelection}
            onCopySelectionPointerDown={onCopySelectionPointerDown}
            onCopySelectionPointerMove={onCopySelectionPointerMove}
            onCopySelectionPointerUp={onCopySelectionPointerUp}
            onCopySelectionPointerCancel={onCopySelectionPointerCancel}
            onCopySelectionLostPointerCapture={onCopySelectionLostPointerCapture}
            selectionApi={selectionApi}
          />
        </div>
      ))}
      {targetIndex === tab.measures.length && <div className="banjo-tab-measure-drop-indicator" />}
    </div>
  );
}
