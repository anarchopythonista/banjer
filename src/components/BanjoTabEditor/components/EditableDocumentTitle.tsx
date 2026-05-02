import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

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
  const blurCancelTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (blurCancelTimeoutRef.current !== null) {
        window.clearTimeout(blurCancelTimeoutRef.current);
      }
    };
  }, []);

  const clearPendingBlurCancel = () => {
    if (blurCancelTimeoutRef.current !== null) {
      window.clearTimeout(blurCancelTimeoutRef.current);
      blurCancelTimeoutRef.current = null;
    }
  };

  const startEditing = () => {
    clearPendingBlurCancel();
    setDraftTitle(title);
    setIsEditing(true);
  };

  const applyDraftTitle = () => {
    clearPendingBlurCancel();
    const nextTitle = (inputRef.current?.value ?? draftTitle).trim() || FALLBACK_TITLE;
    setDraftTitle(nextTitle);
    setIsEditing(false);
    void onCommitTitle(nextTitle);
  };

  const cancelEditing = () => {
    clearPendingBlurCancel();
    setDraftTitle(title);
    setIsEditing(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyDraftTitle();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (typeof event.currentTarget.form?.requestSubmit === "function") {
        event.currentTarget.form.requestSubmit();
        return;
      }

      applyDraftTitle();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  };

  const handleBlur = () => {
    clearPendingBlurCancel();
    blurCancelTimeoutRef.current = window.setTimeout(() => {
      blurCancelTimeoutRef.current = null;
      cancelEditing();
    }, 0);
  };

  return (
    <h1 id="banjo-tab-editor-title" className="banjo-tab-document-title">
      {isEditing ? (
        <form className="banjo-tab-document-title-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="banjo-tab-document-title-input"
            value={draftTitle}
            aria-label="Edit title"
            onBlur={handleBlur}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="banjo-tab-document-title-submit"
            tabIndex={-1}
            aria-hidden="true"
          />
        </form>
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
