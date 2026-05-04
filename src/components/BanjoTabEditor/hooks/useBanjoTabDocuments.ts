import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  createDraftDocument,
  documentReducer,
  isUnsavedMeaningfulDraft,
  normalizeDocumentTitle,
} from "../documentReducer";
import { createDocumentId } from "../documentId";
import {
  getMostRecentTab,
  getSavedTab,
  deleteSavedTab,
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
  undoTabChange: () => void;
  redoTabChange: () => void;
  deleteDocument: (id: string) => Promise<void>;
  loadDocument: (id: string) => Promise<void>;
  startNewDraft: () => void;
  canUndo: boolean;
  canRedo: boolean;
  shouldConfirmDiscard: boolean;
};

type SaveRequest = {
  token: number;
  documentRevision: number;
};

type DocumentSessionState = {
  documentState: BanjoTabDocumentState;
  editorState: BanjoTabEditorState;
  undoStack: BanjoTab[];
  redoStack: BanjoTab[];
  canUndo: boolean;
  canRedo: boolean;
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
  | { type: "UNDO_TAB_CHANGE" }
  | { type: "REDO_TAB_CHANGE" }
  | { type: "UNDO_TAB_SAVE_STARTED"; tab: BanjoTab; token: number }
  | { type: "REDO_TAB_SAVE_STARTED"; tab: BanjoTab; token: number }
  | {
      type: "SAVE_SUCCEEDED";
      request: SaveRequest;
      document: BanjoTabDocument;
      savedTabs: SavedTabSummary[];
    }
  | { type: "SAVE_FAILED"; request: SaveRequest; message: string }
  | { type: "DOCUMENT_LOADED"; document: BanjoTabDocument }
  | { type: "DOCUMENT_DELETE_STARTED" }
  | {
      type: "DOCUMENT_DELETE_SUCCEEDED";
      deletedId: string;
      nextDocument: EditableBanjoTabDocument;
      savedTabs: SavedTabSummary[];
    }
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
              id: createDocumentId(),
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

  const applyHistoryChange = useCallback(
    (action: Extract<DocumentSessionAction, { type: "UNDO_TAB_CHANGE" | "REDO_TAB_CHANGE" }>) => {
      const previousTab = sessionStateRef.current.editorState.tab;
      const nextState = dispatchSessionAction(action);

      if (nextState.editorState.tab === previousTab) {
        return;
      }

      const activeDocument = nextState.documentState.activeDocument;

      if (activeDocument.id === null) {
        return;
      }

      const token = getNextSaveToken(nextSaveTokenRef);
      const saveActionType =
        action.type === "UNDO_TAB_CHANGE" ? "UNDO_TAB_SAVE_STARTED" : "REDO_TAB_SAVE_STARTED";
      const savingState = dispatchSessionAction({
        type: saveActionType,
        tab: nextState.editorState.tab,
        token,
      });

      void persistDocument(
        {
          ...activeDocument,
          tab: savingState.editorState.tab,
          updatedAt: new Date().toISOString(),
        },
        { token, documentRevision: savingState.documentRevision },
        "Unable to autosave tab changes",
      );
    },
    [dispatchSessionAction, persistDocument],
  );

  const undoTabChange = useCallback(() => {
    applyHistoryChange({ type: "UNDO_TAB_CHANGE" });
  }, [applyHistoryChange]);

  const redoTabChange = useCallback(() => {
    applyHistoryChange({ type: "REDO_TAB_CHANGE" });
  }, [applyHistoryChange]);

  const deleteDocument = useCallback(
    async (id: string) => {
      const activeDocument = sessionStateRef.current.documentState.activeDocument;
      dispatchSessionAction({ type: "DOCUMENT_DELETE_STARTED" });

      try {
        await deleteSavedTab(id);
        const savedTabs = await listSavedTabs();
        const nextDocument =
          activeDocument.id === id
            ? await getNextDocumentAfterDelete(savedTabs)
            : activeDocument;

        if (nextDocument.id !== null) {
          await markOpened(nextDocument.id);
        }

        dispatchSessionAction({
          type: "DOCUMENT_DELETE_SUCCEEDED",
          deletedId: id,
          nextDocument,
          savedTabs,
        });
      } catch (error) {
        dispatchSessionAction({
          type: "STORAGE_FAILED",
          message: getStorageErrorMessage(error, "Unable to delete saved tab"),
        });
      }
    },
    [dispatchSessionAction],
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
    enabled: initialState === undefined,
    dispatchSessionAction,
    getSessionState,
  });

  return {
    documentState: sessionState.documentState,
    editorState: sessionState.editorState,
    commitTitle,
    dispatchTabAction,
    undoTabChange,
    redoTabChange,
    deleteDocument,
    loadDocument,
    startNewDraft,
    canUndo: sessionState.canUndo,
    canRedo: sessionState.canRedo,
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
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
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
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
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
      return applyTabChange(state, action.tab, { addUndoEntry: true });

    case "TAB_SAVE_STARTED":
      return {
        ...applyTabChange(state, action.tab, { addUndoEntry: true }),
        latestSaveToken: action.token,
      };

    case "UNDO_TAB_CHANGE":
      return undoTabChangeInState(state);

    case "REDO_TAB_CHANGE":
      return redoTabChangeInState(state);

    case "UNDO_TAB_SAVE_STARTED":
    case "REDO_TAB_SAVE_STARTED":
      return {
        ...applyTabChange(state, action.tab, { addUndoEntry: false }),
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
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
        documentRevision: 0,
      };

    case "DOCUMENT_DELETE_STARTED":
      return {
        ...state,
        documentState: {
          ...state.documentState,
          storageStatus: "loading",
          storageError: null,
        },
      };

    case "DOCUMENT_DELETE_SUCCEEDED": {
      const deletedActiveDocument = state.documentState.activeDocument.id === action.deletedId;

      return {
        ...state,
        documentState: {
          activeDocument: deletedActiveDocument
            ? action.nextDocument
            : state.documentState.activeDocument,
          savedTabs: action.savedTabs,
          storageStatus: "idle",
          storageError: null,
        },
        editorState:
          deletedActiveDocument
            ? replaceEditorTab(state.editorState, action.nextDocument.tab, { type: "idle" })
            : state.editorState,
        undoStack: deletedActiveDocument ? [] : state.undoStack,
        redoStack: deletedActiveDocument ? [] : state.redoStack,
        canUndo: deletedActiveDocument ? false : state.canUndo,
        canRedo: deletedActiveDocument ? false : state.canRedo,
        documentRevision: deletedActiveDocument ? 0 : state.documentRevision + 1,
      };
    }

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
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
        documentRevision: state.documentRevision + 1,
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
  options: { addUndoEntry: boolean } = { addUndoEntry: false },
): DocumentSessionState {
  const undoStack = options.addUndoEntry
    ? [...state.undoStack, state.editorState.tab]
    : state.undoStack;
  const redoStack = options.addUndoEntry ? [] : state.redoStack;

  return {
    ...state,
    documentState: documentReducer(state.documentState, {
      type: "TAB_CHANGED",
      tab,
    }),
    editorState: replaceEditorTab(state.editorState, tab),
    undoStack,
    redoStack,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    documentRevision: state.documentRevision + 1,
  };
}

