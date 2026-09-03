---
version: alpha
name: JianAn-Quiet-Horizon
description: "A premium AI exam-coaching design system built around the metaphor of seeing a distant shore through mist. Calm, precise and quietly optimistic: warm fog-white canvases, deep blue-green ink, restrained horizon teal, rare dawn-copper highlights, layered functional materials, editorial typography, evidence-led data visualization, and motion that spatially connects intent, action, feedback and progress. The interface should feel like a private high-performance coach rather than a tutoring marketplace or gamified cram school."
colors:
  primary: "#2B6367"
  primary-active: "#214E52"
  primary-soft: "#DCEBE8"
  primary-faint: "#EEF5F3"
  horizon-glow: "#86BDB5"
  dawn: "#C88E56"
  dawn-active: "#A96F3D"
  dawn-soft: "#F4E8D9"
  ink: "#122B2F"
  body: "#34484B"
  # 四级文本阶梯，均以 canvas-grouped(#F1F5F3) 与 surface(#FFFFFF) 双底验算 ≥4.5:1：
  #   ink 13.5:1 / body 8.8:1 / muted 6.2:1 / muted-soft 4.7:1
  # 修复前 muted #687A7D 仅 4.3:1、muted-soft #96A5A7 仅 2.6:1，大量元数据文本不达标。
  muted: "#4A5E61"
  muted-soft: "#5E7174"
  canvas: "#F7F9F8"
  canvas-warm: "#FAF8F4"
  surface: "#FFFFFF"
  surface-soft: "#F0F4F2"
  surface-strong: "#E7EEEB"
  border: "#DCE4E1"
  border-strong: "#C7D3CF"
  success: "#4F7B68"
  success-soft: "#E5F0EA"
  warning: "#B67A43"
  warning-soft: "#F7EBDD"
  error: "#B85A50"
  error-soft: "#F9E7E4"
  info: "#4F7287"
  info-soft: "#E5EEF3"
  on-primary: "#FFFFFF"
  on-dark: "#F8FBFA"
  scrim: "#0B1B1E"
  focus-ring: "#4E8E91"
  # --- §6.4 材质层（Apple-grade depth）：分隔线、半透明材质与分组画布 ---
  separator: "#E6ECE9"
  separator-opaque: "#EDF2F0"
  canvas-grouped: "#F1F5F3"
  material-nav: "rgba(247,249,248,0.86)"
  material-sheet: "rgba(255,255,255,0.92)"
  material-fill: "rgba(18,43,47,0.045)"
  material-fill-strong: "rgba(18,43,47,0.075)"
typography:
  display-web:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 56px
    fontWeight: 620
    lineHeight: 1.08
    letterSpacing: -0.035em
  display-app:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 34px
    fontWeight: 620
    lineHeight: 1.16
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 620
    lineHeight: 1.22
    letterSpacing: -0.018em
  headline-lg:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.28
    letterSpacing: -0.012em
  title-lg:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.006em
  title-md:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.42
    letterSpacing: 0
  body-lg:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0
  body-md:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  label-md:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 560
    lineHeight: 1.38
    letterSpacing: 0.01em
  caption:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 450
    lineHeight: 1.45
    letterSpacing: 0.01em
  micro:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 560
    lineHeight: 1.36
    letterSpacing: 0.025em
  stat-xl:
    fontFamily: "Inter Variable, SF Pro Display, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 590
    lineHeight: 1
    letterSpacing: -0.035em
  stat-lg:
    fontFamily: "Inter Variable, SF Pro Display, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 590
    lineHeight: 1.05
    letterSpacing: -0.025em
  stat-md:
    fontFamily: "Inter Variable, SF Pro Display, system-ui, sans-serif"
    fontSize: 26px
    fontWeight: 580
    lineHeight: 1.1
    letterSpacing: -0.018em
  button-md:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 590
    lineHeight: 1.2
    letterSpacing: 0
  button-sm:
    fontFamily: "Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 580
    lineHeight: 1.2
    letterSpacing: 0
rounded:
  none: 0px
  xs: 6px
  sm: 10px
  md: 16px
  lg: 22px
  xl: 28px
  xxl: 36px
  full: 9999px
spacing:
  micro: 2px
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section: 48px
  section-lg: 64px
  hero: 88px
  gutter: 16px
  margin-mobile: 20px
  margin-tablet: 32px
  margin-desktop: 48px
  # --- §5.7 inset grouped list：分组内缩、组间距、行最小高度 ---
  separator-inset: 16px
  group-gap: 24px
  row-min: 44px
motion:
  instant: 80ms
  feedback: 120ms
  fast: 160ms
  state: 220ms
  content: 320ms
  spatial: 380ms
  sheet: 420ms
  hero: 560ms
  easing-standard: "cubic-bezier(0.20, 0.00, 0.00, 1.00)"
  easing-enter: "cubic-bezier(0.05, 0.70, 0.10, 1.00)"
  easing-exit: "cubic-bezier(0.30, 0.00, 0.80, 0.15)"
  easing-emphasized: "cubic-bezier(0.20, 0.80, 0.20, 1.00)"
  spring-control: "mass 0.8, stiffness 420, damping 34"
  spring-container: "mass 1.0, stiffness 280, damping 30"
  spring-hero: "mass 1.0, stiffness 220, damping 28"
elevation:
  flat: "none"
  hairline: "0 0 0 1px rgba(18,43,47,0.06)"
  lift-sm: "0 1px 2px rgba(18,43,47,0.04), 0 8px 24px rgba(18,43,47,0.05)"
  lift-md: "0 2px 6px rgba(18,43,47,0.06), 0 18px 48px rgba(18,43,47,0.08)"
  lift-focus: "0 10px 36px rgba(43,99,103,0.12), 0 1px 0 rgba(255,255,255,0.7) inset"
  # --- §6.3 Apple-grade material depth（替代发丝边框） ---
  card-rest: "0 1px 3px rgba(18,43,47,0.03), 0 8px 24px rgba(18,43,47,0.03)"
  card-pressed: "inset 0 1px 3px rgba(18,43,47,0.07)"
  card-raised: "0 2px 8px rgba(18,43,47,0.05), 0 16px 40px rgba(18,43,47,0.07)"
  nav-material: "0 -1px 0 rgba(18,43,47,0.04), 0 -4px 16px rgba(18,43,47,0.03)"
  sheet-material: "0 -2px 12px rgba(18,43,47,0.06), 0 -12px 32px rgba(18,43,47,0.08)"
interaction:
  min-touch: 44px
  preferred-touch: 48px
  desktop-control-height: 40px
  mobile-control-height: 48px
  swipe-threshold: 64px
  sheet-dismiss-velocity: 900px/s
  long-press-delay: 420ms
  tooltip-delay-desktop: 550ms
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    height: 48px
    padding: 14px 20px
    transition: "{motion.feedback} {motion.easing-standard}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    height: 48px
    padding: 13px 20px
  button-tertiary:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.button-md}"
  button-icon:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: 44px
  app-shell:
    # §6.3 材质决策：shell 用 canvas-grouped 而非 canvas。
    # canvas(#F7F9F8) 与 surface(#FFFFFF) 对比仅 1.03:1，白卡无法靠填充与背景分离，
    # 迫使每张卡叠加 1px 边框；改用 canvas-grouped(#F1F5F3) 后由 card-rest 双层柔阴影
    # 承担分离，符合「elevation 只声明一次」。canvas 保留为大气层（§5.4 Z0）与降级底色。
    backgroundColor: "{colors.canvas-grouped}"
    textColor: "{colors.ink}"
  top-app-bar:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    height: 56px
  bottom-nav-glass:
    backgroundColor: "rgba(255,255,255,0.78)"
    textColor: "{colors.muted}"
    rounded: "{rounded.xl}"
    height: 64px
  focus-card:
    backgroundColor: "{colors.primary-faint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  evidence-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body}"
    rounded: "{rounded.md}"
    padding: 16px
  prescription-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 18px
  insight-chip:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-active}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 7px 10px
  warning-chip:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 7px 10px
  metric-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 16px
  chart-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 20px
  coach-message:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.body}"
    rounded: "{rounded.lg}"
    padding: 14px 16px
  user-message:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: 14px 16px
  answer-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 16px
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xxl}"
    padding: 20px
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: 52px
    padding: 14px 14px
  search-field:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 12px 16px
  progress-track:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: 8px
---

# Design System: 见岸 / JIANAN — Quiet Horizon

> **本文件是设计规范的唯一权威**（2026-08-30 确认）。色彩、图形语言、数据可视化形态、动效、排版、组件、无障碍均以本文件为准。
>
> `03-页面设计稿/见岸_10张核心页面/` 是**实例稿，不是规范**：从中取用页面区块结构、组件构成、信息层级与文案，其视觉表现（蓝色系、圆环分数、玻璃拟态插画、机器人形象、高饱和语义色）不作为实现依据，需按本文件重新表达。
>
> 结构提取与逐项映射见 `03-页面设计稿/见岸_10张设计稿_结构提取与规范映射.md`。

