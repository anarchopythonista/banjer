import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent } from "storybook/test";
import "../BanjoTabEditor.css";
import { usePointerDocumentDrag } from "../hooks/usePointerDocumentDrag";
import { TrashDropZone } from "./TrashDropZone";
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

export const SavedFilesWithDeleteControls: Story = {
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
    documentDragApi: {
      documentPointerHandlers: {
        onPointerDown: fn(),
        onPointerMove: fn(),
        onPointerUp: fn(),
        onPointerCancel: fn(),
        onLostPointerCapture: fn(),
      },
      deleteDocumentByKeyboard: fn(),
      shouldSuppressClick: fn(() => false),
    },
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await userEvent.click(canvas.getByRole("menuitem", { name: "Delete Cripple Creek" }));
    await expect(args.documentDragApi?.deleteDocumentByKeyboard).toHaveBeenCalledWith({
      id: "doc-1",
      title: "Cripple Creek",
      updatedAt: "2026-04-29T14:30:00.000Z",
    });
  },
};

const deleteDocumentFromDrag = fn();
const confirmDocumentDeleteFromDrag = fn(() => true);
const deleteDocumentAfterCancel = fn();
const cancelDocumentDelete = fn(() => false);

export const DragSavedFileToTrash: Story = {
  render: () => (
    <DocumentMenuDeleteDragHarness
      onDeleteDocument={deleteDocumentFromDrag}
      confirmDeleteDocument={confirmDocumentDeleteFromDrag}
    />
  ),
  beforeEach: () => {
    deleteDocumentFromDrag.mockClear();
    confirmDocumentDeleteFromDrag.mockClear();
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    const savedFile = canvas.getByRole("menuitem", { name: "Cripple Creek" });
    const startRect = savedFile.getBoundingClientRect();
    const startPoint = {
      clientX: startRect.left + startRect.width / 2,
      clientY: startRect.top + startRect.height / 2,
    };

    fireEvent.pointerDown(savedFile, {
      ...startPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(savedFile, {
      clientX: startPoint.clientX,
      clientY: startPoint.clientY + 30,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
    });

    const trashZone = canvas.getByText("Drop tab to delete").closest(".banjo-tab-trash-zone");
    const trashRect = trashZone?.getBoundingClientRect();

    if (!trashRect) {
      throw new Error("Trash zone did not render");
    }

    const endPoint = {
      clientX: trashRect.left + trashRect.width / 2,
      clientY: trashRect.top + trashRect.height / 2,
    };
    fireEvent.pointerMove(savedFile, {
      ...endPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(savedFile, {
      ...endPoint,
      button: 0,
      pointerId: 9,
      pointerType: "mouse",
    });

    await expect(confirmDocumentDeleteFromDrag).toHaveBeenCalledWith({
      id: "doc-1",
      title: "Cripple Creek",
      updatedAt: "2026-04-29T14:30:00.000Z",
    });
    await expect(deleteDocumentFromDrag).toHaveBeenCalledWith("doc-1");
  },
};

export const CancelSavedFileDelete: Story = {
  render: () => (
    <DocumentMenuDeleteDragHarness
      onDeleteDocument={deleteDocumentAfterCancel}
      confirmDeleteDocument={cancelDocumentDelete}
    />
  ),
  beforeEach: () => {
    deleteDocumentAfterCancel.mockClear();
    cancelDocumentDelete.mockClear();
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open file menu" }));
    await userEvent.click(canvas.getByRole("menuitem", { name: "Delete Cripple Creek" }));

    await expect(cancelDocumentDelete).toHaveBeenCalledWith({
      id: "doc-1",
      title: "Cripple Creek",
      updatedAt: "2026-04-29T14:30:00.000Z",
    });
    await expect(deleteDocumentAfterCancel).not.toHaveBeenCalled();
  },
};

function DocumentMenuDeleteDragHarness({
  onDeleteDocument,
  confirmDeleteDocument,
}: {
  onDeleteDocument: (id: string) => void;
  confirmDeleteDocument: (document: {
    id: string;
    title: string;
    updatedAt: string;
  }) => boolean;
}) {
  const documentDragApi = usePointerDocumentDrag({
    onDeleteDocument,
    confirmDeleteDocument,
  });
  const trashState = documentDragApi.dragState
    ? {
        isActive: true,
        isOverTrash: documentDragApi.dragState.overTrash,
        label: "Drop tab to delete",
      }
    : {
        isActive: false,
        isOverTrash: false,
        label: "Drop tab to delete",
      };

  return (
    <>
      <DocumentMenuButton
        activeDocumentId="doc-2"
        savedTabs={[
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
        ]}
        onNewFile={fn()}
        onLoadFile={fn()}
        documentDragApi={documentDragApi}
      />
      <TrashDropZone
        isActive={trashState.isActive}
        isOverTrash={trashState.isOverTrash}
        label={trashState.label}
        onRegister={documentDragApi.registerTrashZone}
      />
      {documentDragApi.dragState && (
        <div
          className="banjo-tab-document-drag-preview"
          style={{
            left: documentDragApi.dragState.pointer.x,
            top: documentDragApi.dragState.pointer.y,
          }}
          aria-hidden="true"
        >
          {documentDragApi.dragState.document.title}
        </div>
      )}
    </>
  );
}
