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
  EditorMode,
} from "../types";
import type { BanjoTabDocumentAction } from "../documentReducer";
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

type LocalEditorAction =
  | { type: "EDITOR_STATE_REPLACED"; state: BanjoTabEditorState }
  | { type: "EDITOR_TAB_REPLACED"; tab: BanjoTab; mode?: EditorMode };

type LocalDocumentAction = {
  type: "DOCUMENT_STATE_REPLACED";
  state: BanjoTabDocumentState;
};

export function useBanjoTabDocuments(
  initialState?: BanjoTabEditorState,
): UseBanjoTabDocumentsResult {
  const initialEditorStateRef = useRef<BanjoTabEditorState | null>(null);

  if (initialEditorStateRef.current === null) {
    initialEditorStateRef.current = initialState ?? createInitialEditorState();
  }

  const [documentState, baseDispatchDocument] = useReducer(
    localDocumentReducer,
    initialEditorStateRef.current.tab,
    createInitialDocumentState,
  );
  const [editorState, baseDispatchEditor] = useReducer(
    localEditorReducer,
    initialEditorStateRef.current,
  );
  const documentStateRef = useRef(documentState);
  const editorStateRef = useRef(editorState);

  documentStateRef.current = documentState;
  editorStateRef.current = editorState;

  const dispatchDocumentAction = useCallback((action: BanjoTabDocumentAction) => {
    const nextDocumentState = documentReducer(documentStateRef.current, action);
    documentStateRef.current = nextDocumentState;
    baseDispatchDocument({
      type: "DOCUMENT_STATE_REPLACED",
      state: nextDocumentState,
    });
  }, []);

  const replaceEditorTab = useCallback((tab: BanjoTab, mode?: EditorMode) => {
    const action: LocalEditorAction = { type: "EDITOR_TAB_REPLACED", tab, mode };
    editorStateRef.current = localEditorReducer(editorStateRef.current, action);
    baseDispatchEditor(action);
  }, []);

  const persistDocument = useCallback(
    async (document: BanjoTabDocument, fallbackMessage: string) => {
      try {
        const savedDocument = await saveTab(document);
        const savedTabs = await listSavedTabs();
        dispatchDocumentAction({
          type: "DOCUMENT_PERSISTED",
          document: savedDocument,
          savedTabs,
        });
      } catch (error) {
        dispatchDocumentAction({
          type: "STORAGE_FAILED",
          message: getStorageErrorMessage(error, fallbackMessage),
        });
      }
    },
    [dispatchDocumentAction],
  );

  const commitTitle = useCallback(
    async (title: string) => {
      const activeDocument = documentStateRef.current.activeDocument;
      const normalizedTitle = normalizeDocumentTitle(title);
      const now = new Date().toISOString();
      const documentToSave: BanjoTabDocument =
        activeDocument.id === null
          ? {
              id: crypto.randomUUID(),
              title: normalizedTitle,
              tab: editorStateRef.current.tab,
              createdAt: now,
              updatedAt: now,
            }
          : {
              ...activeDocument,
              title: normalizedTitle,
              tab: editorStateRef.current.tab,
              updatedAt: now,
            };

      dispatchDocumentAction({ type: "TITLE_COMMITTED", title });
      await persistDocument(documentToSave, "Unable to save tab title");
    },
    [dispatchDocumentAction, persistDocument],
  );

  const dispatchTabAction = useCallback(
    (action: BanjoTabAction) => {
      const previousEditorState = editorStateRef.current;
      const nextEditorState = banjoTabReducer(previousEditorState, action);
      const editorAction: LocalEditorAction = {
        type: "EDITOR_STATE_REPLACED",
        state: nextEditorState,
      };

      editorStateRef.current = nextEditorState;
      baseDispatchEditor(editorAction);

      if (nextEditorState.tab === previousEditorState.tab) {
        return;
      }

      const activeDocument = documentStateRef.current.activeDocument;
      dispatchDocumentAction({ type: "TAB_CHANGED", tab: nextEditorState.tab });

      if (activeDocument.id === null) {
        return;
      }

      void persistDocument(
        {
          ...activeDocument,
          tab: nextEditorState.tab,
          updatedAt: new Date().toISOString(),
        },
        "Unable to autosave tab changes",
      );
    },
    [dispatchDocumentAction, persistDocument],
  );

  const loadDocument = useCallback(
    async (id: string) => {
      dispatchDocumentAction({ type: "DOCUMENTS_LOADING" });

      try {
        const document = await getSavedTab(id);

        if (!document) {
          dispatchDocumentAction({
            type: "STORAGE_FAILED",
            message: "Saved tab not found",
          });
          return;
        }

        await markOpened(id);
        const savedTabs = await listSavedTabs();

        dispatchDocumentAction({ type: "DOCUMENT_LOADED", document });
        dispatchDocumentAction({ type: "SAVED_TABS_LOADED", savedTabs });
        replaceEditorTab(document.tab, { type: "idle" });
      } catch (error) {
        dispatchDocumentAction({
          type: "STORAGE_FAILED",
          message: getStorageErrorMessage(error, "Unable to load saved tab"),
        });
      }
    },
    [dispatchDocumentAction, replaceEditorTab],
  );

  const startNewDraft = useCallback(() => {
    dispatchDocumentAction({ type: "NEW_DRAFT_STARTED" });
    replaceEditorTab(documentStateRef.current.activeDocument.tab, { type: "idle" });
  }, [dispatchDocumentAction, replaceEditorTab]);

  useMountDocuments({
    dispatchDocumentAction,
    initialTab: initialEditorStateRef.current.tab,
    replaceEditorTab,
  });

  return {
    documentState,
    editorState,
    commitTitle,
    dispatchTabAction,
    loadDocument,
    startNewDraft,
    shouldConfirmDiscard: isUnsavedMeaningfulDraft(documentState.activeDocument),
  };
}

function localEditorReducer(
  state: BanjoTabEditorState,
  action: LocalEditorAction,
): BanjoTabEditorState {
  switch (action.type) {
    case "EDITOR_STATE_REPLACED":
      return action.state;
    case "EDITOR_TAB_REPLACED":
      return {
        ...state,
        tab: action.tab,
        mode: action.mode ?? state.mode,
      };
  }
}

function localDocumentReducer(
  _state: BanjoTabDocumentState,
  action: LocalDocumentAction,
): BanjoTabDocumentState {
  return action.state;
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

function useMountDocuments({
  dispatchDocumentAction,
  initialTab,
  replaceEditorTab,
}: {
  dispatchDocumentAction: (action: BanjoTabDocumentAction) => void;
  initialTab: BanjoTab;
  replaceEditorTab: (tab: BanjoTab, mode?: EditorMode) => void;
}) {
  useEffect(() => {
    let isActive = true;

    dispatchDocumentAction({ type: "DOCUMENTS_LOADING" });

    void Promise.all([listSavedTabs(), getMostRecentTab()])
      .then(([savedTabs, mostRecentDocument]) => {
        if (!isActive) {
          return;
        }

        const document = mostRecentDocument ?? createDraftDocumentWithTab(initialTab);
        dispatchDocumentAction({
          type: "DOCUMENTS_INITIALIZED",
          document,
          savedTabs,
        });
        replaceEditorTab(
          document.tab,
          mostRecentDocument ? { type: "idle" } : undefined,
        );
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        dispatchDocumentAction({
          type: "STORAGE_FAILED",
          message: getStorageErrorMessage(error, "Unable to load saved tabs"),
        });
      });

    return () => {
      isActive = false;
    };
  }, [dispatchDocumentAction, initialTab, replaceEditorTab]);
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
