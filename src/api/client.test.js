import { apiRequest, ApiError } from "./client";
import { auth } from "../firebase/firebase";

jest.mock("../firebase/firebase", () => ({
  auth: {
    currentUser: { getIdToken: jest.fn() },
    signOut: jest.fn(),
  },
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
  });

  it("sends the current Firebase ID token", async () => {
    global.fetch = jest.fn().mockResolvedValue(response(200, { ok: true }));

    await apiRequest("/admin/users");

    const request = global.fetch.mock.calls[0];
    expect(request[1].headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
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
