/**
 * 成绩导入状态机（状态机与异常 sheet「成绩导入」行 × 功能点 F0040/F0041/F0035）。
 *
 * 状态：待上传 / 上传中 / 解析中 / 待确认 / 已确认（+ 上传失败 / 解析失败 异常态）。
 * 允许进入条件 / 允许动作 / 成功下一状态 / 失败状态 / 恢复策略 / 禁止事项
 * 全部来自 xlsx「状态机与异常」sheet，逐条落进 statechart。
 */
import { setup } from "xstate";
import type { ParseResult } from "@/lib/ai/gateway";

export interface ImportFieldEdit {
  fieldKey: string;
  value: string;
}

export interface ImportContext {
  fileName: string;
  parse: ParseResult | null;
  /** 待确认页用户逐字段确认标记（F0035） */
  confirmedKeys: string[];
  /** 低置信/异常字段必须确认后才能提交 */
  editedValues: Record<string, string>;
  errorMessage: string | null;
}

export type ImportEvent =
  | { type: "START_UPLOAD"; fileName: string }
  | { type: "UPLOAD_DONE" }
  | { type: "UPLOAD_FAIL"; message: string }
  | { type: "PARSE_DONE"; parse: ParseResult }
  | { type: "PARSE_FAIL"; message: string }
  | { type: "RETRY" }
  | { type: "CANCEL" }
  | { type: "CONFIRM_FIELD"; fieldKey: string }
  | { type: "EDIT_FIELD"; fieldKey: string; value: string }
  | { type: "SUBMIT" };

export const scoreImportMachine = setup({
  types: {} as {
    context: ImportContext;
    events: ImportEvent;
  },
  guards: {
    /** 低置信字段全部确认后才允许提交（F0035 数据确认） */
    allRiskyFieldsConfirmed: ({ context }) => {
      if (!context.parse) return false;
      const risky = Object.entries(context.parse.confidence)
        .filter(([, c]) => c === "low" || c === "missing")
        .map(([k]) => k);
      return risky.every((k) => context.confirmedKeys.includes(k));
    },
  },
}).createMachine({
  id: "scoreImport",
  initial: "待上传",
  context: {
    fileName: "",
    parse: null,
    confirmedKeys: [],
    editedValues: {},
    errorMessage: null,
  },
  states: {
    待上传: {
      on: {
        START_UPLOAD: {
          target: "上传中",
          actions: ({ context, event }) => {
            context.fileName = event.fileName;
          },
        },
      },
    },
    上传中: {
      on: {
        UPLOAD_DONE: "解析中",
        UPLOAD_FAIL: {
          target: "上传失败",
          actions: ({ context, event }) => {
            context.errorMessage = event.message;
          },
        },
      },
    },
    解析中: {
      on: {
        PARSE_DONE: {
          target: "待确认",
          actions: ({ context, event }) => {
            context.parse = event.parse;
            context.confirmedKeys = [];
          },
        },
        PARSE_FAIL: {
          target: "解析失败",
          actions: ({ context, event }) => {
            context.errorMessage = event.message;
          },
        },
      },
    },
    解析失败: {
      // F0041：失败原因可见、保留原图、可重新解析
      entry: () => undefined,
      on: {
        RETRY: "解析中",
        CANCEL: { target: "待上传" },
      },
    },
    上传失败: {
      on: {
        RETRY: "上传中",
        CANCEL: { target: "待上传" },
      },
    },
    待确认: {
      on: {
        CONFIRM_FIELD: {
          actions: ({ context, event }) => {
            if (!context.confirmedKeys.includes(event.fieldKey)) {
              context.confirmedKeys.push(event.fieldKey);
            }
          },
        },
        EDIT_FIELD: {
          actions: ({ context, event }) => {
            context.editedValues[event.fieldKey] = event.value;
            if (!context.confirmedKeys.includes(event.fieldKey)) {
              context.confirmedKeys.push(event.fieldKey);
            }
          },
        },
        SUBMIT: {
          target: "已确认",
          guard: "allRiskyFieldsConfirmed",
        },
      },
    },
    已确认: {
      type: "final",
    },
  },
});

/** 禁止事项（xlsx 状态机列）在 UI 层保证：已确认 final 状态不可再编辑；
 * 解析失败时禁止提交（不处于待确认状态）；缺失字段禁止默认值填充。 */
