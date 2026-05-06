import type { MouseEvent, PointerEvent } from "react";
import { SLOTS_PER_MEASURE } from "../constants";
import { slotRangeToPercentBounds } from "../selection";
import type { SelectionBounds } from "../types";

type SelectionCopyButtonProps = {
  bounds: SelectionBounds;
  onCopy: () => void;
  onCopyPointerDown: (bounds: SelectionBounds, event: PointerEvent<HTMLButtonElement>) => void;
  onCopyPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onCopyPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onCopyPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onCopyLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => void;
};

export function SelectionCopyButton({
  bounds,
  onCopy,
  onCopyPointerDown,
  onCopyPointerMove,
  onCopyPointerUp,
  onCopyPointerCancel,
  onCopyLostPointerCapture,
}: SelectionCopyButtonProps) {
  const percentBounds = slotRangeToPercentBounds(
    bounds.minPosition,
    bounds.maxPosition,
    SLOTS_PER_MEASURE,
  );
  const left = Math.min(percentBounds.left + percentBounds.width, 96);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onCopy();
  };

  return (
    <button
      type="button"
      className="banjo-tab-selection-copy-button"
      style={{
        left: `${left}%`,
      }}
      aria-label="Copy selected notes"
      onClick={handleClick}
      onPointerDown={(event) => onCopyPointerDown(bounds, event)}
      onPointerMove={onCopyPointerMove}
      onPointerUp={onCopyPointerUp}
      onPointerCancel={onCopyPointerCancel}
      onLostPointerCapture={onCopyLostPointerCapture}
    >
      Copy
    </button>
  );
}
