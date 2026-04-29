# Tab Documents And IndexedDB Design

## Goal

Add a document layer to the banjo tablature editor so the title is part of the saved data model and users can manage multiple saved tabs without a tabbed interface. Saved files will live in IndexedDB for the MVP, with a storage boundary that can later be replaced by a self-hosted API backed by MongoDB.

## Decisions

- The editor opens the most recently opened saved file on startup when one exists.
- If no saved file exists, the editor starts with a fresh untitled draft.
- Pressing Enter while editing the title creates the first saved file for an unsaved draft.
- Pressing Enter while editing the title of an existing file renames and saves that same file.
- Once a file has been saved, note edits, measure edits, fret edits, and drag/drop changes autosave.
- Duplicate visible titles are allowed; files remain distinct by internal ID.
- The file menu lives beside the editable title and only becomes visually prominent on hover or focus.
- The file menu initially contains only `New file...`.
- Saved files appear in the menu by filename and can be selected to load that file.
- Selecting `New file...` only asks for confirmation when the current unsaved draft contains real content.

## Data Model

The existing `BanjoTab` remains focused on musical content:

```ts
type BanjoTab = {
  tuning: BanjoString[];
  measures: TabMeasureData[];
};
```

The new document model wraps that tab content:

```ts
type BanjoTabDocument = {
  id: string;
  title: string;
  tab: BanjoTab;
  createdAt: string;
  updatedAt: string;
};
```

IndexedDB records add browser-storage metadata:

```ts
type SavedTabRecord = BanjoTabDocument & {
  lastOpenedAt: string;
  schemaVersion: 1;
};

type SavedTabSummary = {
  id: string;
  title: string;
  updatedAt: string;
};
```

This shape maps cleanly to a future server document. MongoDB can later store the same durable fields plus ownership, sharing, and sync metadata without changing the editor's musical model.

## State Ownership

`tabReducer.ts` should continue to own music-editing behavior:

- add measure
- add or update note
- move note
- delete note
- move measure
- delete measure
- editor modes for fret picker and drag state

A new document state layer should own file-level behavior:

- active document ID, when saved
- title
- current tab
- saved file summaries
- loading, saving, and error status
- whether the current file is an unsaved draft

The editable title should become controlled by document state instead of keeping its own durable local title. It may still keep temporary draft input state while the user is actively editing.

## Storage Boundary

IndexedDB should be hidden behind a small repository module, for example `savedTabsRepository.ts`.

Suggested API:

```ts
listSavedTabs(): Promise<SavedTabSummary[]>;
getMostRecentTab(): Promise<BanjoTabDocument | null>;
getSavedTab(id: string): Promise<BanjoTabDocument | null>;
saveTab(document: BanjoTabDocument): Promise<BanjoTabDocument>;
markOpened(id: string): Promise<void>;
```

React components should call a document controller or hook rather than directly opening IndexedDB transactions. That keeps the UI independent from the storage backend and leaves room for a later API-backed repository.

## UI Workflow

The editor header should become:

```text
[ Editable title ][ file menu button ]                         [ + measure ]
```

The title remains visually dominant. The file menu button sits beside it, remains keyboard reachable, and exposes an accessible name such as `Open file menu`. Its border/visible affordance should follow the title edit affordance: quiet by default, visible on hover and focus.

The menu contents:

```text
New file...
Saved title 1
Saved title 2
Saved title 3
```

Choosing a saved file loads it into the editor and marks it as most recently opened. Choosing `New file...` starts a fresh untitled draft, unless the current draft is unsaved and contains real tab content.

## Unsaved Draft Behavior

A fresh draft is considered empty when it has one measure and no notes. It can be discarded without confirmation.

An unsaved draft with notes or extra measures is considered meaningful content. Selecting `New file...` or loading another file should ask for confirmation before discarding it.

Saved files do not need a confirmation on switch because autosave keeps them current.

## Error Handling

If IndexedDB is unavailable or a save fails, the editor should remain usable in memory. Document state should track a storage error so the UI can show a small unobtrusive status later.

For the first MVP, error UI can be minimal. The important part is that storage failures do not break note editing.

## Testing

Add pure tests for the document state layer:

- committing a title creates a saved document for an unsaved draft
- committing a title renames an existing document
- selecting `New file...` resets to an untitled draft
- unsaved draft detection distinguishes empty drafts from meaningful content
- loading a saved file replaces the active document

Keep existing reducer tests for note and measure behavior. Add repository tests only where they can stay lightweight; serialization and record conversion helpers are the best targets if full IndexedDB testing needs more setup.

Add Storybook coverage for:

- untitled draft
- saved document title
- file menu with only `New file...`
- file menu with saved files
- unsaved draft confirmation if implemented as a visible component

## Out Of Scope

- A tabbed interface.
- Cloud sync.
- User accounts.
- Import/export.
- Sharing.
- Conflict resolution.
- MongoDB implementation.
