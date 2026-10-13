import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="site-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
    >
      <div className="dialog-panel">
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="dialog-x" onClick={onClose} aria-label="關閉視窗">×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
