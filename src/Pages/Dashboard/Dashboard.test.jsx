import React from "react";
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { apiRequest } from "../../api/client";

jest.mock("../../api/client", () => ({
  apiRequest: jest.fn(),
  getErrorMessage: jest.fn((error, fallback) => fallback || error.message),
  jsonRequest: jest.fn(),
}));
jest.mock("../../components/Navbar", () => () => <div>Navigation</div>);
jest.mock("../../contexts/authContext", () => ({
  useAuth: () => ({ currentUser: { uid: "admin-id" } }),
}));

describe("member dashboard", () => {
  it("renders members that do not have membership dates", async () => {
    apiRequest.mockResolvedValue([
      {
        id: "member-id",
        displayName: "Test Member",
        email: "member@example.com",
        phoneNumber: "+96170123456",
        role: "user",
        membership: "none",
        privateSessions: "0",
        startDate: "none",
        endDate: "none",
        profilePicture: "none",
        barcode: "none",
      },
    ]);

    render(<Dashboard />);

    expect(await screen.findByText("Test Member")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("to —")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
  });
});