**Theme Name:** Quiet Horizon / 静默地平线  
**Product:** AI 公考备考教练 / 个体化学习与决策系统  
**Primary Surface:** Mobile App first, responsive Web second  
**Design Stage:** High-fidelity system blueprint / Stitch-ready  
**Primary Design Objective:** 在信息密度很高、心理压力很大的公考场景中，用极强的层级控制、低噪声视觉、明确因果反馈和克制的动态设计，让用户每次进入系统都迅速回答三个问题：**我现在在哪里、今天最重要的是什么、下一步该做什么。**

---

## 0. Design Thesis / 设计总纲

### 0.1 一句话定义

**见岸不是“公考版题库”，也不是“套了聊天框的 AI 教育产品”。它应该像一位非常安静、非常懂你的高水平私人教练：看得见长期趋势，但每次只把此刻最值得做的一件事放到你眼前。**

视觉与交互都必须围绕“从雾到清晰”展开：

`模糊状态 → 看见关键变量 → 看见证据 → 明确行动 → 完成训练 → 获得反馈 → 更新个人模型 → 下一次更清晰`

### 0.2 艺术母题

视觉母题不是海浪、船、奖杯、书本、火箭等直白“上岸”符号，而是三个更抽象、更长期耐看的意象：

1. **雾 Mist**：代表不确定、焦虑、信息过载。
2. **地平线 Horizon**：代表可见目标与判断边界。
3. **岸光 Shore Light**：代表被证据支持的方向，而不是鸡血式成功承诺。

界面应产生类似清晨海岸的感受：远处有光，但近处是安静的；信息并不稀少，但被组织得像航海图一样有秩序。

### 0.3 不是什么

- 不是蓝白政务 App。
- 不是红橙色培训机构促销页。
- 不是紫色渐变 + 发光 AI 粒子。
- 不是满屏数据卡片的 Dashboard。
- 不是把所有功能塞到首页。
- 不是 Duolingo 式强游戏化。
- 不是“Liquid Glass Everywhere”。
- 不是为了高级而弱化信息可读性。

### 0.4 Visual Intent Profile

> 这是设计前目标，不是 VisAWI 的正式测量得分。

| 维度 | 目标 | 解释 |
|---|---:|---|
| Simplicity | 6.4 / 7 | 首屏只允许 1 个主焦点，其他信息降级 |
| Diversity | 4.4 / 7 | 通过构图、数据形态和少量 Signature Moment 产生变化 |
| Colorfulness | 3.4 / 7 | 低饱和、单主色、少量暖色机会点 |
| Craftsmanship | 6.7 / 7 | 极高的间距、动效、状态、图表和文字完成度 |
| Category Prototypicality | 5.6 / 7 | 导航、表单、训练交互保持熟悉；品牌表现允许创新 |
| Visual Complexity | low-medium | 功能丰富，但一次只显露当前任务需要的信息 |
| Signature Moments | 2 | 今日焦点 / 长期成长图谱 |

### 0.5 审美判断标准

高级感不由“玻璃、阴影、渐变、圆角”决定，而由以下结构决定：

- **信息权重是否准确**：最重要的东西是否真的最大、最先被看到。
- **视觉噪声是否被压缩**：每一个边框、颜色、图标是否都有语义。
- **空间是否有前后关系**：内容层、交互层、功能层能否被感知为不同深度。
- **节奏是否稳定**：密集任务区与呼吸区是否交替出现。
- **动态是否解释状态变化**：动画是否在告诉用户“什么从哪里来、去了哪里、为什么变化”。
- **产品是否有自己的视觉语法**：不是换颜色的 Material / shadcn。

---

## 1. Research Synthesis / 多轮调研后的设计取舍

### 1.1 Oura — “One Big Thing” + Personal Baseline

Oura 2024–2026 的设计演进最值得见岸借鉴的不是圆环，而是**信息压缩策略**：Today 强调当下最重要的信息，Vitals 承担快速总览，My Health 承担长期趋势。2025 年改版进一步明确 Today 要“cut through the clutter”，突出 “one big thing”。

**见岸迁移：**

- 首页不展示十几个功能入口。
- 首屏只回答“今天最值得解决什么”。
- 所有数据先和“个人基线”比较，再和群体 benchmark 比较。
- 日常信息与长期成长必须分层，不要在同一个卡片里混合。
- 颜色首先表达“状态差异”，不是装饰。

**不照搬：**

- 不复制 Oura 的三环造型。
- 不把公考能力强行压成一个神秘总分。
- 诊断必须可展开查看证据与不确定性。

### 1.2 WHOOP — Pillars + At-a-glance + Adaptive Plan

WHOOP 2025–2026 的 Home Redesign 把 Sleep / Recovery / Strain 放到非常明确的快速扫读层，并把 Weekly Plan 直接放回首页。2026 的 AI 方向进一步强调目标、习惯、生活事件与主动 check-in。

**见岸迁移：**

- 保留 3–5 个真正稳定的能力支柱，而不是 30 个 KPI 同时出现。
- “计划”不是静态清单，而要跟最近训练结果动态调整。
- 主动提醒只在“有行动价值”时出现。
- 高阶用户可以深入，普通用户不被复杂指标淹没。

### 1.3 Brilliant — Interactive Learning + Contextual Tutor

Brilliant 的核心优势是“学习动作本身就是界面”。用户不是看完解释再做题，而是在可交互环境中边推理边得到反馈；Koji 能看见当前题目和用户已经做过的步骤，不是一个脱离上下文的聊天机器人。

**见岸迁移：**

- AI Coach 必须知道当前题、当前错误、最近训练、用户目标。
- AI 不先给答案，先定位误区、给局部提示、让用户继续完成。
- 每个诊断结果都应能一键进入相应训练，而不是停在“建议”。
- 训练完成后必须回写 Candidate Model，形成闭环。

### 1.4 Linear — Calm Interface + Attention Control

Linear 2026 的 UI Refresh 明确强调 calmer、consistent、easier to scan、stay focused，并通过弱化侧栏、统一 header / view controls 来让主内容自然突出。

**见岸迁移：**

- 导航是基础设施，不应该成为视觉主角。
- 页面标题、筛选、状态操作的位置必须高度一致。
- “主要任务区”永远比导航和工具区更亮、更近、更大。
- 复杂功能通过稳定语法扩张，而不是每增加功能就增加一种新卡片。

### 1.5 Apple 2025–2026 — Functional Glass, not Glass Content

Apple 新的 Material / Liquid Glass 指南强调：玻璃材质主要用于**控制和导航功能层**，内容层应保持清晰，不应到处使用透明玻璃；深度用于层级和位置感，而不是装饰。

**见岸迁移：**

- Bottom Navigation、Sheet handle、浮动工具条可以使用轻透明材质。
- 题目、解释、成绩、数据卡片保持稳定的实色 Surface。
- 深度通过遮挡、模糊、轻阴影、背景露出来建立。
- 文字绝不悬浮在复杂动态背景上。

### 1.6 Material 3 Expressive — Expressive Hero, Standard Utility

Material 3 Expressive 将 motion 分成标准与 expressive，强调 spring、shape morphing 和空间连续性；高表达更适合突出 hero interaction，而不是所有控件。

**见岸迁移：**

- 只有“今日焦点”“完成一次关键训练”“周复盘展开”使用 expressive motion。
- 高频按钮、筛选、列表使用短促标准 motion。
- 页面转场要表现空间关系，而不是随机 fade。

### 1.7 视觉心理学与学习心理学

设计依据不是“极简就是高级”。研究显示视觉复杂度和类别典型性会非常早地影响审美判断；因此见岸应保持熟悉的 App 类别语法，同时压低无意义复杂度。

学习动机方面，Self-Determination Theory 对教育场景的大量研究强调 **Autonomy / Competence / Relatedness**。见岸尤其应该强化前两者：

- Autonomy：用户可以理解并调整学习处方，而不是被 AI 命令。
- Competence：每次训练后必须看到具体能力变化，而不是只有“完成 +1”。
- Relatedness：AI 的语言像可信赖教练，不像系统通知或情绪化导师。

---

## 2. Visual Theme & Atmosphere / 视觉主题与氛围

### 2.1 Theme: Quiet Horizon / 静默地平线

这是一个**Quiet Intelligence** 风格：专业、安静、有判断力，但不冷漠。页面的视觉重心像海上地平线——横向稳定、边界清晰、远处有亮度变化；局部的柔和曲率让界面保持人性，而不是工具感过强。

整体第一印象应该是：

> “这是一个很懂我的系统，它的信息很多，但它已经替我整理好了。”

而不是：

> “这是一个功能很多的公考平台。”

### 2.2 视觉节奏

页面遵循三段式节奏：

1. **Focus Zone / 聚焦区**：大留白、单焦点、低密度。
2. **Action Zone / 行动区**：更紧凑、明确 CTA、任务列表。
3. **Evidence Zone / 证据区**：图表、趋势、细节，通过渐进披露进入。

禁止从顶部到底部所有区块都用同样大小的卡片网格。

