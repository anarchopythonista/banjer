import { useCallback, useRef } from "react";
import type { Dispatch, PointerEvent as ReactPointerEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import {
  findNoteLocationFromPoint,
  isPointInsideRect,
  xToNearestSlot,
  type StringTrackGeometry,
} from "../geometry";
import type { BanjoTabAction } from "../tabReducer";
import type { BanjoTabEditorState, NoteLocation, ScreenPoint, TabNoteData } from "../types";

type ActivePointer = {
  note: TabNoteData;
  origin: NoteLocation;
  pointerId: number;
  startPoint: ScreenPoint;
  isDragging: boolean;
  longPressTimer: number | null;
  captureElement: HTMLElement;
};

type ActiveArticulationResize = {
  note: TabNoteData;
  location: NoteLocation;
  edge: "start" | "end";
  pointerId: number;
  captureElement: HTMLElement;
};

type UsePointerNoteDragArgs = {
  state: BanjoTabEditorState;
  dispatch: Dispatch<BanjoTabAction>;
  isNoteDragDisabled?: boolean;
};

const DRAG_THRESHOLD_PX = 6;
const TOUCH_CANCEL_THRESHOLD_PX = 10;
const TOUCH_LONG_PRESS_MS = 350;

export function usePointerNoteDrag({
  state,
  dispatch,
  isNoteDragDisabled = false,
}: UsePointerNoteDragArgs) {
  const activePointerRef = useRef<ActivePointer | null>(null);
  const activeResizeRef = useRef<ActiveArticulationResize | null>(null);
  const stringTrackElementsRef = useRef(new Map<string, HTMLElement>());
  const trashElementRef = useRef<HTMLDivElement | null>(null);
  const suppressNextClickRef = useRef(false);

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

  const registerTrashZone = useCallback((element: HTMLDivElement | null) => {
    trashElementRef.current = element;
  }, []);

  const shouldSuppressClick = useCallback(() => {
    if (!suppressNextClickRef.current) {
      return false;
    }

    suppressNextClickRef.current = false;
    return true;
  }, []);

  const startDragging = useCallback(
    (activePointer: ActivePointer, point: ScreenPoint) => {
      activePointer.isDragging = true;
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "dragging-note",
          noteId: activePointer.note.id,
          origin: activePointer.origin,
          currentTarget: getTargetLocation(point, stringTrackElementsRef.current),
          pointer: point,
          pointerId: activePointer.pointerId,
          overTrash: getOverTrash(point, trashElementRef.current),
        },
      });
    },
    [dispatch],
  );

  const handleNotePointerDown = useCallback(
    (
      note: TabNoteData,
      origin: NoteLocation,
      event: ReactPointerEvent<HTMLElement>,
    ) => {
      if (event.button !== 0) {
        return;
      }

      if (event.shiftKey || isNoteDragDisabled) {
        return;
      }

      const point = getPointerPoint(event);
      const activePointer: ActivePointer = {
        note,
        origin,
        pointerId: event.pointerId,
        startPoint: point,
        isDragging: false,
        longPressTimer: null,
        captureElement: event.currentTarget,
      };

      safeSetPointerCapture(event.currentTarget, event.pointerId);

      if (event.pointerType === "touch") {
        activePointer.longPressTimer = window.setTimeout(() => {
          startDragging(activePointer, point);
        }, TOUCH_LONG_PRESS_MS);
      }

      activePointerRef.current = activePointer;
    },
    [isNoteDragDisabled, startDragging],
  );

  const handleArticulationResizePointerDown = useCallback(
    (
      note: TabNoteData,
      location: NoteLocation,
      edge: "start" | "end",
      event: ReactPointerEvent<HTMLElement>,
    ) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      safeSetPointerCapture(event.currentTarget, event.pointerId);
      activeResizeRef.current = {
        note,
        location,
        edge,
        pointerId: event.pointerId,
        captureElement: event.currentTarget,
      };

      const point = getPointerPoint(event);
      const currentPosition =
        getSlotPositionForNote(point, location, stringTrackElementsRef.current) ??
        getResizeEdgePosition(note, edge);
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: makeResizeMode(note, location, edge, currentPosition, point, event.pointerId),
      });
    },
    [dispatch],
  );

  const handleNotePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activePointer = activePointerRef.current;

      if (!activePointer || activePointer.pointerId !== event.pointerId) {
        return;
      }

      const point = getPointerPoint(event);
      const distance = getDistance(activePointer.startPoint, point);

      if (!activePointer.isDragging) {
        if (event.pointerType === "touch") {
          if (distance > TOUCH_CANCEL_THRESHOLD_PX) {
            clearLongPressTimer(activePointer);
          }
          return;
        }

        if (distance < DRAG_THRESHOLD_PX) {
          return;
        }

        startDragging(activePointer, point);
      }

      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "dragging-note",
          noteId: activePointer.note.id,
          origin: activePointer.origin,
          currentTarget: getTargetLocation(point, stringTrackElementsRef.current),
          pointer: point,
          pointerId: activePointer.pointerId,
          overTrash: getOverTrash(point, trashElementRef.current),
        },
      });
    },
    [dispatch, startDragging],
  );

  const handleArticulationResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeResize = activeResizeRef.current;

      if (!activeResize || activeResize.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const point = getPointerPoint(event);
      const currentPosition =
        getSlotPositionForNote(point, activeResize.location, stringTrackElementsRef.current) ??
        getResizeEdgePosition(activeResize.note, activeResize.edge);

      dispatch({
        type: "SET_EDITOR_MODE",
        mode: makeResizeMode(
          activeResize.note,
          activeResize.location,
          activeResize.edge,
          currentPosition,
          point,
          activeResize.pointerId,
        ),
      });
    },
    [dispatch],
  );

  const handleNotePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activePointer = activePointerRef.current;

      if (!activePointer || activePointer.pointerId !== event.pointerId) {
        return;
      }

      clearLongPressTimer(activePointer);
      releasePointerCapture(activePointer);

      if (activePointer.isDragging) {
        const point = getPointerPoint(event);
        const overTrash = getOverTrash(point, trashElementRef.current);
        const target = getTargetLocation(point, stringTrackElementsRef.current);

        if (overTrash) {
          dispatch({ type: "DELETE_NOTE", noteId: activePointer.note.id });
        } else if (target) {
          dispatch({ type: "MOVE_NOTE", noteId: activePointer.note.id, target });
        }

        dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
        suppressNextClickRef.current = true;
      }

      activePointerRef.current = null;
    },
    [dispatch],
  );

  const handleArticulationResizePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeResize = activeResizeRef.current;

      if (!activeResize || activeResize.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      releaseResizePointerCapture(activeResize);

      const point = getPointerPoint(event);
      const targetPosition =
        getSlotPositionForNote(point, activeResize.location, stringTrackElementsRef.current) ??
        getResizeEdgePosition(activeResize.note, activeResize.edge);

      dispatch({
        type: "RESIZE_ARTICULATION_SPAN",
        noteId: activeResize.note.id,
        edge: activeResize.edge,
        targetPosition,
      });
      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });

      activeResizeRef.current = null;
    },
    [dispatch],
  );

  const cancelDragging = useCallback(
    (event?: ReactPointerEvent<HTMLElement>) => {
      const activePointer = activePointerRef.current;

      if (!activePointer || (event && activePointer.pointerId !== event.pointerId)) {
        return;
      }

      clearLongPressTimer(activePointer);
      releasePointerCapture(activePointer);

      if (activePointer.isDragging) {
        dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
        suppressNextClickRef.current = true;
      }

      activePointerRef.current = null;
    },
    [dispatch],
  );

  const cancelArticulationResize = useCallback(
    (event?: ReactPointerEvent<HTMLElement>) => {
      const activeResize = activeResizeRef.current;

      if (!activeResize || (event && activeResize.pointerId !== event.pointerId)) {
        return;
      }

      releaseResizePointerCapture(activeResize);
      dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
      activeResizeRef.current = null;
    },
    [dispatch],
  );

  const moveNoteByKeyboard = useCallback(
    (note: TabNoteData, origin: NoteLocation, direction: "up" | "down" | "left" | "right") => {
      const stringCount = state.tab.tuning.length;
      const target = {
        measureId: origin.measureId,
        stringIndex:
          direction === "up"
            ? Math.max(origin.stringIndex - 1, 0)
            : direction === "down"
              ? Math.min(origin.stringIndex + 1, stringCount - 1)
              : origin.stringIndex,
        position:
          direction === "left"
            ? Math.max(origin.position - 1, 0)
            : direction === "right"
              ? Math.min(origin.position + 1, SLOTS_PER_MEASURE - 1)
              : origin.position,
      };

      dispatch({ type: "MOVE_NOTE", noteId: note.id, target });
    },
    [dispatch, state.tab.tuning.length],
  );

  const resizeArticulationByKeyboard = useCallback(
    (note: TabNoteData, edge: "start" | "end", direction: "left" | "right") => {
      const delta = direction === "left" ? -1 : 1;
      const currentPosition = getResizeEdgePosition(note, edge);

      dispatch({
        type: "RESIZE_ARTICULATION_SPAN",
        noteId: note.id,
        edge,
        targetPosition: currentPosition + delta,
      });
    },
    [dispatch],
  );

  return {
    registerStringTrack,
    registerTrashZone,
    shouldSuppressClick,
    notePointerHandlers: {
      onPointerDown: handleNotePointerDown,
      onPointerMove: handleNotePointerMove,
      onPointerUp: handleNotePointerUp,
      onPointerCancel: cancelDragging,
      onLostPointerCapture: cancelDragging,
    },
    articulationResizePointerHandlers: {
      onPointerDown: handleArticulationResizePointerDown,
      onPointerMove: handleArticulationResizePointerMove,
      onPointerUp: handleArticulationResizePointerUp,
      onPointerCancel: cancelArticulationResize,
      onLostPointerCapture: cancelArticulationResize,
    },
    moveNoteByKeyboard,
    resizeArticulationByKeyboard,
    deleteNoteByKeyboard: (noteId: string) => dispatch({ type: "DELETE_NOTE", noteId }),
  };
}

