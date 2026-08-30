# 见岸 · MVP 验收记录

> 2026-08-30，Phase 0–5 全部完成后按 GOAL_PROMPT「完成定义」与 DESIGN.md §23 质量门槛逐项自查。
> 自动化证据：`pnpm check`（typecheck / lint / vitest / token 漂移）+ `pnpm build` + Playwright E2E。

## 1. 完成定义（GOAL_PROMPT DoD）对照

| 判据 | 状态 | 证据 |
|---|---|---|
| MVP 171 条功能点在台账中可追溯 | ✅ 165 完成 + 6 条后端/原生阻塞（spec-gaps GAP-6/7/11） | `docs/05-实现/feature-ledger.md`（每条含 ID/模块/优先级/版本/闭环/状态） |
| CL-01 建档闭环 E2E 绿 | ✅ | `tests/e2e/cl01.spec.ts`（2 例） |
| 完整日闭环（诊断→处方→训练→复盘） | ✅ | CL-02（`cl02.spec.ts` 2 例）+ CL-03（`cl03.spec.ts` 2 例） |
| 新模考触发重新诊断 | ✅ | CL-04：模考成绩入导入管线 → 基线重算 → 诊断过期自动重生成（`mock/page.tsx` + `diagnosis/page.tsx` useEffect），E2E `cl07.spec.ts` 覆盖 |
| 关键 AI 错误进入评测闭环 | ✅ | 用户纠正（导入改字段）/AI 反馈（F0319）→ 后台工单归类（F0362）→ 运营台评测集与回归门禁（`/aiops` 真实驱动 MockAiGateway + diagnose 引擎） |

## 2. 路线图 MVP 成功判据（xlsx 版本路线图）

- 用户能完成首次建档：CL-01 E2E 绿（协议→目标→上传→逐项确认→基线 v0）。
- 至少一次完整日闭环：Today 处方 → 训练作答（计时/跳题/反馈/错因）→ 总结入模 → 处方随数据与时间预算重排，E2E 绿。
- 新模考能触发重新诊断：站内模考交卷与截图导入共用导入管线，诊断 `generatedAt < baseline.computedAt` 即重算。
- 关键 AI 错误可进入评测闭环：纠正率埋点（F0386）→ 反馈归类 → parser/诊断评测集 + 零容忍门禁。

## 3. DESIGN.md §23 七项验收自查

| 门槛 | 自查结果 | 备注 |
|---|---|---|
| 23.1 50ms 第一印象 | 符合方向 | 亮/冷色调、单一焦点、无促销感；需真实用户盲测最终确认 |
| 23.2 3 秒层级 | 符合 | 每屏首元素即页面判断（Today=焦点结论、诊断=一句话、训练=进度+题干） |
| 23.3 眯眼测试 | 符合 | 每屏仅 1 个视觉重心（Horizon Focus / 题干 / 首个机会卡） |
| 23.4 色彩稀缺 | 符合 | 结构全部由中性色承载；青绿仅语义/CTA，曙光铜仅机会点；去色后布局不塌 |
| 23.5 动效因果 | 符合 | 仅 Horizon Reveal / 周复盘 morph / 展开反馈三类 Signature；微动效全部反馈型 |
| 23.6 状态完备 | 基本符合 | 四态组件（skeleton/empty/error/offline）+ 按钮 loading/disabled；P0 组件 10 态中 offline/reduced-motion 全局覆盖，个别表单态待补 |
| 23.7 高级感门槛 | 符合 | 无宫格首页、同屏 ≤1 大数字、Card 形态 ≤4 套、AI 结论均有证据入口、错误文案不羞辱 |

## 4. 硬约束执行情况

- **Token 零手抄**：`check:tokens` 扫描 src/ 全量，色值/时长/曲线/px 字号硬编码为 0（生成文件与注释豁免）。
- **规范缺口 11 项**全部记录于 `spec-gaps.md`，未混入规范原文。
- **xlsx 状态机**：成绩导入/训练任务/错因 3 台机器为 XState 显式建模，六列约束含「禁止默认归因粗心」「一次答对不算修复」「中断不丢作答」均有单测。
- **DESIGN.md 与 xlsx 未被修改**（git 历史可证）。

## 5. 已知限制（转生产前必须处理）

1. GAP-6/7：短信登录、账号恢复、通知/相册权限需后端与原生壳。
2. GAP-10：/admin 与 /aiops 为单机 mock；RBAC/审计/Provider 需服务端。
3. GAP-11：`data-correct` 测试钩子需构建开关。
4. 诊断排序常量（GAP-8）为首版基线，需真实数据校准（C18/CL-10）。
5. 性能：构建产物 First Load JS ≈ 102–117 kB（静态预渲染），Lighthouse 真机抽查待补；动效 60fps 需真机验证（§8.20）。
