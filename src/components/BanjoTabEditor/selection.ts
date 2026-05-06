import { clamp } from "./geometry";
import type {
  CopiedNoteSelection,
  SelectionBounds,
  SelectionPoint,
  TabMeasureData,
  TabNoteData,
} from "./types";

export function normalizeSelectionBounds(
  measureId: string,
  start: SelectionPoint,
  current: SelectionPoint,
): SelectionBounds {
  return {
    measureId,
    minStringIndex: Math.min(start.stringIndex, current.stringIndex),
    maxStringIndex: Math.max(start.stringIndex, current.stringIndex),
    minPosition: Math.min(start.position, current.position),
    maxPosition: Math.max(start.position, current.position),
  };
}

export function isNoteInSelection(note: TabNoteData, bounds: SelectionBounds): boolean {
  return (
    note.stringIndex >= bounds.minStringIndex &&
    note.stringIndex <= bounds.maxStringIndex &&
    note.position >= bounds.minPosition &&
    note.position <= bounds.maxPosition
  );
}

export function getNotesInSelection(
  measure: TabMeasureData,
  bounds: SelectionBounds,
): TabNoteData[] {
  if (measure.id !== bounds.measureId) {
    return [];
  }

  return measure.notes.filter((note) => isNoteInSelection(note, bounds));
}

export function createCopiedNoteSelection(
  sourceMeasureId: string,
  notes: TabNoteData[],
): CopiedNoteSelection | null {
  if (notes.length === 0) {
    return null;
  }

  const orderedNotes = [...notes].sort(
    (left, right) => left.position - right.position || left.stringIndex - right.stringIndex,
  );
  const minPosition = Math.min(...orderedNotes.map((note) => note.position));
  const maxPosition = Math.max(...orderedNotes.map((note) => note.position));

  return {
    sourceMeasureId,
    sourceNoteIds: orderedNotes.map((note) => note.id),
    minPosition,
    maxPosition,
    notes: orderedNotes.map((note) => ({
      stringIndex: note.stringIndex,
      positionOffset: note.position - minPosition,
      fret: note.fret,
      ...(note.durationSlots !== undefined ? { durationSlots: note.durationSlots } : {}),
      ...(note.articulation ? { articulation: note.articulation } : {}),
    })),
  };
}

export function clampPasteStart(
  targetStart: number,
  selection: CopiedNoteSelection,
  slotCount: number,
): number {
  const maxOffset = Math.max(...selection.notes.map((note) => note.positionOffset));
  const maxStart = Math.max(slotCount - maxOffset - 1, 0);

  return clamp(targetStart, 0, maxStart);
}

export function slotRangeToPercentBounds(
  minPosition: number,
  maxPosition: number,
  slotCount: number,
): { left: number; width: number } {
  const start = clamp(minPosition, 0, Math.max(slotCount - 1, 0));
  const end = clamp(maxPosition, start, Math.max(slotCount - 1, 0));

  return {
    left: (start / slotCount) * 100,
    width: ((end - start + 1) / slotCount) * 100,
  };
}
