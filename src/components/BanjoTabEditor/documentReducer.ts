import { createInitialTab } from "./constants";
import type {
  BanjoTab,
  BanjoTabDocument,
  BanjoTabDocumentState,
  EditableBanjoTabDocument,
  SavedTabSummary,
} from "./types";

export const UNTITLED_DOCUMENT_TITLE = "Untitled";

export type BanjoTabDocumentAction =
  | { type: "DOCUMENTS_LOADING" }
  | {
      type: "DOCUMENTS_INITIALIZED";
      document: EditableBanjoTabDocument;
      savedTabs: SavedTabSummary[];
    }
  | { type: "TITLE_COMMITTED"; title: string }
  | { type: "TAB_CHANGED"; tab: BanjoTab }
  | {
      type: "DOCUMENT_PERSISTED";
      document: BanjoTabDocument;
      savedTabs: SavedTabSummary[];
    }
  | { type: "DOCUMENT_LOADED"; document: BanjoTabDocument }
  | { type: "SAVED_TABS_LOADED"; savedTabs: SavedTabSummary[] }
  | { type: "NEW_DRAFT_STARTED" }
  | { type: "STORAGE_FAILED"; message: string };

export function createDraftDocumentState(): BanjoTabDocumentState {
  return {
    activeDocument: createDraftDocument(),
    savedTabs: [],
    storageStatus: "idle",
    storageError: null,
  };
}

export function createDraftDocument(): EditableBanjoTabDocument {
  return {
    id: null,
    title: UNTITLED_DOCUMENT_TITLE,
    tab: createInitialTab(),
    createdAt: null,
    updatedAt: null,
  };
}

export function documentReducer(
  state: BanjoTabDocumentState,
  action: BanjoTabDocumentAction,
): BanjoTabDocumentState {
  switch (action.type) {
    case "DOCUMENTS_LOADING":
      return { ...state, storageStatus: "loading", storageError: null };

    case "DOCUMENTS_INITIALIZED":
      return {
        activeDocument: action.document,
        savedTabs: action.savedTabs,
        storageStatus: "idle",
        storageError: null,
      };

    case "TITLE_COMMITTED":
      return {
        ...state,
        activeDocument: {
          ...state.activeDocument,
          title: normalizeDocumentTitle(action.title),
        },
        storageStatus: "saving",
        storageError: null,
      };

    case "TAB_CHANGED":
      return {
        ...state,
        activeDocument: {
          ...state.activeDocument,
          tab: action.tab,
        },
        storageStatus: "saving",
        storageError: null,
      };

    case "DOCUMENT_PERSISTED":
      return {
        ...state,
        activeDocument: action.document,
        savedTabs: action.savedTabs,
        storageStatus: "idle",
        storageError: null,
      };

    case "DOCUMENT_LOADED":
      return {
        ...state,
        activeDocument: action.document,
        storageStatus: "idle",
        storageError: null,
      };

    case "SAVED_TABS_LOADED":
      return {
        ...state,
        savedTabs: action.savedTabs,
      };

    case "NEW_DRAFT_STARTED":
      return {
        ...state,
        activeDocument: createDraftDocument(),
        storageStatus: "idle",
        storageError: null,
      };

    case "STORAGE_FAILED":
      return {
        ...state,
        storageStatus: "error",
        storageError: action.message,
      };
  }
}

export function normalizeDocumentTitle(title: string): string {
  return title.trim() || UNTITLED_DOCUMENT_TITLE;
}

export function isUnsavedMeaningfulDraft(
  document: EditableBanjoTabDocument,
): boolean {
  if (document.id !== null) {
    return false;
  }

  if (document.tab.measures.length !== 1) {
    return true;
  }

  return (
    document.title !== UNTITLED_DOCUMENT_TITLE ||
    document.tab.measures[0]?.notes.length !== 0
  );
}
