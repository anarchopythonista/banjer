import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
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
