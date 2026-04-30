import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { isPointInsideRect } from "../geometry";
import type { SavedTabSummary, ScreenPoint } from "../types";

type ActiveDocumentPointer = {
  document: SavedTabSummary;
  pointerId: number;
  startPoint: ScreenPoint;
  isDragging: boolean;
  longPressTimer: number | null;
  captureElement: HTMLElement;
};

export type DocumentDragState = {
  document: SavedTabSummary;
  pointer: ScreenPoint;
  pointerId: number;
  overTrash: boolean;
};

type UsePointerDocumentDragArgs = {
  onDeleteDocument: (id: string) => void;
  confirmDeleteDocument?: (document: SavedTabSummary) => boolean;
};

const DRAG_THRESHOLD_PX = 6;
const TOUCH_CANCEL_THRESHOLD_PX = 10;
const TOUCH_LONG_PRESS_MS = 350;

export function usePointerDocumentDrag({
  onDeleteDocument,
  confirmDeleteDocument = () => true,
}: UsePointerDocumentDragArgs) {
  const activePointerRef = useRef<ActiveDocumentPointer | null>(null);
  const trashElementRef = useRef<HTMLDivElement | null>(null);
  const suppressedClickDocumentIdRef = useRef<string | null>(null);
  const [dragState, setDragState] = useState<DocumentDragState | null>(null);

  const registerTrashZone = useCallback((element: HTMLDivElement | null) => {
    trashElementRef.current = element;
  }, []);

  const startDragging = useCallback(
    (activePointer: ActiveDocumentPointer, point: ScreenPoint) => {
      activePointer.isDragging = true;
      setDragState({
        document: activePointer.document,
        pointer: point,
        pointerId: activePointer.pointerId,
        overTrash: getOverTrash(point, trashElementRef.current),
      });
    },
    [],
  );

  const handleDocumentPointerDown = useCallback(
    (document: SavedTabSummary, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      const activePointer: ActiveDocumentPointer = {
        document,
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

  const handleDocumentPointerMove = useCallback(
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

      setDragState({
        document: activePointer.document,
        pointer: point,
        pointerId: activePointer.pointerId,
        overTrash: getOverTrash(point, trashElementRef.current),
      });
    },
    [startDragging],
  );

  const handleDocumentPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activePointer = activePointerRef.current;

      if (!activePointer || activePointer.pointerId !== event.pointerId) {
        return;
      }

      clearLongPressTimer(activePointer);
      releasePointerCapture(activePointer);

      if (activePointer.isDragging) {
        suppressedClickDocumentIdRef.current = activePointer.document.id;

        if (
          getOverTrash(getPointerPoint(event), trashElementRef.current) &&
          confirmDeleteDocument(activePointer.document)
        ) {
          onDeleteDocument(activePointer.document.id);
        }
      }

      activePointerRef.current = null;
      setDragState(null);
    },
    [confirmDeleteDocument, onDeleteDocument],
  );

  const cancelDragging = useCallback((event?: ReactPointerEvent<HTMLElement>) => {
    const activePointer = activePointerRef.current;

    if (!activePointer || (event && activePointer.pointerId !== event.pointerId)) {
      return;
    }

    clearLongPressTimer(activePointer);
    releasePointerCapture(activePointer);
    activePointerRef.current = null;
    setDragState(null);
  }, []);

  const shouldSuppressClick = useCallback((documentId: string) => {
    if (suppressedClickDocumentIdRef.current !== documentId) {
      return false;
    }

    suppressedClickDocumentIdRef.current = null;
    return true;
  }, []);

  return {
    dragState,
    registerTrashZone,
    documentPointerHandlers: {
      onPointerDown: handleDocumentPointerDown,
      onPointerMove: handleDocumentPointerMove,
      onPointerUp: handleDocumentPointerUp,
      onPointerCancel: cancelDragging,
      onLostPointerCapture: cancelDragging,
    },
    deleteDocumentByKeyboard: (document: SavedTabSummary) => {
      if (confirmDeleteDocument(document)) {
        onDeleteDocument(document.id);
      }
    },
    shouldSuppressClick,
  };
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

function clearLongPressTimer(activePointer: ActiveDocumentPointer) {
  if (activePointer.longPressTimer !== null) {
    window.clearTimeout(activePointer.longPressTimer);
    activePointer.longPressTimer = null;
  }
}

function releasePointerCapture(activePointer: ActiveDocumentPointer) {
  if (activePointer.captureElement.hasPointerCapture(activePointer.pointerId)) {
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
