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
  beats: number;
  subdivision: number;
  notes: TabNoteData[];
};

export type TabNoteData = {
  id: string;
  stringIndex: number;
  position: number;
  fret: number;
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

export type EditorMode =
  | { type: "idle" }
  | {
      type: "fret-picker";
      location: NoteLocation;
      noteId?: string;
      screenPoint: ScreenPoint;
    }
  | {
      type: "dragging-note";
      noteId: string;
      origin: NoteLocation;
      currentTarget: NoteLocation | null;
      pointer: ScreenPoint;
      overTrash: boolean;
    };

export type BanjoTabEditorState = {
  tab: BanjoTab;
  mode: EditorMode;
};
