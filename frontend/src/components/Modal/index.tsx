import type { ReactNode } from "react";
import { Button } from "../Button";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({ children, onClose, open, title }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="modal-panel">
        <header className="modal-header">
          <h2>{title}</h2>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
