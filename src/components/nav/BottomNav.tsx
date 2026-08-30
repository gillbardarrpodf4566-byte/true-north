"use client";

/**
 * BottomNav — §7.12：5 项（今日/训练/教练/进展/我的）、64px functional glass、
 * icon 20px + label 11px、active ink/primary + 轻 tint、教练不放大不悬浮（§20 Don't）。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { zIndex } from "@/design/tokens";

const items = [
  { href: "/today", label: "今日", icon: IconToday },
  { href: "/train", label: "训练", icon: IconTrain },
  { href: "/coach", label: "教练", icon: IconCoach },
  { href: "/progress", label: "进展", icon: IconProgress },
  { href: "/me", label: "我的", icon: IconMe },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 mx-auto flex h-16 max-w-[430px] items-stretch border-t border-border bg-[rgba(255,255,255,0.78)] backdrop-blur-md"
      style={{ zIndex: zIndex.functional, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-[2px] ${
              active ? "text-primary" : "text-muted"
            }`}
          >
            <Icon active={active} />
            <span className={`text-micro ${active ? "font-medium" : ""}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function iconCls(active: boolean): string {
  return active ? "stroke-primary" : "stroke-muted";
}

function IconToday({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-[2px]">
      <circle cx="10" cy="10" r="7.5" className={iconCls(active)} strokeWidth="1.5" />
      <path d="M4.5 12.5h11" className={iconCls(active)} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 9.5l2-2 1.5 1.5 1.5-1.5" className={iconCls(active)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrain({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-[2px]">
      <rect x="4" y="3" width="12" height="14" rx="2" className={iconCls(active)} strokeWidth="1.5" />
      <path d="M7 7h6M7 10h6M7 13h3.5" className={iconCls(active)} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCoach({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-[2px]">
      <path
        d="M10 3.5c3.6 0 6.5 2.6 6.5 6 0 2.2-1.6 3.8-4 3.8h-1.2c-1 0-1.8.8-1.8 1.7 0 .6-.5 1.5-1.5 1.5-2.6 0-4.5-2.9-4.5-6.5 0-3.7 2.9-6.5 6.5-6.5Z"
        className={iconCls(active)}
        strokeWidth="1.5"
      />
      <circle cx="8" cy="9" r="1" className={active ? "fill-primary" : "fill-muted"} />
      <circle cx="12.5" cy="9" r="1" className={active ? "fill-primary" : "fill-muted"} />
    </svg>
  );
}

function IconProgress({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-[2px]">
      <path d="M4 16.5v-5M10 16.5v-9M16 16.5v-13" className={iconCls(active)} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconMe({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-[2px]">
      <circle cx="10" cy="7" r="3" className={iconCls(active)} strokeWidth="1.5" />
      <path d="M4.5 16.5c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2" className={iconCls(active)} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
