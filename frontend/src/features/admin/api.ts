import type { CmsRole } from "../../../../shared/cms-contract";

export interface AdminUser {
  id: string;
  username: string;
  role: CmsRole;
}

export class AuthError extends Error {
  status: number;
  fieldErrors?: { path: string; message: string }[];
  constructor(
    status: number,
    message: string,
    fieldErrors?: { path: string; message: string }[],
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    const request =
      import.meta.env.VITE_ADMIN_SOURCE === "mock"
        ? (await loadAdminMock()).mockRequest
        : fetch;
    response = await request(`/api/v1/${path}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AuthError(0, "無法連線至伺服器，請稍後重試。");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AuthError(
      response.status,
      response.status < 500 && typeof data?.message === "string"
        ? data.message
        : "服務暫時無法使用，請稍後重試。",
      data?.fieldErrors,
    );
  }
  if (!data) throw new AuthError(0, "服務回應異常，請稍後重試。");
  return data as T;
}

const request = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(`auth/${path}`, options);

async function mutate<T>(path: string, body: object = {}): Promise<T> {
  const { csrfToken } = await request<{ csrfToken: string }>("csrf");
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
}

export const getCurrentUser = () => request<{ user: AdminUser }>("me");
export const login = (username: string, password: string) =>
  mutate<{ user: AdminUser }>("login", { username, password });
export const logout = () => mutate<{ ok: boolean }>("logout");

export const isAdminMock = import.meta.env.VITE_ADMIN_SOURCE === "mock";
export async function apiMutation<T>(
  path: string,
  method: string,
  body?: object | FormData,
): Promise<T> {
  const { csrfToken } = await apiRequest<{ csrfToken: string }>("auth/csrf");
  const multipart = body instanceof FormData;
  return apiRequest<T>(path, {
    method,
    headers: {
      "X-CSRF-Token": csrfToken,
      ...(multipart ? {} : { "Content-Type": "application/json" }),
    },
    body:
      body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
}

export async function loadAdminMock() {
  if (import.meta.env.VITE_ADMIN_SOURCE === "mock") return import("./cmsMock");
  throw new Error("目前使用正式 API 模式。");
}
