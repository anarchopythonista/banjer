import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { DEFAULT_TUNING, getDefaultMeasureTitle } from "./constants";
import { BanjoTabEditor } from "./BanjoTabEditor";
import type { BanjoTabEditorState } from "./types";

const meta = {
  title: "Components/BanjoTabEditor",
  component: BanjoTabEditor,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof BanjoTabEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyEditor: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Add measure")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Measure 1")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit title: Untitled" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await expect(canvas.getByRole("menuitem", { name: "New file..." })).toBeInTheDocument();
  },
};

export const RenameTitleInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit title: Untitled" }));
    const titleInput = canvas.getByLabelText("Edit title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Foggy Mountain{Enter}");
    await expect(canvas.getByRole("button", { name: "Edit title: Foggy Mountain" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await expect(canvas.getAllByRole("menuitem", { name: "Foggy Mountain" }).length).toBeGreaterThan(0);
  },
};

export const RenameTitleOutsideTapCancelsInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit title: Untitled" }));
    const titleInput = canvas.getByLabelText("Edit title");
    const addMeasureButton = canvas.getByLabelText("Add measure");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Test");

    await userEvent.click(addMeasureButton);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    await expect(canvas.getByRole("button", { name: "Edit title: Untitled" })).toBeInTheDocument();
  },
};

export const SingleNote: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
      },
    ]),
  },
};

export const MultipleMeasures: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        title: "Intro",
        notes: [{ id: "note-1", stringIndex: 2, position: 0, fret: 0 }],
      },
      {
        id: "measure-2",
        title: "Break",
        notes: [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }],
      },
      {
        id: "measure-3",
        notes: [{ id: "note-3", stringIndex: 4, position: 15, fret: 5 }],
      },
    ]),
  },
};

export const RenameMeasureTitleInteraction: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [],
      },
    ]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit measure 1 title: Measure 1" }));
    const titleInput = canvas.getByLabelText("Edit measure 1 title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Break{Enter}");
    await expect(canvas.getByRole("button", { name: "Edit measure 1 title: Break" })).toBeInTheDocument();
  },
};

export const ClearMeasureTitleInteraction: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        title: "Break",
        notes: [],
      },
    ]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit measure 1 title: Break" }));
    const titleInput = canvas.getByLabelText("Edit measure 1 title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "{Enter}");
    await expect(canvas.getByRole("button", { name: "Edit measure 1 title: Measure 1" })).toBeInTheDocument();
  },
};

export const ChordLikeStack: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [
          { id: "note-1", stringIndex: 0, position: 6, fret: 2 },
          { id: "note-2", stringIndex: 1, position: 6, fret: 1 },
          { id: "note-3", stringIndex: 2, position: 6, fret: 0 },
          { id: "note-4", stringIndex: 3, position: 6, fret: 2 },
        ],
      },
    ]),
  },
};

export const FretPickerOpen: Story = {
  args: {
    initialState: {
      ...makeEditorState([
        {
          id: "measure-1",
          notes: [{ id: "note-1", stringIndex: 1, position: 5, fret: 3 }],
        },
      ]),
      mode: {
        type: "fret-picker",
        location: { measureId: "measure-1", stringIndex: 1, position: 5 },
        noteId: "note-1",
        screenPoint: { x: 360, y: 210 },
      },
    },
  },
};

