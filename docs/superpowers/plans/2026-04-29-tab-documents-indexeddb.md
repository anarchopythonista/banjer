# Tab Documents IndexedDB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add titled, locally persisted banjo tab documents with a hover/focus file menu backed by IndexedDB.

**Architecture:** Keep `BanjoTab` focused on musical data and wrap it in a document layer that owns title, ID, timestamps, saved file summaries, and storage status. Hide IndexedDB behind `savedTabsRepository.ts`, coordinate document persistence through a React hook, and keep the existing tab reducer responsible for note/measure editing.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Storybook, browser IndexedDB.

---

## File Structure

- Modify `src/components/BanjoTabEditor/types.ts`
  - Add document and saved-file types.
- Create `src/components/BanjoTabEditor/documentReducer.ts`
  - Pure document state transitions and unsaved-draft helpers.
- Create `src/components/BanjoTabEditor/documentReducer.test.ts`
  - Tests for title commits, saved document updates, draft reset, loading documents, and unsaved draft detection.
- Create `src/components/BanjoTabEditor/savedTabsRepository.ts`
  - IndexedDB repository plus record conversion helpers.
- Create `src/components/BanjoTabEditor/savedTabsRepository.test.ts`
  - Tests for conversion helpers and summary ordering.
- Create `src/components/BanjoTabEditor/hooks/useBanjoTabDocuments.ts`
  - Async orchestration hook: startup load, title commit, autosave, file loading, new draft flow.
- Modify `src/components/BanjoTabEditor/components/EditableDocumentTitle.tsx`
  - Convert from self-owned title state to controlled title props.
- Create `src/components/BanjoTabEditor/components/DocumentMenuButton.tsx`
  - Accessible file menu with `New file...` and saved file entries.
- Modify `src/components/BanjoTabEditor/BanjoTabEditor.tsx`
  - Use document hook, render title/menu controls, dispatch tab actions through document wrapper.
- Modify `src/components/BanjoTabEditor/BanjoTabEditor.css`
  - Style document title/menu group, quiet menu affordance, menu popover, and storage status.
- Modify `src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx`
  - Add stories for unsaved draft, saved document, menu with only `New file...`, and menu with saved files.

Before editing `BanjoTabEditor.stories.tsx`, follow the Storybook MCP instructions loaded during planning:

- Use `Meta` and `StoryObj` from `@storybook/react-vite`.
- Use interaction helpers from `storybook/test`.
- Use the `canvas` play parameter directly for queries.
- Add interaction tests for keyboard/pointer behavior that changes UI state.
- Run `run-story-tests` after component or story changes.
- Use `preview-stories` and include story links in the final handoff after story changes.

---

### Task 1: Document Types And Pure Reducer

**Files:**
- Modify: `src/components/BanjoTabEditor/types.ts`
- Create: `src/components/BanjoTabEditor/documentReducer.ts`
- Test: `src/components/BanjoTabEditor/documentReducer.test.ts`

- [ ] **Step 1: Add failing document reducer tests**

Create `src/components/BanjoTabEditor/documentReducer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/components/BanjoTabEditor/documentReducer.test.ts
```

Expected: FAIL because `documentReducer.ts` and the new document types do not exist yet.

- [ ] **Step 3: Add document types**

Modify `src/components/BanjoTabEditor/types.ts` by adding these exports after `BanjoTabEditorState`:

```ts
export type BanjoTabDocument = {
  id: string;
  title: string;
  tab: BanjoTab;
  createdAt: string;
  updatedAt: string;
};

export type UnsavedBanjoTabDocument = {
  id: null;
  title: string;
  tab: BanjoTab;
  createdAt: null;
  updatedAt: null;
};

export type EditableBanjoTabDocument = BanjoTabDocument | UnsavedBanjoTabDocument;

export type SavedTabSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type SavedTabRecord = BanjoTabDocument & {
  lastOpenedAt: string;
  schemaVersion: 1;
};

export type DocumentStorageStatus = "idle" | "loading" | "saving" | "error";

export type BanjoTabDocumentState = {
  activeDocument: EditableBanjoTabDocument;
  savedTabs: SavedTabSummary[];
  storageStatus: DocumentStorageStatus;
  storageError: string | null;
};
```

