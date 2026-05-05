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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        alignItems: "center",
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        inset: 0,
        justifyContent: "center",
        position: "fixed"
      }}
    >
      <section style={{ background: "#fff", borderRadius: 8, maxWidth: 520, padding: 24, width: "90%" }}>
        <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          <h2>{title}</h2>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}