export const PlainNotePicker: Story = {
  args: {
    initialState: {
      ...makeEditorState([{ id: "measure-1", notes: [] }]),
      mode: {
        type: "fret-picker",
        location: { measureId: "measure-1", stringIndex: 0, position: 0 },
        screenPoint: { x: 360, y: 210 },
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("dialog", { name: "Choose fret" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Add technique for fret 0" })).toBeInTheDocument();
    await userEvent.hover(canvas.getByRole("button", { name: "Fret 7" }));
    await expect(canvas.getByRole("button", { name: "Add technique for fret 7" })).toBeInTheDocument();
  },
};

export const ArticulationMenuOpen: Story = {
  args: {
    initialState: editorStateWithOpenPicker(2),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add technique for fret 2" }));
    await expect(canvas.getByRole("dialog", { name: "Choose technique" })).toBeInTheDocument();
    await expect(canvas.getByText("Fret 2")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Hammer-on" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Pull-off" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Slide" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Bend, creates note immediately" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Back" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Fret 0" })).not.toBeInTheDocument();
  },
};

export const HammerOnTargetSelection: Story = {
  args: {
    initialState: editorStateWithOpenPicker(2),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add technique for fret 2" }));
    await userEvent.click(canvas.getByRole("button", { name: "Hammer-on" }));
    await expect(canvas.getByRole("dialog", { name: "Choose Hammer-on target" })).toBeInTheDocument();
    await expect(canvas.getByText("2h... choose target")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Back" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Fret 2 unavailable for Hammer-on target" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Fret 4" })).toBeEnabled();
  },
};

export const PullOffTargetSelection: Story = {
  args: {
    initialState: editorStateWithOpenPicker(4),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add technique for fret 4" }));
    await userEvent.click(canvas.getByRole("button", { name: "Pull-off" }));
    await expect(canvas.getByRole("dialog", { name: "Choose Pull-off target" })).toBeInTheDocument();
    await expect(canvas.getByText("4p... choose target")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Fret 2" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Fret 4 unavailable for Pull-off target" })).toBeDisabled();
  },
};

export const SlideTargetSelection: Story = {
  args: {
    initialState: editorStateWithOpenPicker(5),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add technique for fret 5" }));
    await userEvent.click(canvas.getByRole("button", { name: "Slide" }));
    await expect(canvas.getByRole("dialog", { name: "Choose Slide target" })).toBeInTheDocument();
    await expect(canvas.getByText("5/... choose target")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Fret 2" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Fret 5 unavailable for Slide target" })).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(canvas.getByRole("dialog", { name: "Choose technique" })).toBeInTheDocument();
  },
};

export const FretPickerNearScreenEdge: Story = {
  args: {
    initialState: {
      ...makeEditorState([
        {
          id: "measure-1",
          notes: [{ id: "note-1", stringIndex: 0, position: 0, fret: 2 }],
        },
      ]),
      mode: {
        type: "fret-picker",
        location: { measureId: "measure-1", stringIndex: 0, position: 0 },
        noteId: "note-1",
        screenPoint: { x: 10, y: 210 },
      },
    },
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const MixedArticulatedNotes: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [
          { id: "note-1", stringIndex: 0, position: 1, fret: 2, durationSlots: 2, articulation: { type: "hammer-on", targetFret: 4 } },
          { id: "note-2", stringIndex: 1, position: 4, fret: 4, articulation: { type: "pull-off", targetFret: 2 } },
          { id: "note-3", stringIndex: 2, position: 7, fret: 2, durationSlots: 3, articulation: { type: "slide", targetFret: 5 } },
          { id: "note-4", stringIndex: 3, position: 10, fret: 5, durationSlots: 4, articulation: { type: "slide", targetFret: 2 } },
          { id: "note-5", stringIndex: 4, position: 13, fret: 7, articulation: { type: "bend" } },
          { id: "note-6", stringIndex: 0, position: 15, fret: 10, articulation: { type: "hammer-on", targetFret: 12 } },
        ],
      },
    ]),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Edit fret 2h4 on string 1, slots 2 through 3" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Resize end of fret 2h4" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 10h12 on string 1, slot 16" })).toBeInTheDocument();
  },
};

export const AddMeasureInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText("Add measure"));
    await expect(canvas.getByLabelText("Measure 2")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit measure 2 title: Measure 2" })).toBeInTheDocument();
  },
};

