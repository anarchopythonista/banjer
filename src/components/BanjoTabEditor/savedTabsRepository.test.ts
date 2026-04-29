import { describe, expect, it } from "vitest";
import { createInitialTab } from "./constants";
import {
  fromSavedTabRecord,
  sortSavedTabSummaries,
  toSavedTabRecord,
  toSavedTabSummary,
} from "./savedTabsRepository";
import type { BanjoTabDocument, SavedTabSummary } from "./types";

describe("savedTabsRepository helpers", () => {
  it("converts documents to versioned IndexedDB records", () => {
    const record = toSavedTabRecord(
      document("doc-1", "Cripple Creek"),
      "2026-04-29T12:05:00.000Z",
    );

    expect(record).toMatchObject({
      id: "doc-1",
      title: "Cripple Creek",
      schemaVersion: 1,
      lastOpenedAt: "2026-04-29T12:05:00.000Z",
    });
  });

  it("converts records back to documents without storage metadata", () => {
    const savedDocument = document("doc-1", "Cripple Creek");
    const record = toSavedTabRecord(savedDocument, "2026-04-29T12:05:00.000Z");

    expect(fromSavedTabRecord(record)).toEqual(savedDocument);
  });

  it("creates saved tab summaries", () => {
    expect(toSavedTabSummary(document("doc-1", "Cripple Creek"))).toEqual({
      id: "doc-1",
      title: "Cripple Creek",
      updatedAt: "2026-04-29T12:00:00.000Z",
    });
  });

  it("sorts summaries by most recently updated first", () => {
    const summaries: SavedTabSummary[] = [
      {
        id: "doc-1",
        title: "Older",
        updatedAt: "2026-04-29T12:00:00.000Z",
      },
      {
        id: "doc-2",
        title: "Newer",
        updatedAt: "2026-04-29T12:10:00.000Z",
      },
    ];

    expect(sortSavedTabSummaries(summaries).map((summary) => summary.id)).toEqual(
      ["doc-2", "doc-1"],
    );
  });
});

function document(id: string, title: string): BanjoTabDocument {
  return {
    id,
    title,
    tab: createInitialTab(),
    createdAt: "2026-04-29T12:00:00.000Z",
    updatedAt: "2026-04-29T12:00:00.000Z",
  };
}
