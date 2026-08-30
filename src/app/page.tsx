"use client";

/** 根路由门控：未建档 → onboarding；建档未导入 → import；否则 → today。 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/lib/profile/store";

export default function Home() {
  const router = useRouter();
  const { profile, imports, baseline } = useProfileStore();

  useEffect(() => {
    // persist rehydrate 后再判断；zustand persist 同步 rehydrate（localStorage）
    if (!profile.agreements?.userAgreement) router.replace("/onboarding");
    else if (imports.length === 0) router.replace("/import");
    else router.replace(baseline ? "/today" : "/baseline");
  }, [profile.agreements, imports.length, baseline, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-body-md text-muted">正在进入见岸…</p>
    </main>
  );
}
