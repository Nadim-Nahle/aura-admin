import { auth } from "../firebase/firebase";

export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL ||
  "https://us-central1-aura-9c98c.cloudfunctions.net/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const extractMessage = (body, fallback) => {
  const message = body?.message;
  if (Array.isArray(message)) {
    return message.join(" ");
  }
  return typeof message === "string" && message.trim() ? message : fallback;
};

export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (error instanceof ApiError) {
    return error.message;
  }
  return typeof error?.message === "string" && error.message.trim()
    ? error.message
    : fallback;
};

export async function apiRequestWithResponse(path, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      "Unable to reach GrowFitness. Check your connection and try again.",
      0,
      error,
    );
  }
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      await auth.signOut().catch(() => undefined);
    }
    throw new ApiError(
      extractMessage(body, `Request failed with status ${response.status}`),
      response.status,
      body,
    );
  }

  return {
    data: body,
    headers: response.headers,
    status: response.status,
  };
}

export async function apiRequest(path, options = {}) {
  const response = await apiRequestWithResponse(path, options);
  return response.data;
}

export function jsonRequest(path, method, body) {
  return apiRequest(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
