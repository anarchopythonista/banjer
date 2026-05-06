import { SLOTS_PER_MEASURE } from "../constants";
import { slotRangeToPercentBounds } from "../selection";
import type { SelectionBounds } from "../types";

type SelectionRegionOverlayProps = {
  bounds: SelectionBounds;
  stringIndex: number;
};

export function SelectionRegionOverlay({ bounds, stringIndex }: SelectionRegionOverlayProps) {
  if (stringIndex < bounds.minStringIndex || stringIndex > bounds.maxStringIndex) {
    return null;
  }

  const percentBounds = slotRangeToPercentBounds(
    bounds.minPosition,
    bounds.maxPosition,
    SLOTS_PER_MEASURE,
  );

  return (
    <span
      className="banjo-tab-selection-region"
      style={{
        left: `${percentBounds.left}%`,
        width: `${percentBounds.width}%`,
      }}
      aria-hidden="true"
    />
  );
}