### 2.3 形态语言

- 主要容器：16–28px 圆角，面积越大圆角越大。
- 控件：10px 圆角，不做夸张胶囊化。
- 标签 / 状态：full pill。
- 图表：线条圆润，但数值端点精准。
- 形态变化遵循“海岸线”：轻微弯曲、连续、不做尖锐科幻切角。

### 2.4 品牌 Signature Moment 01 — Horizon Focus

今日首页的核心不是圆环，而是一个**“Horizon Focus / 地平线焦点”**组件：

- 背景从 `{colors.primary-faint}` 到 `{colors.surface}` 极轻渐变。
- 上部是一条低对比度水平地平线。
- 当前状态以一个微光点或短线落在地平线上。
- 下部只出现一句今日判断 + 一个行动。
- 用户点击“为什么”后，地平线向上扩展成证据面板。

它表达“看见方向”，而不是“分数仪表盘”。

### 2.5 品牌 Signature Moment 02 — Growth Coastline

长期成长页使用**层叠海岸线 / contour** 作为抽象数据语法：

- 每一层代表一个阶段或能力支柱。
- 不是装饰性的山丘图，而是由真实趋势生成的低频曲线。
- 当前阶段的曲线最清晰，历史阶段逐渐淡入背景。
- 当用户滑动时间轴，曲线不瞬移，而是连续 morph。

---

## 3. Color Palette & Roles / 色彩系统

### 3.1 Primary Foundation

- **Horizon Teal** `{colors.primary}` #2B6367：核心品牌色。用于主 CTA、选中态、重要趋势线、AI 建议核心结论。
- **Deep Horizon** `{colors.primary-active}` #214E52：按下态、高对比文本、深色重点。
- **Mist Teal** `{colors.primary-soft}` #DCEBE8：状态背景、弱强调。
- **Fog Teal** `{colors.primary-faint}` #EEF5F3：首屏焦点卡和大面积浅背景。

主色不是“科技蓝”，它更接近海水与雾之间的蓝绿，避免教育行业常见高饱和蓝。

### 3.2 Warm Opportunity Accent

- **Dawn Copper** `{colors.dawn}` #C88E56：仅用于“机会 / 值得注意 / 关键突破”语义。
- **Dawn Soft** `{colors.dawn-soft}` #F4E8D9：机会卡背景。

暖色是系统中最稀缺的视觉资源。**不能用于普通按钮，也不能作为营销色铺满页面。**

它的视觉意义是：

> “这里值得你投入注意力。”

### 3.3 Canvas & Surface

- `{colors.canvas}` #F7F9F8：默认 App 背景，略带绿色的雾白。
- `{colors.canvas-warm}` #FAF8F4：长阅读、申论、复盘场景，略暖，降低视觉疲劳。
- `{colors.surface}` #FFFFFF：主要信息承载面。
- `{colors.surface-soft}` #F0F4F2：输入、次级模块、列表 hover / selected background。
- `{colors.surface-strong}` #E7EEEB：禁用、分段控件背景、进度轨道。

### 3.4 Text

- `{colors.ink}` #122B2F：主文字，不用纯黑。
- `{colors.body}` #34484B：长文本。
- `{colors.muted}` #687A7D：辅助信息。
- `{colors.muted-soft}` #96A5A7：disabled、占位、过往时间点。

### 3.5 Functional States

状态色必须“双编码”：颜色 + 文本 / 图标 / 形态。

- Success `{colors.success}` #4F7B68
- Warning `{colors.warning}` #B67A43
- Error `{colors.error}` #B85A50
- Info `{colors.info}` #4F7287

不要使用鲜红 / 鲜绿作为整卡底色。错误是可恢复状态，不是惩罚。

### 3.6 Color Ratio

默认单屏近似：

- 65–75% Canvas / white surface
- 15–20% ink / body
- 5–8% primary teal
- 1–3% dawn / semantic accent

高级感来自**色彩稀缺性**，不是更多颜色。

### 3.7 Dynamic Color

允许颜色随“状态”轻微变化，但不允许整套主题频繁换色。

例如今日焦点：

- 平稳：Mist Teal
- 高潜力机会：Dawn Soft
- 需要恢复 / 降负荷：Info Soft / neutral cool
- 风险：Error Soft，仅局部边界和提示

不要让用户每天打开 App 都感觉换了一个品牌。

### 3.8 Gradient Policy

渐变只能出现于：

1. Horizon Focus 背景亮度过渡。
2. Hero 数字背后的极轻 radial glow。
3. 长期趋势中的面积透明过渡。

禁止：

- 渐变按钮。
- 紫蓝 AI 渐变文字。
- 彩虹数据卡。
- 霓虹外发光。

---

## 4. Typography Rules / 字体与排版

### 4.1 字体哲学

中文界面优先使用系统质量最高的中文字体；英文、数字和数据标签使用 Inter Variable。目的不是“混搭酷”，而是让数字拥有更稳定的宽度、层次和识别度。

默认字体栈：

`Inter Variable, PingFang SC, HarmonyOS Sans SC, Noto Sans SC, system-ui, sans-serif`

### 4.2 层级

**App 首页最多同时出现 4 个有效文字层级。**

推荐：

1. 今日核心结论：`{typography.display-app}`
2. 页面/模块标题：`{typography.headline-lg}` / `{typography.title-lg}`
3. 正文：`{typography.body-md}`
4. 标签 / 元信息：`{typography.label-md}` / `{typography.caption}`

不要通过“所有标题都加粗”建立层级。

### 4.3 数字

成绩、时间、概率、趋势的数字使用 `{typography.stat-*}`。

规则：

- 数字大，单位小。
- 小数只在决策有意义时保留。
- 不显示伪精确，例如“上岸概率 73.428%”。
- 置信区间优先用视觉区间或“高 / 中 / 低置信度”表达。

### 4.4 中文排版

- 中文正文 15–17px，行高 1.55–1.65。
- 每段推荐 2–5 行，超过 7 行主动分段。
- 标题不使用过度紧缩字距。
- 禁止全中文大段 center alignment。
- 核心结论允许短句断行，让语义分段成为视觉层级。

### 4.5 Data Typography

数据界面必须建立“数字优先级”：

- Primary Metric：36–48px
- Secondary Metric：24–28px
- Context Value：15–17px
- Change / delta：12–13px

同一张卡内最多 1 个 Primary Metric。

---

## 5. Layout & Spatial Hierarchy / 布局与空间层次

### 5.1 Mobile Grid

**主设计宽度：390px。**

- 4-column fluid grid
- 左右安全 margin：20px
- gutter：12px
- 内容最大可用宽度：350px
- 主要卡片通常跨 4 列
- 并列 metric tile：2 + 2 列

### 5.2 Tablet

- 8-column
- margin 32px
- gutter 16px
- 今日焦点与今日任务可形成 5/3 或 4/4 布局
- 不把手机界面机械放大

### 5.3 Desktop Web App

- 12-column
- 主内容 max-width 1180–1240px
- 左侧 navigation rail 220–240px
- 主工作区 680–760px
- 证据 / AI contextual rail 280–340px（需要时出现）
- 页面不应使用三列常驻高密度 dashboard，第三列必须是上下文相关的

### 5.4 Depth Model

见岸使用四层空间模型：

#### Z0 — Atmosphere
Canvas、极轻 radial light、非交互背景。

#### Z1 — Content
题目、文章、数据、卡片。**基本实色，极少 blur。**

#### Z2 — Active Context
正在进行的训练卡、展开证据卡、选中项目。通过 tone、border、轻 lift 区分。

#### Z3 — Functional Layer
Bottom Navigation、Bottom Sheet、Popover、floating tool。允许使用 translucent material / blur。

原则：**Depth 用来解释层级，不用来装饰文本。**

### 5.5 Whitespace Strategy

大留白只给三种东西：

1. 关键判断。
2. 关键数据。
3. 关键行动。

普通列表不浪费空间。

因此见岸不是“每张卡 32px padding”的伪高级，而是：

- Focus：24–28px padding
- Standard Card：16–20px
- Dense List：12–16px
- Evidence table：8–12px row rhythm

### 5.6 Alignment

- 主阅读流严格左对齐。
- 大数字可以与图形轴线居中，但文字解释回归左对齐。
- CTA 优先靠近相关内容，不统一堆到底部。
- 移动端主要操作优先放在屏幕下半区可达区域。

### 5.7 Inset Grouped List / 内缩分组列表

同构行的集合用分组列表，不用「一屏等宽卡片堆叠」。

结构（对应 `spacing.separator-inset` / `spacing.group-gap` / `spacing.row-min`）：

- **分组容器**：`surface` 实色 + `rounded.sm`(10px) + `card-rest`，`overflow-hidden` 裁剪行背景。
  容器不加边框（§6.3：elevation 只声明一次）。
- **行**：最小高度 44px（= `interaction.min-touch`），水平内边距 `base`(16px)。
- **分隔线**：1px `separator`，**左内缩 16px 与行内文本对齐**，末行不显示。
  需要贯穿整行时显式选择 full 变体。
