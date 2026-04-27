import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type EditableDocumentTitleProps = {
  initialTitle?: string;
};

const FALLBACK_TITLE = "Untitled";

export function EditableDocumentTitle({
  initialTitle = FALLBACK_TITLE,
}: EditableDocumentTitleProps) {
  const [title, setTitle] = useState(initialTitle);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
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
    const nextTitle = draftTitle.trim() || FALLBACK_TITLE;
    setTitle(nextTitle);
    setDraftTitle(nextTitle);
    setIsEditing(false);
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

  const handleBlur = () => {
    applyDraftTitle();
  };

  return (
    <h1 id="banjo-tab-editor-title" className="banjo-tab-document-title">
      {isEditing ? (
        <input
          ref={inputRef}
          className="banjo-tab-document-title-input"
          value={draftTitle}
          aria-label="Edit title"
          onBlur={handleBlur}
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