function getTargetLocation(
  point: ScreenPoint,
  trackElements: Map<string, HTMLElement>,
): NoteLocation | null {
  const tracks: StringTrackGeometry[] = Array.from(trackElements.entries()).map(([key, element]) => {
    const [measureId, stringIndex] = key.split(":");
    return {
      measureId,
      stringIndex: Number(stringIndex),
      rect: element.getBoundingClientRect(),
    };
  });

  return findNoteLocationFromPoint(point, tracks, SLOTS_PER_MEASURE);
}

function getOverTrash(point: ScreenPoint, trashElement: HTMLDivElement | null): boolean {
  return trashElement ? isPointInsideRect(point, trashElement.getBoundingClientRect()) : false;
}

function getSlotPositionForNote(
  point: ScreenPoint,
  location: NoteLocation,
  trackElements: Map<string, HTMLElement>,
): number | null {
  const trackElement = trackElements.get(makeTrackKey(location.measureId, location.stringIndex));

  if (!trackElement) {
    return null;
  }

  const rect = trackElement.getBoundingClientRect();
  return xToNearestSlot(point.x, {
    left: rect.left,
    width: rect.width,
    slotCount: SLOTS_PER_MEASURE,
  });
}

function makeResizeMode(
  note: TabNoteData,
  location: NoteLocation,
  edge: "start" | "end",
  currentPosition: number,
  pointer: ScreenPoint,
  pointerId: number,
): BanjoTabEditorState["mode"] {
  const startPosition = note.position;
  const endPosition = note.position + getDefaultArticulationDuration(note) - 1;

  return {
    type: "resizing-articulation",
    noteId: note.id,
    edge,
    measureId: location.measureId,
    stringIndex: location.stringIndex,
    startPosition,
    endPosition,
    currentPosition,
    pointer,
    pointerId,
  };
}

