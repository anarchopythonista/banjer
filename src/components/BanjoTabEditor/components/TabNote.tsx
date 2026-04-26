import type { MouseEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import { slotToPercent } from "../geometry";
import type { TabNoteData } from "../types";

type TabNoteProps = {
  note: TabNoteData;
  measureId: string;
  onNotePress: (
    note: TabNoteData,
    location: { measureId: string; stringIndex: number; position: number },
    screenPoint: { x: number; y: number },
  ) => void;
};

export function TabNote({ note, measureId, onNotePress }: TabNoteProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onNotePress(
      note,
      {
        measureId,
        stringIndex: note.stringIndex,
        position: note.position,
      },
      getEventPoint(event),
    );
  };

  return (
    <button
      type="button"
      className="banjo-tab-note"
      style={{ left: `${slotToPercent(note.position, SLOTS_PER_MEASURE)}%` }}
      aria-label={`Edit fret ${note.fret} on string ${note.stringIndex + 1}, slot ${note.position + 1}`}
      onClick={handleClick}
    >
      {note.fret}
    </button>
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