export const UndoRedoButtonsInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Undo" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Redo" })).toBeDisabled();
    await userEvent.click(canvas.getByLabelText("Add measure"));
    await expect(canvas.getByLabelText("Measure 2")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Undo" })).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Undo" }));
    await expect(canvas.queryByLabelText("Measure 2")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Redo" })).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Redo" }));
    await expect(canvas.getByLabelText("Measure 2")).toBeInTheDocument();
  },
};

export const UndoRedoKeyboardInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText("Set string 1 slot 1"));
    await userEvent.click(canvas.getByRole("button", { name: "Fret 5" }));
    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 1, slot 1" })).toBeInTheDocument();

    fireEvent.keyDown(window, {
      key: "z",
      ctrlKey: true,
    });
    await expect(canvas.queryByRole("button", { name: "Edit fret 5 on string 1, slot 1" })).not.toBeInTheDocument();

    fireEvent.keyDown(window, {
      key: "z",
      ctrlKey: true,
      shiftKey: true,
    });
    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 1, slot 1" })).toBeInTheDocument();
  },
};

export const CreateNoteInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText("Set string 1 slot 1"));
    await expect(canvas.getByRole("dialog", { name: "Choose fret" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Fret 5" }));
    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 1, slot 1" })).toBeInTheDocument();
  },
};

export const FretPickerDigitEntryInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText("Set string 1 slot 1"));
    await expect(canvas.getByRole("dialog", { name: "Choose fret" })).toBeInTheDocument();

    const initiallyFocusedFret = canvas.getByRole("button", { name: "Fret 0" });
    initiallyFocusedFret.focus();
    fireEvent.keyDown(initiallyFocusedFret, { key: "6" });

    await expect(canvas.getByRole("button", { name: "Edit fret 6 on string 1, slot 1" })).toBeInTheDocument();
    await expect(canvas.queryByRole("dialog", { name: "Choose fret" })).not.toBeInTheDocument();
  },
};

export const EditNoteInteraction: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [{ id: "note-1", stringIndex: 0, position: 0, fret: 2 }],
      },
    ]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 1" }));
    await expect(canvas.getByRole("dialog", { name: "Edit fret" })).toBeInTheDocument();
    const fretSevenButton = canvas.getByRole("button", { name: "Fret 7" });

    await userEvent.hover(fretSevenButton);
    await expect(canvas.getByRole("button", { name: "Add technique for fret 2" })).toBeInTheDocument();

    fireEvent.focusIn(fretSevenButton);
    await expect(canvas.getByRole("button", { name: "Add technique for fret 7" })).toBeInTheDocument();

    await userEvent.click(fretSevenButton);
    await expect(canvas.getByRole("button", { name: "Edit fret 7 on string 1, slot 1" })).toBeInTheDocument();
  },
};

export const QuickFretEntryInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    fireEvent.pointerOver(canvas.getByLabelText("Set string 2 slot 3"), {
      pointerType: "mouse",
    });
    fireEvent.keyDown(window, { key: "7" });

    await expect(canvas.getByRole("button", { name: "Edit fret 7 on string 2, slot 3" })).toBeInTheDocument();
    await expect(canvas.queryByRole("dialog", { name: "Choose fret" })).not.toBeInTheDocument();

    fireEvent.pointerOver(canvas.getByRole("button", { name: "Edit fret 7 on string 2, slot 3" }), {
      pointerType: "mouse",
    });
    fireEvent.keyDown(window, { key: "9" });

    await expect(canvas.getByRole("button", { name: "Edit fret 9 on string 2, slot 3" })).toBeInTheDocument();
    await expect(canvas.queryByRole("dialog", { name: "Edit fret" })).not.toBeInTheDocument();

    canvas.getByLabelText("Set string 3 slot 4").focus();
    fireEvent.keyDown(window, { key: "4" });

    await expect(canvas.getByRole("button", { name: "Edit fret 4 on string 3, slot 4" })).toBeInTheDocument();
    await expect(canvas.queryByRole("dialog", { name: "Choose fret" })).not.toBeInTheDocument();
  },
};

