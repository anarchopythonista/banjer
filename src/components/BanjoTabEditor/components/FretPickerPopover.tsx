import { useEffect, useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { EditorMode, TabNoteData } from "../types";

type FretPickerPopoverProps = {
  mode: EditorMode;
  currentNote?: TabNoteData;
  onSelectFret: (fret: number) => void;
  onClose: () => void;
};

const FRETS = Array.from({ length: 23 }, (_, fret) => fret);

export function FretPickerPopover({
  mode,
  currentNote,
  onSelectFret,
  onClose,
}: FretPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const fretButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const currentFret = currentNote?.fret;

  const position = useMemo(() => {
    if (mode.type !== "fret-picker") {
      return null;
    }

    return {
      left: Math.min(Math.max(mode.screenPoint.x, 24), window.innerWidth - 24),
      top: Math.min(Math.max(mode.screenPoint.y + 18, 92), window.innerHeight - 24),
    };
  }, [mode]);

  useEffect(() => {
    if (mode.type !== "fret-picker") {
      return;
    }

    window.setTimeout(() => {
      (selectedButtonRef.current ?? firstButtonRef.current)?.focus();
    }, 0);
  }, [mode]);

  useEffect(() => {
    if (mode.type !== "fret-picker") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, onClose]);

  if (mode.type !== "fret-picker" || !position) {
    return null;
  }

  const label = currentNote ? "Edit fret" : "Choose fret";
  const handleFretGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const activeIndex = fretButtonRefs.current.findIndex((button) => button === document.activeElement);
    const currentIndex = activeIndex >= 0 ? activeIndex : currentFret ?? 0;
    const columns = 6;
    const nextIndexByKey: Record<string, number> = {
      ArrowRight: currentIndex + 1,
      ArrowLeft: currentIndex - 1,
      ArrowDown: currentIndex + columns,
      ArrowUp: currentIndex - columns,
      Home: 0,
      End: FRETS.length - 1,
    };
    const nextIndex = Math.min(Math.max(nextIndexByKey[event.key], 0), FRETS.length - 1);
    fretButtonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      ref={popoverRef}
      className="banjo-tab-fret-picker"
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-modal="false"
      aria-label={label}
    >
      <div className="banjo-tab-fret-picker-heading">
        <span>{label}</span>
        <button type="button" aria-label="Close fret picker" onClick={onClose}>
          x
        </button>
      </div>
      <div
        className="banjo-tab-fret-grid"
        role="group"
        aria-label="Frets 0 through 22"
        onKeyDown={handleFretGridKeyDown}
      >
        {FRETS.map((fret) => (
          <button
            key={fret}
            ref={(button) => {
              fretButtonRefs.current[fret] = button;
              if (fret === currentFret) {
                selectedButtonRef.current = button;
              }
              if (fret === 0) {
                firstButtonRef.current = button;
              }
            }}
            type="button"
            className="banjo-tab-fret-option"
            aria-label={`Fret ${fret}`}
            aria-pressed={fret === currentFret}
            onClick={() => onSelectFret(fret)}
          >
            {fret}
          </button>
        ))}
      </div>
    </div>
  );
}
