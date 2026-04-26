import type { NoteLocation, ScreenPoint } from "./types";

export type SlotGeometry = {
  left: number;
  width: number;
  slotCount: number;
};

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type StringTrackGeometry = {
  measureId: string;
  stringIndex: number;
  rect: RectLike;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function xToNearestSlot(clientX: number, geometry: SlotGeometry): number {
  const relativeX = clamp(clientX - geometry.left, 0, geometry.width);
  const slotWidth = geometry.width / Math.max(geometry.slotCount, 1);
  return clamp(Math.floor(relativeX / slotWidth), 0, geometry.slotCount - 1);
}

export function slotToPercent(position: number, slotCount: number): number {
  if (slotCount <= 0) {
    return 0;
  }

  return ((clamp(position, 0, slotCount - 1) + 0.5) / slotCount) * 100;
}

export function findNoteLocationFromPoint(
  point: ScreenPoint,
  tracks: StringTrackGeometry[],
  slotCount: number,
): NoteLocation | null {
  const matchingTrack = tracks.find(({ rect }) => isPointInsideRect(point, rect));

  if (!matchingTrack) {
    return null;
  }

  return {
    measureId: matchingTrack.measureId,
    stringIndex: matchingTrack.stringIndex,
    position: xToNearestSlot(point.x, {
      left: matchingTrack.rect.left,
      width: matchingTrack.rect.width,
      slotCount,
    }),
  };
}

export function isPointInsideRect(point: ScreenPoint, rect: RectLike): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}
