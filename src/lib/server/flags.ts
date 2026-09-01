import { getAiConfig } from "@/lib/server/admin";
import { featureEnabledFor, resolveFeatureFlags, isFlagEnabled } from "@/lib/ai/quality";
import { userFromToken } from "@/lib/server/db";

/**
 * 灰度主体只能来自服务端认证身份（F0359）。
 * 客户端不能自选 userKey，否则可以反复换键直到命中开放分组。
 */
export interface FlagSubject {
  key: string;
  authenticated: boolean;
}

export function flagSubject(req: Request): FlagSubject {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = userFromToken(token);
  return user ? { key: `user:${user.id}`, authenticated: true } : { key: "anonymous", authenticated: false };
}

export function flagStates(subject: FlagSubject): Array<{ key: string; enabled: boolean }> {
  return resolveFeatureFlags(getAiConfig("feature_flags")).map((flag) => ({
    key: flag.key,
    enabled: isFlagEnabled(flag, subject.key),
  }));
}

/** 接口侧强制：灰度未覆盖的主体直接拒绝，不能只靠前端隐藏入口。 */
export function requireFeature(req: Request, key: string): { ok: true; subject: FlagSubject } | { ok: false; status: 403; message: string } {
  const subject = flagSubject(req);
  if (featureEnabledFor(getAiConfig("feature_flags"), key, subject.key)) {
    return { ok: true, subject };
  }
  return { ok: false, status: 403, message: "该功能尚未对你的账号开放。" };
}
