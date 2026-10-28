import type { CmsRole } from '../../../../shared/cms-contract';

export interface AdminUser {
  id: string;
  username: string;
  role: CmsRole;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      ...options, credentials: "same-origin", cache: "no-store",
    });
  } catch {
    throw new AuthError(0, "無法連線至伺服器，請稍後重試。");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AuthError(response.status,
      response.status < 500 && typeof data?.message === "string"
        ? data.message : "服務暫時無法使用，請稍後重試。");
  }
  if (!data) throw new AuthError(0, "服務回應異常，請稍後重試。");
  return data as T;
}

const request = <T,>(path: string, options?: RequestInit) => apiRequest<T>(`auth/${path}`, options);

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
