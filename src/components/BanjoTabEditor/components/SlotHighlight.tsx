import { SLOTS_PER_MEASURE } from "../constants";
import { slotToPercent } from "../geometry";

type SlotHighlightProps = {
  position: number;
};

export function SlotHighlight({ position }: SlotHighlightProps) {
  return (
    <span
      className="banjo-tab-slot-highlight"
      style={{ left: `${slotToPercent(position, SLOTS_PER_MEASURE)}%` }}
      aria-hidden="true"
    />
  );
}
