# 见岸 · 规范缺口与实现补充记录

> GOAL_PROMPT 硬约束：DESIGN.md 与功能清单 xlsx 不可修改。凡规范未定义而实现必须补齐的决策，全部记录在本文件，注明规范出处与补充理由。**这里的内容不是规范原文，是实现补充。**

## GAP-1 · z-index 数值化

- **规范出处**：DESIGN.md §5.4 只定义 Z0 Atmosphere / Z1 Content / Z2 Active Context / Z3 Functional Layer 四层语义，frontmatter 无 z-index token。
- **冲突**：无数值则工程落地只能散落 magic number，违背 §22.2「不要散落 magic numbers」的意图。
- **补充**：`zIndex = { atmosphere: 0, content: 10, activeContext: 20, functional: 30 }`，每层间隔 10 为后续插入留空间。业务代码禁止使用语义之外的数值（sheet/popover 等浮层一律 `functional`）。
- **落地**：`src/design/tokens.ts#zIndex`（生成物）。

## GAP-2 · 中文字重钳制

- **规范出处**：frontmatter 字号表使用 620/590/580/560/450 等可变字重；字体栈 `PingFang SC, HarmonyOS Sans SC, Noto Sans SC` 中仅 HarmonyOS/Noto 有可变轴，PingFang SC 无；DESIGN.md §25 第 8 条自陈「中文字体可用字重必须最终确认」。
- **补充**：中文渲染字重钳制到 400/500/600 三档：`≥580 → 600`；`500–579 → 500`；`<500 → 400`。Inter 数字栈保留原始值（620/590 等，可变字体下生效）。层级差异主要由字号与颜色承担，字重钳制不得作为加粗手段。
- **落地**：`clampCjkFontWeight()`（生成物）。

## GAP-3 · gutter 冲突裁决

- **规范出处**：frontmatter `spacing.gutter: 16px` 单值；§5.1 移动端 gutter 12px；§5.2 平板 gutter 16px。
- **补充**：以 §5 正文为准，`gutter = { mobile: 12, tablet: 16, desktop: 16 }`；frontmatter 的单值 `gutter` 不进入实现。
- **落地**：`src/design/tokens.ts#gutter`（生成物）。

## GAP-4 · 夜间主题补全

- **规范出处**：§17 只给 8 个色值（canvas/surface/surface-soft/主文字/body/muted/primary/dawn），缺其余 23 个 token；不补齐则主题切换无法落地。
- **补充规则**：
  1. §17 原值原样采用；
  2. 表面色沿 `canvas → surface → surface-soft → surface-strong` 阶梯加深，保持 §5.4 的层级可感知；
  3. 语义色（success/warning/error/info）保持色相、提高明度，正文对比目标 ≥ 4.5:1，soft 变体转为对应色相的低亮度深底；
  4. `primary` 提亮为 `#72AAA6`（§17 原值）后，`on-primary` 反转为深色 `#0C1414`（白字对比不足）；
  5. 不引入 §20 禁止的高饱和“赛博黑蓝”。
- **落地**：`src/styles/tokens.css [data-theme="night"]` + `nightColors`（均为生成物）。
- **待办**：全部深色对比度需真机 + axe 复核后才能标记「验收」。

## GAP-5 · 会员与支付（MVP 5 条）的产品缺口

- **规范出处**：功能清单「会员与支付」MVP 5 条（仅 1 条 P0）；DESIGN.md 无付费屏规格；实例稿仅一行入口。
- **补充**：MVP 只实现「诊断次数余额展示 + 消耗计数」（P0），购买/续费/退款三条 P1 以 mock 支付适配器实现流程占位，不接真实支付渠道。价格与权益页在 V1 前需产品补充规格后另行实现。

## GAP-6 · 登录注册在 Web MVP 无短信通道

- **规范出处**：「账号与首次使用」F0003 手机号短信验证码登录（P0）、F0013 验证码倒计时与重发保护、F0014 异常登录恢复路径。
- **冲突**：MVP 无后端与短信服务商，无法实现真实验证码；GOAL_PROMPT 也要求「无 API key 时全流程可跑通」。
- **补充**：Phase 1 采用**本机档案模式**——协议确认（F0006/F0007）后直接建档，数据存 localStorage。F0003/F0013/F0014 状态保持「未开始」，待接入后端时统一实现，不做假登录页冒充完成。
- **影响**：账号模块 12 条 MVP 中，本阶段仅完成 F0002/F0006/F0007/F0010 四条。

