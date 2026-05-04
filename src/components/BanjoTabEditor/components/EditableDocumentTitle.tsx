import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type EditableDocumentTitleProps = {
  title: string;
  onCommitTitle: (title: string) => void | Promise<void>;
};

const FALLBACK_TITLE = "Untitled";

export function EditableDocumentTitle({
  title,
  onCommitTitle,
}: EditableDocumentTitleProps) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const nextTitle = (inputRef.current?.value ?? draftTitle).trim() || FALLBACK_TITLE;
    setDraftTitle(nextTitle);
    setIsEditing(false);
    void onCommitTitle(nextTitle);
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