export const QuickDeleteHoveredNoteInteraction: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [
          { id: "note-1", stringIndex: 1, position: 2, fret: 7 },
          { id: "note-2", stringIndex: 2, position: 3, fret: 4 },
        ],
      },
    ]),
  },
  play: async ({ canvas }) => {
    const hoveredNote = canvas.getByRole("button", { name: "Edit fret 7 on string 2, slot 3" });

    fireEvent.pointerOver(hoveredNote, {
      pointerType: "mouse",
    });
    fireEvent.keyDown(window, { key: "Backspace" });

    await expect(canvas.queryByRole("button", { name: "Edit fret 7 on string 2, slot 3" })).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 4 on string 3, slot 4" })).toBeInTheDocument();

    canvas.getByRole("button", { name: "Edit fret 4 on string 3, slot 4" }).focus();
    fireEvent.keyDown(window, { key: "Delete" });

    await expect(canvas.queryByRole("button", { name: "Edit fret 4 on string 3, slot 4" })).not.toBeInTheDocument();
  },
};

export const DraggingNoteVisualState: Story = {
  args: {
    initialState: {
      ...makeEditorState([
        {
          id: "measure-1",
          notes: [
            { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
            { id: "note-2", stringIndex: 2, position: 9, fret: 5 },
          ],
        },
      ]),
      mode: {
        type: "dragging-note",
        noteId: "note-1",
        origin: { measureId: "measure-1", stringIndex: 0, position: 4 },
        currentTarget: { measureId: "measure-1", stringIndex: 2, position: 9 },
        pointer: { x: 520, y: 310 },
        overTrash: false,
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Drop note to delete")).toBeInTheDocument();
  },
};

export const DraggingOverOccupiedNoteVisualState: Story = {
  args: {
    initialState: {
      ...makeEditorState([
        {
          id: "measure-1",
          notes: [
            { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
            { id: "note-2", stringIndex: 2, position: 9, fret: 5 },
          ],
        },
      ]),
      mode: {
        type: "dragging-note",
        noteId: "note-1",
        origin: { measureId: "measure-1", stringIndex: 0, position: 4 },
        currentTarget: { measureId: "measure-1", stringIndex: 2, position: 9 },
        pointer: { x: 520, y: 310 },
        overTrash: false,
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 5" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 3, slot 10" })).toBeInTheDocument();
  },
};

export const ResizingArticulationVisualState: Story = {
  args: {
    initialState: {
      ...makeEditorState([
        {
          id: "measure-1",
          notes: [
            {
              id: "note-1",
              stringIndex: 2,
              position: 4,
              fret: 3,
              durationSlots: 2,
              articulation: { type: "slide", targetFret: 5 },
            },
          ],
        },
      ]),
      mode: {
        type: "resizing-articulation",
        noteId: "note-1",
        edge: "end",
        measureId: "measure-1",
        stringIndex: 2,
        startPosition: 4,
        endPosition: 5,
        currentPosition: 7,
        pointer: { x: 520, y: 310 },
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Edit fret 3/5 on string 3, slots 5 through 8" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Resize start of fret 3/5" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Resize end of fret 3/5" })).toBeInTheDocument();
  },
};

export const DragDropReplacesOnDrop: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [
          { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
          { id: "note-2", stringIndex: 2, position: 9, fret: 5 },
        ],
      },
    ]),
  },
  play: async ({ canvas }) => {
    const draggedNote = canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 5" });
    const dropSlot = canvas.getByLabelText("Set string 3 slot 10");
    const startRect = draggedNote.getBoundingClientRect();
    const endRect = dropSlot.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };
    const endPoint = {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
    };

    fireEvent.pointerDown(draggedNote, {
      ...startPoint,
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(draggedNote, {
      ...endPoint,
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
    });

    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 3, slot 10" })).toBeInTheDocument();

    fireEvent.pointerUp(draggedNote, {
      ...endPoint,
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
    });

    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 3, slot 10" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Edit fret 5 on string 3, slot 10" })).not.toBeInTheDocument();
  },
};

