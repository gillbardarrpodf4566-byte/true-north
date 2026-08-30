# 见岸 · Goal 模式实施提示词

> 复制下方全文作为 goal 模式的目标输入。文件路径均相对于仓库根 `G:\project\True-North`。
> 提示词正文以本仓库当前文档状态为准（2026-08-30）：母文档已删除，设计权威 = DESIGN.md，功能权威 = 功能清单 xlsx，设计稿仅为实例。

---

## 你的任务

在本仓库从零实现「见岸」AI 考公备考产品。这是一个已完成设计与功能定义、尚无任何代码的项目。你的工作是把两份规范翻译成可运行的软件，**不是重新设计产品**。

## 两份规范（唯一权威，不得偏离）

1. **设计规范** — `docs/02-设计系统/见岸_Quiet_Horizon_动态Google_Stitch_DESIGN.md`
   2365 行。第 1–312 行是机器可读 YAML frontmatter（31 个色值、17 级字号、8 级圆角、14 项间距、8 档动效时长、5 档阴影、8 项交互 token、24 个组件条目）；正文 26 章覆盖设计总纲、色彩角色与配比、排版、栅格、材质与层级、组件样式、动效系统、交互心理学、信息架构、15 个屏幕规格、Web 端、数据可视化、文案系统、响应式、无障碍、夜间主题、四态、通知、Do's and Don'ts、Stitch 生成注记、前端实现注记、验收门槛、Known Gaps。

2. **功能规范** — `docs/04-功能规格/见岸AI考公_超细颗粒度功能清单_v1.0.xlsx`
   7 个 sheet：`说明与范围`、`总功能清单`（388 行 × 25 列，F0001–F0388）、`核心特色深度设计`（C01–C18）、`闭环用户旅程`（CL-01–CL-10，47 步）、`状态机与异常`（10 类对象 29 个状态）、`研究依据`（R01–R20）、`版本路线图`（MVP/V1/V2/V3）。

**辅助参考（非权威）** — `docs/03-页面设计稿/见岸_10张核心页面/*.png` 是实例稿。只取页面区块顺序、卡片内部元素构成、信息层级、文案初稿。其视觉表现（蓝色系、圆环分数、玻璃拟态插画、3D 机器人形象、高饱和语义色）与设计规范冲突，**不得作为实现依据**。提取结果与逐项映射已整理在 `docs/03-页面设计稿/见岸_10张设计稿_结构提取与规范映射.md`。

冲突判定顺序：**设计看 DESIGN.md，功能看 xlsx，结构与文案参考实例稿。**

## 开工前必做

先完整读完 DESIGN.md 全部 2365 行，并用 openpyxl 全量读取 xlsx 的 7 个 sheet。不要靠抽样或摘要开工——两份规范里大量约束写在细节处，漏读会导致返工。读完后向我确认你抓到的关键约束，再进入 Phase 0。

## 硬约束：设计 token 不得手抄

DESIGN.md 的 YAML frontmatter 是 token 的唯一来源。**写一个构建期脚本**从该 frontmatter 解析并生成代码侧 token（CSS 自定义属性 / Tailwind theme / TS 常量三者任选其一为主，其余由主产物派生）。禁止在任何组件或样式文件里出现硬编码的十六进制色值、px 字号、ms 时长、cubic-bezier 数值。规范改动时只改 md，重新生成即可。

frontmatter 缺失的两项需要你补齐并在 PR 说明里标注为「规范缺口的实现补充」，不要当成既有规范：
- **z-index 数值**：规范只有 Z0 Atmosphere / Z1 Content / Z2 Active Context / Z3 Functional Layer 四层语义，无数值。按语义分层定义常量，禁止散落 magic number。
- **夜间主题（§17）只给了 8 个色值**，缺 `border` / `border-strong` / `success` / `warning` / `error` / `info` / `surface-strong` / `focus-ring` 的深色对应值。补齐并确保对比度达标。
- **可变字重落地**：字号表使用 620/590/580/560/450 等可变字重，仅 Inter Variable 支持；中文栈 PingFang SC / HarmonyOS Sans SC / Noto Sans SC 无可变轴。在 token 生成器里维护一张「规范字重 → 中文实际字重」钳制映射（如 620→600、590→600、560→500、450→400），并输出为可见常量。
- **gutter 冲突**：frontmatter `spacing.gutter: 16px` 与 §5.1 移动端 12px / §5.2 平板 16px 矛盾。取 §5 章为准，token 拆为 `gutter-mobile: 12px` / `gutter-tablet: 16px` / `gutter-desktop: 16px`，废弃单值 gutter。

所有实现补充集中记录在 `docs/05-实现/spec-gaps.md`（你创建），每条注明规范出处与补充理由。**永远不要修改 DESIGN.md 与 xlsx 本身。**

## 范围：只做 MVP

