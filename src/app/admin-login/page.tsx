"use client";

/** 员工登录（后台服务端化）：用户名 + 密码 → staff token。 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { staffLogin } from "@/lib/auth/adminClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fail, setFail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    setLoading(true);
    setFail(null);
    const r = await staffLogin(username.trim(), password);
    setLoading(false);
    if (r.ok) {
      router.replace("/admin");
    } else {
      setFail(r.message ?? "登录失败。");
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center px-margin-mobile pb-xl">
      <header className="mb-xl">
        <p className="text-micro text-primary">见岸 · 管理后台</p>
        <h1 className="mt-sm text-headline-xl text-ink">员工登录</h1>
        <p className="mt-sm text-body-sm text-muted">
          与考生登录相互独立；权限按角色校验（运营/教研/客服/AI运营/管理员）。
        </p>
      </header>

      <Card>
        <label className="block">
          <span className="text-label-md text-muted">用户名</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="用户名"
            className="mt-xs h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-button-md text-ink focus:border-primary focus:outline-none"
          />
        </label>
        <label className="mt-lg block">
          <span className="text-label-md text-muted">密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="密码"
            className="mt-xs h-12 w-full rounded-sm border border-border-strong bg-surface px-md text-button-md text-ink focus:border-primary focus:outline-none"
          />
        </label>

        {fail ? (
          <p role="alert" className="mt-md rounded-sm border border-warning bg-warning-soft p-md text-body-sm text-ink">
            {fail}
          </p>
        ) : null}

        <Button
          className="mt-xl"
          fullWidth
          loading={loading}
          disabled={username.trim() === "" || password === ""}
          onClick={submit}
        >
          登录
        </Button>
      </Card>

      <p className="mt-lg text-caption text-muted-soft">
        账号由系统管理员安全配发；本页不提供自助注册，也不展示任何默认口令。
      </p>
    </main>
  );
}