- **分组标题**：`label-md` / `muted`，**上间距 `group-gap`(24px) 大于下间距 `sm`(8px)**。
  标题只用于真实分类语义；不得作为大标题之上的装饰性 eyebrow。
- **分组脚注**：`caption` / `muted`，说明该组数据的来源或后果。
- **按压反馈**：行用材质填充（`material-fill`）变色，**不用缩放**——列表内缩放会抖动。

**Group 与 Card 的分工**：Card 是单个信息容器，Group 是同构行集合；两者不得互相嵌套。

背景前提：shell 用 `canvas-grouped`，白底分组才能靠 `card-rest` 与背景分离（§6.3 表格）。

---

## 6. Materials & Elevation / 材质与景深

### 6.1 基本原则

内容应该像“纸面 / 仪表”，功能控件才像“玻璃”。

- 90% 内容 Surface：flat 或 hairline。
- 8% Active Surface：lift-sm。
- 2% Modal / Hero：lift-md / lift-focus。

### 6.2 Functional Glass

用于：

- Bottom Navigation
- Floating mini toolbar
- Bottom Sheet top chrome
- Context menu

建议：

- white 76–84% opacity
- backdrop blur 18–28px
- saturation 110–120%
- 1px inner highlight
- 不做彩色玻璃

### 6.3 Shadow

Shadow 色相向品牌 ink 偏移，不用纯黑。

禁止 5–6 套 shadow level。**景深仍只有四级**：Flat / Small Lift / Modal Lift / Focus Lift。

四级之外只允许两类附加定义，它们不是新的景深层级，不得再扩张：

1. **交互态**（同一景深的状态变化，不产生新层级）
   - `card-pressed`：内凹 inset 阴影，表达按压的物理下陷；与静息态属同一层。
2. **材质边缘**（§6.2 Functional Glass 的组成部分，不是投影）
   - `nav-material` / `sheet-material`：以 `-1px` 偏移的发丝边界定玻璃与内容的交界。
     使用它们的组件**不得再叠加 border**，否则等于同时声明两次 elevation。

内容面的两个实现值映射到既有四级，而非新增层级：

| 实现 token | 对应景深层级 | 用途 |
|---|---|---|
| `card-rest` | Small Lift | 静息卡片/分组容器 |
| `card-raised` | Modal Lift | 焦点卡、浮动元素 |
| `lift-sm` / `lift-md` | 同上（旧名） | 保留兼容，新代码用上表两个 |

**核心规则：elevation 只声明一次。** 边框或阴影二选一；
「1px 边框 + 宽柔阴影」是 ghost card，属禁止项。

### 6.4 Occlusion

Sheet 打开时：

- 背景整体 scale 到 0.985–0.99（移动端可选）
- 背景亮度轻降 3–5%
- Scrim 16–24%
- Sheet 先于 scrim 停止，形成前景感

Reduced Motion 下取消 scale，仅做 opacity。

---

## 7. Component Stylings / 组件设计

### 7.1 Primary Button

`{component.button-primary}`

- 48px height
- 10px radius
- 15px / 590
- 无渐变、无强 shadow
- 主色填充
- pressed：颜色变深 + scale 0.985，120ms
- disabled：不是降低到看不清，使用 surface-strong + muted
- loading：文本保持位置，右侧出现 14px progress spinner；不要把整个按钮换成 spinner

### 7.2 Secondary Button

白色 Surface + 1px `{colors.border-strong}`，不使用灰底厚边。

Hover desktop：surface-soft。  
Pressed：scale 0.99 + border darken。

### 7.3 Tertiary Action

用于“查看依据 / 调整计划 / 稍后再说”。

不抢主 CTA 权重。

### 7.4 Focus Card

`{component.focus-card}` 是首页品牌核心容器。

结构：

1. 顶部 micro-label：今日焦点
2. 状态 / horizon indicator
3. 1–2 行核心判断
4. 一句证据摘要
5. Primary CTA
6. Secondary “为什么”

静态上不超过 6 个元素。

动态：首次进入当天页面执行一次 420–560ms 的 Horizon Reveal；同一天二次进入只做 180ms fade，避免炫技疲劳。

### 7.5 Evidence Card

结论和证据永远可追溯。

卡片结构：

- 结论
- 依据数据
- 对比基线
- 置信度 / 数据量
- “查看完整证据”

AI 文字不应把“系统推断”伪装成事实。

### 7.6 Prescription Card

任务卡不是 todo list，而是“处方单元”。

必须包含：

- 任务名称
- 预估时间
- 目标能力
- 为什么今天做
- 成功判定
- 开始按钮

完成后卡片折叠为 compact success state，并展示真实结果。

### 7.7 Metric Tile

单 Tile 只呈现：

- 一个数字
- 一个标签
- 一个 delta
- 可选 tiny sparkline

不在 Tile 内塞入解释段落。

### 7.8 Skill / Insight Chip

用于“资料分析”“速度瓶颈”“高确定性”等短语。

Chip 是语义标记，不是装饰。

### 7.9 Training Question Card

训练题是“阅读对象”，视觉上比所有工具元素更安静。

- 使用 `{colors.canvas-warm}` 或白色
- 题干 17px，行高 1.65
- 关键信息可用淡底高亮，不用彩色荧光笔
- 题号、计时、收藏降到辅助层
- 滚动时题目工具条可以 sticky，但透明度降低

### 7.10 Answer Option

默认：白底 + hairline。  
Hover：surface-soft。  
Selected：primary-faint + primary border。  
Correct：success-soft + check icon。  
Incorrect：error-soft + error icon，同时保持正确答案可见。

错误反馈不能只闪红然后消失。

### 7.11 AI Coach Message

AI 消息不是普通 ChatGPT bubble 海洋。

- Coach 建议默认使用低对比度 Surface，不全部包气泡。
- 长解释使用“段落 + 小标题 + 可操作项”，像专业教练批注。
- 用户消息可以用 primary bubble。
- 证据引用做独立 inline evidence chip。
- “立即训练”“加入今日计划”“查看原题”是 action row，不埋在文本里。

### 7.12 Bottom Navigation

移动端 5 项：

**今日 / 训练 / 教练 / 进展 / 我的**

设计：

- 64px functional glass capsule / bar
- icon 20–22px
- label 11–12px
- active：ink / primary + 轻 tint
- inactive：muted
- “教练”不放大、不悬浮、不做中间大按钮，避免工具化噱头

### 7.13 Bottom Sheet

- top radius 28–36px
- handle 36×4px
- 初始 detent 45–55%
- full detent 88–94%
- 跟手 drag
- velocity > `{interaction.sheet-dismiss-velocity}` 时 dismiss
- 键盘弹出时 sheet 不应跳动；输入区跟随 safe-area

### 7.14 Text Input

- Label 永不只依赖 placeholder
- Focus：2px focus-ring 或 1px primary + 外 ring
- Error：error border + 具体恢复建议
- AI 输入支持多行，最多默认 5 行后内部滚动

### 7.15 Search

搜索是 utility，不是 hero。

- 48px pill
- 结果出现使用列表 morph / crossfade
- 输入 debounce 状态用轻 progress，不弹全屏 loading

---

## 8. Motion System / 动态设计系统

### 8.1 Motion Philosophy

见岸的动效关键词是：

**Causal / Spatial / Quiet / Responsive / Recoverable**

动效必须回答至少一个问题：

- 我刚刚触发了什么？
- 新内容从哪里来？
- 旧内容去了哪里？
- 状态为什么改变？
- 下一步在哪里？

答不出来就不该动画。

### 8.2 Motion Budget

每个 Screen Entry：

- 允许 1 个主空间动效。
- 允许 2–4 个跟随微动效。
- 禁止多个模块同时独立飞入。
- 禁止无限循环 float / pulse。
- ambient animation 默认 0。

### 8.3 Timing Tiers

| 类型 | Token | 用途 |
|---|---|---|
| Tap feedback | `{motion.feedback}` 120ms | button press, chip select |
| Fast state | `{motion.fast}` 160ms | icon state, highlight |
| State change | `{motion.state}` 220ms | tab switch content fade, validation |
| Content | `{motion.content}` 320ms | accordion, card expand |
| Spatial | `{motion.spatial}` 380ms | route hierarchy, shared element |
| Sheet | `{motion.sheet}` 420ms | bottom sheet / modal |
| Hero | `{motion.hero}` 560ms | Horizon Focus, weekly recap |

一般界面不要超过 600ms。真正的等待必须由真实加载状态而不是慢动画填充。

### 8.4 Easing

- 普通 UI：`{motion.easing-standard}`
- 新内容进入：`{motion.easing-enter}`
- 元素离开：`{motion.easing-exit}`
- Hero / 结构变化：`{motion.easing-emphasized}`

### 8.5 Springs

#### Control Spring
`{motion.spring-control}`

用于：button, toggle, small chip, tab indicator。

特点：快速、几乎无 bounce。

#### Container Spring
`{motion.spring-container}`

