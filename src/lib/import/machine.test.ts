import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { scoreImportMachine } from "./machine";
import type { ParseResult } from "@/lib/ai/gateway";

const parse: ParseResult = {
  platform: "粉笔",
  examLabel: "粉笔模考",
  totalScore: 128.5,
  modules: [],
  confidence: { total: "high", "module:资料分析:seconds": "medium" },
  sourceConfidence: "high",
};

const parseRisky: ParseResult = {
  ...parse,
  confidence: { total: "low", "module:常识判断:score": "missing" },
};

function actor() {
  return createActor(scoreImportMachine).start();
}

describe("成绩导入状态机（xlsx 状态机与异常）", () => {
  it("待上传 → 上传中 → 解析中 → 待确认 → 已确认", () => {
    const a = actor();
    expect(a.getSnapshot().value).toBe("待上传");
    a.send({ type: "START_UPLOAD", fileName: "a.png" });
    a.send({ type: "UPLOAD_DONE" });
    expect(a.getSnapshot().value).toBe("解析中");
    a.send({ type: "PARSE_DONE", parse });
    expect(a.getSnapshot().value).toBe("待确认");
    a.send({ type: "SUBMIT" });
    expect(a.getSnapshot().value).toBe("已确认");
  });

  it("解析失败保留原图可重试（F0041）", () => {
    const a = actor();
    a.send({ type: "START_UPLOAD", fileName: "a.png" });
    a.send({ type: "UPLOAD_DONE" });
    a.send({ type: "PARSE_FAIL", message: "解析没有成功" });
    expect(a.getSnapshot().value).toBe("解析失败");
    a.send({ type: "RETRY" });
    expect(a.getSnapshot().value).toBe("解析中");
  });

  it("低置信字段未确认时禁止提交（F0035）", () => {
    const a = actor();
    a.send({ type: "START_UPLOAD", fileName: "a.png" });
    a.send({ type: "UPLOAD_DONE" });
    a.send({ type: "PARSE_DONE", parse: parseRisky });
    a.send({ type: "SUBMIT" });
    expect(a.getSnapshot().value).toBe("待确认");
    a.send({ type: "CONFIRM_FIELD", fieldKey: "total" });
    a.send({ type: "SUBMIT" });
    expect(a.getSnapshot().value).toBe("待确认");
    a.send({ type: "EDIT_FIELD", fieldKey: "module:常识判断:score", value: "14" });
    a.send({ type: "SUBMIT" });
    expect(a.getSnapshot().value).toBe("已确认");
  });

  it("高置信无需逐项确认即可提交", () => {
    const a = actor();
    a.send({ type: "START_UPLOAD", fileName: "a.png" });
    a.send({ type: "UPLOAD_DONE" });
    a.send({ type: "PARSE_DONE", parse: { ...parse, confidence: {} } });
    a.send({ type: "SUBMIT" });
    expect(a.getSnapshot().value).toBe("已确认");
  });
});
