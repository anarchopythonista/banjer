import { useCallback, useRef } from "react";
import type { Dispatch, PointerEvent as ReactPointerEvent } from "react";
import {
  findMeasureDropIndexFromPoint,
  isPointInsideRect,
  type MeasureGeometry,
} from "../geometry";
import type { BanjoTabAction } from "../tabReducer";
import type { BanjoTabEditorState, ScreenPoint } from "../types";

type ActiveMeasurePointer = {
  measureId: string;
  originIndex: number;
  pointerId: number;
  startPoint: ScreenPoint;
  isDragging: boolean;
  longPressTimer: number | null;
  captureElement: HTMLElement;
};

type UsePointerMeasureDragArgs = {
  state: BanjoTabEditorState;
  dispatch: Dispatch<BanjoTabAction>;
};

const DRAG_THRESHOLD_PX = 6;
const TOUCH_CANCEL_THRESHOLD_PX = 10;
const TOUCH_LONG_PRESS_MS = 350;

export function usePointerMeasureDrag({ state, dispatch }: UsePointerMeasureDragArgs) {
  const activePointerRef = useRef<ActiveMeasurePointer | null>(null);
  const measureElementsRef = useRef(new Map<string, HTMLElement>());
  const trashElementRef = useRef<HTMLDivElement | null>(null);

  const registerMeasure = useCallback((measureId: string, element: HTMLElement | null) => {
    if (element) {
      measureElementsRef.current.set(measureId, element);
    } else {
      measureElementsRef.current.delete(measureId);
    }
  }, []);

  const registerTrashZone = useCallback((element: HTMLDivElement | null) => {
    trashElementRef.current = element;
  }, []);

  const startDragging = useCallback(
    (activePointer: ActiveMeasurePointer, point: ScreenPoint) => {
      activePointer.isDragging = true;
      dispatch({
        type: "SET_EDITOR_MODE",
        mode: {
          type: "dragging-measure",
          measureId: activePointer.measureId,
          originIndex: activePointer.originIndex,
          currentTargetIndex: getMeasureDropIndex(point, measureElementsRef.current),
          pointer: point,
          pointerId: activePointer.pointerId,
          overTrash: getOverTrash(point, trashElementRef.current),
        },
      });
    },
    [dispatch],
  );

  const handleMeasurePointerDown = useCallback(
    (measureId: string, measureIndex: number, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      const activePointer: ActiveMeasurePointer = {
        measureId,
        originIndex: measureIndex,
        pointerId: event.pointerId,
        startPoint: getPointerPoint(event),
        isDragging: false,
        longPressTimer: null,
        captureElement: event.currentTarget,
      };

      safeSetPointerCapture(event.currentTarget, event.pointerId);

      if (event.pointerType === "touch") {
        activePointer.longPressTimer = window.setTimeout(() => {
          startDragging(activePointer, activePointer.startPoint);
        }, TOUCH_LONG_PRESS_MS);
      }

      activePointerRef.current = activePointer;
    },
    [startDragging],
  );

  const handleMeasurePointerMove = useCallback(
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
          type: "dragging-measure",
          measureId: activePointer.measureId,
          originIndex: activePointer.originIndex,
          currentTargetIndex: getMeasureDropIndex(point, measureElementsRef.current),
          pointer: point,
          pointerId: activePointer.pointerId,
          overTrash: getOverTrash(point, trashElementRef.current),
        },
      });
    },
    [dispatch, startDragging],
  );

  const handleMeasurePointerUp = useCallback(
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
        const rawTargetIndex = getMeasureDropIndex(point, measureElementsRef.current);

        if (overTrash) {
          dispatch({ type: "DELETE_MEASURE", measureId: activePointer.measureId });
        } else if (rawTargetIndex !== null) {
          dispatch({
            type: "MOVE_MEASURE",
            measureId: activePointer.measureId,
            targetIndex: toPostRemovalIndex(activePointer.originIndex, rawTargetIndex),
          });
        }

        dispatch({ type: "SET_EDITOR_MODE", mode: { type: "idle" } });
      }

      activePointerRef.current = null;
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
      }

      activePointerRef.current = null;
    },
    [dispatch],
  );

  const moveMeasureByKeyboard = useCallback(
    (measureId: string, measureIndex: number, direction: "up" | "down") => {
      const targetIndex =
        direction === "up"
          ? Math.max(measureIndex - 1, 0)
          : Math.min(measureIndex + 1, state.tab.measures.length - 1);

      dispatch({ type: "MOVE_MEASURE", measureId, targetIndex });
    },
    [dispatch, state.tab.measures.length],
  );

  return {
    registerMeasure,
    registerTrashZone,
    measurePointerHandlers: {
      onPointerDown: handleMeasurePointerDown,
      onPointerMove: handleMeasurePointerMove,
      onPointerUp: handleMeasurePointerUp,
      onPointerCancel: cancelDragging,
      onLostPointerCapture: cancelDragging,
    },
    moveMeasureByKeyboard,
    deleteMeasureByKeyboard: (measureId: string) => dispatch({ type: "DELETE_MEASURE", measureId }),
  };
}

function getMeasureDropIndex(
  point: ScreenPoint,
  measureElements: Map<string, HTMLElement>,
): number | null {
  const measures: MeasureGeometry[] = Array.from(measureElements.entries()).map(([measureId, element]) => ({
    measureId,
    rect: element.getBoundingClientRect(),
  }));

  return findMeasureDropIndexFromPoint(point, measures);
}

function getOverTrash(point: ScreenPoint, trashElement: HTMLDivElement | null): boolean {
  return trashElement ? isPointInsideRect(point, trashElement.getBoundingClientRect()) : false;
}

function getPointerPoint(event: ReactPointerEvent<HTMLElement>): ScreenPoint {
  return { x: event.clientX, y: event.clientY };
}

function getDistance(start: ScreenPoint, current: ScreenPoint): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

function clearLongPressTimer(activePointer: ActiveMeasurePointer) {
  if (activePointer.longPressTimer !== null) {
    window.clearTimeout(activePointer.longPressTimer);
    activePointer.longPressTimer = null;
  }
}

function releasePointerCapture(activePointer: ActiveMeasurePointer) {
  if (
    activePointer.captureElement.hasPointerCapture(activePointer.pointerId)
  ) {
    activePointer.captureElement.releasePointerCapture(activePointer.pointerId);
  }
}

function safeSetPointerCapture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Test environments can dispatch synthetic pointer events without an active pointer.
  }
}

function toPostRemovalIndex(sourceIndex: number, rawTargetIndex: number) {
  return rawTargetIndex > sourceIndex ? rawTargetIndex - 1 : rawTargetIndex;
}
