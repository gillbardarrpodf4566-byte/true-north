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

