import { apiRequest } from "./api";

export const contactCategories = {
  association: "系學會相關", activities: "系上活動", teams: "系隊相關",
  resources: "學習資料", website: "網站問題或建議", other: "其他",
};

export interface ContactSummary {
  id: string;
  name: string;
  email: string;
  category: keyof typeof contactCategories;
  subject: string;
  createdAt: string;
  readAt: string | null;
}

export interface ContactMessage extends ContactSummary { message: string }
export interface ContactList {
  items: ContactSummary[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

const base = "admin/contact-messages";
export const getContactMessages = (page = 1, read: "all" | "unread" = "all") =>
  apiRequest<ContactList>(`${base}?page=${page}&read=${read}`);
export const getContactMessage = (id: string) => apiRequest<ContactMessage>(`${base}/${encodeURIComponent(id)}`);
export async function markContactRead(id: string) {
  const { csrfToken } = await apiRequest<{ csrfToken: string }>("auth/csrf");
  return apiRequest<ContactMessage>(`${base}/${encodeURIComponent(id)}/read`, {
    method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: "{}",
  });
}
