"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth/client";

/**
 * V1 F0359 灰度开关客户端读取：服务端是唯一判定真源。
 * 失败关闭——判定完成前不渲染灰度能力，避免先展示后收回。
 */
export function useFeatureFlag(key: string): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = getToken();
    void fetch("/api/flags", {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => r.json())
      .then((d: { ok: boolean; flags?: Array<{ key: string; enabled: boolean }> }) => {
        const flag = d.flags?.find((f) => f.key === key);
        setEnabled(Boolean(d.ok && flag?.enabled));
      })
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, [key]);
  return { enabled, loading };
}
