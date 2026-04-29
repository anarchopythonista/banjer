import { describe, expect, it } from "vitest";
import { createInitialTab } from "./constants";
import {
  createDraftDocumentState,
  documentReducer,
  isUnsavedMeaningfulDraft,
  normalizeDocumentTitle,
} from "./documentReducer";
import type { BanjoTabDocument, SavedTabSummary } from "./types";

describe("documentReducer", () => {
  it("normalizes empty titles to Untitled", () => {
    expect(normalizeDocumentTitle("  ")).toBe("Untitled");
    expect(normalizeDocumentTitle(" Foggy Mountain ")).toBe("Foggy Mountain");
  });

  it("starts with an unsaved untitled draft", () => {
    const state = createDraftDocumentState();

    expect(state.activeDocument).toMatchObject({
      id: null,
      title: "Untitled",
      createdAt: null,
      updatedAt: null,
    });
    expect(state.savedTabs).toEqual([]);
    expect(state.storageStatus).toBe("idle");
  });

  it("commits a title on an unsaved draft without creating an id in the reducer", () => {
    const state = documentReducer(createDraftDocumentState(), {
      type: "TITLE_COMMITTED",
      title: "Cripple Creek",
    });

    expect(state.activeDocument).toMatchObject({
      id: null,
      title: "Cripple Creek",
    });
    expect(state.storageStatus).toBe("saving");
  });

  it("updates the active saved document after persistence succeeds", () => {
    const savedDocument = document("doc-1", "Cripple Creek");
    const summary: SavedTabSummary = {
      id: "doc-1",
      title: "Cripple Creek",
      updatedAt: savedDocument.updatedAt,
    };

    const state = documentReducer(createDraftDocumentState(), {
      type: "DOCUMENT_PERSISTED",
      document: savedDocument,
      savedTabs: [summary],
    });

    expect(state.activeDocument).toEqual({
      ...savedDocument,
      id: "doc-1",
    });
    expect(state.savedTabs).toEqual([summary]);
    expect(state.storageStatus).toBe("idle");
  });

  it("loads a saved document and marks it idle", () => {
    const savedDocument = document("doc-2", "Foggy Mountain");

    const state = documentReducer(createDraftDocumentState(), {
      type: "DOCUMENT_LOADED",
      document: savedDocument,
    });

    expect(state.activeDocument.id).toBe("doc-2");
    expect(state.activeDocument.title).toBe("Foggy Mountain");
    expect(state.storageStatus).toBe("idle");
  });

  it("resets to a fresh draft for New file", () => {
    const loadedState = documentReducer(createDraftDocumentState(), {
      type: "DOCUMENT_LOADED",
      document: document("doc-3", "Old Joe Clark"),
    });

    const state = documentReducer(loadedState, { type: "NEW_DRAFT_STARTED" });

    expect(state.activeDocument).toMatchObject({
      id: null,
      title: "Untitled",
      createdAt: null,
      updatedAt: null,
    });
    expect(state.activeDocument.tab.measures).toHaveLength(1);
    expect(state.activeDocument.tab.measures[0].notes).toEqual([]);
  });

  it("detects meaningful unsaved drafts", () => {
    const emptyDraft = createDraftDocumentState().activeDocument;
    const draftWithNote = {
      ...emptyDraft,
      tab: {
        ...emptyDraft.tab,
        measures: [
          {
            ...emptyDraft.tab.measures[0],
            notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
          },
        ],
      },
    };
    const draftWithExtraMeasure = {
      ...emptyDraft,
      tab: {
        ...emptyDraft.tab,
        measures: [
          emptyDraft.tab.measures[0],
          { id: "measure-2", beats: 4, subdivision: 4, notes: [] },
        ],
      },
    };

    expect(isUnsavedMeaningfulDraft(emptyDraft)).toBe(false);
    expect(isUnsavedMeaningfulDraft(draftWithNote)).toBe(true);
    expect(isUnsavedMeaningfulDraft(draftWithExtraMeasure)).toBe(true);
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