用于：card expand, sheet detent, shared container transform。

#### Hero Spring
`{motion.spring-hero}`

用于：Horizon Focus / Weekly Review 的一次性强调。

禁止橡皮筋式弹跳。

### 8.6 App Launch

冷启动：

1. Canvas 立即出现。
2. Logo / 见岸 wordmark 120–180ms opacity。
3. 数据准备好后直接进入 Today，避免冗长 splash。

如果初始化 > 600ms，显示结构 skeleton，不播放品牌动画拖延。

### 8.7 Tab Switch

同层级 tab：

- active icon 120ms weight / fill change
- content 160–220ms crossfade + 4px vertical settle
- 不做横向整屏滑动，除非用户本身执行 swipe gesture

这样避免“每换 tab 都像翻页”的疲劳。

### 8.8 Push Navigation

进入详情：

- source card / title 做 shared-container transform（可实现时）
- 新页面从相同视觉锚点展开
- 背景内容微退 8–12px 或 opacity 0.96
- 320–380ms

返回严格逆向，保持空间模型可预测。

### 8.9 Horizon Focus Reveal

当天第一次进入 Today：

1. 0–120ms：卡片 surface fade in。
2. 80–360ms：地平线由中心向两侧展开。
3. 160–420ms：关键状态点从低透明度出现并 settle。
4. 220–480ms：核心结论上移 6px + opacity。
5. 300–560ms：CTA 与“为什么”出现。

这是品牌级 Motion Signature，但一天只完整执行一次。

### 8.10 Score / Metric Update

新成绩写入：

- 数字从旧值连续过渡到新值，240–420ms。
- delta 迟 80ms 出现。
- 图表对应点同步高亮。
- 不使用老虎机式滚数字。
- 大幅下降也不 shake，不制造羞耻感。

### 8.11 Card Expand → Evidence

用户点击“为什么”：

- Focus Card 底部向下扩展。
- 标题保持锚定，不重新 layout 跳跃。
- Evidence sections 以 40–60ms stagger 出现。
- 卡片背景从 primary-faint 慢慢趋近 surface。

目标是让用户感到“深入一层”，不是“打开了另一个弹窗”。

### 8.12 Training Start

从 Prescription Card 点击“开始”：

- 卡片中的任务标题成为训练页 header shared element。
- CTA 区收缩为 progress rail。
- 页面其余数据淡出。

心理意义：从“计划”平滑进入“执行”，减少任务切换感。

### 8.13 Answer Feedback

**正确：**

- selected option border → success 160ms
- check icon scale 0.92→1，control spring
- 关键解题路径 220ms reveal
- optional soft haptic

**错误：**

- 不 shake 整卡
- selected option 变 error-soft
- correct option 延迟 100ms 用 success outline 出现
- “错因”区域从下方展开 320ms
- optional warning haptic

错误反馈应让注意力转向“差在哪里”，不是强调失败。

### 8.14 AI Coach Streaming

禁止逐字符“打字机”长时间输出。

推荐：

- 先显示思考占位结构（标题 / 证据 / 行动）
- 按语义块 streaming
- 每一块 120ms opacity settle
- action row 在可执行信息完整后一次出现
- 图表先画框架，再补数据

用户可在生成中滚动、复制已生成内容或停止生成。

### 8.15 Chart Motion

首次出现：

- axis 先出现 100ms
- primary line 320–520ms path reveal
- comparison line 迟 80ms
- labels 最后 120ms fade

后续筛选：使用 morph，不重复从零画线。

滑动 scrubber 时：

- tooltip 1:1 跟手，无 easing lag
- selection haptic 每跨关键节点轻触一次，但密度受限

### 8.16 Weekly Review Hero

周复盘允许第二个 Signature Moment：

- 上周与本周的 coastline contours 进行 morph
- 先展示“变化”，再展示“原因”，最后给下周一件事
- 总时长不超过 700ms

### 8.17 Gesture Rules

- Back swipe 跟随系统。
- Bottom sheet 跟手。
- 图表横向 scrub 可拖动，但必须提供 tap alternative。
- 训练选项不依赖 swipe 才能完成。
- 任何 drag-only 功能都有 single-tap 替代。

### 8.18 Haptics

Haptic 是辅助信号，不是奖励机制。

- selection：非常轻，用于 tab / picker / chart key point。
- success：单次 soft impact。
- warning：单次 medium，不连续震动。
- error：不使用强烈重复震动。
- streak / XP 不使用夸张 celebration haptic。

### 8.19 Reduced Motion

开启 Reduce Motion / `prefers-reduced-motion`：

- route transform → 120ms crossfade
- card morph → instant layout + opacity
- chart path drawing → final state fade
- count-up → 直接显示结果
- parallax → 0
- scale / depth background movement → 0

重要信息永远不靠运动单独表达。

### 8.20 Performance Rules

- 目标稳定 60fps；支持高刷新设备时自然受益，不强求 120fps。
- Web 优先 transform / opacity，避免动画大面积 blur / layout properties。
- 大面积 backdrop-filter 数量受控。
- 同时进行的 GPU-heavy 动画不超过 2 个。
- 长列表动画只对 viewport 内元素执行。

---

## 9. Interaction Psychology / 用户心理学逻辑

### 9.1 One Big Thing — 降低决策负担

备考焦虑往往来自“我可以做很多事，但不知道做哪件”。Today 首屏只给一个主要方向，其他任务在第二层。

设计原则：

**Primary choice = 1；Secondary choices ≤ 2。**

### 9.2 Autonomy — 处方可解释、可调整

AI 推荐必须允许：

- 查看为什么。
- 调整今天可用时间。
- 替换任务。
- 标记“不适合我”。

用户接受建议，不等于失去控制权。

### 9.3 Competence — 让成长可见

完成训练后不只显示“+20 XP”，而是显示：

- 哪个能力变了。
- 变化幅度。
- 为什么认为变化有效。
- 下一次如何验证。

### 9.4 Progressive Disclosure

默认只呈现结论；证据和技术细节按需展开。

层级：

`结论 → 关键证据 → 完整数据 → 方法解释`

不要一上来展示所有模型参数。

### 9.5 Trust Calibration

AI 输出区分：

- Fact / 原始数据
- Inference / 系统推断
- Recommendation / 行动建议
- Uncertainty / 不确定性

界面可通过不同 label、evidence link、confidence phrase 显示，不依赖不同颜色。

### 9.6 Motivation without Shame

连续学习机制不应该通过恐惧损失维持。

推荐：

- “本周节奏 4/5 天”优先于“连续 37 天”。
- 允许 Recovery Day / 补偿机制。
- 中断后文案：“重新开始今天这一小步”，不说“你断签了”。

### 9.7 Goal Gradient with Integrity

当用户接近阶段目标时，可以强化进度可见性，但不能伪造“只差一点”。

进度必须来自真实业务数据。

### 9.8 Error Recovery

所有高成本操作：

- 可撤销优于确认弹窗。
- 删除学习记录提供短时 Undo。
- 提交模考等不可逆动作再确认。
- 网络中断不丢当前答案。

### 9.9 Reachability

移动端高频按钮放在下半屏；顶部更多承担“信息和上下文”，底部承担“行动”。

### 9.10 Emotional Arc

一次训练体验的情绪曲线：

`进入：安静 → 开始：明确 → 做题：专注 → 错误：被理解 → 完成：轻微满足 → 退出：知道下一步`

没有烟花、金币爆炸、夸张庆祝。

---

## 10. App Information Architecture / App 核心信息架构

### 10.1 Bottom Navigation

1. **今日** — 当天状态、焦点、处方、提醒。
2. **训练** — 行测 / 申论 / 模考 / 错题 / 专项训练。
3. **教练** — AI Coach，带全局和当前上下文。
4. **进展** — 能力趋势、周复盘、成绩预测、实验结果。
5. **我的** — 考试目标、岗位、资料、账户、设置。

### 10.2 Navigation Principle

AI 不应该变成所有功能的入口。

用户想做明确任务时，直接进入结构化 UI；只有需要解释、诊断、组合策略时进入 Coach。

### 10.3 Page Family Model

`App → Page Family → Screen → State`

主要 Page Families：

- Daily Focus
- Diagnostics
- Practice
- Review & Error Repair
- AI Coach
- Progress & Trends
- Mock Exam
- Essay / 申论
- Interview / 面试
- Job Selection
- Account & Settings

---

## 11. Core Screen Specifications / 核心页面逐屏设计

## 11.1 Onboarding — 建立“我是谁”而不是填资料

**Page Job:** 用最少问题建立考试目标和初始 Candidate Model。

### Hierarchy

1. 品牌 / 一句话价值
2. 当前目标考试
3. 距离考试时间
4. 当前分数 / 是否有历史成绩
5. 每日可用时间
6. 导入已有数据（可跳过）

### Layout

一屏一问，避免长表单。

底部固定 Next CTA，顶部显示 4–5 段进度而非“17%”。

### Motion

前后步骤用 shared container + 12px lateral transition；用户回退严格反向。

