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

export type MeasureGeometry = {
  measureId: string;
  rect: RectLike;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type PopoverPositionOptions = {
  width: number;
  margin: number;
  offsetY: number;
  minTop: number;
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

export function slotSpanToPercentBounds(
  position: number,
  durationSlots: number,
  slotCount: number,
): { start: number; end: number; width: number } {
  const start = slotToPercent(position, slotCount);
  const end = slotToPercent(position + Math.max(durationSlots, 1) - 1, slotCount);

  return {
    start,
    end,
    width: Math.max(end - start, 0),
  };
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

export function findNearestNoteLocationFromPoint(
  point: ScreenPoint,
  tracks: StringTrackGeometry[],
  slotCount: number,
): NoteLocation | null {
  const exactLocation = findNoteLocationFromPoint(point, tracks, slotCount);

  if (exactLocation) {
    return exactLocation;
  }

  const trackGroups = groupTracksByMeasure(tracks);

  for (const measureTracks of trackGroups.values()) {
    const measureBounds = getTrackGroupBounds(measureTracks);

    if (!measureBounds || !isPointInsideRect(point, measureBounds)) {
      continue;
    }

    const nearestTrack = measureTracks.reduce<StringTrackGeometry | null>((nearest, track) => {
      if (!nearest) {
        return track;
      }

      return getVerticalCenterDistance(point, track.rect) <
        getVerticalCenterDistance(point, nearest.rect)
        ? track
        : nearest;
    }, null);

    if (!nearestTrack) {
      return null;
    }

    return {
      measureId: nearestTrack.measureId,
      stringIndex: nearestTrack.stringIndex,
      position: xToNearestSlot(point.x, {
        left: nearestTrack.rect.left,
        width: nearestTrack.rect.width,
        slotCount,
      }),
    };
  }

  return null;
}

export function isPointInsideRect(point: ScreenPoint, rect: RectLike): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

function groupTracksByMeasure(tracks: StringTrackGeometry[]): Map<string, StringTrackGeometry[]> {
  return tracks.reduce((groups, track) => {
    const group = groups.get(track.measureId) ?? [];
    group.push(track);
    groups.set(track.measureId, group);
    return groups;
  }, new Map<string, StringTrackGeometry[]>());
}

function getTrackGroupBounds(tracks: StringTrackGeometry[]): RectLike | null {
  if (tracks.length === 0) {
    return null;
  }

  const left = Math.min(...tracks.map((track) => track.rect.left));
  const right = Math.max(...tracks.map((track) => track.rect.left + track.rect.width));
  const top = Math.min(...tracks.map((track) => track.rect.top));
  const bottom = Math.max(...tracks.map((track) => track.rect.top + track.rect.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function getVerticalCenterDistance(point: ScreenPoint, rect: RectLike): number {
  return Math.abs(point.y - (rect.top + rect.height / 2));
}

export function containPopoverPosition(
  anchorPoint: ScreenPoint,
  viewport: ViewportSize,
  options: PopoverPositionOptions,
): ScreenPoint {
  const availableWidth = Math.max(viewport.width - options.margin * 2, 0);
  const popoverWidth = Math.min(options.width, availableWidth);
  const halfWidth = popoverWidth / 2;
  const minLeft = options.margin + halfWidth;
  const maxLeft = viewport.width - options.margin - halfWidth;

  return {
    x: clamp(anchorPoint.x, minLeft, Math.max(minLeft, maxLeft)),
    y: Math.min(
      Math.max(anchorPoint.y + options.offsetY, options.minTop),
      viewport.height - options.margin,
    ),
  };
}

export function findMeasureDropIndexFromPoint(
  point: ScreenPoint,
  measures: MeasureGeometry[],
): number | null {
  if (measures.length === 0) {
    return null;
  }

  const columnLeft = Math.min(...measures.map(({ rect }) => rect.left));
  const columnRight = Math.max(...measures.map(({ rect }) => rect.left + rect.width));

  if (point.x < columnLeft || point.x > columnRight) {
    return null;
  }

  const firstMeasure = measures[0];
  if (point.y < firstMeasure.rect.top) {
    return 0;
  }

  for (let index = 0; index < measures.length; index += 1) {
    const measure = measures[index];
    const midpoint = measure.rect.top + measure.rect.height / 2;

    if (point.y < midpoint) {
      return index;
    }
  }

  return measures.length;
}
