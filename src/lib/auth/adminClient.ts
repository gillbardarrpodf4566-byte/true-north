"use client";

/** 员工端鉴权工具（与用户端 token 分开存）。 */
const STAFF_TOKEN_KEY = "jianan-staff-token";

export interface StaffIdentity {
  id: number;
  username: string;
  role: "operations" | "teaching" | "support" | "aiops" | "admin";
  display_name: string;
}

export function getStaffToken(): string | null {
  try {
    return localStorage.getItem(STAFF_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStaffToken(token: string): void {
  try {
    localStorage.setItem(STAFF_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearStaffToken(): void {
  try {
    localStorage.removeItem(STAFF_TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T & { ok: boolean; message?: string }> {
  const token = getStaffToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  return (await res.json()) as T & { ok: boolean; message?: string };
}

export async function staffLogin(username: string, password: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/admin/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json()) as { ok: boolean; token?: string; message?: string };
  if (data.ok && data.token) setStaffToken(data.token);
  return data;
}

export async function staffMe(): Promise<StaffIdentity | null> {
  const data = await api<{ staff: StaffIdentity }>("/api/admin/auth/me");
  return data.ok ? data.staff : null;
}

export async function staffLogout(): Promise<void> {
  await api("/api/admin/auth/logout", { method: "POST" });
  clearStaffToken();
}

export const adminApi = api;