### Psychology

先问用户能回答的事实，再问主观目标；减少一开始的“系统审讯感”。

### Completion

结束页不放庆祝动画，直接产生：

> “我先按你现在的信息给出第一版路线，之后会根据真实训练持续修正。”

---

## 11.2 Today — 今日首页

**Page Job:** 在 5 秒内确定今天最值得做什么。

### Above the fold

1. 日期 / 简短 greeting
2. `Horizon Focus`
3. 今日主任务 CTA

### Second Fold

- 今日处方 2–4 项
- 本周节奏
- 一条值得关注的趋势

### Below

- 最近训练
- Upcoming exam / deadline
- 可折叠工具入口

### Visual Rule

首页最多一个大数字。

### Dynamic

Focus 会随时间 / 数据变化重新排序，但位置不变，避免每天 IA 变化。

---

## 11.3 Diagnostic Import — 模考截图 / 数据导入

**Page Job:** 让用户安全地把外部结果变成结构化学习数据。

### Flow

选择来源 → 上传 → 识别 → 高亮不确定字段 → 用户确认 → 写入 → 诊断。

### Visual

上传后原图置于背景参考层；结构化数据用 foreground sheet 覆盖，形成“原始证据 / 解析结果”空间关系。

### Motion

OCR / AI parsing 不使用虚假的线性进度条。显示阶段状态：

`正在识别 → 正在核对 → 等你确认`

### Trust

低置信字段必须视觉标记并要求确认。

---

## 11.4 Diagnostic Result — 诊断结果

**Page Job:** 回答“真正限制我的是什么”。

### Hierarchy

1. 一句核心判断
2. Top 1–3 提分机会
3. 每个机会的证据
4. 建议动作
5. 置信度 / 数据覆盖

### Avoid

不要默认雷达图。雷达图比较困难、精确读取弱。

优先：

- ranked opportunity list
- horizontal contribution bar
- trend sparkline
- confidence interval

### CTA

“生成 7 天处方” 或 “立即练这个弱点”。

---

## 11.5 Practice Hub — 训练中心

**Page Job:** 快速开始一个明确训练任务。

### Sections

- 今日推荐
- 继续上次
- 专项能力
- 模考
- 错题修复
- 申论 / 面试

### Layout

推荐项大卡；其余用高密度 list，不把所有入口做成彩色功能宫格。

### Psychology

“推荐”与“自由选择”同时存在，兼顾 autonomy 和 competence。

---

## 11.6 Training Session — 行测训练页

**Page Job:** 最大化阅读、思考、答题专注。

### Top chrome

- Back
- 题目进度
- subtle timer
- More

滚动后 chrome 变更轻薄，题干获得更多视觉空间。

### Bottom action

- 选项区域本身完成回答
- 确认 / 下一题按题型决定
- AI 提示作为 secondary action，不一直漂浮

### Motion

题目切换：内容 crossfade + 8px directional slide，180–220ms。

---

## 11.7 Answer Review — 错题与反馈

**Page Job:** 把“做错”转化为可迁移的认知修正。

### Information order

1. 对 / 错 + 正确答案
2. 你错在什么类型
3. 正确推理路径
4. 你的作答与正确路径差异
5. 一个微型 follow-up question
6. 是否加入错题修复计划

### AI

AI 首先解释差异，不先给长篇标准解析。

---

## 11.8 Coach — AI 教练

**Page Job:** 理解数据、解释原因、调整计划、处理不结构化问题。

### Landing

不要空白聊天页。

顶部显示当前上下文：

- 当前考试目标
- 今日焦点
- 最近一次关键变化

下面给 3 个动态建议问题：

- “为什么我这周资料分析变慢了？”
- “把今天计划压缩到 45 分钟。”
- “我连续两次模考判断都下降，先查什么？”

### Conversation

结构化回复：

`结论 → 证据 → 建议 → 行动按钮`

### Contextual Entry

从任何成绩 / 题目 / 趋势页进入 Coach 时，顶部保留一个 context chip，告诉用户 AI 正在看什么。

---

## 11.9 Progress — 成长与趋势

**Page Job:** 回答“我是否在正确方向上变好”。

### Top

阶段性判断，而不是大总分：

> “过去 4 周，资料分析速度改善明显；判断推理稳定性仍是主要波动源。”

### Core Views

- 总分趋势
- 能力支柱
- 速度 / 正确率二维变化
- 训练投入 vs 成果
- 长期 Candidate Model

### Interaction

日期 segmented control + chart scrub。

### Signature

Growth Coastline 只用于长周期 overview，不用于每一个小图表。

---

## 11.10 Weekly Review — 周复盘

**Page Job:** 把一周行为转成下一周策略。

### Story order

1. 本周一句话
2. 有效变化
3. 无效投入
4. 新发现
5. 下周一个重点
6. 用户确认 / 调整

### Motion

允许 coastline morph 的 560–700ms Signature Motion。

### Psychology

不是评价用户“努力不努力”，而是评价策略是否有效。

---

## 11.11 Mock Exam — 模考

**Page Job:** 模拟真实考试并保护专注状态。

### Before

- 考试长度
- 计时
- 模块顺序
- 中断规则
- 开始确认

### During

极低视觉噪声：

- progress
- time
- question
- answer

不显示学习建议和 AI 鼓励。

### After

先让用户看到整体，再进入诊断。

---

## 11.12 Essay / 申论

**Page Job:** 支持阅读材料、作答、批改、重写。

### Mobile

材料与作答分阶段切换，不强行双栏。

### Tablet / Desktop

左材料 / 右答题；AI 批改以第三层 side panel / overlay 出现。

### Review

- 采点覆盖
- 结构
- 表达
- 证据引用
- 可重写段落

### Interaction

用户点某条 AI 反馈时，高亮对应原文区域，形成双向定位。

---

## 11.13 Interview / 面试

**Page Job:** 从表达练习 → 回放 → 结构反馈 → 再练。

### Recording

界面只保留：题目、时间、录音状态、结束。

### Review

- 音频波形作为定位工具，不做装饰
- 逐字稿
- 结构节点
- 冗余 / 停顿 / 逻辑跳跃
- AI 改进建议

点击建议可跳到对应音频时间。

---

## 11.14 Job Selection / 选岗

**Page Job:** 把大量职位信息变成可解释的候选集。

### Structure

- Filters
- Recommended shortlist
- Comparison
- Risk / fit explanation

### Visual

职位不是商品卡，不用“大图卡片”。

采用 dense professional list + expandable evidence panel。

### Trust

明确数据更新时间、来源、推断字段。

---

## 11.15 Profile / Settings

**Page Job:** 管理长期目标、数据和系统边界。

优先级：

1. 考试目标
2. 学习偏好
3. AI 记忆 / Candidate Model 可查看和纠正
4. 通知
5. 隐私与数据
6. 账户

AI “记住了什么”必须可见、可编辑、可删除。

---

## 12. Website / Web App Front-end Design

虽然移动 App 是主阵地，Web 仍需保持同一视觉语法。

## 12.1 Public Landing Page

### Hero

不要写：

> “AI 驱动的下一代智能公考学习平台”

推荐用真实产品价值：

> **看清你为什么卡在这里。**  
> 见岸根据你的真实训练持续校准，告诉你此刻最值得解决的问题。

Hero 右侧 / 下方展示真实 product demo，而不是 AI 球体。

### Hero Demo

展示：

- 3 次模考趋势
- 系统发现“资料分析正确率上升，但耗时恶化”
- 生成一个今日训练

用户不滚动就知道产品如何工作。

### Page Order

1. Hero / real product
2. 核心闭环
3. 个性化诊断
4. 今日处方
5. AI Coach
6. 长期趋势
7. 真实可信度 / 数据来源说明
8. FAQ / CTA

### Marketing Aesthetic

比 App 更 editorial，但不能脱离 App 视觉。

允许更大留白与 56px display；不允许为营销单独发明霓虹主题。

## 12.2 Desktop Web App

Desktop 不是移动版拉宽：

- 左 rail：稳定导航
- center：任务主体
- right context：按需出现的 AI / evidence

训练 / 申论 / 选岗在 desktop 获得真正的信息密度优势。

---

## 13. Data Visualization / 数据可视化

### 13.1 Philosophy

数据图不是证明“AI 很强”，而是帮助用户决策。

每个图表必须回答一个问题。

### 13.2 Preferred Charts

优先：

- line trend
- small multiples
- horizontal bars
- dot plot
- distribution band
- confidence interval
- progress band
- before / after comparison

谨慎：

- donut
- gauge
- stacked area

默认避免：

- 3D chart
- radar as primary diagnosis
- pie with many categories
- decorative heatmap

### 13.3 Baseline Visualization

个人数据的核心比较顺序：

1. 自己过去的 baseline
2. 当前目标线
3. 可选群体 benchmark

不要默认让用户和“全网考生”比较。

### 13.4 Color

同一图表：

- primary = current self
- muted = historical / comparison
- dawn = opportunity / turning point
- semantic colors = only state

### 13.5 Interaction

