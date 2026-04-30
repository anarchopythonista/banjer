import type { KeyboardEvent, PointerEvent } from "react";
import type { BanjoString, EditorMode, NoteLocation, ScreenPoint, TabMeasureData, TabNoteData } from "../types";
import { EditableMeasureTitle } from "./EditableMeasureTitle";
import { TabStringRow } from "./TabStringRow";
import type { usePointerNoteDrag } from "../hooks/usePointerNoteDrag";
import type { usePointerMeasureDrag } from "../hooks/usePointerMeasureDrag";

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
  ) => void;
  onNotePress: (
    note: TabNoteData,
    location: NoteLocation,
    screenPoint: ScreenPoint,
    returnFocusElement: HTMLElement,
  ) => void;
  dragApi: ReturnType<typeof usePointerNoteDrag>;
  measureDragApi: ReturnType<typeof usePointerMeasureDrag>;
  onRenameMeasure: (measureId: string, title: string) => void;
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
  onRenameMeasure,
}: TabMeasureProps) {
  const fallbackTitle = `Measure ${measureNumber}`;

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
      aria-label={`Measure ${measureNumber}`}
    >
      <div
        className="banjo-tab-measure-header"
        aria-label={`Drag ${measure.title || fallbackTitle}`}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={measureDragApi.measurePointerHandlers.onPointerMove}
        onPointerUp={measureDragApi.measurePointerHandlers.onPointerUp}
        onPointerCancel={measureDragApi.measurePointerHandlers.onPointerCancel}
        onLostPointerCapture={measureDragApi.measurePointerHandlers.onLostPointerCapture}
      >
        <button
          type="button"
          className="banjo-tab-measure-handle"
          aria-label={`Drag ${measure.title || fallbackTitle}`}
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
          title={measure.title ?? ""}
          fallbackTitle={fallbackTitle}
          measureNumber={measureNumber}
          onCommitTitle={(title) => onRenameMeasure(measure.id, title)}
        />
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
