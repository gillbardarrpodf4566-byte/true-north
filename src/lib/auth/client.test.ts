// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount, getToken, setToken } from "./client";

/** F0332/F0334：注销账号必须同时清掉该账号的本地持久化命名空间。 */
describe("账号注销与本地数据清理", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("服务端确认后删除本账号快照，保留其他账号与访客数据", async () => {
    setToken("token-42", 42);
    localStorage.setItem("jianan-profile:user:42", JSON.stringify({ state: { profile: { nickname: "我" } } }));
    localStorage.setItem("jianan-profile:user:7", JSON.stringify({ state: { profile: { nickname: "他" } } }));
    localStorage.setItem("jianan-profile:guest", JSON.stringify({ state: { profile: { nickname: "访客" } } }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));

    await expect(deleteAccount()).resolves.toBe(true);
    expect(localStorage.getItem("jianan-profile:user:42")).toBeNull();
    expect(localStorage.getItem("jianan-profile:user:7")).not.toBeNull();
    expect(localStorage.getItem("jianan-profile:guest")).not.toBeNull();
    expect(localStorage.getItem("jianan-active-profile")).toBe("guest");
    expect(getToken()).toBeNull();
  });

  it("服务端拒绝时既不删本地数据也不清 token", async () => {
    setToken("token-42", 42);
    localStorage.setItem("jianan-profile:user:42", JSON.stringify({ state: {} }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 401 })));

    await expect(deleteAccount()).resolves.toBe(false);
    expect(localStorage.getItem("jianan-profile:user:42")).not.toBeNull();
    expect(localStorage.getItem("jianan-active-profile")).toBe("user:42");
    expect(getToken()).toBe("token-42");
  });
});