- scrubber 跟手
- tooltip 不遮挡目标点
- long press mobile / hover desktop
- double tap 不承担必要功能
- 关键洞察可以从图表直接“加入计划”

---

## 14. Content Design / 文案系统

### 14.1 Voice

**冷静、准确、有人味、不居高临下。**

不是：

> “太棒了！你又进步啦！坚持就是胜利！”

而是：

> “资料分析正确率在上升，但耗时连续两次超过你的个人基线。今天先处理速度。”

### 14.2 AI Uncertainty

推荐表达：

- “目前更像是……”
- “基于最近 3 次记录……”
- “这个判断的证据还不够稳定。”
- “如果下次仍出现，我们再把它升级为重点问题。”

禁止：

- “AI 精准预测你一定可以……”
- “系统证明……”（除非确有严格证据）

### 14.3 CTA Language

动词优先：

- 开始训练
- 查看依据
- 调整计划
- 再做一组
- 加入本周
- 对比两次结果

少用：

- 确定
- 提交
- 下一步

除非场景确实需要。

---

## 15. Responsive Behavior / 响应式与设备适配

| Device | Width | Navigation | Content Strategy |
|---|---|---|---|
| Compact phone | < 375px | 5-tab bottom nav | 1-column，减少并列指标 |
| Standard phone | 375–430px | 5-tab bottom nav | 4-column fluid grid |
| Large phone | 430–600px | 5-tab bottom nav | 4-column，适度增加 gutter |
| Tablet portrait | 600–900px | bottom / compact rail | 8-column，双区布局 |
| Tablet landscape | 900–1100px | side rail | 8–12 column，支持 split view |
| Desktop | 1100–1440px | persistent side rail | center work area + optional context rail |
| Wide | > 1440px | persistent side rail | max-width，不无限拉宽正文 |

### 15.1 Mobile Principles

- Sticky action 不遮挡内容。
- Bottom nav 遵循 safe-area。
- 键盘打开时保留正在输入的 context。
- 一手操作高频 action 优先下置。

### 15.2 Large Screen Principles

大屏新增价值，而不是只增大间距：

- 同时看原题 + 解释
- 材料 + 作答
- 列表 + 对比
- 数据 + AI evidence

---

## 16. Accessibility & Inclusive Design

### 16.1 Target

Web 默认以 WCAG 2.2 AA 为最低目标。

### 16.2 Touch

- 系统最低 44×44px
- 主 CTA 48px high
- 相邻小图标必须有足够 spacing

### 16.3 Contrast

- 正文目标 ≥ 4.5:1
- 大字 ≥ 3:1
- 焦点状态明显
- color 不是唯一状态编码

### 16.4 Dynamic Type

文字放大 130–150% 时：

- 关键 CTA 不截断
- Bottom nav label 可缩减为 icon + accessible label（极端情况）
- 数据卡允许纵向增长
- 图表 label 避免重叠，必要时转为 tooltip

### 16.5 Screen Reader

数据图提供：

- 图表标题
- 当前值
- 变化方向
- 关键时间点
- 可访问数据表替代

### 16.6 Motion

遵循系统 Reduce Motion，任何动画都不是理解内容的唯一通道。

---

## 17. Night Study Theme / 夜间学习主题

夜间模式不是纯黑。

建议：

- Canvas: #101719
- Surface: #162023
- Surface Soft: #1B292C
- Primary Text: #EAF1EF
- Body: #C3CFCC
- Muted: #8FA09C
- Primary: #72AAA6
- Dawn: #D5A36F

原则：

- 减少大面积高对比白。
- 保持暖色稀缺性。
- 图表亮度降低但区别仍清晰。
- 不把整个品牌变成“赛博黑蓝”。

---

## 18. Loading / Empty / Error / Offline States

### 18.1 Loading

优先 skeleton matching final layout。

不用“AI 正在思考 1/2/3...”伪步骤，除非真有可观察的阶段。

### 18.2 Empty

Empty state 必须告诉用户：

- 为什么空
- 可以做什么
- 完成后会得到什么

例如进展页无数据：

> “还没有足够数据形成趋势。完成 2 次模考或 3 次专项训练后，这里会开始出现你的个人基线。”

### 18.3 Error

错误文案结构：

`发生什么 → 数据有没有丢 → 怎么恢复`

### 18.4 Offline

训练过程本地保存当前答案和进度；恢复连接后同步。

用户感知重点不是“网络错误”，而是“我的学习不会丢”。

---

## 19. Notifications & Proactive Coaching

通知遵循“行动价值阈值”。

允许：

- 今天计划尚未开始，且距离用户设定时间窗接近。
- 模考后诊断已经完成。
- 连续出现值得处理的变化。
- 用户主动设置的考试 / 报名 deadline。

禁止：

- 为提高 DAU 发送“今天也要加油”。
- 每个小进步都推送。
- 强化焦虑的倒计时轰炸。

通知文案示例：

> “你最近两次资料分析都慢于个人基线。今天计划里已经替你压了一组 18 分钟训练。”

---

## 20. Do's and Don'ts / 强约束

### Do

- **Do** 让首页只有一个真正的主焦点。
- **Do** 让所有 AI 结论都能向下追溯到证据。
- **Do** 使用空间连续性解释页面和状态之间的关系。
- **Do** 把玻璃限制在导航 / 控件层。
- **Do** 使用大量低对比中性色承载复杂信息。
- **Do** 让暖色只出现在“值得关注的机会点”。
- **Do** 在训练场景主动降低品牌存在感，让内容成为主角。
- **Do** 让 Mobile 与 Desktop 使用同一视觉语法，但不同信息密度。
- **Do** 为 loading / empty / error / low-confidence 设计完整状态。
- **Do** 把 Motion 当作信息架构的一部分。

### Don't

- **Don't** 做紫色 AI 渐变、霓虹光环、星空背景。
- **Don't** 用十几个彩色功能入口组成首页宫格。
- **Don't** 给每张卡加 shadow。
- **Don't** 把所有容器做成玻璃。
- **Don't** 用雷达图承担主要诊断。
- **Don't** 在做错题时 shake 整屏或强烈红色警告。
- **Don't** 用金币、烟花、彩带作为主要激励。
- **Don't** 让 AI 大段文本成为默认结果页。
- **Don't** 让 Bottom Navigation 的 AI 中心按钮巨大悬浮。
- **Don't** 让动态效果超过内容本身的注意力权重。
- **Don't** 为了“高级”牺牲对比度、字号、触摸面积或明确 CTA。

---

## 21. Design System Notes for Stitch Generation

### 21.1 Language to Use

生成 UI 时优先使用以下描述：

- quiet intelligence
- coastal dawn restraint
- warm mist canvas
- deep blue-green editorial ink
- precise data hierarchy
- calm high-performance coaching
- functional translucent navigation layer
- opaque content surfaces
- progressive disclosure
- evidence-led AI insight
- restrained expressive motion
- spatial continuity
- soft but not playful geometry
- low visual complexity, high craftsmanship

不要只写：

- modern
- clean
- premium
- AI style
- glassmorphism

这些词过于泛化。

### 21.2 Color References

- Horizon Teal `{colors.primary}` — 主 CTA / selected / primary data
- Deep Horizon `{colors.primary-active}` — pressed / high-emphasis
- Mist Teal `{colors.primary-soft}` — selected background
- Fog Canvas `{colors.canvas}` — default canvas
- Ink `{colors.ink}` — primary text
- Dawn Copper `{colors.dawn}` — opportunity only
- Success `{colors.success}` — positive state
- Error `{colors.error}` — recoverable error

### 21.3 Component Prompt — Today / 今日

> Create a premium mobile AI exam-coaching Today screen for “见岸 / JIANAN” using the Quiet Horizon design system. Use a warm fog-white canvas, deep blue-green ink, restrained horizon teal, and one rare dawn-copper opportunity accent. The first screen must have one dominant “Horizon Focus” card with a subtle horizontal horizon motif, one decisive coaching sentence, one evidence summary, and one primary action. Under it, show a compact 3-item daily prescription and one small weekly rhythm module. Keep navigation visually quiet in a translucent functional bottom layer. No colorful dashboard grid, no neon AI gradient, no oversized gamification.

### 21.4 Component Prompt — Diagnostic Result

> Create a high-end diagnostic result screen for “见岸”. Lead with one sentence that identifies the highest-value score improvement opportunity. Beneath it, rank three opportunities with compact evidence rows, personal-baseline comparison, confidence language, and one action per opportunity. Use opaque white cards on a fog canvas, subtle hairline borders, almost no shadows, teal for current self and dawn copper only for the top opportunity. Avoid radar charts; use horizontal contribution bars and sparklines.

### 21.5 Component Prompt — Training

> Create a distraction-minimized mobile training screen for a serious adult exam learner. Use warm off-white reading surfaces, 17px Chinese question text with generous line height, a very quiet top progress/timer bar, large accessible answer options, and a low-emphasis contextual AI hint action. The question must dominate the screen. Feedback should transform the selected answer into a calm correct/incorrect state and reveal the reasoning below without shaking or celebratory animation.

