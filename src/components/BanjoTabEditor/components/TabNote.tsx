import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import { slotToPercent } from "../geometry";
import type { NoteLocation, TabNoteData } from "../types";

type TabNoteProps = {
  note: TabNoteData;
  measureId: string;
  onNotePress: (
    note: TabNoteData,
    location: NoteLocation,
    screenPoint: { x: number; y: number },
  ) => void;
  onNotePointerDown: (
    note: TabNoteData,
    location: NoteLocation,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onNotePointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onNotePointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onNotePointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onNoteLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => void;
  onMoveNoteByKeyboard: (
    note: TabNoteData,
    location: NoteLocation,
    direction: "up" | "down" | "left" | "right",
  ) => void;
  onDeleteNoteByKeyboard: (noteId: string) => void;
  shouldSuppressClick: () => boolean;
  isDragging: boolean;
};

export function TabNote({
  note,
  measureId,
  onNotePress,
  onNotePointerDown,
  onNotePointerMove,
  onNotePointerUp,
  onNotePointerCancel,
  onNoteLostPointerCapture,
  onMoveNoteByKeyboard,
  onDeleteNoteByKeyboard,
  shouldSuppressClick,
  isDragging,
}: TabNoteProps) {
  const location = {
    measureId,
    stringIndex: note.stringIndex,
    position: note.position,
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (shouldSuppressClick()) {
      return;
    }

    onNotePress(note, location, getEventPoint(event));
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    onNotePointerDown(note, location, event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keyToDirection = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    } as const;

    if (event.key in keyToDirection) {
      event.preventDefault();
      onMoveNoteByKeyboard(note, location, keyToDirection[event.key as keyof typeof keyToDirection]);
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onDeleteNoteByKeyboard(note.id);
    }
  };

  return (
    <button
      type="button"
      className="banjo-tab-note"
      style={{ left: `${slotToPercent(note.position, SLOTS_PER_MEASURE)}%` }}
      aria-label={`Edit fret ${note.fret} on string ${note.stringIndex + 1}, slot ${note.position + 1}`}
      data-dragging={isDragging || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={onNotePointerMove}
      onPointerUp={onNotePointerUp}
      onPointerCancel={onNotePointerCancel}
      onLostPointerCapture={onNoteLostPointerCapture}
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