- [ ] **Step 4: Implement the pure document reducer**

Create `src/components/BanjoTabEditor/documentReducer.ts`:

```ts
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

export function isUnsavedMeaningfulDraft(document: EditableBanjoTabDocument): boolean {
  if (document.id !== null) {
    return false;
  }

  if (document.tab.measures.length !== 1) {
    return true;
  }

  return document.tab.measures[0]?.notes.length !== 0;
}
```

- [ ] **Step 5: Run reducer tests to verify they pass**

Run:

```bash
npm test -- src/components/BanjoTabEditor/documentReducer.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/BanjoTabEditor/types.ts src/components/BanjoTabEditor/documentReducer.ts src/components/BanjoTabEditor/documentReducer.test.ts
git commit -m "feat: add tab document state model"
```

---

### Task 2: IndexedDB Repository Boundary

**Files:**
- Create: `src/components/BanjoTabEditor/savedTabsRepository.ts`
- Test: `src/components/BanjoTabEditor/savedTabsRepository.test.ts`

- [ ] **Step 1: Add failing repository helper tests**

Create `src/components/BanjoTabEditor/savedTabsRepository.test.ts`:

```ts
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
    const record = toSavedTabRecord(document("doc-1", "Cripple Creek"), "2026-04-29T12:05:00.000Z");

    expect(record).toMatchObject({
      id: "doc-1",
      title: "Cripple Creek",
      schemaVersion: 1,
      lastOpenedAt: "2026-04-29T12:05:00.000Z",
    });
  });

  it("converts records back to documents without storage metadata", () => {
    const record = toSavedTabRecord(document("doc-1", "Cripple Creek"), "2026-04-29T12:05:00.000Z");

    expect(fromSavedTabRecord(record)).toEqual(document("doc-1", "Cripple Creek"));
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
      { id: "doc-1", title: "Older", updatedAt: "2026-04-29T12:00:00.000Z" },
      { id: "doc-2", title: "Newer", updatedAt: "2026-04-29T12:10:00.000Z" },
    ];

    expect(sortSavedTabSummaries(summaries).map((summary) => summary.id)).toEqual(["doc-2", "doc-1"]);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/components/BanjoTabEditor/savedTabsRepository.test.ts
```

Expected: FAIL because `savedTabsRepository.ts` does not exist yet.

- [ ] **Step 3: Implement repository and conversion helpers**

Create `src/components/BanjoTabEditor/savedTabsRepository.ts`:

