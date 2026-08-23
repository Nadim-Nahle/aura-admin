import { apiRequest, apiRequestWithResponse, ApiError } from "./client";
import { auth } from "../firebase/firebase";
import { getAppCheckHeader } from "../firebase/appCheck";

jest.mock("../firebase/firebase", () => ({
  auth: {
    currentUser: { getIdToken: jest.fn() },
    signOut: jest.fn(),
  },
}));

jest.mock("../firebase/appCheck", () => ({
  getAppCheckHeader: jest.fn(),
}));

describe("authenticated API client", () => {
  const response = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue("firebase-token");
    auth.signOut.mockResolvedValue(undefined);
    getAppCheckHeader.mockResolvedValue(null);
  });

  it("sends an App Check token when protection is configured", async () => {
    getAppCheckHeader.mockResolvedValue("app-check-token");
    global.fetch = jest.fn().mockResolvedValue(response(200, { ok: true }));

    await apiRequest("/admin/users");

    const request = global.fetch.mock.calls[0];
    expect(request[1].headers.get("X-Firebase-AppCheck")).toBe(
      "app-check-token",
    );
  });

  it("sends the current Firebase ID token", async () => {
    global.fetch = jest.fn().mockResolvedValue(response(200, { ok: true }));

    await apiRequest("/admin/users");

    const request = global.fetch.mock.calls[0];
    expect(request[1].headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
  });

  it("exposes pagination response headers when requested", async () => {
    const apiResponse = response(200, [{ id: "member-1" }]);
    apiResponse.headers.get = jest.fn((name) =>
      name.toLowerCase() === "content-type"
        ? "application/json"
        : name.toLowerCase() === "x-next-page-token"
          ? "next-token"
          : null,
    );
    global.fetch = jest.fn().mockResolvedValue(apiResponse);

    const result = await apiRequestWithResponse("/admin/users?limit=50");

    expect(result.data).toEqual([{ id: "member-1" }]);
    expect(result.headers.get("X-Next-Page-Token")).toBe("next-token");
  });

  it("keeps the session on a forbidden response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(response(403, { message: "Not allowed" }));

    await expect(apiRequest("/admin/users")).rejects.toEqual(
      expect.objectContaining({ status: 403, message: "Not allowed" }),
    );
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("ends the session on an unauthorized response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(response(401, { message: "Token expired" }));

    await expect(apiRequest("/admin/users")).rejects.toBeInstanceOf(ApiError);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("returns a clear message when the API cannot be reached", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiRequest("/admin/users")).rejects.toEqual(
      expect.objectContaining({
        status: 0,
        message:
          "Unable to reach GrowFitness. Check your connection and try again.",
      }),
    );
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
