import { describe, expect, it } from "vitest";
import { createInitialTab } from "../constants";
import {
  createDocumentSessionState,
  documentSessionReducer,
} from "./useBanjoTabDocuments";
import type { BanjoTab, BanjoTabDocument, SavedTabSummary } from "../types";

describe("useBanjoTabDocuments session state", () => {
  it("ignores stale title save completions without replacing newer tab edits", () => {
    const initialTab = createInitialTab();
    const titleSaveTab = initialTab;
    const editedTab = tabWithNote(initialTab, "note-new", 7);
    const titleSaveDocument = document("doc-1", "Cripple Creek", titleSaveTab);
    const state = documentSessionReducer(
      documentSessionReducer(createDocumentSessionState(), {
        type: "TITLE_SAVE_STARTED",
        document: titleSaveDocument,
        token: 1,
      }),
      {
        type: "TAB_CHANGED",
        tab: editedTab,
      },
    );

    const nextState = documentSessionReducer(state, {
      type: "SAVE_SUCCEEDED",
      request: { token: 1, documentRevision: 1 },
      document: titleSaveDocument,
      savedTabs: [summary(titleSaveDocument)],
    });

    expect(nextState.documentState.activeDocument.tab).toBe(editedTab);
    expect(nextState.editorState.tab).toBe(editedTab);
  });

  it("lets only the latest autosave completion update active document state", () => {
    const savedDocument = document("doc-1", "Cripple Creek", createInitialTab());
    const firstEditTab = tabWithNote(savedDocument.tab, "note-old", 2);
    const secondEditTab = tabWithNote(savedDocument.tab, "note-new", 5);
    let state = documentSessionReducer(createDocumentSessionState(), {
      type: "DOCUMENT_LOADED",
      document: savedDocument,
    });

    state = documentSessionReducer(state, {
      type: "TAB_SAVE_STARTED",
      tab: firstEditTab,
      token: 1,
    });
    state = documentSessionReducer(state, {
      type: "TAB_SAVE_STARTED",
      tab: secondEditTab,
      token: 2,
    });

    const staleCompletionState = documentSessionReducer(state, {
      type: "SAVE_SUCCEEDED",
      request: { token: 1, documentRevision: 1 },
      document: document("doc-1", "Cripple Creek", firstEditTab),
      savedTabs: [summary(savedDocument)],
    });

    expect(staleCompletionState.documentState.activeDocument.tab).toBe(secondEditTab);
    expect(staleCompletionState.editorState.tab).toBe(secondEditTab);
    expect(staleCompletionState.documentState.storageStatus).toBe("saving");

    const latestCompletionState = documentSessionReducer(staleCompletionState, {
      type: "SAVE_SUCCEEDED",
      request: { token: 2, documentRevision: 2 },
      document: document("doc-1", "Cripple Creek", secondEditTab),
      savedTabs: [summary(savedDocument)],
    });

    expect(latestCompletionState.documentState.activeDocument.tab).toBe(secondEditTab);
    expect(latestCompletionState.documentState.storageStatus).toBe("idle");
  });

  it("does not apply startup documents after the draft changed during loading", () => {
    const initialTab = createInitialTab();
    const editedTab = tabWithNote(initialTab, "note-new", 3);
    const loadedDocument = document("doc-1", "Loaded Tab", createInitialTab());
    let state = createDocumentSessionState({ tab: initialTab, mode: { type: "idle" } });

    state = documentSessionReducer(state, { type: "DOCUMENTS_LOADING" });
    state = documentSessionReducer(state, {
      type: "TAB_CHANGED",
      tab: editedTab,
    });

    const nextState = documentSessionReducer(state, {
      type: "STARTUP_DOCUMENTS_INITIALIZED",
      expectedDocumentRevision: 0,
      document: loadedDocument,
      savedTabs: [summary(loadedDocument)],
    });

    expect(nextState.documentState.activeDocument.tab).toBe(editedTab);
    expect(nextState.editorState.tab).toBe(editedTab);
    expect(nextState.documentState.activeDocument.id).toBeNull();
  });
});

function tabWithNote(tab: BanjoTab, noteId: string, fret: number): BanjoTab {
  return {
    ...tab,
    measures: [
      {
        ...tab.measures[0],
        notes: [{ id: noteId, stringIndex: 0, position: 4, fret }],
      },
    ],
  };
}

function document(id: string, title: string, tab: BanjoTab): BanjoTabDocument {
  return {
    id,
    title,
    tab,
    createdAt: "2026-04-29T12:00:00.000Z",
    updatedAt: "2026-04-29T12:00:00.000Z",
  };
}

function summary(document: BanjoTabDocument): SavedTabSummary {
  return {
    id: document.id,
    title: document.title,
    updatedAt: document.updatedAt,
  };
}