按 xlsx `版本路线图` 与 `规划版本` 列，**本次交付 = 171 条 MVP 功能点**（P0 118 / P1 50 / P2 3；用户端 142 / 管理后台 13 / AI运营台 16）。V1/V2/V3 的 217 条不在范围内，但架构不得为其设置障碍。

MVP 用户端模块（条数 / 其中 P0）：AI提分诊断 15/13、行测训练中心 15/12、数据接入与建档 14/10、首页与今日 13/7、账号与首次使用 12/7、学习处方与计划 11/7、AI教练 11/7、备考目标与个人画像 9/7、模考与分数预测 9/7、个人基线与能力画像 7/6、趋势与复盘 7/5、错题与错因系统 5/5、会员与支付 5/1、设置与隐私 5/1、消息与客服 3/1。MVP 后台：AI模型运营 5/5、AI观测与成本 6/5、AI质量评测 5/5、内容运营 4/3、其余零星。

**MVP 明确不做**（路线图原文）：完整题库商业规模、复杂社交、视频面试、全量选岗、过度游戏化。申论（V1）、面试（V2）、智能选岗（V1）、时政素材（V2）、策略实验（V2）都不做，对应 DESIGN.md 屏幕 §11.12 / §11.13 / §11.14 不实现。

**MVP 需实现的屏幕**（DESIGN.md §11）：11.1 Onboarding、11.2 Today、11.3 Diagnostic Import、11.4 Diagnostic Result、11.5 Practice Hub、11.6 Training Session、11.7 Answer Review、11.8 Coach、11.9 Progress、11.10 Weekly Review、11.11 Mock Exam、11.15 Profile/Settings，共 12 屏。

两处结构裁决（规范优先于实例稿）：
- **学习处方不做独立页**。实例稿 `04` 是整页，但 DESIGN.md 中处方是 §11.2 Today 二折的区块（prescription-card），按规范实现。
- **Progress 与 Weekly Review 是两屏**（§11.9 / §11.10）。实例稿 `08` 合并为一页，不采纳。

## 技术栈（默认，可被明确指示覆盖）

先探测环境（Node 版本、可用包管理器）。默认：Next.js（App Router）+ TypeScript 严格模式 + Tailwind（token 全部来自生成的 CSS 变量）+ React Query（服务端状态）+ Zustand（本地状态）+ XState（xlsx 状态机）+ Vitest + Playwright。包管理器按环境取 pnpm > npm。UI 不引入组件库——DESIGN.md §7 的 24 个组件全部自建，这是设计系统落地的核心交付物。

## 架构要求

1. **Token 管线**：`scripts/build-tokens.ts` 解析 DESIGN.md frontmatter → 生成 `src/styles/tokens.css`（唯一真源）→ 派生 Tailwind theme 与 TS 常量。纳入 build 前置步骤与 CI。
2. **功能台账**：`scripts/build-ledger.ts` 用 openpyxl 导出的 JSON（或 Node 侧 xlsx 解析）生成 `docs/05-实现/feature-ledger.md`——388 条全量，含 ID/模块/优先级/版本/闭环ID/状态。MVP 范围内每完成一条就更新状态；每个 PR 必须能指出它覆盖哪些功能 ID。
3. **状态机**：xlsx `状态机与异常` sheet 的 10 类对象中，MVP 涉及 7 类（成绩导入：待上传/上传中/解析中/待确认/已确认；训练任务：待开始/进行中/已完成；错因：待判断/待确认/验证中；AI诊断：待生成/已生成；学习处方：草稿/待确认/执行中；周复盘：待生成/待确认；AI版本：候选/待灰度/灰度中）。用 XState 显式建模，`允许进入条件 / 允许动作 / 成功下一状态 / 失败状态 / 恢复策略 / 禁止事项` 六列逐条落进 statechart，禁止散落的 boolean 标志位模拟状态。
4. **AI 网关**：所有 LLM 调用（诊断生成、教练对话、错因推断、解析 OCR）走统一 `AiGateway` 接口 + **确定性 mock 适配器**。无 API key 时全流程可用 mock 跑通（这是 E2E 测试的基础）；真实适配器留接口不阻塞主流程。Prompt 模板带版本号入库，对应 xlsx AI模型运营的 Schema/Prompt 版本管理条目。
5. **种子内容**：行测训练需要最小题集。按 DESIGN.md §11.6 的题型结构造 ≥3 个模块 × 每模块 ≥20 题的种子数据（资料分析必须含图表/表格材料题）。文案初稿取自实例稿（`docs/03-页面设计稿/见岸_10张设计稿_结构提取与规范映射.md` §4 已整理），但实例稿三处内容错误（06 的 K12 数学题、LaTeX 残留、10 的法考目标）必须替换为行测/公考内容。
6. **四态先行**：每个屏幕从第一版起就带 loading / empty / error / offline 态，按 DESIGN.md §18 实现，不许留空。

## 分阶段计划（每阶段以闭环 E2E 绿为出口条件）

