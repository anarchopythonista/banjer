import type { BanjoString, EditorMode, NoteLocation, ScreenPoint, TabMeasureData, TabNoteData } from "../types";
import { TabStringRow } from "./TabStringRow";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";

type TabMeasureProps = {
  measure: TabMeasureData;
  measureNumber: number;
  tuning: BanjoString[];
  mode: EditorMode;
  onSlotPress: (location: NoteLocation, screenPoint: ScreenPoint) => void;
  onNotePress: (note: TabNoteData, location: NoteLocation, screenPoint: ScreenPoint) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
};

export function TabMeasure({
  measure,
  measureNumber,
  tuning,
  mode,
  onSlotPress,
  onNotePress,
  dragApi,
}: TabMeasureProps) {
  return (
    <section className="banjo-tab-measure" aria-label={`Measure ${measureNumber}`}>
      <div className="banjo-tab-measure-header">
        <span>Measure {measureNumber}</span>
        <span>{measure.beats}/{measure.subdivision}</span>
      </div>
      <div className="banjo-tab-measure-grid" role="grid" aria-label={`Tablature measure ${measureNumber}`}>
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
            dragApi={dragApi}
          />
        ))}
      </div>
    </section>
  );
}