export const DraggingMeasureVisualState: Story = {
  args: {
    initialState: {
      ...makeEditorState([
        {
          id: "measure-1",
          title: "Intro",
          notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
        },
        {
          id: "measure-2",
          notes: [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }],
        },
      ]),
      mode: {
        type: "dragging-measure",
        measureId: "measure-1",
        originIndex: 0,
        currentTargetIndex: 2,
        pointer: { x: 520, y: 310 },
        overTrash: false,
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("Drop measure to delete")).toBeInTheDocument();
    await expect(canvasElement.querySelector(".banjo-tab-measure-drag-preview")).toHaveTextContent("Intro");
  },
};

export const SelectingNotesVisualState: Story = {
  args: {
    initialState: {
      ...selectionEditorState(),
      mode: {
        type: "selecting-notes",
        measureId: "measure-1",
        start: { stringIndex: 0, position: 4 },
        current: { stringIndex: 3, position: 7 },
        pointer: { x: 460, y: 280 },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".banjo-tab-selection-region")).toBeInTheDocument();
  },
};

export const SelectAndCopyNotesInteraction: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  play: async ({ canvas, canvasElement }) => {
    const startSlot = canvas.getAllByLabelText("Set string 1 slot 5")[0];
    const endSlot = canvas.getAllByLabelText("Set string 4 slot 8")[0];
    const previewTarget = canvas.getAllByLabelText("Set string 1 slot 11")[1];
    const startRect = startSlot.getBoundingClientRect();
    const endRect = endSlot.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };
    const endPoint = {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
    };

    fireEvent.pointerDown(startSlot, {
      ...startPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerMove(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerUp(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.click(startSlot, { shiftKey: true });

    await expect(canvas.getByRole("button", { name: "Copy selected notes" })).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll(".banjo-tab-note[data-selected='true']").length).toBe(3);

    await userEvent.click(canvas.getByRole("button", { name: "Copy selected notes" }));
    fireEvent.pointerOver(previewTarget, {
      pointerType: "mouse",
    });

    await expect(canvasElement.querySelector(".banjo-tab-note--paste-preview")).toBeInTheDocument();
  },
};

export const ColumnSelectionInteraction: Story = {
  args: {
    initialState: verticalSlotSelectionEditorState(),
  },
  play: async ({ canvas, canvasElement }) => {
    const measureGrid = canvas.getByRole("grid", { name: "Tablature Column test" });
    const startSlot = canvas.getByLabelText("Set string 3 slot 1");
    const endSlot = canvas.getByLabelText("Set string 3 slot 2");
    const upperGapSlot = canvas.getByLabelText("Set string 2 slot 1");
    const lowerGapSlot = canvas.getByLabelText("Set string 3 slot 1");
    const startRect = startSlot.getBoundingClientRect();
    const endRect = endSlot.getBoundingClientRect();
    const upperGapRect = upperGapSlot.getBoundingClientRect();
    const lowerGapRect = lowerGapSlot.getBoundingClientRect();
    const gapY = (upperGapRect.bottom + lowerGapRect.top) / 2;

    fireEvent.pointerDown(measureGrid, {
      clientX: startRect.left + startRect.width / 2,
      clientY: gapY,
      button: 0,
      pointerId: 12,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerMove(measureGrid, {
      clientX: endRect.left + endRect.width / 2,
      clientY: gapY,
      button: 0,
      pointerId: 12,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerUp(measureGrid, {
      clientX: endRect.left + endRect.width / 2,
      clientY: gapY,
      button: 0,
      pointerId: 12,
      pointerType: "mouse",
      shiftKey: true,
    });

    await expect(canvas.getByRole("button", { name: "Copy selected notes" })).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll(".banjo-tab-note[data-selected='true']").length).toBe(2);
    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 1" })).toHaveAttribute("data-selected", "true");
    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 5, slot 1" })).toHaveAttribute("data-selected", "true");
  },
};

export const KeyboardCopyPasteInteraction: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  play: async ({ canvas }) => {
    const startSlot = canvas.getAllByLabelText("Set string 1 slot 5")[0];
    const endSlot = canvas.getAllByLabelText("Set string 4 slot 8")[0];
    const pasteSlot = canvas.getAllByLabelText("Set string 1 slot 11")[1];
    const startRect = startSlot.getBoundingClientRect();
    const endRect = endSlot.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };
    const endPoint = {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
    };

    fireEvent.pointerDown(startSlot, {
      ...startPoint,
      button: 0,
      pointerId: 10,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerMove(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 10,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerUp(startSlot, {
      ...endPoint,
      button: 0,
      pointerId: 10,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.click(startSlot, { shiftKey: true });

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    pasteSlot.focus();
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 11" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 3 on string 2, slot 12" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 5 on string 4, slot 14" })).toBeInTheDocument();
  },
};

export const RepeatPasteWithModifierClickInteraction: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  play: async ({ canvas }) => {
    const startSlot = canvas.getAllByLabelText("Set string 1 slot 5")[0];
    const endSlot = canvas.getAllByLabelText("Set string 4 slot 8")[0];
    const firstPasteSlot = canvas.getAllByLabelText("Set string 1 slot 9")[0];
    const secondPasteSlot = canvas.getAllByLabelText("Set string 1 slot 13")[0];
    const startRect = startSlot.getBoundingClientRect();
    const endRect = endSlot.getBoundingClientRect();

    fireEvent.pointerDown(startSlot, {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
      button: 0,
      pointerId: 11,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerMove(startSlot, {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
      button: 0,
      pointerId: 11,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.pointerUp(startSlot, {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height / 2,
      button: 0,
      pointerId: 11,
      pointerType: "mouse",
      shiftKey: true,
    });
    fireEvent.click(startSlot, { shiftKey: true });

    await userEvent.click(canvas.getByRole("button", { name: "Copy selected notes" }));
    fireEvent.click(firstPasteSlot, { ctrlKey: true });
    fireEvent.click(secondPasteSlot);

    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 9" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 2 on string 1, slot 13" })).toBeInTheDocument();
  },
};

export const DragDropMeasureReorders: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
      },
      {
        id: "measure-2",
        notes: [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }],
      },
    ]),
  },
  play: async ({ canvas, canvasElement }) => {
    const handle = canvas.getByRole("button", { name: "Drag Measure 1" });
    const measuresBefore = canvasElement.querySelectorAll(".banjo-tab-measure");
    const startRect = handle.getBoundingClientRect();
    const endRect = measuresBefore[1].getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };
    const endPoint = {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height * 0.75,
    };

    fireEvent.pointerDown(handle, {
      ...startPoint,
      button: 0,
      pointerId: 2,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(handle, {
      ...endPoint,
      button: 0,
      pointerId: 2,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(handle, {
      ...endPoint,
      button: 0,
      pointerId: 2,
      pointerType: "mouse",
    });

    const measuresAfter = canvasElement.querySelectorAll(".banjo-tab-measure");
    await expect(within(measuresAfter[0] as HTMLElement).getByRole("button", { name: "Edit measure 1 title: Measure 2" })).toBeInTheDocument();
    await expect(within(measuresAfter[1] as HTMLElement).getByRole("button", { name: "Edit measure 2 title: Measure 1" })).toBeInTheDocument();
    await expect(within(measuresAfter[0] as HTMLElement).getByRole("button", { name: /Edit fret 3/ })).toBeInTheDocument();
    await expect(within(measuresAfter[1] as HTMLElement).getByRole("button", { name: /Edit fret 2/ })).toBeInTheDocument();
  },
};

export const DragDropMeasureFromHeaderReorders: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        title: "Intro",
        notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
      },
      {
        id: "measure-2",
        title: "Break",
        notes: [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }],
      },
    ]),
  },
  play: async ({ canvasElement }) => {
    const measuresBefore = canvasElement.querySelectorAll(".banjo-tab-measure");
    const header = measuresBefore[0]?.querySelector(".banjo-tab-measure-header");
    const targetMeasure = measuresBefore[1];

    if (!(header instanceof HTMLElement) || !(targetMeasure instanceof HTMLElement)) {
      throw new Error("Measure header did not render");
    }

    const startRect = header.getBoundingClientRect();
    const endRect = targetMeasure.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.right - 28,
      clientY: startRect.top + startRect.height / 2,
    };
    const endPoint = {
      clientX: endRect.left + endRect.width / 2,
      clientY: endRect.top + endRect.height * 0.75,
    };

    fireEvent.pointerDown(header, {
      ...startPoint,
      button: 0,
      pointerId: 4,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(header, {
      ...endPoint,
      button: 0,
      pointerId: 4,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(header, {
      ...endPoint,
      button: 0,
      pointerId: 4,
      pointerType: "mouse",
    });

    const measuresAfter = canvasElement.querySelectorAll(".banjo-tab-measure");
    await expect(within(measuresAfter[0] as HTMLElement).getByRole("button", { name: "Edit measure 1 title: Break" })).toBeInTheDocument();
    await expect(within(measuresAfter[1] as HTMLElement).getByRole("button", { name: "Edit measure 2 title: Intro" })).toBeInTheDocument();
  },
};

export const DragDropOnlyMeasureToDeleteClearsNotes: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [{ id: "note-1", stringIndex: 0, position: 4, fret: 2 }],
      },
    ]),
  },
  play: async ({ canvas }) => {
    const handle = canvas.getByRole("button", { name: "Drag Measure 1" });
    const startRect = handle.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };

    fireEvent.pointerDown(handle, {
      ...startPoint,
      button: 0,
      pointerId: 3,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(handle, {
      clientX: startPoint.clientX,
      clientY: startPoint.clientY + 40,
      button: 0,
      pointerId: 3,
      pointerType: "mouse",
    });

    const trashZone = canvas.getByText("Drop measure to delete").closest(".banjo-tab-trash-zone");
    const trashRect = trashZone?.getBoundingClientRect();

    if (!trashRect) {
      throw new Error("Trash zone did not render");
    }

    const endPoint = {
      clientX: trashRect.left + trashRect.width / 2,
      clientY: trashRect.top + trashRect.height / 2,
    };
    fireEvent.pointerMove(handle, {
      ...endPoint,
      button: 0,
      pointerId: 3,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(handle, {
      ...endPoint,
      button: 0,
      pointerId: 3,
      pointerType: "mouse",
    });

    await expect(canvas.queryByRole("button", { name: /Edit fret 2/ })).not.toBeInTheDocument();
    await expect(canvas.getByLabelText("Measure 1")).toBeInTheDocument();
  },
};

export const MobileLikeNarrowWidth: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [
          { id: "note-1", stringIndex: 0, position: 1, fret: 0 },
          { id: "note-2", stringIndex: 2, position: 7, fret: 4 },
          { id: "note-3", stringIndex: 4, position: 14, fret: 7 },
        ],
      },
    ]),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const MobileLongTitleFloatingControls: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const longTitle = "Foggy Mountain Breakdown melodic backup arrangement";

    await userEvent.click(canvas.getByRole("button", { name: "Edit title: Untitled" }));
    const titleInput = canvas.getByLabelText("Edit title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, `${longTitle}{Enter}`);

    const titleButton = await canvas.findByRole("button", { name: `Edit title: ${longTitle}` });
    const headerActions = canvasElement.querySelector(".banjo-tab-header-actions");

    if (!(headerActions instanceof HTMLElement)) {
      throw new Error("Header actions did not render");
    }

    await expect(getComputedStyle(titleButton).whiteSpace).toBe("nowrap");
    await expect(getComputedStyle(titleButton).textOverflow).toBe("ellipsis");
    await expect(getComputedStyle(headerActions).position).toBe("fixed");

    await userEvent.click(canvas.getByLabelText("Add measure"));
    await expect(canvas.getByLabelText("Measure 2")).toBeInTheDocument();
  },
};