function getResizeEdgePosition(note: TabNoteData, edge: "start" | "end") {
  return edge === "start" ? note.position : note.position + getDefaultArticulationDuration(note) - 1;
}

function getDefaultArticulationDuration(note: TabNoteData) {
  return note.durationSlots ?? Math.min(2, SLOTS_PER_MEASURE - note.position);
}

function getPointerPoint(event: ReactPointerEvent<HTMLElement>): ScreenPoint {
  return { x: event.clientX, y: event.clientY };
}

function getDistance(start: ScreenPoint, current: ScreenPoint): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

function clearLongPressTimer(activePointer: ActivePointer) {
  if (activePointer.longPressTimer !== null) {
    window.clearTimeout(activePointer.longPressTimer);
    activePointer.longPressTimer = null;
  }
}

function releasePointerCapture(activePointer: ActivePointer) {
  if (activePointer.captureElement.hasPointerCapture(activePointer.pointerId)) {
    activePointer.captureElement.releasePointerCapture(activePointer.pointerId);
  }
}

function releaseResizePointerCapture(activeResize: ActiveArticulationResize) {
  if (activeResize.captureElement.hasPointerCapture(activeResize.pointerId)) {
    activeResize.captureElement.releasePointerCapture(activeResize.pointerId);
  }
}

function safeSetPointerCapture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Test environments can dispatch synthetic pointer events without an active pointer.
  }
}

function makeTrackKey(measureId: string, stringIndex: number) {
  return `${measureId}:${stringIndex}`;
}