### 21.6 Component Prompt — AI Coach

> Create a contextual AI coaching screen that feels like a private professional coach, not a generic chatbot. Show the active exam goal and current context at the top, followed by structured AI responses organized as Conclusion, Evidence, Recommendation, and Action. Use minimal bubble styling: AI content sits mostly on the canvas or subtle soft surfaces, user messages use restrained teal bubbles. Evidence is represented by compact chips linking back to source training data. Include actionable buttons such as “加入今日计划” and “立即训练”.

### 21.7 Component Prompt — Progress

> Create a premium long-term progress screen using the Quiet Horizon visual language. Start with a one-sentence interpretation of the last four weeks, then show a restrained Growth Coastline overview as the single expressive data moment, followed by precise small-multiple charts for score, accuracy, speed, and stability. Use current-self teal, muted gray historical lines, and rare dawn-copper turning points. Charts must be readable and evidence-driven, with a touch/hover scrubber and no decorative 3D graphics.

### 21.8 Dynamic Prompt — Motion

> Apply restrained spatial motion. Micro feedback 120–160ms, state changes ~220ms, card expansion ~320ms, shared-container navigation 320–380ms, bottom sheets ~420ms, and only one hero transition up to 560ms. Use spring motion with high damping and nearly no bounce. Preserve source-to-destination continuity. The Horizon Focus may reveal its horizon line and insight once per day; repeated visits should use a short fade. All animations must have a reduced-motion fallback.

### 21.9 Incremental Generation Order

Stitch 生成顺序不要一次生成全系统：

1. Today — 先确认品牌气质和层级。
2. Training — 验证高专注状态。
3. Diagnostic Result — 验证数据和 AI 可信度。
4. Coach — 验证 AI 交互。
5. Progress — 验证复杂数据层级。
6. Weekly Review — 验证 Signature Motion。
7. 申论 / 面试 / 选岗。
8. Onboarding / Settings / empty-error-loading。
9. Public website。

每完成一组，检查视觉语法是否一致，再扩展。

---

## 22. Motion Implementation Notes for Front-end

### 22.1 CSS / Web

可实现的通用映射：

- Press: `transform: scale(.985)` + 120ms
- Standard state: 220ms `{motion.easing-standard}`
- Container transform: 320–380ms emphasized easing
- Modal / sheet: translateY + opacity + backdrop 380–420ms
- Use `will-change` only shortly before animation, not globally

### 22.2 Native / Flutter / React Native

优先使用 spring / shared transition API；不要在业务代码里散落几十个 duration magic numbers。

Motion tokens 应集中配置：

`feedback / state / content / spatial / sheet / hero`

### 22.3 Gesture Coupling

交互驱动动画必须跟手：

- sheet drag progress 直接映射 translateY
- back swipe 映射 previous screen reveal
- chart scrub 直接映射 selected x

松手后才进入 spring settle。

---

## 23. Quality Gates / 高级感验收标准

### 23.1 50ms First-impression Test

随机给目标用户快速闪现页面：

必须能感到：

- 平静
- 专业
- 有方向
- 非培训机构
- 非普通 AI 套壳

若第一感受是“功能多 / 信息多 / AI 很炫”，失败。

### 23.2 3-second Hierarchy Test

3 秒内用户应能指出：

1. 这页是什么。
2. 最重要的信息是什么。
3. 下一步能做什么。

### 23.3 Squint Test

把页面缩小 / 模糊后仍应只有 1 个主视觉重心。

### 23.4 Color Scarcity Test

去掉主色和 dawn 后页面仍然成立；颜色只是增加语义，而不是维持结构。

### 23.5 Motion Causality Test

逐个动画问：

> “没有它，用户是否更难理解状态变化？”

如果不是，只保留在 Signature Moment 或删除。

### 23.6 State Completeness

每个 P0 Component 至少覆盖：

- default
- pressed / active
- focus
- disabled
- loading
- success
- error
- empty / no-data（适用时）
- offline（适用时）
- reduced motion

### 23.7 App Premium Gate

高保真验收必须同时满足：

- 首页无功能宫格主导。
- 同屏不超过 1 个大号主数字。
- 同屏高饱和强调色不超过 2 个语义。
- Card family 不超过 4 套主要形态。
- Navigation 不争夺视觉中心。
- 每个 AI 结论有证据入口。
- 错误状态不羞辱用户。
- Motion 无明显 bounce / lag / layout jump。
- Mobile 和 Desktop 都有专门布局，不是等比缩放。

---

## 24. Research Basis / 研究依据与对标来源

以下来源用于约束设计方向，不表示见岸复制其视觉表达。

### Google Stitch / DESIGN.md

- Google Labs: Stitch DESIGN.md open source announcement  
  https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/
- DESIGN.md Draft Specification  
  https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
- DESIGN.md Philosophy  
  https://github.com/google-labs-code/design.md/blob/main/PHILOSOPHY.md
- Stitch design extraction skill / example structure  
  https://github.com/google-labs-code/stitch-skills/tree/main/plugins/stitch-design/skills/extract-design-md

### Oura

- New Oura App Experience / Today, Vitals, My Health  
  https://ouraring.com/blog/new-oura-app-experience/
- 2025 Oura App redesign / “one big thing”  
  https://ouraring.com/blog/new-app-design/
- Oura Advisor  
  https://ouraring.com/blog/oura-advisor/
- Oura Trends  
  https://support.ouraring.com/hc/articles/360055983614-Using-Trends

### Brilliant

- How Koji works  
  https://brilliant.org/help/features/how-does-koji-work/
- Learning Paths  
  https://brilliant.org/help/features/what-are-learning-paths/
- Product Features  
  https://brilliant.org/help/features/
- Streak  
  https://brilliant.org/help/features/what-is-a-streak/

### WHOOP

- 2025 Home Redesign / personalized AI / Weekly Plan  
  https://www.whoop.com/us/en/thelocker/everything-whoop-launched-in-2025/
- 2026 personalized coaching direction  
  https://www.whoop.com/us/en/thelocker/2026-whats-next/
- AI guidance  
  https://www.whoop.com/us/en/thelocker/new-ai-guidance-from-whoop/

### Linear

- 2026 UI Refresh  
  https://linear.app/now/behind-the-latest-design-refresh

### Apple Human Interface Guidelines

- Design Principles  
  https://developer.apple.com/design/human-interface-guidelines/design-principles
- Materials / Liquid Glass  
  https://developer.apple.com/design/human-interface-guidelines/materials
- Motion  
  https://developer.apple.com/design/human-interface-guidelines/motion
- Layout  
  https://developer.apple.com/design/human-interface-guidelines/layout

### Material / Android

- Material 3 in Compose / M3 Expressive  
  https://developer.android.com/develop/ui/compose/designsystems/material3
- MotionScheme  
  https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme
- Material motion duration / easing background reference  
  https://m1.material.io/motion/duration-easing.html

### Accessibility

- WCAG 2.2  
  https://www.w3.org/TR/wcag/
- What’s New in WCAG 2.2  
  https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

### HCI / Psychology

- Tuch et al. — Visual complexity and prototypicality in first impressions  
  https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/
- Miniukovich & Figl — Prototypicality, aesthetics, usability, trustworthiness  
  https://doi.org/10.1016/j.ijhcs.2023.103103
- Wang et al. 2024 — SDT interventions in education, systematic review/meta-analysis  
  https://doi.org/10.1016/j.lmot.2024.102015
- Ryan & Deci perspective on intrinsic/extrinsic motivation and SDT  
  https://doi.org/10.1016/j.cedpsych.2020.101860

---

## 25. Known Gaps / 待真实产品验证

这份文档已经达到设计系统和 Stitch 生成层级，但以下项目必须通过真实高保真 / 运行态继续验证，不能仅靠规范宣称“最优”：

1. Horizon Focus 的具体图形比例需要至少 3 版高保真 A/B 视觉比较。
2. Dawn Copper 在不同国产 Android 屏幕上的实际饱和度需要设备测试。
3. Bottom Navigation 的 glass blur 在低端设备上需要性能降级方案。
4. 5-tab IA 需要可用性测试验证“教练 / 进展”的心智区分。
5. AI Coach 的信息块长度与用户真实阅读完成率需要行为数据校准。
6. 周复盘 Growth Coastline 是否真正帮助理解，需要与普通 line chart 进行任务测试，不应因为好看就默认保留。
7. 动效参数需要在 iOS / Android / Web 三端真实设备上调参；本文数值是高质量实现起点，不是跨设备物理常数。
8. App 中文字体在实际技术栈中的可用字重与字形必须最终确认。

---

## 26. Final Design Rule / 最终设计原则

**见岸的高级感不是让用户觉得“这个 App 很会设计”，而是让用户在复杂备考中持续感到：信息被整理了，方向更清楚了，下一步变简单了。**

如果某个视觉元素、动效、图表或 AI 表达不能增强这种“清晰与确定”，即使它本身很漂亮，也应该删除。