```ts
import type { BanjoTabDocument, SavedTabRecord, SavedTabSummary } from "./types";

const DATABASE_NAME = "banjer";
const DATABASE_VERSION = 1;
const TAB_STORE_NAME = "tabs";

export async function listSavedTabs(): Promise<SavedTabSummary[]> {
  const database = await openSavedTabsDatabase();
  const records = await getAllRecords(database);
  database.close();
  return sortSavedTabSummaries(records.map((record) => toSavedTabSummary(fromSavedTabRecord(record))));
}

export async function getMostRecentTab(): Promise<BanjoTabDocument | null> {
  const database = await openSavedTabsDatabase();
  const records = await getAllRecords(database);
  database.close();
  const [mostRecentRecord] = [...records].sort((first, second) =>
    second.lastOpenedAt.localeCompare(first.lastOpenedAt),
  );
  return mostRecentRecord ? fromSavedTabRecord(mostRecentRecord) : null;
}

export async function getSavedTab(id: string): Promise<BanjoTabDocument | null> {
  const database = await openSavedTabsDatabase();
  const record = await getRecord(database, id);
  database.close();
  return record ? fromSavedTabRecord(record) : null;
}

export async function saveTab(document: BanjoTabDocument): Promise<BanjoTabDocument> {
  const database = await openSavedTabsDatabase();
  await putRecord(database, toSavedTabRecord(document, new Date().toISOString()));
  database.close();
  return document;
}

export async function markOpened(id: string): Promise<void> {
  const database = await openSavedTabsDatabase();
  const record = await getRecord(database, id);

  if (record) {
    await putRecord(database, {
      ...record,
      lastOpenedAt: new Date().toISOString(),
    });
  }

  database.close();
}

export function toSavedTabRecord(
  document: BanjoTabDocument,
  lastOpenedAt: string,
): SavedTabRecord {
  return {
    ...document,
    lastOpenedAt,
    schemaVersion: 1,
  };
}

export function fromSavedTabRecord(record: SavedTabRecord): BanjoTabDocument {
  return {
    id: record.id,
    title: record.title,
    tab: record.tab,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toSavedTabSummary(document: BanjoTabDocument): SavedTabSummary {
  return {
    id: document.id,
    title: document.title,
    updatedAt: document.updatedAt,
  };
}

export function sortSavedTabSummaries(summaries: SavedTabSummary[]): SavedTabSummary[] {
  return [...summaries].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

function openSavedTabsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(TAB_STORE_NAME)) {
        const store = database.createObjectStore(TAB_STORE_NAME, { keyPath: "id" });
        store.createIndex("lastOpenedAt", "lastOpenedAt");
        store.createIndex("updatedAt", "updatedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open saved tabs database"));
  });
}

function getAllRecords(database: IDBDatabase): Promise<SavedTabRecord[]> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(TAB_STORE_NAME, "readonly")
      .objectStore(TAB_STORE_NAME)
      .getAll();

    request.onsuccess = () => resolve(request.result as SavedTabRecord[]);
    request.onerror = () => reject(request.error ?? new Error("Unable to list saved tabs"));
  });
}

function getRecord(database: IDBDatabase, id: string): Promise<SavedTabRecord | null> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(TAB_STORE_NAME, "readonly")
      .objectStore(TAB_STORE_NAME)
      .get(id);

    request.onsuccess = () => resolve((request.result as SavedTabRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error(`Unable to load saved tab ${id}`));
  });
}

function putRecord(database: IDBDatabase, record: SavedTabRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(TAB_STORE_NAME, "readwrite")
      .objectStore(TAB_STORE_NAME)
      .put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Unable to save tab ${record.id}`));
  });
}
```

- [ ] **Step 4: Run repository helper tests**

Run:

```bash
npm test -- src/components/BanjoTabEditor/savedTabsRepository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/BanjoTabEditor/savedTabsRepository.ts src/components/BanjoTabEditor/savedTabsRepository.test.ts
git commit -m "feat: add saved tab IndexedDB repository"
```

---

### Task 3: Document Orchestration Hook

**Files:**
- Create: `src/components/BanjoTabEditor/hooks/useBanjoTabDocuments.ts`
- Modify: `src/components/BanjoTabEditor/documentReducer.ts`
- Test: `src/components/BanjoTabEditor/documentReducer.test.ts`

- [ ] **Step 1: Add reducer tests for tab changes and storage failures**

Append to `src/components/BanjoTabEditor/documentReducer.test.ts` inside the `describe` block:

```ts
  it("updates the active document tab from tab editor changes", () => {
    const state = createDraftDocumentState();
    const nextTab = {
      ...state.activeDocument.tab,
      measures: [
        {
          ...state.activeDocument.tab.measures[0],
          notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
        },
      ],
    };

    const nextState = documentReducer(state, { type: "TAB_CHANGED", tab: nextTab });

    expect(nextState.activeDocument.tab).toBe(nextTab);
  });

  it("stores storage errors without losing the active document", () => {
    const state = createDraftDocumentState();

    const nextState = documentReducer(state, {
      type: "STORAGE_FAILED",
      message: "IndexedDB unavailable",
    });

    expect(nextState.activeDocument).toEqual(state.activeDocument);
    expect(nextState.storageStatus).toBe("error");
    expect(nextState.storageError).toBe("IndexedDB unavailable");
  });
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm test -- src/components/BanjoTabEditor/documentReducer.test.ts
```

Expected: PASS because the reducer from Task 1 already supports these actions.

- [ ] **Step 3: Create the orchestration hook**

Create `src/components/BanjoTabEditor/hooks/useBanjoTabDocuments.ts`:

```ts
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { createInitialEditorState, banjoTabReducer } from "../tabReducer";
import {
  createDraftDocumentState,
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
import type { BanjoTabAction } from "../tabReducer";
import type { BanjoTabDocument } from "../types";

export function useBanjoTabDocuments() {
  const [documentState, dispatchDocument] = useReducer(
    documentReducer,
    undefined,
    createDraftDocumentState,
  );

  useEffect(() => {
    let isActive = true;

    async function loadInitialDocument() {
      dispatchDocument({ type: "DOCUMENTS_LOADING" });

      try {
        const [savedTabs, mostRecentDocument] = await Promise.all([
          listSavedTabs(),
          getMostRecentTab(),
        ]);

        if (!isActive) {
          return;
        }

        dispatchDocument({
          type: "DOCUMENTS_INITIALIZED",
          document: mostRecentDocument ?? createDraftDocumentState().activeDocument,
          savedTabs,
        });
      } catch (error) {
        if (isActive) {
          dispatchDocument({
            type: "STORAGE_FAILED",
            message: getErrorMessage(error),
          });
        }
      }
    }

    void loadInitialDocument();

    return () => {
      isActive = false;
    };
  }, []);

  const editorState = useMemo(
    () => ({
      ...createInitialEditorState(),
      tab: documentState.activeDocument.tab,
    }),
    [documentState.activeDocument.tab],
  );

  const persistDocument = useCallback(async (document: BanjoTabDocument) => {
    try {
      const savedDocument = await saveTab(document);
      const savedTabs = await listSavedTabs();
      dispatchDocument({
        type: "DOCUMENT_PERSISTED",
        document: savedDocument,
        savedTabs,
      });
    } catch (error) {
      dispatchDocument({
        type: "STORAGE_FAILED",
        message: getErrorMessage(error),
      });
    }
  }, []);

  const commitTitle = useCallback(
    (title: string) => {
      const now = new Date().toISOString();
      const normalizedTitle = normalizeDocumentTitle(title);
      const document: BanjoTabDocument =
        documentState.activeDocument.id === null
          ? {
              id: crypto.randomUUID(),
              title: normalizedTitle,
              tab: documentState.activeDocument.tab,
              createdAt: now,
              updatedAt: now,
            }
          : {
              ...documentState.activeDocument,
              title: normalizedTitle,
              updatedAt: now,
            };

      dispatchDocument({ type: "TITLE_COMMITTED", title: normalizedTitle });
      void persistDocument(document);
    },
    [documentState.activeDocument, persistDocument],
  );

  const dispatchTabAction = useCallback(
    (action: BanjoTabAction) => {
      const nextEditorState = banjoTabReducer(
        {
          tab: documentState.activeDocument.tab,
          mode: editorState.mode,
        },
        action,
      );

      dispatchDocument({ type: "TAB_CHANGED", tab: nextEditorState.tab });

      if (documentState.activeDocument.id !== null) {
        void persistDocument({
          ...documentState.activeDocument,
          tab: nextEditorState.tab,
          updatedAt: new Date().toISOString(),
        });
      }

      return nextEditorState;
    },
    [documentState.activeDocument, editorState.mode, persistDocument],
  );

  const loadDocument = useCallback(async (id: string) => {
    try {
      const document = await getSavedTab(id);

      if (!document) {
        dispatchDocument({
          type: "STORAGE_FAILED",
          message: "Saved tab could not be found.",
        });
        return;
      }

      await markOpened(id);
      dispatchDocument({ type: "DOCUMENT_LOADED", document });
      dispatchDocument({ type: "SAVED_TABS_LOADED", savedTabs: await listSavedTabs() });
    } catch (error) {
      dispatchDocument({
        type: "STORAGE_FAILED",
        message: getErrorMessage(error),
      });
    }
  }, []);

  const startNewDraft = useCallback(() => {
    dispatchDocument({ type: "NEW_DRAFT_STARTED" });
  }, []);

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Storage operation failed.";
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS. If it fails because `editorState.mode` does not persist between actions, stop and adjust the hook to keep `mode` in a local `useReducer(banjoTabReducer, ...)` wrapper before continuing. Do not move storage calls into presentational components.

- [ ] **Step 5: Commit**

```bash
git add src/components/BanjoTabEditor/hooks/useBanjoTabDocuments.ts src/components/BanjoTabEditor/documentReducer.test.ts
git commit -m "feat: add tab document orchestration hook"
```

---

### Task 4: Controlled Title And File Menu Components

**Files:**
- Modify: `src/components/BanjoTabEditor/components/EditableDocumentTitle.tsx`
- Create: `src/components/BanjoTabEditor/components/DocumentMenuButton.tsx`

- [ ] **Step 1: Update `EditableDocumentTitle` to be controlled**

Replace `src/components/BanjoTabEditor/components/EditableDocumentTitle.tsx` with:

```tsx
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type EditableDocumentTitleProps = {
  title: string;
  onCommitTitle: (title: string) => void;
};

export function EditableDocumentTitle({
  title,
  onCommitTitle,
}: EditableDocumentTitleProps) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(title);
    }
  }, [isEditing, title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraftTitle(title);
    setIsEditing(true);
  };

  const applyDraftTitle = () => {
    onCommitTitle(draftTitle);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setDraftTitle(title);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyDraftTitle();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  };

  return (
    <h1 id="banjo-tab-editor-title" className="banjo-tab-document-title">
      {isEditing ? (
        <input
          ref={inputRef}
          className="banjo-tab-document-title-input"
          value={draftTitle}
          aria-label="Edit title"
          onBlur={cancelEditing}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button
          type="button"
          className="banjo-tab-document-title-button"
          aria-label={`Edit title: ${title}`}
          onClick={startEditing}
        >
          {title}
        </button>
      )}
    </h1>
  );
}
```

- [ ] **Step 2: Create `DocumentMenuButton`**

Create `src/components/BanjoTabEditor/components/DocumentMenuButton.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { SavedTabSummary } from "../types";

type DocumentMenuButtonProps = {
  savedTabs: SavedTabSummary[];
  activeDocumentId: string | null;
  onNewFile: () => void;
  onLoadFile: (id: string) => void;
};

export function DocumentMenuButton({
  savedTabs,
  activeDocumentId,
  onNewFile,
  onLoadFile,
}: DocumentMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const closeAndRun = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="banjo-tab-document-menu" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="banjo-tab-document-menu-button"
        aria-label="Open file menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true">▾</span>
      </button>
      {isOpen && (
        <div id={menuId} className="banjo-tab-document-menu-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            className="banjo-tab-document-menu-item"
            onClick={() => closeAndRun(onNewFile)}
          >
            New file...
          </button>
          {savedTabs.map((summary) => (
            <button
              key={summary.id}
              type="button"
              role="menuitem"
              className="banjo-tab-document-menu-item"
              aria-current={summary.id === activeDocumentId ? "true" : undefined}
              onClick={() => closeAndRun(() => onLoadFile(summary.id))}
            >
              {summary.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: FAIL until `BanjoTabEditor.tsx` is updated to pass `title` and `onCommitTitle` to `EditableDocumentTitle`. Do not commit yet.

---

### Task 5: Wire Documents Into `BanjoTabEditor`

**Files:**
- Modify: `src/components/BanjoTabEditor/BanjoTabEditor.tsx`
- Modify: `src/components/BanjoTabEditor/hooks/useBanjoTabDocuments.ts` if Task 3 typecheck revealed mode-handling issues.

- [ ] **Step 1: Update `BanjoTabEditor` imports**

Add imports:

```ts
import { DocumentMenuButton } from "./components/DocumentMenuButton";
import { useBanjoTabDocuments } from "./hooks/useBanjoTabDocuments";
```

Remove direct imports of `useReducer`, `banjoTabReducer`, and `createInitialEditorState` if they are no longer used.

- [ ] **Step 2: Replace local reducer setup**

In `BanjoTabEditor`, replace:

```ts
const [state, dispatch] = useReducer(
  banjoTabReducer,
  initialState ?? createInitialEditorState(),
);
```

with:

```ts
const {
  documentState,
  editorState: state,
  commitTitle,
  dispatchTabAction,
  loadDocument,
  startNewDraft,
  shouldConfirmDiscard,
} = useBanjoTabDocuments(initialState);
const dispatch = dispatchTabAction;
```

If `useBanjoTabDocuments` does not yet accept `initialState`, update its signature to:

```ts
export function useBanjoTabDocuments(initialState?: BanjoTabEditorState) {
```

and use `initialState?.tab ?? createDraftDocumentState().activeDocument.tab` for the initial draft tab so existing stories can still pass deterministic tab data.

- [ ] **Step 3: Render the title/menu group**

Replace:

```tsx
<EditableDocumentTitle />
```

with:

```tsx
<div className="banjo-tab-document-controls">
  <EditableDocumentTitle
    title={documentState.activeDocument.title}
    onCommitTitle={commitTitle}
  />
  <DocumentMenuButton
    savedTabs={documentState.savedTabs}
    activeDocumentId={documentState.activeDocument.id}
    onNewFile={() => {
      if (
        shouldConfirmDiscard &&
        !window.confirm("Discard this unsaved tab and start a new file?")
      ) {
        return;
      }

      startNewDraft();
    }}
    onLoadFile={(id) => {
      if (
        shouldConfirmDiscard &&
        !window.confirm("Discard this unsaved tab and open another file?")
      ) {
        return;
      }

      void loadDocument(id);
    }}
  />
</div>
```

- [ ] **Step 4: Show unobtrusive storage status**

After `DocumentMenuButton`, add:

```tsx
{documentState.storageStatus === "error" && documentState.storageError && (
  <span className="banjo-tab-storage-status" role="status">
    {documentState.storageError}
  </span>
)}
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS. If it fails because `dispatchTabAction` does not preserve `mode`, update `useBanjoTabDocuments` to keep a separate local reducer for `BanjoTabEditorState` and mirror `tab` into document state only when `nextEditorState.tab !== previous.tab`.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/components/BanjoTabEditor/documentReducer.test.ts src/components/BanjoTabEditor/tabReducer.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/BanjoTabEditor/BanjoTabEditor.tsx src/components/BanjoTabEditor/components/EditableDocumentTitle.tsx src/components/BanjoTabEditor/components/DocumentMenuButton.tsx src/components/BanjoTabEditor/hooks/useBanjoTabDocuments.ts
git commit -m "feat: wire tab documents into editor"
```

---

### Task 6: Header And Menu Styling

**Files:**
- Modify: `src/components/BanjoTabEditor/BanjoTabEditor.css`

- [ ] **Step 1: Add document control styles**

In `src/components/BanjoTabEditor/BanjoTabEditor.css`, add after `.banjo-tab-editor-header`:

```css
.banjo-tab-document-controls {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
}

.banjo-tab-document-menu {
  position: relative;
  flex: 0 0 auto;
}

.banjo-tab-document-menu-button {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--tab-muted);
  background: transparent;
  font: inherit;
  cursor: pointer;
  opacity: 0;
  transition: opacity 140ms ease, border-color 140ms ease, background 140ms ease;
}

.banjo-tab-document-controls:hover .banjo-tab-document-menu-button,
.banjo-tab-document-menu-button:focus-visible,
.banjo-tab-document-menu-button[aria-expanded="true"] {
  opacity: 1;
}

.banjo-tab-document-menu-button:hover {
  border-color: var(--tab-measure-handle-border);
  background: var(--tab-hover-bg);
}

.banjo-tab-document-menu-button:focus-visible {
  outline: 3px solid var(--tab-focus);
  outline-offset: 2px;
}

.banjo-tab-document-menu-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  display: grid;
  min-width: 220px;
  max-width: min(320px, calc(100vw - 32px));
  padding: 6px;
  border: 1px solid var(--tab-popover-border);
  border-radius: 8px;
  background: var(--tab-fret-bg);
  box-shadow: var(--tab-popover-shadow);
}

.banjo-tab-document-menu-item {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 9px 10px;
  border: 0;
  border-radius: 6px;
  color: var(--tab-ink);
  background: transparent;
  font: inherit;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
}

.banjo-tab-document-menu-item:hover,
.banjo-tab-document-menu-item:focus-visible {
  outline: none;
  background: var(--tab-hover-bg);
}

.banjo-tab-document-menu-item[aria-current="true"] {
  color: #ffffff;
  background: var(--tab-accent);
}

.banjo-tab-storage-status {
  margin-left: 10px;
  color: var(--tab-danger);
  font-size: 0.85rem;
  font-weight: 700;
}
```

- [ ] **Step 2: Adjust mobile header if needed**

Inside the existing `@media (max-width: 640px)` block, add:

```css
  .banjo-tab-document-controls {
    max-width: calc(100% - 56px);
  }

  .banjo-tab-document-menu-button {
    opacity: 1;
  }
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/BanjoTabEditor/BanjoTabEditor.css
git commit -m "style: add document menu header styles"
```

---

### Task 7: Storybook Coverage

**Files:**
- Modify: `src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx`

- [ ] **Step 1: Fetch Storybook instructions**

Run the Storybook MCP tool if this plan is being executed in a fresh session:

```text
get-storybook-story-instructions
```

Expected: instructions load successfully. This planning session already confirmed the MCP endpoint works and loaded the instructions, but the implementer should refresh them before editing stories if context was compacted or a new session starts.

- [ ] **Step 2: Add story fixtures**

In `src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx`, add helper state for a titled saved document only if the component now accepts document-oriented story props. If the public component still only accepts `initialState`, keep stories focused on visible initial tab states and add story coverage for the menu through props exposed by `BanjoTabEditor` only after those props exist.

Use this pattern for a saved-looking initial state if supported:

```ts
const savedDocumentState = makeEditorState([
  {
    id: "measure-1",
    notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
  },
]);
```

- [ ] **Step 3: Add menu stories**

Add exports:

```tsx
export const UntitledDraftDocument: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Edit title: Untitled" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await expect(canvas.getByRole("menuitem", { name: "New file..." })).toBeInTheDocument();
  },
};

