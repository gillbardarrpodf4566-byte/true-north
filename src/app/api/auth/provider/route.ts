import { NextResponse } from "next/server";
import {
  createUser,
  findUserByPhone,
  issueToken,
  linkProvider,
  listLinkedProviders,
  unlinkProvider,
  userByProvider,
  userFromToken,
  type LinkedProvider,
} from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 第三方登录/绑定（F0004/F0005）。
 * 生产：必须由微信/Apple SDK 提供授权码并在这里服务端验证，绝不接受客户端 subject。
 * E2E/本地演示：仅在 JIANAN_ALLOW_MOCK_OAUTH=1 时接受服务器预置 mock code，
 * 映射为稳定 subject；调用方无法自选身份，也无法登录任意账号。
 */
const MOCK_CODES: Record<string, { provider: LinkedProvider; subject: string }> = {
  "mock-wechat-login-code": { provider: "wechat", subject: "mock-wechat-user-001" },
  "mock-apple-login-code": { provider: "apple", subject: "mock-apple-user-001" },
  "mock-wechat-link-code": { provider: "wechat", subject: "mock-wechat-linked-001" },
  "mock-apple-link-code": { provider: "apple", subject: "mock-apple-linked-001" },
};

interface VerifiedIdentity {
  provider: LinkedProvider;
  subject: string;
}

async function verifyProviderCode(provider: LinkedProvider, code: string): Promise<VerifiedIdentity | null> {
  const mock = MOCK_CODES[code];
  if (process.env.JIANAN_ALLOW_MOCK_OAUTH === "1" && mock?.provider === provider) {
    return mock;
  }
  // 真实接入点：在此向微信/Apple token endpoint 交换授权码并验签 ID token。
  // 未接 SDK/密钥时明确拒绝，不能降级为相信客户端传来的 subject。
  return null;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: { action?: string; provider?: string; authorizationCode?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }
  const provider = body.provider === "wechat" || body.provider === "apple" ? body.provider : null;
  const code = (body.authorizationCode ?? "").trim();
  if (!provider || code.length < 3 || code.length > 2048) {
    return NextResponse.json({ ok: false, message: "第三方授权码不完整" }, { status: 400 });
  }

  const identity = await verifyProviderCode(provider, code);
  if (!identity) {
    return NextResponse.json(
      { ok: false, message: "第三方授权码验证失败或当前环境未配置 SDK" },
      { status: 401 },
    );
  }

  if (body.action === "unlink") {
    const current = currentUser(req);
    if (!current) return NextResponse.json({ ok: false, message: "请先登录手机号账号" }, { status: 401 });
    unlinkProvider(current.id, provider);
    return NextResponse.json({ ok: true, unlinked: provider, providers: listLinkedProviders(current.id) });
  }

  if (body.action === "link") {
    const current = currentUser(req);
    if (!current) return NextResponse.json({ ok: false, message: "请先登录后再绑定" }, { status: 401 });
    const existing = userByProvider(identity.provider, identity.subject);
    if (existing && existing.id !== current.id) {
      return NextResponse.json({ ok: false, message: "该第三方账号已绑定其他见岸账号，请先解绑" }, { status: 409 });
    }
    linkProvider(current.id, identity.provider, identity.subject);
    return NextResponse.json({ ok: true, linked: provider, providers: listLinkedProviders(current.id) });
  }

  // F0004 login：稳定已验证 subject 才可定位账号；首次创建仅生成内部占位手机号。
  let user = userByProvider(identity.provider, identity.subject);
  let isNew = false;
  if (!user) {
    const phone = syntheticPhone(identity.provider, identity.subject);
    user = findUserByPhone(phone) ?? createUser(phone);
    linkProvider(user.id, identity.provider, identity.subject);
    isNew = true;
  }
  let token: string;
  let expiresAt: string;
  try {
    ({ token, expiresAt } = issueToken(user.id));
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_BANNED") {
      return NextResponse.json({ ok: false, message: "该账号当前不可登录。如有疑问请联系人工客服。" }, { status: 403 });
    }
    throw error;
  }
  return NextResponse.json({
    ok: true,
    token,
    expiresAt,
    isNew,
    user: { id: user.id, phone: user.phone, nickname: user.nickname },
    providers: listLinkedProviders(user.id),
    mock: process.env.JIANAN_ALLOW_MOCK_OAUTH === "1" ? { provider, note: "仅 E2E/本地 mock 授权码，不可在生产启用。" } : undefined,
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  const current = currentUser(req);
  if (!current) return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  return NextResponse.json({ ok: true, providers: listLinkedProviders(current.id) });
}

function currentUser(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return userFromToken(token);
}

function syntheticPhone(provider: LinkedProvider, subject: string): string {
  const prefix = provider === "wechat" ? "199" : "198";
  let h = 2166136261;
  for (let i = 0; i < subject.length; i++) h = Math.imul(h ^ subject.charCodeAt(i), 16777619);
  return prefix + String(h >>> 0).slice(-8).padStart(8, "0");
}
