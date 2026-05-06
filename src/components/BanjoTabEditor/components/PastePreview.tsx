import { SLOTS_PER_MEASURE } from "../constants";
import { slotToPercent } from "../geometry";
import { formatNoteLabel } from "../noteFormatting";
import { clampPasteStart } from "../selection";
import type { CopiedNoteSelection, PasteTarget } from "../types";
import { SlotHighlight } from "./SlotHighlight";

type PastePreviewProps = {
  measureId: string;
  stringIndex: number;
  copiedSelection: CopiedNoteSelection | null;
  target: PasteTarget | null;
};

export function PastePreview({
  measureId,
  stringIndex,
  copiedSelection,
  target,
}: PastePreviewProps) {
  if (!copiedSelection || !target || target.measureId !== measureId) {
    return null;
  }

  const targetStart = clampPasteStart(target.position, copiedSelection, SLOTS_PER_MEASURE);
  const notes = copiedSelection.notes.filter((note) => note.stringIndex === stringIndex);

  return (
    <>
      <SlotHighlight position={targetStart} />
      {notes.map((note) => {
        const position = targetStart + note.positionOffset;
        return (
          <span
            key={`${stringIndex}-${note.positionOffset}-${note.fret}`}
            className="banjo-tab-note banjo-tab-note--paste-preview"
            style={{ left: `${slotToPercent(position, SLOTS_PER_MEASURE)}%` }}
            aria-hidden="true"
          >
            {formatNoteLabel({
              id: "preview",
              stringIndex: note.stringIndex,
              position,
              fret: note.fret,
              ...(note.durationSlots !== undefined ? { durationSlots: note.durationSlots } : {}),
              ...(note.articulation ? { articulation: note.articulation } : {}),
            })}
          </span>
        );
      })}
    </>
  );
}
