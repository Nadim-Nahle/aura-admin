import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { apiRequest, apiRequestWithResponse } from "../../api/client";

jest.mock("../../api/client", () => ({
  apiRequest: jest.fn(),
  apiRequestWithResponse: jest.fn(),
  getErrorMessage: jest.fn((error, fallback) => fallback || error.message),
  jsonRequest: jest.fn(),
}));
jest.mock("../../components/Navbar", () => () => <div>Navigation</div>);
jest.mock("../../contexts/authContext", () => ({
  useAuth: () => ({ currentUser: { uid: "admin-id" } }),
}));

describe("member dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the initial layout stable until members and totals are ready", async () => {
    let resolveSummary;
    let resolveMembers;
    apiRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );
    apiRequestWithResponse.mockReturnValue(
      new Promise((resolve) => {
        resolveMembers = resolve;
      }),
    );

    render(<Dashboard />);

    expect(screen.getByLabelText("Member summary")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByLabelText("Member directory")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByLabelText("Loading members")).toBeInTheDocument();

    await act(async () => {
      resolveMembers({
        data: [
          {
            id: "member-id",
            displayName: "Stable Member",
            email: "stable@example.com",
            role: "user",
            membership: "none",
            profilePicture: "none",
            barcode: "none",
          },
        ],
        headers: new Headers({ "X-Total-Count": "1" }),
      });
    });

    expect(screen.queryByText("Stable Member")).not.toBeInTheDocument();

    await act(async () => {
      resolveSummary({
        totalMembers: 1,
        activeMembers: 0,
        payingMembers: 0,
        expiringSoon: 0,
      });
    });

    expect(await screen.findByText("Stable Member")).toBeInTheDocument();
    expect(screen.getByLabelText("Member directory")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  });

  it("renders members that do not have membership dates", async () => {
    apiRequest.mockResolvedValue({
      totalMembers: 75,
      activeMembers: 10,
      payingMembers: 12,
      expiringSoon: 2,
    });
    apiRequestWithResponse.mockResolvedValue({
      data: [
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
      ],
      headers: new Headers({ "X-Total-Count": "75" }),
    });

    render(<Dashboard />);

    expect(await screen.findByText("Test Member")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("to —")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Member directory pages")).toHaveTextContent(
      "75 total",
    );
  });

  it("requests the next cursor page instead of treating the first page as complete", async () => {
    let resolveNextPage;
    apiRequest.mockResolvedValue({
      totalMembers: 75,
      activeMembers: 0,
      payingMembers: 0,
      expiringSoon: 0,
    });
    apiRequestWithResponse
      .mockResolvedValueOnce({
        data: [
          {
            id: "first-member",
            displayName: "First Page Member",
            email: "first@example.com",
            role: "user",
            membership: "none",
            profilePicture: "none",
            barcode: "none",
          },
        ],
        headers: new Headers({
          "X-Total-Count": "75",
          "X-Next-Page-Token": "next-token",
        }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNextPage = resolve;
        }),
      );

    render(<Dashboard />);
    const nextButton = await screen.findByRole("button", { name: "Next" });
    await waitFor(() => expect(nextButton).toBeEnabled());
    fireEvent.click(nextButton);

    await waitFor(() =>
      expect(apiRequestWithResponse).toHaveBeenCalledWith(
        expect.stringContaining("pageToken=next-token"),
      ),
    );
    expect(screen.getByText("First Page Member")).toBeInTheDocument();
    expect(screen.getByLabelText("Member directory")).toHaveAttribute(
      "aria-busy",
      "true",
    );

    await act(async () => {
      resolveNextPage({
        data: [
          {
            id: "second-member",
            displayName: "Second Page Member",
            email: "second@example.com",
            role: "user",
            membership: "none",
            profilePicture: "none",
            barcode: "none",
          },
        ],
        headers: new Headers({ "X-Total-Count": "75" }),
      });
    });

    expect(await screen.findByText("Second Page Member")).toBeInTheDocument();
    expect(screen.queryByText("First Page Member")).not.toBeInTheDocument();
  });
});
