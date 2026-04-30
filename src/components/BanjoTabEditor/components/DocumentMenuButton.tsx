import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { SavedTabSummary } from "../types";

type DocumentDragApi = {
  documentPointerHandlers: {
    onPointerDown: (
      document: SavedTabSummary,
      event: ReactPointerEvent<HTMLElement>,
    ) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void;
  };
  deleteDocumentByKeyboard: (document: SavedTabSummary) => void;
  shouldSuppressClick: (id: string) => boolean;
};

type DocumentMenuButtonProps = {
  savedTabs: SavedTabSummary[];
  activeDocumentId: string | null;
  onNewFile: () => void;
  onLoadFile: (id: string) => void;
  documentDragApi?: DocumentDragApi;
};

export function DocumentMenuButton({
  savedTabs,
  activeDocumentId,
  onNewFile,
  onLoadFile,
  documentDragApi,
}: DocumentMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    requestAnimationFrame(() => {
      getMenuItems(rootRef.current)[0]?.focus();
    });
  }, [isOpen]);

  const closeMenu = ({ returnFocus }: { returnFocus: boolean }) => {
    setIsOpen(false);

    if (returnFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuItems = getMenuItems(rootRef.current);
    const currentIndex = menuItems.findIndex(
      (item) => item === document.activeElement,
    );

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        closeMenu({ returnFocus: true });
        break;
      case "ArrowDown": {
        event.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
        menuItems[nextIndex % menuItems.length]?.focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const nextIndex =
          currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
        menuItems[nextIndex]?.focus();
        break;
      }
      case "Home":
        event.preventDefault();
        menuItems[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
    }
  };

  const handleNewFile = () => {
    onNewFile();
    closeMenu({ returnFocus: true });
  };

  const handleLoadFile = (id: string) => {
    if (documentDragApi?.shouldSuppressClick(id)) {
      return;
    }

    onLoadFile(id);
    closeMenu({ returnFocus: true });
  };

  const handleDeleteFile = (document: SavedTabSummary) => {
    documentDragApi?.deleteDocumentByKeyboard(document);
    closeMenu({ returnFocus: true });
  };

  return (
    <div className="banjo-tab-document-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="banjo-tab-document-menu-button"
        aria-label="Open file menu"
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true">...</span>
      </button>
      {isOpen && (
        <div
          id={menuId}
          className="banjo-tab-document-menu-popover"
          role="menu"
          aria-label="Saved files"
          onKeyDown={handleMenuKeyDown}
        >
          <button
            type="button"
            className="banjo-tab-document-menu-item"
            role="menuitem"
            onClick={handleNewFile}
          >
            New file...
          </button>
          {savedTabs.map((savedTab) => (
            <div key={savedTab.id} className="banjo-tab-document-menu-row" role="none">
              <button
                type="button"
                className="banjo-tab-document-menu-item banjo-tab-document-menu-file"
                role="menuitem"
                aria-current={savedTab.id === activeDocumentId ? "true" : undefined}
                onPointerDown={(event) =>
                  documentDragApi?.documentPointerHandlers.onPointerDown(savedTab, event)
                }
                onPointerMove={documentDragApi?.documentPointerHandlers.onPointerMove}
                onPointerUp={documentDragApi?.documentPointerHandlers.onPointerUp}
                onPointerCancel={documentDragApi?.documentPointerHandlers.onPointerCancel}
                onLostPointerCapture={documentDragApi?.documentPointerHandlers.onLostPointerCapture}
                onClick={() => handleLoadFile(savedTab.id)}
              >
                {savedTab.title}
              </button>
              {documentDragApi && (
                <button
                  type="button"
                  className="banjo-tab-document-menu-delete"
                  role="menuitem"
                  aria-label={`Delete ${savedTab.title}`}
                  onClick={() => handleDeleteFile(savedTab)}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getMenuItems(root: HTMLDivElement | null): HTMLButtonElement[] {
  return Array.from(
    root?.querySelectorAll<HTMLButtonElement>(
      ".banjo-tab-document-menu-item, .banjo-tab-document-menu-delete",
    ) ?? [],
  );
}
