import React from "react";
import { render, screen } from "@testing-library/react";
import ReportPage from "./ReportPage";
import { apiRequest, apiRequestWithResponse } from "../../api/client";

jest.mock("../../api/client", () => ({
  apiRequest: jest.fn(),
  apiRequestWithResponse: jest.fn(),
  getErrorMessage: jest.fn((error, fallback) => fallback || error.message),
  jsonRequest: jest.fn(),
}));
jest.mock("../../components/Navbar", () => () => <div>Navigation</div>);

describe("financial report", () => {
  it("renders complete server totals with a paginated member breakdown", async () => {
    apiRequest.mockImplementation((path) =>
      path === "/admin/reports/summary"
        ? Promise.resolve({
            estimatedRevenue: 500,
            expensesTotal: 125,
            estimatedNet: 375,
            payingMembers: 20,
          })
        : Promise.resolve([]),
    );
    apiRequestWithResponse.mockResolvedValue({
      data: [
        {
          id: "member-1",
          name: "Member One",
          email: "member@example.com",
          membership: "regular",
          privateSessions: "none",
        },
      ],
      headers: new Headers({ "X-Total-Count": "1391" }),
    });

    render(<ReportPage />);

    expect(await screen.findByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("$375.00")).toBeInTheDocument();
    expect(screen.getByText("Member One")).toBeInTheDocument();
    expect(screen.getByText(/1391 members total/)).toBeInTheDocument();
  });
});
