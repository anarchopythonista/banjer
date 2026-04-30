import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

type EditableMeasureTitleProps = {
  title: string;
  fallbackTitle: string;
  measureNumber: number;
  onCommitTitle: (title: string) => void;
};

export function EditableMeasureTitle({
  title,
  fallbackTitle,
  measureNumber,
  onCommitTitle,
}: EditableMeasureTitleProps) {
  const displayTitle = title || fallbackTitle;
  const [draftTitle, setDraftTitle] = useState(displayTitle);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraftTitle(displayTitle);
    setIsEditing(true);
  };

  const applyDraftTitle = () => {
    setIsEditing(false);
    onCommitTitle(draftTitle);
  };

  const cancelEditing = () => {
    setDraftTitle(displayTitle);
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

  const stopHeaderDrag = (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="banjo-tab-measure-title">
      {isEditing ? (
        <input
          ref={inputRef}
          className="banjo-tab-measure-title-input"
          value={draftTitle}
          aria-label={`Edit measure ${measureNumber} title`}
          data-measure-header-interactive="true"
          onBlur={cancelEditing}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          onPointerDown={stopHeaderDrag}
        />
      ) : (
        <button
          type="button"
          className="banjo-tab-measure-title-button"
          aria-label={`Edit measure ${measureNumber} title: ${displayTitle}`}
          data-measure-header-interactive="true"
          onClick={startEditing}
          onPointerDown={stopHeaderDrag}
        >
          {displayTitle}
        </button>
      )}
    </div>
  );
}
