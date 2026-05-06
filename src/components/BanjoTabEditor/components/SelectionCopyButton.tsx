import { SLOTS_PER_MEASURE } from "../constants";
import { slotRangeToPercentBounds } from "../selection";
import type { SelectionBounds } from "../types";

type SelectionCopyButtonProps = {
  bounds: SelectionBounds;
  onCopy: () => void;
};

export function SelectionCopyButton({ bounds, onCopy }: SelectionCopyButtonProps) {
  const percentBounds = slotRangeToPercentBounds(
    bounds.minPosition,
    bounds.maxPosition,
    SLOTS_PER_MEASURE,
  );
  const left = Math.min(percentBounds.left + percentBounds.width, 96);

  return (
    <button
      type="button"
      className="banjo-tab-selection-copy-button"
      style={{
        left: `${left}%`,
      }}
      aria-label="Copy selected notes"
      onClick={onCopy}
    >
      Copy
    </button>
  );
}
