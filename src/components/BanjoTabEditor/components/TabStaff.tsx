import type { BanjoTab, EditorMode, NoteLocation, ScreenPoint, TabNoteData } from "../types";
import { TabMeasure } from "./TabMeasure";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";
import type { usePointerMeasureDrag } from "../hooks/usePointerMeasureDrag";

type TabStaffProps = {
  tab: BanjoTab;
  mode: EditorMode;
  onSlotPress: (
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
  ) => void;
  onNotePress: (
    note: TabNoteData,
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
  ) => void;
  onRenameMeasure: (measureId: string, title: string) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
  measureDragApi: ReturnType<typeof usePointerMeasureDrag>;
};

export function TabStaff({
  tab,
  mode,
  onSlotPress,
  onNotePress,
  onRenameMeasure,
  dragApi,
  measureDragApi,
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
            onRenameMeasure={onRenameMeasure}
            dragApi={dragApi}
            measureDragApi={measureDragApi}
          />
        </div>
      ))}
      {targetIndex === tab.measures.length && <div className="banjo-tab-measure-drop-indicator" />}
    </div>
  );
}
