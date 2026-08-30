/**
 * build-ledger — 功能清单 xlsx → 功能台账 + 应用侧规格 JSON。
 *
 * 产物：
 *   docs/05-实现/feature-ledger.md   388 条全量台账（含状态，状态人工推进）
 *   docs/05-实现/ledger-status.json  功能ID → 状态（人工维护，生成时合并保留）
 *   src/data/spec/features.json      总功能清单全量（应用追溯用）
 *   src/data/spec/loops.json         CL-01–CL-10 闭环旅程步骤
 *   src/data/spec/state-machines.json 状态机与异常（对象/状态/迁移约束）
 *   src/data/spec/roadmap.json       版本路线图
 *
 * 运行：pnpm ledger
 */
import ExcelJS from "exceljs";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const XLSX = resolve(ROOT, "docs/04-功能规格/见岸AI考公_超细颗粒度功能清单_v1.0.xlsx");
const STATUS_FILE = resolve(ROOT, "docs/05-实现/ledger-status.json");
const LEDGER_MD = resolve(ROOT, "docs/05-实现/feature-ledger.md");

const STATUSES = ["未开始", "进行中", "完成", "验收"] as const;
type Status = (typeof STATUSES)[number];

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText.map((r) => r.text).join("");
    }
    if ("result" in v) return String((v as { result: unknown }).result ?? "");
    if ("text" in v) return String((v as { text: unknown }).text ?? "");
  }
  return String(v);
}