export const FileMenuInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await expect(canvas.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByRole("menu")).not.toBeInTheDocument();
  },
};
```

If saved file entries require IndexedDB setup, do not fake internal repository state through undocumented props. Instead, defer the saved-files visual story until the component exposes an explicit testing/story seam.

- [ ] **Step 4: Run focused story tests**

Run the Storybook MCP `run-story-tests` for:

```text
components-banjotabeditor--untitled-draft-document
components-banjotabeditor--file-menu-interaction
```

Expected: PASS. If MCP times out, run `npm test` and `npm run build`, then note the MCP timeout in the task handoff.

- [ ] **Step 5: Commit**

Before committing, call `preview-stories` for changed BanjoTabEditor stories and save the returned links for the final handoff.

```bash
git add src/components/BanjoTabEditor/BanjoTabEditor.stories.tsx
git commit -m "test: add document menu stories"
```

---

### Task 8: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run unit tests**

```bash
npm test
```

Expected: PASS. Existing React `act` warning may still appear; the command must exit 0.

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Run Storybook tests**

Use Storybook MCP `run-story-tests` for the changed BanjoTabEditor stories.

Expected: PASS. If MCP cannot connect to `localhost:6006`, start Storybook with `npm run storybook` and retry. If the MCP call still times out, document the timeout and include the successful `npm test` and `npm run build` evidence in the final handoff.

- [ ] **Step 6: Final git status check**

```bash
git status --short
```

Expected: only intentional files changed or no changes after commits. Do not revert unrelated pre-existing user changes.

---

## Self-Review Notes

Spec coverage:

- Document model and title persistence: Task 1, Task 3, Task 5.
- IndexedDB boundary: Task 2.
- Startup most-recent behavior: Task 3.
- Enter-to-save title behavior: Task 4 and Task 5.
- Autosave saved documents: Task 3 and Task 5.
- File menu beside title: Task 4, Task 5, Task 6.
- New file confirmation for meaningful unsaved drafts: Task 1 and Task 5.
- Error handling that keeps editor usable: Task 1, Task 3, Task 5.
- Tests and Storybook coverage: Task 1, Task 2, Task 7, Task 8.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified "handle edge cases" steps remain.
- The only conditional instructions are explicit failure-response branches tied to typecheck or Storybook MCP availability.

Type consistency:

- Document names match `BanjoTabDocument`, `UnsavedBanjoTabDocument`, `EditableBanjoTabDocument`, `SavedTabSummary`, and `SavedTabRecord`.
- Reducer action names match the test and implementation snippets.
- Repository function names match the approved design spec.
