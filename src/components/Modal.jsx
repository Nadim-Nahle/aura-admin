import React, { useEffect, useId, useRef } from "react";
import "./Modal.css";

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  busy = false,
  wide = false,
}) => {
  const titleId = useId();
  const modalRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={modalRef}
        className={`modal-content${wide ? " modal-content--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">GrowFitness admin</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="modal-body">{children ?? message}</div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <span className="button-spinner" aria-hidden="true" />}
            {busy ? "Working…" : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
};

export default Modal;
