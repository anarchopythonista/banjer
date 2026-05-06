import type { TabNoteData } from "./types";

export type TargetedArticulationParts = {
  source: string;
  operator: "h" | "p" | "/" | "\\";
  target: string;
};

export function formatNoteLabel(note: TabNoteData): string {
  const source = String(note.fret);

  switch (note.articulation?.type) {
    case "hammer-on":
      return `${source}h${note.articulation.targetFret}`;
    case "pull-off":
      return `${source}p${note.articulation.targetFret}`;
    case "slide":
      return note.articulation.targetFret > note.fret
        ? `${source}/${note.articulation.targetFret}`
        : `${source}\\${note.articulation.targetFret}`;
    case "bend":
      return `${source}b`;
    case undefined:
      return source;
  }
}

export function formatTargetedArticulationParts(
  note: TabNoteData,
): TargetedArticulationParts | null {
  const source = String(note.fret);

  switch (note.articulation?.type) {
    case "hammer-on":
      return { source, operator: "h", target: String(note.articulation.targetFret) };
    case "pull-off":
      return { source, operator: "p", target: String(note.articulation.targetFret) };
    case "slide":
      return {
        source,
        operator: note.articulation.targetFret > note.fret ? "/" : "\\",
        target: String(note.articulation.targetFret),
      };
    case "bend":
    case undefined:
      return null;
  }
}
