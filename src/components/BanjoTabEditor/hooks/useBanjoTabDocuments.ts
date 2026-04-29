import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  createDraftDocument,
  documentReducer,
  isUnsavedMeaningfulDraft,
  normalizeDocumentTitle,
} from "../documentReducer";
import {
  getMostRecentTab,
  getSavedTab,
  listSavedTabs,
  markOpened,
  saveTab,
} from "../savedTabsRepository";
import { banjoTabReducer, createInitialEditorState } from "../tabReducer";
import type {
  BanjoTab,
  BanjoTabDocument,
  BanjoTabDocumentState,
  BanjoTabEditorState,
  EditableBanjoTabDocument,
  EditorMode,
  SavedTabSummary,
} from "../types";
import type { BanjoTabAction } from "../tabReducer";

type UseBanjoTabDocumentsResult = {
  documentState: BanjoTabDocumentState;
  editorState: BanjoTabEditorState;
  commitTitle: (title: string) => Promise<void>;
  dispatchTabAction: (action: BanjoTabAction) => void;
  loadDocument: (id: string) => Promise<void>;
  startNewDraft: () => void;
  shouldConfirmDiscard: boolean;
};

type SaveRequest = {
  token: number;
  documentRevision: number;
};

type DocumentSessionState = {
  documentState: BanjoTabDocumentState;
  editorState: BanjoTabEditorState;
  documentRevision: number;
  latestSaveToken: number;
};

type DocumentSessionAction =
  | { type: "DOCUMENTS_LOADING" }
  | {
      type: "STARTUP_DOCUMENTS_INITIALIZED";
      expectedDocumentRevision: number;
      document: EditableBanjoTabDocument;
      savedTabs: SavedTabSummary[];
      mode?: EditorMode;
    }
  | { type: "TITLE_SAVE_STARTED"; document: BanjoTabDocument; token: number }
  | { type: "TAB_CHANGED"; tab: BanjoTab }
  | { type: "TAB_SAVE_STARTED"; tab: BanjoTab; token: number }
  | {
      type: "SAVE_SUCCEEDED";
      request: SaveRequest;
      document: BanjoTabDocument;
      savedTabs: SavedTabSummary[];
    }
  | { type: "SAVE_FAILED"; request: SaveRequest; message: string }
  | { type: "DOCUMENT_LOADED"; document: BanjoTabDocument }
  | { type: "SAVED_TABS_LOADED"; savedTabs: SavedTabSummary[] }
  | { type: "NEW_DRAFT_STARTED" }
  | { type: "EDITOR_STATE_REPLACED"; state: BanjoTabEditorState }
  | { type: "STORAGE_FAILED"; message: string };

