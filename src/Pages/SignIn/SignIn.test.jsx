import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignIn from "./SignIn";
import { useAuth } from "../../contexts/authContext";
import { doSignInWithEmailAndPassword } from "../../firebase/auth";

jest.mock("../../contexts/authContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../firebase/auth", () => ({
  doSignInWithEmailAndPassword: jest.fn(),
  doSignOut: jest.fn(),
}));

describe("admin sign in", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ userLoggedIn: false, refreshSession: jest.fn() });
  });

  it("shows a local validation error for an invalid email", () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SignIn />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(doSignInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("maps invalid credentials to a clear message", async () => {
    doSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SignIn />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ADMIN@GMAIL.COM " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The email or password is incorrect.",
      ),
    );
    expect(doSignInWithEmailAndPassword).toHaveBeenCalledWith(
      "admin@gmail.com",
      "wrong-password",
    );
  });
});