async function main(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);

  const sheet = (name: string): ExcelJS.Worksheet => {
    const ws = wb.getWorksheet(name);
    if (!ws) throw new Error(`xlsx 缺少 sheet: ${name}`);
    return ws;
  };

  const readTable = (name: string): { header: string[]; rows: string[][] } => {
    const ws = sheet(name);
    const header = (ws.getRow(1).values as ExcelJS.CellValue[])
      .slice(1)
      .map((v) => cellText(v).trim());
    const rows: string[][] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cells = (row.values as ExcelJS.CellValue[]).slice(1).map((v) => cellText(v).trim());
      if (cells.some((c) => c !== "")) rows.push(cells);
    });
    return { header, rows };
  };

  const pick = (header: string[], row: string[], name: string): string => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`sheet 缺少列「${name}」`);
    return row[i] ?? "";
  };

  // ---- 总功能清单 ----
  const main = readTable("总功能清单");
  const features = main.rows.map((r) => ({
    id: pick(main.header, r, "功能ID"),
    seq: Number(pick(main.header, r, "序号")) || 0,
    surface: pick(main.header, r, "端"),
    module: pick(main.header, r, "一级模块"),
    submodule: pick(main.header, r, "二级模块"),
    feature: pick(main.header, r, "三级功能"),
    point: pick(main.header, r, "功能点"),
    description: pick(main.header, r, "功能说明"),
    type: pick(main.header, r, "类型标记"),
    priority: pick(main.header, r, "优先级"),
    version: pick(main.header, r, "规划版本"),
    role: pick(main.header, r, "用户角色"),
    loop: pick(main.header, r, "闭环ID"),
    mechanism: pick(main.header, r, "机制标签"),
    rules: pick(main.header, r, "核心业务规则"),
    flow: pick(main.header, r, "正常流程"),
    recovery: pick(main.header, r, "异常与恢复"),
    acceptance: pick(main.header, r, "验收要点"),
  }));
  if (features.length !== 388) throw new Error(`功能点应为 388，实得 ${features.length}`);
  const ids = new Set(features.map((f) => f.id));
  if (ids.size !== features.length) throw new Error("功能ID 存在重复");

  // ---- 闭环 ----
  const loopsTable = readTable("闭环用户旅程");
  interface LoopStep {
    loopId: string;
    loopName: string;
    step: number;
    phase: string;
    action: string;
    dataIn: string;
    decision: string;
    recovery: string;
    next: string;
  }
  const loops: LoopStep[] = loopsTable.rows.map((r) => ({
    loopId: pick(loopsTable.header, r, "闭环ID"),
    loopName: pick(loopsTable.header, r, "闭环名称"),
    step: Number(pick(loopsTable.header, r, "序号")) || 0,
    phase: pick(loopsTable.header, r, "阶段"),
    action: pick(loopsTable.header, r, "用户动作/系统动作"),
    dataIn: pick(loopsTable.header, r, "关键数据输入"),
    decision: pick(loopsTable.header, r, "决策/反馈"),
    recovery: pick(loopsTable.header, r, "异常恢复"),
    next: pick(loopsTable.header, r, "下一步"),
  }));

  // ---- 状态机 ----
  const smTable = readTable("状态机与异常");
  const stateMachines = smTable.rows.map((r) => ({
    object: pick(smTable.header, r, "对象"),
    state: pick(smTable.header, r, "状态"),
    entryCondition: pick(smTable.header, r, "允许进入条件"),
    allowedActions: pick(smTable.header, r, "允许动作"),
    successNext: pick(smTable.header, r, "成功下一状态"),
    failureNext: pick(smTable.header, r, "失败/异常状态"),
    recovery: pick(smTable.header, r, "恢复策略"),
    forbidden: pick(smTable.header, r, "禁止事项"),
  }));

  // ---- 路线图 ----
  const roadTable = readTable("版本路线图");
  const roadmap = roadTable.rows.map((r) => ({
    version: pick(roadTable.header, r, "版本"),
    goal: pick(roadTable.header, r, "阶段目标"),
    scope: pick(roadTable.header, r, "核心范围"),
    successCriteria: pick(roadTable.header, r, "成功判据"),
    notDoing: pick(roadTable.header, r, "明确不做"),
  }));

  // ---- 状态合并 ----
  type StatusMap = Record<string, Status>;
  let statuses: StatusMap = {};
  if (existsSync(STATUS_FILE)) {
    statuses = JSON.parse(readFileSync(STATUS_FILE, "utf8")) as StatusMap;
    for (const [k, v] of Object.entries(statuses)) {
      if (!ids.has(k)) console.warn(`⚠ 状态文件引用了不存在的功能ID: ${k}`);
      if (!STATUSES.includes(v)) throw new Error(`非法状态值: ${k}=${v}`);
    }
  }
  for (const f of features) if (!statuses[f.id]) statuses[f.id] = "未开始";

  // ---- 台账 md ----
  const count = (pred: (f: (typeof features)[number]) => boolean): number =>
    features.filter(pred).length;
  const mvp = features.filter((f) => f.version === "MVP");
  const byModule = new Map<string, typeof features>();
  for (const f of features) {
    const list = byModule.get(f.module) ?? [];
    list.push(f);
    byModule.set(f.module, list);
  }

  const statusBadge: Record<Status, string> = {
    未开始: " ",
    进行中: "~",
    完成: "x",
    验收: "x",
  };

  const lines: string[] = [];
  lines.push("# 见岸 · 功能台账");
  lines.push("");
  lines.push("> 由 `scripts/build-ledger.ts` 自动生成于功能清单 v1.0。状态推进：改 `ledger-status.json` 后重跑 `pnpm ledger`。");
  lines.push("");
  lines.push("## 总览");
  lines.push("");
  lines.push(`- 功能点：**${features.length}** 条（F0001–F0388）`);
  lines.push(
    `- 优先级：P0 ${count((f) => f.priority === "P0")} / P1 ${count((f) => f.priority === "P1")} / P2 ${count((f) => f.priority === "P2")}`,
  );
  lines.push(
    `- 版本：MVP ${mvp.length}（P0 ${mvp.filter((f) => f.priority === "P0").length}）/ V1 ${count((f) => f.version === "V1")} / V2 ${count((f) => f.version === "V2")} / V3 ${count((f) => f.version === "V3")}`,
  );
  lines.push(
    `- 端：用户端 ${count((f) => f.surface === "用户端")} / 管理后台 ${count((f) => f.surface === "管理后台")} / AI运营台 ${count((f) => f.surface === "AI运营台")}`,
  );
  const done = features.filter((f) => statuses[f.id] === "完成" || statuses[f.id] === "验收");
  lines.push(
    `- **MVP 进度：${mvp.filter((f) => statuses[f.id] === "完成" || statuses[f.id] === "验收").length} / ${mvp.length}**（全量 ${done.length} / ${features.length}）`,
  );
  lines.push("");
  lines.push("## 范围里程碑");
  lines.push("");
  lines.push("| 版本 | 阶段目标 | 明确不做 |");
  lines.push("|---|---|---|");
  for (const r of roadmap) {
    lines.push(`| ${r.version} | ${r.goal} | ${r.notDoing} |`);
  }
  lines.push("");
  lines.push("## 台账（按一级模块）");
  for (const [mod, list] of byModule) {
    const mvpCount = list.filter((f) => f.version === "MVP").length;
    lines.push("");
    lines.push(
      `### ${mod}（${list.length} 条 · MVP ${mvpCount}）`,
    );
    lines.push("");
    lines.push("| ID | 功能点 | 级联 | 优先级 | 版本 | 端 | 闭环 | 状态 |");
    lines.push("|---|---|---|---|---|---|---|---|");
    for (const f of list) {
      const st = statuses[f.id] ?? "未开始";
      const cascade = `${f.submodule} / ${f.feature}`;
      lines.push(
        `| [${statusBadge[st]}] ${f.id} | ${f.point} | ${cascade} | ${f.priority} | ${f.version} | ${f.surface} | ${f.loop || "-"} | ${st} |`,
      );
    }
  }
  lines.push("");

  // ---- 写盘 ----
  const write = (file: string, content: unknown): void => {
    const p = resolve(ROOT, file);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(
      p,
      typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`,
      "utf8",
    );
    console.log("✓", file);
  };

  write(LEDGER_MD, lines.join("\n"));
  write("docs/05-实现/ledger-status.json", statuses);
  write("src/data/spec/features.json", features);
  write("src/data/spec/loops.json", loops);
  write("src/data/spec/state-machines.json", stateMachines);
  write("src/data/spec/roadmap.json", roadmap);
  console.log(
    `\n台账完成：${features.length} 条 / MVP ${mvp.length} / 闭环 ${loops.length} 步 / 状态机 ${stateMachines.length} 行`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