export function useBanjoTabDocuments(
  initialState?: BanjoTabEditorState,
): UseBanjoTabDocumentsResult {
  const [sessionState, baseDispatchSession] = useReducer(
    documentSessionReducer,
    initialState,
    createDocumentSessionState,
  );
  const sessionStateRef = useRef(sessionState);
  const nextSaveTokenRef = useRef(0);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  const dispatchSessionAction = useCallback((action: DocumentSessionAction) => {
    const nextState = documentSessionReducer(sessionStateRef.current, action);
    sessionStateRef.current = nextState;
    baseDispatchSession(action);
    return nextState;
  }, []);
  const getSessionState = useCallback(() => sessionStateRef.current, []);

  const persistDocument = useCallback(
    async (
      document: BanjoTabDocument,
      request: SaveRequest,
      fallbackMessage: string,
    ) => {
      try {
        const savedDocument = await saveTab(document);
        const savedTabs = await listSavedTabs();
        dispatchSessionAction({
          type: "SAVE_SUCCEEDED",
          request,
          document: savedDocument,
          savedTabs,
        });
      } catch (error) {
        dispatchSessionAction({
          type: "SAVE_FAILED",
          request,
          message: getStorageErrorMessage(error, fallbackMessage),
        });
      }
    },
    [dispatchSessionAction],
  );

  const commitTitle = useCallback(
    async (title: string) => {
      const activeDocument = sessionStateRef.current.documentState.activeDocument;
      const normalizedTitle = normalizeDocumentTitle(title);
      const now = new Date().toISOString();
      const token = getNextSaveToken(nextSaveTokenRef);
      const documentToSave: BanjoTabDocument =
        activeDocument.id === null
          ? {
              id: crypto.randomUUID(),
              title: normalizedTitle,
              tab: sessionStateRef.current.editorState.tab,
              createdAt: now,
              updatedAt: now,
            }
          : {
              ...activeDocument,
              title: normalizedTitle,
              tab: sessionStateRef.current.editorState.tab,
              updatedAt: now,
            };

      const nextState = dispatchSessionAction({
        type: "TITLE_SAVE_STARTED",
        document: documentToSave,
        token,
      });
      await persistDocument(
        documentToSave,
        { token, documentRevision: nextState.documentRevision },
        "Unable to save tab title",
      );
    },
    [dispatchSessionAction, persistDocument],
  );

  const dispatchTabAction = useCallback(
    (action: BanjoTabAction) => {
      const previousEditorState = sessionStateRef.current.editorState;
      const nextEditorState = banjoTabReducer(previousEditorState, action);

      if (nextEditorState.tab === previousEditorState.tab) {
        dispatchSessionAction({
          type: "EDITOR_STATE_REPLACED",
          state: nextEditorState,
        });
        return;
      }

      const activeDocument = sessionStateRef.current.documentState.activeDocument;

      if (activeDocument.id === null) {
        dispatchSessionAction({ type: "TAB_CHANGED", tab: nextEditorState.tab });
        return;
      }

      const token = getNextSaveToken(nextSaveTokenRef);
      const nextState = dispatchSessionAction({
        type: "TAB_SAVE_STARTED",
        tab: nextEditorState.tab,
        token,
      });

      void persistDocument(
        {
          ...activeDocument,
          tab: nextEditorState.tab,
          updatedAt: new Date().toISOString(),
        },
        { token, documentRevision: nextState.documentRevision },
        "Unable to autosave tab changes",
      );
    },
    [dispatchSessionAction, persistDocument],
  );

  const loadDocument = useCallback(
    async (id: string) => {
      dispatchSessionAction({ type: "DOCUMENTS_LOADING" });

      try {
        const document = await getSavedTab(id);

        if (!document) {
          dispatchSessionAction({
            type: "STORAGE_FAILED",
            message: "Saved tab not found",
          });
          return;
        }

        await markOpened(id);
        const savedTabs = await listSavedTabs();

        dispatchSessionAction({ type: "DOCUMENT_LOADED", document });
        dispatchSessionAction({ type: "SAVED_TABS_LOADED", savedTabs });
      } catch (error) {
        dispatchSessionAction({
          type: "STORAGE_FAILED",
          message: getStorageErrorMessage(error, "Unable to load saved tab"),
        });
      }
    },
    [dispatchSessionAction],
  );

  const startNewDraft = useCallback(() => {
    dispatchSessionAction({ type: "NEW_DRAFT_STARTED" });
  }, [dispatchSessionAction]);

  useMountDocuments({
    dispatchSessionAction,
    getSessionState,
  });

  return {
    documentState: sessionState.documentState,
    editorState: sessionState.editorState,
    commitTitle,
    dispatchTabAction,
    loadDocument,
    startNewDraft,
    shouldConfirmDiscard: isUnsavedMeaningfulDraft(
      sessionState.documentState.activeDocument,
    ),
  };
}

export function createDocumentSessionState(
  initialState?: BanjoTabEditorState,
): DocumentSessionState {
  const editorState = initialState ?? createInitialEditorState();

  return {
    documentState: createInitialDocumentState(editorState.tab),
    editorState,
    documentRevision: 0,
    latestSaveToken: 0,
  };
}

