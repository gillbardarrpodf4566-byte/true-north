"use client";

/**
 * 登录 — F0003 手机号验证码登录 / F0013 倒计时与重发保护 / F0014 异常登录恢复路径。
 * 只有显式启用的本地/E2E mock 通道才会回显验证码；生产由服务商下发。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { setToken } from "@/lib/auth/client";
import { duration } from "@/design/tokens";

type FailReason = "expired" | "wrong" | "locked" | "no_code" | "cooldown" | "rate_limited" | "channel_unavailable";

interface FailState {
  reason: FailReason;
  message: string;
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [fail, setFail] = useState<FailState | null>(null);
  const [sentCode, setSentCode] = useState<string | null>(null); // 仅 mock 通道会返回
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const startCountdown = useCallback((seconds: number): void => {
    setCountdown(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1 && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
        return Math.max(0, c - 1);
      });
    }, 1000);
  }, []);

  const send = async (): Promise<void> => {
    if (!/^1\d{10}$/.test(phone) || sending) return;
    setSending(true);
    setFail(null);
    try {
      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        retryAfter?: number;
        mock?: { code: string };
        message?: string;
        reason?: FailReason;
      };
      if (data.ok) {
        setStage("code");
        startCountdown(data.retryAfter ?? 60);
        setSentCode(data.mock?.code ?? null);
      } else {
        setFail({
          reason: data.reason ?? "cooldown",
          message: data.message ?? "发送失败，请稍后重试。",
        });
        if (data.retryAfter && data.reason === "cooldown") startCountdown(data.retryAfter);
      }
    } catch {
      setFail({
        reason: "cooldown",
        message: "网络异常，验证码没有发出。请检查网络后重试；重试不会产生额外次数。",
      });
    } finally {
      setSending(false);
    }
  };

  const verify = async (): Promise<void> => {
    if (!/^\d{6}$/.test(code)) return;
    setFail(null);
    const res = await fetch("/api/auth/sms/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      token?: string;
      isNew?: boolean;
      user?: { id: number };
      message?: string;
      reason?: FailReason;
      canResendIn?: number;
    };
    if (data.ok && data.token) {
      setToken(data.token, data.user?.id);
      // 身份命名空间切换后完整重载，避免当前内存中的上一账号状态泄露到新账号。
      window.location.assign(data.isNew ? "/onboarding" : "/today");
      return;
    }
    setFail({
      reason: data.reason ?? "wrong",
      message: data.message ?? "验证失败，请重试。",
    });
    void data.canResendIn;
  };

  const canResendNow = countdown === 0 && stage === "code";

  const providerLogin = async (provider: "wechat" | "apple"): Promise<void> => {
    setFail(null);
    const authorizationCode = provider === "wechat" ? "mock-wechat-login-code" : "mock-apple-login-code";
    const res = await fetch("/api/auth/provider", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "login", provider, authorizationCode }),
    });
    const data = (await res.json()) as { ok: boolean; token?: string; isNew?: boolean; user?: { id: number }; message?: string };
    if (data.ok && data.token) {
      setToken(data.token, data.user?.id);
      window.location.assign(data.isNew ? "/onboarding" : "/today");
    } else setFail({ reason: "wrong", message: data.message ?? "第三方登录失败，请改用手机号登录。" });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-margin-mobile pb-xl pt-xl">
      <header>
        <p className="text-micro text-primary">见岸</p>
        <h1 className="mt-sm text-headline-xl text-ink">登录</h1>
        <p className="mt-sm text-body-sm text-muted">
          尚未注册的手机号验证后将自动创建账号。也可以先{" "}
          <Link href="/onboarding" className="text-primary underline-offset-2 hover:underline">
            不登录，直接体验
          </Link>
          。
        </p>
      </header>

      <Card className="mt-xl">
        <label className="block">
          <span className="text-label-md text-muted">手机号</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
            inputMode="numeric"
            aria-label="手机号"
            placeholder="11 位手机号"
            disabled={stage === "code"}
            className="mt-xs h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-button-md text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none disabled:bg-surface-soft"
          />
        </label>

        {stage === "code" ? (
          <label className="mt-lg block">
            <span className="text-label-md text-muted">验证码</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              inputMode="numeric"
              aria-label="验证码"
              placeholder="6 位数字"
              className="mt-xs h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-button-md tracking-[0.3em] text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none"
            />
          </label>
        ) : null}

        {/* mock 短信通道回显（生产删除） */}
        {sentCode ? (
          <p className="mt-md rounded-sm bg-info-soft px-md py-sm text-caption text-info">
            【模拟短信】验证码 {sentCode}——生产环境将由短信服务商下发。
          </p>
        ) : null}

        {/* F0014：失败原因 + 恢复路径，不笼统报错 */}
        {fail ? (
          <div role="alert" className="mt-md rounded-sm border border-warning bg-warning-soft p-md">
            <p className="text-body-sm text-ink">{fail.message}</p>
            {canResendNow ? (
              <button
                type="button"
                onClick={send}
                className="mt-xs text-caption text-primary underline-offset-2 hover:underline"
              >
                重新获取验证码
              </button>
            ) : null}
          </div>
        ) : null}

        {stage === "phone" ? (
          <Button className="mt-xl" fullWidth disabled={!/^1\d{10}$/.test(phone) || sending} loading={sending} onClick={send}>
            获取验证码
          </Button>
        ) : (
          <>
            <Button className="mt-xl" fullWidth disabled={!/^\d{6}$/.test(code)} onClick={verify}>
              登录
            </Button>
            {/* F0013：倒计时与重发保护 */}
            <div className="mt-md flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStage("phone");
                  setCode("");
                  setFail(null);
                }}
                className="text-caption text-muted underline-offset-2 hover:underline"
              >
                换一个手机号
              </button>
              {canResendNow ? (
                <button
                  type="button"
                  onClick={send}
                  className="text-caption text-primary underline-offset-2 hover:underline"
                >
                  重新获取
                </button>
              ) : (
                <span
                  className="text-caption text-muted-soft tabular-nums"
                  role="timer"
                  aria-label="重发倒计时"
                >
                  {countdown}s 后可重发
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      <div className="mt-lg grid grid-cols-2 gap-sm">
        <Button variant="secondary" onClick={() => void providerLogin("wechat")}>
          微信快捷登录
        </Button>
        <Button variant="secondary" onClick={() => void providerLogin("apple")}>
          Apple 快捷登录
        </Button>
      </div>
      <p className="mt-sm text-center text-caption text-muted-soft">
        第三方登录仅用于身份识别；可在「我的」中查看或解除绑定。
      </p>
      <p className="mt-lg text-caption text-muted-soft">
        登录即代表同意《用户协议》与《隐私政策》；协议原文在首次建档时完整展示。
      </p>
      <span style={{ transitionDuration: `${duration.instant}ms` }} />
    </main>
  );
}