## GAP-7 · 权限授权在 Web 端无对应能力

- **规范出处**：F0008 通知权限、F0009 相册权限（成绩截图导入授权）。
- **补充**：Web 端的文件选择由 `<input type="file">` 承担，无独立相册授权流程；通知需 Notification API + Service Worker，MVP 不引入。两条保持「未开始」，在原生封装阶段实现。

## GAP-8 · 提分机会排序的量化模型

- **规范出处**：AI提分诊断（F0087/F0088/F0092）的核心业务规则原文为「最弱项不等于最高优先级；综合潜在收益、考试相关性、可训练性、时间成本和置信度」，**没有给出算式**。C04 的定位是「回答下一单位时间投在哪里最值」。
- **补充模型**（`src/lib/diagnosis/engine.ts`）：

  ```
  priorityScore = (estimatedGain / estimatedHours)      // 单位时间预期收益
                × trainability[kind]                     // 可训练性
                × confidenceDiscount[confidence]         // 置信折扣
                × (moduleFullScore / totalFullScore + 0.6) // 考试相关性加权
  ```

  - `estimatedGain`：准确率缺口 × 模块满分；速度型按「压回阈值后省下的时间比例 × 模块满分 × 0.35」折算，取两者较大值。
  - `estimatedHours`：`estimatedGain × hoursPerPoint`，其中速度 1.5、准确率 2.5、概念补基础 6。
  - `trainability`：速度 1.0 / 准确率 0.7 / 概念补基础 0.35 —— 速度问题靠方法与节奏短周期可验证，概念缺口短期产出比低。
  - `confidenceDiscount`：高 1.0 / 中 0.85 / 低 0.6，样本不足时压低排序分，避免噪声驱动处方。
  - 速度阈值（秒/题）：言语 55 / 判断 70 / 数量 110 / 资料 90 / 常识 30。
  - 收益 < 0.5 分的机会不占用今日焦点。

- **性质**：这些常量是**首版可运行基线**，不是经验证的教学参数。上线后需用真实训练结果做校准（对应功能清单 C18 处方效果实验、CL-10 AI 质量闭环）。任何调参都要同步本节。
- **验证**：`src/lib/diagnosis/engine.test.ts` 锁定关键行为——最弱项（数量关系 30%）不得排在速度机会（资料分析 82%/120 秒）之前；低样本必须降级为候选；每个机会必须带事实与推断两类证据及失效条件。

## GAP-9 · 每题时间预算

- **规范出处**：F0105 任务分解、F0113 预计时长要求把目标拆成可完成训练单元并给出耗时，未给每题分钟数。
- **补充**（`src/lib/prescription/engine.ts`）：言语 0.9 / 判断 1.2 / 数量 1.8 / 资料 1.5 / 常识 0.5 分钟每题；单任务时长钳制在 10–45 分钟，首项占预算 60%、后续各 30%，余量 ≥10 分钟时补一项 15 分钟错题复盘。

## GAP-10 · 管理后台与 AI 运营台为本机 mock 面板

- **规范出处**：功能清单要求用户查询（F0335）、RBAC（F0364）、审计（F0365）、Provider/路由/版本管理（F0366–F0368）等后台能力，MVP 无服务端。
- **补充**：`/admin` 与 `/aiops` 为**单机 mock 控制台**——交互真实读写 localStorage（admin/aiops store），审计日志记录本地操作，RBAC 为静态权限矩阵展示。**这是演示级实现，不是生产后台**；真实部署需要：服务端 RBAC + 真实鉴权、集中审计、真实 Provider 接入。
- 其中真实生效的部分：评测集（F0372/0373）直接驱动 `MockAiGateway` 与 `diagnose` 引擎执行确定性断言；回归门禁（F0378/0379）执行零容忍规则；调用指标（F0382–F0386）来自 `src/lib/ai/metrics.ts` 进程内采集，解析对抗样本会真实使解析失败。

## GAP-11 · 测试钩子与账号类条目的 MVP 状态

- 训练页选项带 `data-correct` 属性（MVP 测试钩子，CL-03 E2E 依赖），转生产前需经构建开关关闭。
- MVP 171 条中未完成的 6 条全部为后端/原生阻塞：F0001 启动页（P1）、F0003/F0013/F0014 短信登录与账号恢复（GAP-6）、F0008/F0009 通知/相册权限（GAP-7）。见 `feature-ledger.md`。