export const MobileSelectionButtonPressed: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  play: async ({ canvas }) => {
    const selectionButton = canvas.getByRole("button", { name: "Select notes" });
    const addMeasureButton = canvas.getByRole("button", { name: "Add measure" });

    await userEvent.click(selectionButton);
    await expect(selectionButton).toHaveAttribute("aria-pressed", "true");
    await expect(addMeasureButton).toBeInTheDocument();
  },
};

export const ShiftSelectionButtonPressed: Story = {
  args: {
    initialState: selectionEditorState(),
  },
  play: async ({ canvas }) => {
    const selectionButton = canvas.getByRole("button", { name: "Select notes" });

    await expect(selectionButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.keyDown(window, { key: "Shift" });
    await expect(selectionButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyUp(window, { key: "Shift" });
    await expect(selectionButton).toHaveAttribute("aria-pressed", "false");
  },
};

export const MobileNarrowArticulatedNotes: Story = {
  args: {
    initialState: makeEditorState([
      {
        id: "measure-1",
        notes: [
          { id: "note-1", stringIndex: 0, position: 1, fret: 2, durationSlots: 2, articulation: { type: "hammer-on", targetFret: 4 } },
          { id: "note-2", stringIndex: 2, position: 7, fret: 5, durationSlots: 3, articulation: { type: "slide", targetFret: 2 } },
          { id: "note-3", stringIndex: 4, position: 14, fret: 7, articulation: { type: "bend" } },
        ],
      },
    ]),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Edit fret 2h4 on string 1, slots 2 through 3" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit fret 5\\2 on string 3, slots 8 through 10" })).toBeInTheDocument();
  },
};