function undoTabChangeInState(state: DocumentSessionState): DocumentSessionState {
  const previousTab = state.undoStack.at(-1);

  if (!previousTab) {
    return state;
  }

  const undoStack = state.undoStack.slice(0, -1);
  const redoStack = [...state.redoStack, state.editorState.tab];

  return {
    ...state,
    documentState: documentReducer(state.documentState, {
      type: "TAB_CHANGED",
      tab: previousTab,
    }),
    editorState: replaceEditorTab(state.editorState, previousTab, { type: "idle" }),
    undoStack,
    redoStack,
    canUndo: undoStack.length > 0,
    canRedo: true,
    documentRevision: state.documentRevision + 1,
  };
}

function redoTabChangeInState(state: DocumentSessionState): DocumentSessionState {
  const nextTab = state.redoStack.at(-1);

  if (!nextTab) {
    return state;
  }

  const undoStack = [...state.undoStack, state.editorState.tab];
  const redoStack = state.redoStack.slice(0, -1);

  return {
    ...state,
    documentState: documentReducer(state.documentState, {
      type: "TAB_CHANGED",
      tab: nextTab,
    }),
    editorState: replaceEditorTab(state.editorState, nextTab, { type: "idle" }),
    undoStack,
    redoStack,
    canUndo: true,
    canRedo: redoStack.length > 0,
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

async function getNextDocumentAfterDelete(
  savedTabs: SavedTabSummary[],
): Promise<EditableBanjoTabDocument> {
  const [nextSavedTab] = savedTabs;

  if (!nextSavedTab) {
    return createDraftDocument();
  }

  return (await getSavedTab(nextSavedTab.id)) ?? createDraftDocument();
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
  enabled,
  dispatchSessionAction,
  getSessionState,
}: {
  enabled: boolean;
  dispatchSessionAction: (action: DocumentSessionAction) => DocumentSessionState;
  getSessionState: () => DocumentSessionState;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

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
  }, [dispatchSessionAction, enabled, getSessionState]);
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
