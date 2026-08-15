import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders an accessible dialog and closes with Escape", () => {
    const onClose = jest.fn();
    render(
      <Modal
        isOpen
        onClose={onClose}
        onConfirm={jest.fn()}
        title="Delete member"
        confirmText="Delete"
      >
        <p>Confirmation copy</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Delete member" })).toBeInTheDocument();
    expect(screen.getByText("Confirmation copy")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("blocks actions while an operation is in progress", () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    render(
      <Modal
        isOpen
        busy
        onClose={onClose}
        onConfirm={onConfirm}
        title="Save member"
      >
        Saving changes
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Close dialog" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
