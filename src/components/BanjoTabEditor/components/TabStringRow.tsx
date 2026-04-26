import type { MouseEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import type { BanjoString, NoteLocation, ScreenPoint, TabNoteData } from "../types";
import { TabNote } from "./TabNote";

type TabStringRowProps = {
  measureId: string;
  string: BanjoString;
  stringIndex: number;
  notes: TabNoteData[];
  onSlotPress: (location: NoteLocation, screenPoint: ScreenPoint) => void;
  onNotePress: (note: TabNoteData, location: NoteLocation, screenPoint: ScreenPoint) => void;
};

export function TabStringRow({
  measureId,
  string,
  stringIndex,
  notes,
  onSlotPress,
  onNotePress,
}: TabStringRowProps) {
  const handleSlotClick = (position: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onSlotPress(
      {
        measureId,
        stringIndex,
        position,
      },
      getEventPoint(event),
    );
  };

  return (
    <div className="banjo-tab-string-row" role="row">
      <div className="banjo-tab-string-label" role="rowheader" aria-label={`String ${string.order}`}>
        {string.label}
      </div>
      <div
        className="banjo-tab-string-track"
        role="gridcell"
        aria-label={`String ${string.order}, ${string.label}`}
      >
        <div className="banjo-tab-slot-grid">
          {Array.from({ length: SLOTS_PER_MEASURE }).map((_, index) => (
            <button
              key={index}
              type="button"
              className="banjo-tab-slot-button"
              aria-label={`Set string ${string.order} slot ${index + 1}`}
              onClick={handleSlotClick(index)}
            />
          ))}
        </div>
        {notes.map((note) => (
          <TabNote
            key={note.id}
            note={note}
            measureId={measureId}
            onNotePress={onNotePress}
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