- **Phase 0 · 地基**：token 管线 + 功能台账 + CI（lint / typecheck / test / build / token 漂移检查）。出口：`tokens.css` 全部由 frontmatter 生成，组件示例页（Storybook 或 `/dev/tokens`）可视验证。
- **Phase 1 · 建档闭环 CL-01**：账号与首次使用 + 备考目标 + 数据接入与建档 + 个人基线。覆盖屏幕 11.1 / 11.3。出口：注册 → 目标 → 上传截图 → 校对确认 → 基线 v0 的 Playwright 全流程绿。
- **Phase 2 · 诊断与今日 CL-02 / CL-04 前半**：AI提分诊断 + 首页与今日 + 学习处方。覆盖 11.4 / 11.2。出口：新数据触发重新诊断 → Today 出现处方区块 → 处方可确认执行的 E2E 绿。诊断呈现遵守 §11.4：ranked opportunity list + 横向贡献条 + sparkline + 置信区间，禁雷达图、禁五模块百分制打分。
- **Phase 3 · 训练与错因 CL-03**：行测训练中心 + 错题与错因系统 + 练习复盘。覆盖 11.5 / 11.6 / 11.7。出口：处方任务 → 进入训练 → 逐题作答（计时埋点）→ 复盘 → 错因归档 → 影响下次处方 的 E2E 绿。答题交互按 §7.7 answer-option 五态 + §8.11 反馈动效。
- **Phase 4 · 教练、模考、周复盘 CL-07 / CL-09 部分**：AI教练（context chip + 结论→证据→建议→行动 结构 + 按语义块 streaming）+ 模考与分数预测 + 趋势与复盘（11.9 / 11.10 两屏，Weekly Review 带 560–700ms Signature 转场）+ 会员与支付最小闭环（5 条，1 个 P0：额度消耗与展示）。
- **Phase 5 · 收尾与后台**：设置与隐私 + 消息与客服 + AI运营台三模块（模型运营 / 质量评测 / 观测成本，16 条）+ 管理后台零星条目 + 夜间主题 + 全局 a11y 与性能达标。

## 质量门槛

- **每阶段必须全绿后才进入下一阶段**：`pnpm lint && pnpm typecheck && pnpm vitest run && pnpm build && pnpm playwright test`。
- **Token 漂移检查**：脚本扫描 `src/**/*.{ts,tsx,css}`，出现硬编码 hex / px 字号 / ms 时长 / bezier 即失败（白名单：生成的 tokens.css 本身）。
- **DESIGN.md §23 七项验收**（First Impression / Five-second / Critical Journey / Visual Quality 等）在 Phase 5 逐项自查并记录到 `docs/05-实现/acceptance.md`。
- **无障碍**：WCAG 2.2 AA——键盘可达、focus-visible、图表双编码 + 可访问数据表、触控目标 ≥44px、`prefers-reduced-motion` 降级（§8.18 的每条替换规则逐项实现）。
- **性能预算**：训练页预加载下一题、图表按需加载、Coach bundle 延迟；LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1（p75，本地 Lighthouse 抽查记录）。
- **动效预算**：每屏 1 个主空间动效 + 2–4 个跟随微动效；实现严格按 §8 时长/曲线/spring token，禁 bounce。

## 工作规则

1. **不发明功能**。每条路由、按钮、接口都要能指回功能 ID；规范未定义的行为，记入 spec-gaps.md 并选最保守实现，不自行扩scope。
2. **xlsx 的「验收要点」列是模板话术**（388 条只有 16 个不同取值），不能当验收标准。真实需求取自「功能说明 + 核心业务规则 + 正常流程 + 异常与恢复 + 状态机 sheet」五列的组合；每个 P0 功能点要写至少一条针对它的测试。
3. **闭环即验收**。CL-01 到 CL-10 中 MVP 涉及的每条闭环，以 `闭环用户旅程` sheet 的逐步描述为脚本写 Playwright 场景；闭环 E2E 是阶段出口的唯一次级签字。
4. **小步提交**：conventional commits，每个提交可独立构建；禁止一次性巨型提交。
5. **遇到两份规范互相矛盾且本提示词未裁决时**：停下，把矛盾点、两种读法、你的建议写成一个问题清单向我提问，不要猜。
6. 阶段完成的报告格式：本阶段覆盖的功能 ID 区间、绿了的闭环、新增的 spec-gaps 条目、下一阶段计划。

## 完成定义（DoD）

MVP 全部 171 条功能点在 feature-ledger 中状态为「完成/验收」；CL-01/02/03/04/07 四条核心闭环 E2E 全绿；路线图 MVP 成功判据可现场演示——①用户能完成首次建档；②至少一次完整日闭环（诊断→处方→训练→复盘）；③新模考能触发重新诊断；④关键 AI 错误可进入评测闭环（反馈→Eval 集→回归门禁）。

