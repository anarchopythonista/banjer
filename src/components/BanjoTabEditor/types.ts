export type BanjoTab = {
  tuning: BanjoString[];
  measures: TabMeasureData[];
};

export type BanjoString = {
  id: string;
  label: string;
  order: number;
};

export type TabMeasureData = {
  id: string;
  title: string;
  beats: number;
  subdivision: number;
  notes: TabNoteData[];
};

export type TabArticulation =
  | { type: "hammer-on"; targetFret: number }
  | { type: "pull-off"; targetFret: number }
  | { type: "slide"; targetFret: number }
  | { type: "bend"; amount?: "unspecified" | "half" | "full" };

export type TargetedArticulationType = Extract<
  TabArticulation,
  { targetFret: number }
>["type"];

export type TabNoteData = {
  id: string;
  stringIndex: number;
  position: number;
  fret: number;
  durationSlots?: number;
  articulation?: TabArticulation;
};

export type NoteLocation = {
  measureId: string;
  stringIndex: number;
  position: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type SelectionPoint = {
  stringIndex: number;
  position: number;
};

export type SelectionBounds = {
  measureId: string;
  minStringIndex: number;
  maxStringIndex: number;
  minPosition: number;
  maxPosition: number;
};

export type PasteTarget = {
  measureId: string;
  position: number;
};

export type CopiedNote = {
  stringIndex: number;
  positionOffset: number;
  fret: number;
  durationSlots?: number;
  articulation?: TabArticulation;
};

export type CopiedNoteSelection = {
  sourceMeasureId: string;
  sourceNoteIds: string[];
  minPosition: number;
  maxPosition: number;
  notes: CopiedNote[];
};

export type EditorMode =
  | { type: "idle" }
  | {
      type: "fret-picker";
      location: NoteLocation;
      noteId?: string;
      screenPoint: ScreenPoint;
      initialTargetedArticulation?: TargetedArticulationType;
    }
  | {
      type: "dragging-note";
      noteId: string;
      origin: NoteLocation;
      currentTarget: NoteLocation | null;
      pointer: ScreenPoint;
      pointerId?: number;
      overTrash: boolean;
    }
  | {
      type: "resizing-articulation";
      noteId: string;
      edge: "start" | "end";
      measureId: string;
      stringIndex: number;
      startPosition: number;
      endPosition: number;
      currentPosition: number;
      pointer: ScreenPoint;
      pointerId?: number;
    }
  | {
      type: "dragging-measure";
      measureId: string;
      originIndex: number;
      currentTargetIndex: number | null;
      pointer: ScreenPoint;
      pointerId?: number;
      overTrash: boolean;
    }
  | {
      type: "selecting-notes";
      measureId: string;
      start: SelectionPoint;
      current: SelectionPoint;
      pointer: ScreenPoint;
      pointerId?: number;
    }
  | {
      type: "paste-preview";
      target: PasteTarget | null;
      pointer: ScreenPoint | null;
    };

export type BanjoTabEditorState = {
  tab: BanjoTab;
  mode: EditorMode;
};

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
