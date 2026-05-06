import { describe, expect, it } from "vitest";
import { formatTargetedArticulationParts, formatNoteLabel } from "./noteFormatting";

describe("note formatting", () => {
  it("formats plain and articulated note labels", () => {
    expect(formatNoteLabel({ id: "note-1", stringIndex: 0, position: 0, fret: 2 })).toBe("2");
    expect(formatNoteLabel({
      id: "note-2",
      stringIndex: 0,
      position: 0,
      fret: 2,
      articulation: { type: "hammer-on", targetFret: 4 },
    })).toBe("2h4");
    expect(formatNoteLabel({
      id: "note-3",
      stringIndex: 0,
      position: 0,
      fret: 4,
      articulation: { type: "pull-off", targetFret: 2 },
    })).toBe("4p2");
    expect(formatNoteLabel({
      id: "note-4",
      stringIndex: 0,
      position: 0,
      fret: 2,
      articulation: { type: "slide", targetFret: 5 },
    })).toBe("2/5");
    expect(formatNoteLabel({
      id: "note-5",
      stringIndex: 0,
      position: 0,
      fret: 5,
      articulation: { type: "slide", targetFret: 2 },
    })).toBe("5\\2");
    expect(formatNoteLabel({
      id: "note-6",
      stringIndex: 0,
      position: 0,
      fret: 7,
      articulation: { type: "bend" },
    })).toBe("7b");
    expect(formatNoteLabel({
      id: "note-7",
      stringIndex: 0,
      position: 0,
      fret: 10,
      articulation: { type: "hammer-on", targetFret: 12 },
    })).toBe("10h12");
  });

  it("returns source, operator, and target parts for targeted articulations", () => {
    expect(formatTargetedArticulationParts({
      id: "note-1",
      stringIndex: 0,
      position: 0,
      fret: 3,
      articulation: { type: "slide", targetFret: 5 },
    })).toEqual({ source: "3", operator: "/", target: "5" });

    expect(formatTargetedArticulationParts({
      id: "note-2",
      stringIndex: 0,
      position: 0,
      fret: 7,
      articulation: { type: "bend" },
    })).toBeNull();
  });
});
