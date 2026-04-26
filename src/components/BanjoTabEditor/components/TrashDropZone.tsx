type TrashDropZoneProps = {
  isActive: boolean;
  isOverTrash: boolean;
  onRegister: (element: HTMLDivElement | null) => void;
};

export function TrashDropZone({ isActive, isOverTrash, onRegister }: TrashDropZoneProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div ref={onRegister} className="banjo-tab-trash-zone" data-over-trash={isOverTrash || undefined}>
      <span className="banjo-tab-trash-icon" aria-hidden="true">
        Delete
      </span>
      <span>Drop note to delete</span>
    </div>
  );
}
