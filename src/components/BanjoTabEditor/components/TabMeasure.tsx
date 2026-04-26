import type { KeyboardEvent, PointerEvent } from "react";
import type { BanjoString, EditorMode, NoteLocation, ScreenPoint, TabMeasureData, TabNoteData } from "../types";
import { TabStringRow } from "./TabStringRow";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";
import type { usePointerMeasureDrag } from "../hooks/usePointerMeasureDrag";

type TabMeasureProps = {
  measure: TabMeasureData;
  measureNumber: number;
  measureIndex: number;
  tuning: BanjoString[];
  mode: EditorMode;
  onSlotPress: (location: NoteLocation, screenPoint: ScreenPoint) => void;
  onNotePress: (note: TabNoteData, location: NoteLocation, screenPoint: ScreenPoint) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
  measureDragApi: ReturnType<typeof usePointerMeasureDrag>;
};

export function TabMeasure({
  measure,
  measureNumber,
  measureIndex,
  tuning,
  mode,
  onSlotPress,
  onNotePress,
  dragApi,
  measureDragApi,
}: TabMeasureProps) {
  const handleMeasurePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    measureDragApi.measurePointerHandlers.onPointerDown(measure.id, measureIndex, event);
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
      aria-label={`Measure ${measureNumber}`}
    >
      <div className="banjo-tab-measure-header">
        <button
          type="button"
          className="banjo-tab-measure-handle"
          aria-label={`Drag measure ${measureNumber}`}
          onKeyDown={handleMeasureKeyDown}
          onPointerDown={handleMeasurePointerDown}
          onPointerMove={measureDragApi.measurePointerHandlers.onPointerMove}
          onPointerUp={measureDragApi.measurePointerHandlers.onPointerUp}
          onPointerCancel={measureDragApi.measurePointerHandlers.onPointerCancel}
          onLostPointerCapture={measureDragApi.measurePointerHandlers.onLostPointerCapture}
        >
          <span aria-hidden="true">::</span>
          <span>Measure {measureNumber}</span>
        </button>
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
