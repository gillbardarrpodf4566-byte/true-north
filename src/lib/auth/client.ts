"use client";

/** 客户端鉴权工具：token 存 localStorage，请求自动带 Bearer。 */
const TOKEN_KEY = "jianan-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 隐私模式等场景：登录态仅本次会话有效
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
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
    return data.ok ? data.user : null;
  } catch {
    return null;
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
