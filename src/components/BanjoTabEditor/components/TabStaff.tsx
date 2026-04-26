import type { BanjoTab, NoteLocation, ScreenPoint, TabNoteData } from "../types";
import { TabMeasure } from "./TabMeasure";

type TabStaffProps = {
  tab: BanjoTab;
  onSlotPress: (location: NoteLocation, screenPoint: ScreenPoint) => void;
  onNotePress: (note: TabNoteData, location: NoteLocation, screenPoint: ScreenPoint) => void;
};

export function TabStaff({ tab, onSlotPress, onNotePress }: TabStaffProps) {
  return (
    <div className="banjo-tab-staff" aria-label="Banjo tablature">
      {tab.measures.map((measure, index) => (
        <TabMeasure
          key={measure.id}
          measure={measure}
          measureNumber={index + 1}
          tuning={tab.tuning}
          onSlotPress={onSlotPress}
          onNotePress={onNotePress}
        />
      ))}
    </div>
  );
}
