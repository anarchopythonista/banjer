import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { DEFAULT_TUNING } from "./constants";
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
        notes: [{ id: "note-1", stringIndex: 2, position: 0, fret: 0 }],
      },
      {
        id: "measure-2",
        notes: [{ id: "note-2", stringIndex: 1, position: 8, fret: 3 }],
      },
      {
        id: "measure-3",
        notes: [{ id: "note-3", stringIndex: 4, position: 15, fret: 5 }],
      },
    ]),
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

export const AddMeasureInteraction: Story = {
  args: {
    initialState: makeEditorState([{ id: "measure-1", notes: [] }]),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText("Add measure"));
    await expect(canvas.getByLabelText("Measure 2")).toBeInTheDocument();
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
    await userEvent.click(canvas.getByRole("button", { name: "Fret 7" }));
    await expect(canvas.getByRole("button", { name: "Edit fret 7 on string 1, slot 1" })).toBeInTheDocument();
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
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Drop measure to delete")).toBeInTheDocument();
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
    const handle = canvas.getByRole("button", { name: "Drag measure 1" });
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
    await expect(within(measuresAfter[0] as HTMLElement).getByRole("button", { name: /Edit fret 3/ })).toBeInTheDocument();
    await expect(within(measuresAfter[1] as HTMLElement).getByRole("button", { name: /Edit fret 2/ })).toBeInTheDocument();
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
    const handle = canvas.getByRole("button", { name: "Drag measure 1" });
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

function makeEditorState(
  measures: Array<{
    id: string;
    notes: BanjoTabEditorState["tab"]["measures"][number]["notes"];
  }>,
): BanjoTabEditorState {
  return {
    mode: { type: "idle" },
    tab: {
      tuning: DEFAULT_TUNING,
      measures: measures.map((measure) => ({
        id: measure.id,
        beats: 4,
        subdivision: 4,
        notes: measure.notes,
      })),
    },
  };
}
