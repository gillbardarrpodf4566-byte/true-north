"use client";

import { clearActiveProfileNamespace, selectProfileNamespace } from "@/lib/profile/store";

/** 客户端鉴权工具：token 存 localStorage，请求自动带 Bearer。 */
const TOKEN_KEY = "jianan-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string, userId?: number): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (userId != null) selectProfileNamespace(`user:${userId}`);
  } catch {
    // 隐私模式等场景：登录态仅本次会话有效
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    // 登出立即切回独立访客空间，不能让下一个账号继承当前账号的本地学习历史。
    selectProfileNamespace("guest");
  } catch {
    // ignore
  }
}

export interface AuthUser {
  id: number;
  phone: string;
  nickname: string | null;
}

/** GET /api/auth/me：null = 未登录 */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; user: AuthUser };
    if (data.ok) selectProfileNamespace(`user:${data.user.id}`);
    return data.ok ? data.user : null;
  } catch {
    return null;
  }
}

export async function deleteAccount(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/auth/delete", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    if (!res.ok) return false;
    // 先删除被注销账号自己的本地快照，再切回访客空间，否则旧数据会留在 localStorage 里。
    clearActiveProfileNamespace();
    clearToken();
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  const token = getToken();
  try {
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // 离线也可退出：本地 token 必清
  }
  clearToken();
}

export async function recordPermission(
  type: "notification" | "album",
  granted: boolean,
): Promise<void> {
  try {
    await fetch("/api/permissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({ type, granted }),
    });
  } catch {
    // 授权记录失败不阻塞主流程；下次授权会再写
  }
}
