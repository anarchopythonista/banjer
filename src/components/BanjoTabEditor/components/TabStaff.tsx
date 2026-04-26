import type { BanjoTab, EditorMode, NoteLocation, ScreenPoint, TabNoteData } from "../types";
import { TabMeasure } from "./TabMeasure";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";

type TabStaffProps = {
  tab: BanjoTab;
  mode: EditorMode;
  onSlotPress: (location: NoteLocation, screenPoint: ScreenPoint) => void;
  onNotePress: (note: TabNoteData, location: NoteLocation, screenPoint: ScreenPoint) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
};

export function TabStaff({ tab, mode, onSlotPress, onNotePress, dragApi }: TabStaffProps) {
  return (
    <div className="banjo-tab-staff" aria-label="Banjo tablature">
      {tab.measures.map((measure, index) => (
        <TabMeasure
          key={measure.id}
          measure={measure}
          measureNumber={index + 1}
          tuning={tab.tuning}
          mode={mode}
          onSlotPress={onSlotPress}
          onNotePress={onNotePress}
          dragApi={dragApi}
        />
      ))}
    </div>
  );
}
