import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import { slotSpanToPercentBounds, slotToPercent } from "../geometry";
import { formatTargetedArticulationParts, formatNoteLabel } from "../noteFormatting";
import type { EditorMode, NoteLocation, TabNoteData } from "../types";

type TabNoteProps = {
  note: TabNoteData;
  measureId: string;
  onNotePress: (
    note: TabNoteData,
    location: NoteLocation,
    screenPoint: { x: number; y: number },
    returnFocusElement: HTMLElement,
  ) => void;
  onQuickFretTarget: (location: NoteLocation) => void;
  onQuickFretTargetClear: (location: NoteLocation) => void;
  onNotePointerDown: (
    note: TabNoteData,
    location: NoteLocation,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onNotePointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onNotePointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onNotePointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onNoteLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => void;
  onArticulationResizePointerDown: (
    note: TabNoteData,
    location: NoteLocation,
    edge: "start" | "end",
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  onArticulationResizePointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onArticulationResizePointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onArticulationResizePointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onArticulationResizeLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => void;
  onMoveNoteByKeyboard: (
    note: TabNoteData,
    location: NoteLocation,
    direction: "up" | "down" | "left" | "right",
  ) => void;
  onResizeArticulationByKeyboard: (
    note: TabNoteData,
    edge: "start" | "end",
    direction: "left" | "right",
  ) => void;
  onDeleteNoteByKeyboard: (noteId: string) => void;
  shouldSuppressClick: () => boolean;
  isDragging: boolean;
  isSelected: boolean;
  isNoteDragDisabled: boolean;
  mode: EditorMode;
};

export function TabNote({
  note,
  measureId,
  onNotePress,
  onQuickFretTarget,
  onQuickFretTargetClear,
  onNotePointerDown,
  onNotePointerMove,
  onNotePointerUp,
  onNotePointerCancel,
  onNoteLostPointerCapture,
  onArticulationResizePointerDown,
  onArticulationResizePointerMove,
  onArticulationResizePointerUp,
  onArticulationResizePointerCancel,
  onArticulationResizeLostPointerCapture,
  onMoveNoteByKeyboard,
  onResizeArticulationByKeyboard,
  onDeleteNoteByKeyboard,
  shouldSuppressClick,
  isDragging,
  isSelected,
  isNoteDragDisabled,
  mode,
}: TabNoteProps) {
  const noteLabel = formatNoteLabel(note);
  const targetedArticulationParts = formatTargetedArticulationParts(note);
  const renderedSpan = getRenderedSpan(note, mode);
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

    onNotePress(note, location, getEventPoint(event), event.currentTarget);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (isNoteDragDisabled) {
      return;
    }

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

  const handleResizeKeyDown =
    (edge: "start" | "end") => (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        onResizeArticulationByKeyboard(
          note,
          edge,
          event.key === "ArrowLeft" ? "left" : "right",
        );
      }
    };

  const handleResizePointerDown =
    (edge: "start" | "end") => (event: PointerEvent<HTMLButtonElement>) => {
      onArticulationResizePointerDown(note, location, edge, event);
    };

  if (targetedArticulationParts && renderedSpan.durationSlots > 1) {
    const bounds = slotSpanToPercentBounds(
      renderedSpan.position,
      renderedSpan.durationSlots,
      SLOTS_PER_MEASURE,
    );

    return (
      <span
        className="banjo-tab-note banjo-tab-note--articulation"
        style={{
          left: `${bounds.start}%`,
          width: `max(1px, ${bounds.width}%)`,
        }}
        data-dragging={isDragging || undefined}
        data-selected={isSelected || undefined}
        data-resizing={mode.type === "resizing-articulation" && mode.noteId === note.id ? true : undefined}
        onPointerOver={() => onQuickFretTarget(location)}
        onPointerOut={() => onQuickFretTargetClear(location)}
        onFocus={() => onQuickFretTarget(location)}
        onBlur={() => onQuickFretTargetClear(location)}
      >
        <button
          type="button"
          className="banjo-tab-note-edit"
          aria-label={`Edit fret ${noteLabel} on string ${note.stringIndex + 1}, slots ${renderedSpan.position + 1} through ${renderedSpan.position + renderedSpan.durationSlots}`}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={onNotePointerMove}
          onPointerUp={onNotePointerUp}
          onPointerCancel={onNotePointerCancel}
          onLostPointerCapture={onNoteLostPointerCapture}
        />
        <span className="banjo-tab-note-fret banjo-tab-note-fret--start" aria-hidden="true">
          {targetedArticulationParts.source}
        </span>
        <span className="banjo-tab-note-operator" aria-hidden="true">
          {targetedArticulationParts.operator}
        </span>
        <span className="banjo-tab-note-fret banjo-tab-note-fret--end" aria-hidden="true">
          {targetedArticulationParts.target}
        </span>
        <button
          type="button"
          className="banjo-tab-note-resize banjo-tab-note-resize--start"
          aria-label={`Resize start of fret ${noteLabel}`}
          onKeyDown={handleResizeKeyDown("start")}
          onPointerDown={handleResizePointerDown("start")}
          onPointerMove={onArticulationResizePointerMove}
          onPointerUp={onArticulationResizePointerUp}
          onPointerCancel={onArticulationResizePointerCancel}
          onLostPointerCapture={onArticulationResizeLostPointerCapture}
          onClick={(event) => event.stopPropagation()}
        />
        <button
          type="button"
          className="banjo-tab-note-resize banjo-tab-note-resize--end"
          aria-label={`Resize end of fret ${noteLabel}`}
          onKeyDown={handleResizeKeyDown("end")}
          onPointerDown={handleResizePointerDown("end")}
          onPointerMove={onArticulationResizePointerMove}
          onPointerUp={onArticulationResizePointerUp}
          onPointerCancel={onArticulationResizePointerCancel}
          onLostPointerCapture={onArticulationResizeLostPointerCapture}
          onClick={(event) => event.stopPropagation()}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      className="banjo-tab-note"
      style={{ left: `${slotToPercent(note.position, SLOTS_PER_MEASURE)}%` }}
      aria-label={`Edit fret ${noteLabel} on string ${note.stringIndex + 1}, slot ${note.position + 1}`}
      data-dragging={isDragging || undefined}
      data-selected={isSelected || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerOver={() => onQuickFretTarget(location)}
      onPointerOut={() => onQuickFretTargetClear(location)}
      onFocus={() => onQuickFretTarget(location)}
      onBlur={() => onQuickFretTargetClear(location)}
      onPointerDown={handlePointerDown}
      onPointerMove={onNotePointerMove}
      onPointerUp={onNotePointerUp}
      onPointerCancel={onNotePointerCancel}
      onLostPointerCapture={onNoteLostPointerCapture}
    >
      {noteLabel}
    </button>
  );
}

function getRenderedSpan(note: TabNoteData, mode: EditorMode) {
  if (mode.type !== "resizing-articulation" || mode.noteId !== note.id) {
    return {
      position: note.position,
      durationSlots: getDefaultRenderDuration(note),
    };
  }

  const startPosition =
    mode.edge === "start"
      ? Math.min(mode.currentPosition, mode.endPosition)
      : mode.startPosition;
  const endPosition =
    mode.edge === "end"
      ? Math.max(mode.currentPosition, mode.startPosition)
      : mode.endPosition;

  return {
    position: startPosition,
    durationSlots: endPosition - startPosition + 1,
  };
}

function getDefaultRenderDuration(note: TabNoteData) {
  return note.durationSlots ?? Math.min(2, SLOTS_PER_MEASURE - note.position);
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