function selectionEditorState(): BanjoTabEditorState {
  return makeEditorState([
    {
      id: "measure-1",
      title: "Intro",
      notes: [
        { id: "note-1", stringIndex: 0, position: 4, fret: 2 },
        { id: "note-2", stringIndex: 1, position: 5, fret: 3 },
        { id: "note-3", stringIndex: 3, position: 7, fret: 5 },
      ],
    },
    {
      id: "measure-2",
      title: "Repeat",
      notes: [{ id: "note-4", stringIndex: 2, position: 8, fret: 7 }],
    },
  ]);
}

function verticalSlotSelectionEditorState(): BanjoTabEditorState {
  return makeEditorState([
    {
      id: "measure-1",
      title: "Column test",
      notes: [
        { id: "note-1", stringIndex: 0, position: 0, fret: 2 },
        { id: "note-2", stringIndex: 4, position: 0, fret: 5 },
        { id: "note-3", stringIndex: 2, position: 4, fret: 7 },
      ],
    },
  ]);
}

function editorStateWithOpenPicker(fret: number): BanjoTabEditorState {
  return {
    ...makeEditorState([
      {
        id: "measure-1",
        notes: [{ id: "note-1", stringIndex: 1, position: 5, fret }],
      },
    ]),
    mode: {
      type: "fret-picker",
      location: { measureId: "measure-1", stringIndex: 1, position: 5 },
      noteId: "note-1",
      screenPoint: { x: 360, y: 210 },
    },
  };
}

function makeEditorState(
  measures: Array<{
    id: string;
    title?: string;
    notes: BanjoTabEditorState["tab"]["measures"][number]["notes"];
  }>,
): BanjoTabEditorState {
  return {
    mode: { type: "idle" },
    tab: {
      tuning: DEFAULT_TUNING,
      measures: measures.map((measure) => ({
        id: measure.id,
        title: measure.title ?? getDefaultMeasureTitle(measure.id),
        beats: 4,
        subdivision: 4,
        notes: measure.notes,
      })),
    },
  };
}
