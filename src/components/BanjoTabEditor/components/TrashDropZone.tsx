type TrashDropZoneProps = {
  isActive: boolean;
  isOverTrash: boolean;
  label?: string;
  onRegister: (element: HTMLDivElement | null) => void;
};

export function TrashDropZone({
  isActive,
  isOverTrash,
  label = "Drop note to delete",
  onRegister,
}: TrashDropZoneProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div ref={onRegister} className="banjo-tab-trash-zone" data-over-trash={isOverTrash || undefined}>
      <span className="banjo-tab-trash-icon" aria-hidden="true">
        Delete
      </span>
      <span>{label}</span>
    </div>
  );
}
