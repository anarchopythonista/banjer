type SelectionModeButtonProps = {
  isPressed: boolean;
  onToggle: () => void;
};

export function SelectionModeButton({ isPressed, onToggle }: SelectionModeButtonProps) {
  return (
    <button
      type="button"
      className="banjo-tab-selection-mode-button"
      aria-label="Select notes"
      aria-pressed={isPressed}
      title="Select notes"
      onClick={onToggle}
    >
      <span aria-hidden="true">|</span>
    </button>
  );
}