export function documentSessionReducer(
  state: DocumentSessionState,
  action: DocumentSessionAction,
): DocumentSessionState {
  switch (action.type) {
    case "DOCUMENTS_LOADING":
      return {
        ...state,
        documentState: documentReducer(state.documentState, {
          type: "DOCUMENTS_LOADING",
        }),
      };

    case "STARTUP_DOCUMENTS_INITIALIZED":
      if (state.documentRevision !== action.expectedDocumentRevision) {
        return state;
      }

      return {
        ...state,
        documentState: documentReducer(state.documentState, {
          type: "DOCUMENTS_INITIALIZED",
          document: action.document,
          savedTabs: action.savedTabs,
        }),
        editorState: replaceEditorTab(state.editorState, action.document.tab, action.mode),
        documentRevision: 0,
      };

    case "TITLE_SAVE_STARTED":
      return {
        ...state,
        documentState: {
          ...state.documentState,
          activeDocument: action.document,
          storageStatus: "saving",
          storageError: null,
        },
        documentRevision: state.documentRevision + 1,
        latestSaveToken: action.token,
      };

    case "TAB_CHANGED":
      return applyTabChange(state, action.tab);

    case "TAB_SAVE_STARTED":
      return {
        ...applyTabChange(state, action.tab),
        latestSaveToken: action.token,
      };

    case "SAVE_SUCCEEDED":
      if (action.request.token !== state.latestSaveToken) {
        return state;
      }

      if (action.request.documentRevision !== state.documentRevision) {
        return {
          ...state,
          documentState: {
            ...state.documentState,
            storageStatus: "idle",
          },
        };
      }

      return {
        ...state,
        documentState: documentReducer(state.documentState, {
          type: "DOCUMENT_PERSISTED",
          document: action.document,
          savedTabs: action.savedTabs,
        }),
      };

    case "SAVE_FAILED":
      if (
        action.request.token !== state.latestSaveToken ||
        action.request.documentRevision !== state.documentRevision
      ) {
        return state;
      }

      return {
        ...state,
        documentState: documentReducer(state.documentState, {
          type: "STORAGE_FAILED",
          message: action.message,
        }),
      };

    case "DOCUMENT_LOADED":
      return {
        ...state,
        documentState: documentReducer(state.documentState, {
          type: "DOCUMENT_LOADED",
          document: action.document,
        }),
        editorState: replaceEditorTab(state.editorState, action.document.tab, {
          type: "idle",
        }),
        documentRevision: 0,
      };

    case "SAVED_TABS_LOADED":
      return {
        ...state,
        documentState: documentReducer(state.documentState, {
          type: "SAVED_TABS_LOADED",
          savedTabs: action.savedTabs,
        }),
      };

    case "NEW_DRAFT_STARTED": {
      const draftDocument = createDraftDocument();

      return {
        ...state,
        documentState: {
          ...state.documentState,
          activeDocument: draftDocument,
          storageStatus: "idle",
          storageError: null,
        },
        editorState: replaceEditorTab(state.editorState, draftDocument.tab, {
          type: "idle",
        }),
        documentRevision: 0,
      };
    }

    case "EDITOR_STATE_REPLACED":
      return {
        ...state,
        editorState: action.state,
      };

    case "STORAGE_FAILED":
      return {
        ...state,
        documentState: documentReducer(state.documentState, {
          type: "STORAGE_FAILED",
          message: action.message,
        }),
      };
  }
}

function applyTabChange(
  state: DocumentSessionState,
  tab: BanjoTab,
): DocumentSessionState {
  return {
    ...state,
    documentState: documentReducer(state.documentState, {
      type: "TAB_CHANGED",
      tab,
    }),
    editorState: replaceEditorTab(state.editorState, tab),
    documentRevision: state.documentRevision + 1,
  };
}

function createInitialDocumentState(initialTab: BanjoTab) {
  return {
    activeDocument: {
      ...createDraftDocument(),
      tab: initialTab,
    },
    savedTabs: [],
    storageStatus: "idle" as const,
    storageError: null,
  };
}

function createDraftDocumentWithTab(tab: BanjoTab) {
  return {
    ...createDraftDocument(),
    tab,
  };
}

function replaceEditorTab(
  state: BanjoTabEditorState,
  tab: BanjoTab,
  mode?: EditorMode,
): BanjoTabEditorState {
  return {
    ...state,
    tab,
    mode: mode ?? state.mode,
  };
}

function getNextSaveToken(ref: { current: number }): number {
  ref.current += 1;
  return ref.current;
}

function useMountDocuments({
  dispatchSessionAction,
  getSessionState,
}: {
  dispatchSessionAction: (action: DocumentSessionAction) => DocumentSessionState;
  getSessionState: () => DocumentSessionState;
}) {
  useEffect(() => {
    let isActive = true;
    const expectedDocumentRevision = getSessionState().documentRevision;
    const initialTab = getSessionState().editorState.tab;

    dispatchSessionAction({ type: "DOCUMENTS_LOADING" });

    void Promise.all([listSavedTabs(), getMostRecentTab()])
      .then(([savedTabs, mostRecentDocument]) => {
        if (
          !isActive ||
          getSessionState().documentRevision !== expectedDocumentRevision
        ) {
          return;
        }

        const document = mostRecentDocument ?? createDraftDocumentWithTab(initialTab);
        dispatchSessionAction({
          type: "STARTUP_DOCUMENTS_INITIALIZED",
          expectedDocumentRevision,
          document,
          savedTabs,
          mode: mostRecentDocument ? { type: "idle" } : undefined,
        });
      })
      .catch((error) => {
        if (
          !isActive ||
          getSessionState().documentRevision !== expectedDocumentRevision
        ) {
          return;
        }

        dispatchSessionAction({
          type: "STORAGE_FAILED",
          message: getStorageErrorMessage(error, "Unable to load saved tabs"),
        });
      });

    return () => {
      isActive = false;
    };
  }, [dispatchSessionAction, getSessionState]);
}

function getStorageErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallbackMessage;
}
