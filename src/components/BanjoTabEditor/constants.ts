import type { BanjoString, TabMeasureData } from "./types";

export const BANJO_STRING_COUNT = 5;
export const SLOTS_PER_MEASURE = 16;
export const DEFAULT_BEATS_PER_MEASURE = 4;
export const DEFAULT_SUBDIVISION = 4;

export const DEFAULT_TUNING: BanjoString[] = [
  { id: "string-1", label: "D", order: 1 },
  { id: "string-2", label: "B", order: 2 },
  { id: "string-3", label: "G", order: 3 },
  { id: "string-4", label: "D", order: 4 },
  { id: "string-5", label: "g", order: 5 },
];

let nextMeasureNumber = 1;
let nextNoteNumber = 1;

export function createMeasure(): TabMeasureData {
  const id = `measure-${nextMeasureNumber}`;
  nextMeasureNumber += 1;

  return createMeasureWithId(id);
}

export function createMeasureWithId(id: string): TabMeasureData {
  return {
    id,
    title: getDefaultMeasureTitle(id),
    beats: DEFAULT_BEATS_PER_MEASURE,
    subdivision: DEFAULT_SUBDIVISION,
    notes: [],
  };
}

export function createNoteId(): string {
  const id = `note-${nextNoteNumber}`;
  nextNoteNumber += 1;
  return id;
}

export function createInitialTab() {
  return {
    tuning: DEFAULT_TUNING,
    measures: [createMeasure()],
  };
}

export function getDefaultMeasureTitle(id: string): string {
  const measureNumber = /^measure-(\d+)$/.exec(id)?.[1];
  return measureNumber ? `Measure ${measureNumber}` : "Measure";
}
