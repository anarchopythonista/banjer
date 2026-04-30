type UndoRedoControlsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoControlsProps) {
  return (
    <div className="banjo-tab-history-controls" aria-label="Edit history">
      <button
        type="button"
        className="banjo-tab-history-button"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className="banjo-tab-history-button"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        Redo
      </button>
    </div>
  );
}
