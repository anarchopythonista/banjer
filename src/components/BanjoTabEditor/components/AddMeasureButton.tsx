type AddMeasureButtonProps = {
  onAddMeasure: () => void;
};

export function AddMeasureButton({ onAddMeasure }: AddMeasureButtonProps) {
  return (
    <button
      type="button"
      className="banjo-tab-add-measure"
      onClick={onAddMeasure}
      aria-label="Add measure"
    >
      <span aria-hidden="true">+</span>
    </button>
  );
}
