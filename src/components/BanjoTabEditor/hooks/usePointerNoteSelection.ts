import { useCallback, useRef } from "react";
import type { Dispatch, PointerEvent as ReactPointerEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import { findNearestNoteLocationFromPoint, type StringTrackGeometry } from "../geometry";
import { normalizeSelectionBounds } from "../selection";
import type { BanjoTabAction } from "../tabReducer";
import type {
  BanjoTabEditorState,
  NoteLocation,
  ScreenPoint,
  SelectionBounds,
  SelectionPoint,
} from "../types";

type ActiveSelectionPointer = {
  measureId: string;
  pointerId: number;
  start: SelectionPoint;
  current: SelectionPoint;
  captureElement: HTMLElement;
  didDrag: boolean;
};

type UsePointerNoteSelectionArgs = {
  state: BanjoTabEditorState;
  dispatch: Dispatch<BanjoTabAction>;
  isSelectionModeEnabled: boolean;
  onSelectionComplete: (bounds: SelectionBounds) => void;
  onSelectionClear: () => void;
};

const SELECTION_DRAG_THRESHOLD_PX = 4;

export function usePointerNoteSelection({
  state,
  dispatch,
  isSelectionModeEnabled,
  onSelectionComplete,
  onSelectionClear,
}: UsePointerNoteSelectionArgs) {
  const stringTrackElementsRef = useRef(new Map<string, HTMLElement>());
  const activeSelectionRef = useRef<ActiveSelectionPointer | null>(null);
  const suppressNextClickRef = useRef(false);
  const startPointRef = useRef<ScreenPoint | null>(null);

  const registerStringTrack = useCallback(
    (measureId: string, stringIndex: number, element: HTMLElement | null) => {
      const key = makeTrackKey(measureId, stringIndex);

      if (element) {
        stringTrackElementsRef.current.set(key, element);
      } else {
        stringTrackElementsRef.current.delete(key);
      }
    },
    [],
  );

  const shouldSuppressClick = useCallback(() => {
    if (!suppressNextClickRef.current) {
      return false;
    }

    suppressNextClickRef.current = false;
    return true;
  }, []);

  const startSelection = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || state.mode.type !== "idle") {
        return;
      }

      if (!event.shiftKey && !isSelectionModeEnabled) {
        return;
      }

      const point = getPointerPoint(event);
      const location = getSelectionLocation(point, stringTrackElementsRef.current);

      if (!location) {
        return;
      }

      event.preventDefault();
      safeSetPointerCapture(event.currentTarget, event.pointerId);
      onSelectionClear();

      const start = {
        stringIndex: location.stringIndex,
        position: location.position,
      };
      const activeSelection: ActiveSelectionPointer = {
        measureId: location.measureId,
        pointerId: event.pointerId,
        start,
        current: start,
        captureElement: event.currentTarget,
        didDrag: false,
      };

      activeSelectionRef.current = activeSelection;
      startPointRef.current = point;
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "selecting-notes",
          measureId: location.measureId,
          start,
          current: start,
          pointer: point,
          pointerId: event.pointerId,
        },
      });
    },
    [dispatch, isSelectionModeEnabled, onSelectionClear, state.mode.type],
  );

  const updateSelection = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeSelection = activeSelectionRef.current;

      if (!activeSelection || activeSelection.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const point = getPointerPoint(event);
      const startPoint = startPointRef.current;
      const location = getSelectionLocation(
        point,
        stringTrackElementsRef.current,
        activeSelection.measureId,
      );

      if (startPoint && getDistance(startPoint, point) >= SELECTION_DRAG_THRESHOLD_PX) {
        activeSelection.didDrag = true;
      }

      if (!location) {
        return;
      }

      activeSelection.current = {
        stringIndex: location.stringIndex,
        position: location.position,
      };
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "selecting-notes",
          measureId: activeSelection.measureId,
          start: activeSelection.start,
          current: activeSelection.current,
          pointer: point,
          pointerId: activeSelection.pointerId,
        },
      });
    },
    [dispatch],
  );

  const finishSelection = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeSelection = activeSelectionRef.current;

      if (!activeSelection || activeSelection.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releasePointerCapture(activeSelection);

      if (activeSelection.didDrag) {
        onSelectionComplete(
          normalizeSelectionBounds(
            activeSelection.measureId,
            activeSelection.start,
            activeSelection.current,
          ),
        );
        suppressNextClickRef.current = true;
      } else {
        onSelectionClear();
      }

      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
      activeSelectionRef.current = null;
      startPointRef.current = null;
    },
    [dispatch, onSelectionClear, onSelectionComplete],
  );

  const cancelSelection = useCallback(
    (event?: ReactPointerEvent<HTMLElement>) => {
      const activeSelection = activeSelectionRef.current;

      if (!activeSelection || (event && activeSelection.pointerId !== event.pointerId)) {
        return;
      }

      releasePointerCapture(activeSelection);
      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
      activeSelectionRef.current = null;
      startPointRef.current = null;
    },
    [dispatch],
  );

  return {
    registerStringTrack,
    shouldSuppressClick,
    selectionPointerHandlers: {
      onPointerDown: startSelection,
      onPointerMove: updateSelection,
      onPointerUp: finishSelection,
      onPointerCancel: cancelSelection,
      onLostPointerCapture: cancelSelection,
    },
  };
}

function getSelectionLocation(
  point: ScreenPoint,
  trackElements: Map<string, HTMLElement>,
  measureId?: string,
): NoteLocation | null {
  const tracks: StringTrackGeometry[] = Array.from(trackElements.entries())
    .map(([key, element]) => {
      const [trackMeasureId, stringIndex] = key.split(":");
      return {
        measureId: trackMeasureId,
        stringIndex: Number(stringIndex),
        rect: element.getBoundingClientRect(),
      };
    })
    .filter((track) => !measureId || track.measureId === measureId);

  return findNearestNoteLocationFromPoint(point, tracks, SLOTS_PER_MEASURE);
}

function getPointerPoint(event: ReactPointerEvent<HTMLElement>): ScreenPoint {
  return { x: event.clientX, y: event.clientY };
}

function getDistance(start: ScreenPoint, current: ScreenPoint): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

function releasePointerCapture(activeSelection: ActiveSelectionPointer) {
  if (activeSelection.captureElement.hasPointerCapture(activeSelection.pointerId)) {
    activeSelection.captureElement.releasePointerCapture(activeSelection.pointerId);
  }
}

function safeSetPointerCapture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Synthetic pointer events in tests may not have an active browser pointer.
  }
}

function makeTrackKey(measureId: string, stringIndex: number) {
  return `${measureId}:${stringIndex}`;
}
