import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import "../BanjoTabEditor.css";
import { DocumentMenuButton } from "./DocumentMenuButton";

const meta = {
  title: "Components/BanjoTabEditor/DocumentMenuButton",
  component: DocumentMenuButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="banjo-tab-editor" style={{ minHeight: "auto", padding: 24 }}>
        <div className="banjo-tab-document-controls">
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    activeDocumentId: null,
    savedTabs: [],
    onNewFile: fn(),
    onLoadFile: fn(),
  },
} satisfies Meta<typeof DocumentMenuButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewFileOnly: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await expect(canvas.getByRole("menuitem", { name: "New file..." })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("menuitem", { name: "New file..." }));
    await expect(args.onNewFile).toHaveBeenCalled();
  },
};

export const SavedFiles: Story = {
  args: {
    activeDocumentId: "doc-2",
    savedTabs: [
      {
        id: "doc-1",
        title: "Cripple Creek",
        updatedAt: "2026-04-29T14:30:00.000Z",
      },
      {
        id: "doc-2",
        title: "Foggy Mountain",
        updatedAt: "2026-04-29T15:00:00.000Z",
      },
    ],
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await expect(canvas.getByRole("menuitem", { name: "Foggy Mountain" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await userEvent.click(canvas.getByRole("menuitem", { name: "Cripple Creek" }));
    await expect(args.onLoadFile).toHaveBeenCalledWith("doc-1");
  },
};
