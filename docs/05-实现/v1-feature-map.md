# V1 功能完成映射

> 2026-08-31。功能清单 v1.0 中所有 `规划版本=V1` 条目（155 条）逐条映射到实现产物。此表是台账“完成”状态的审计依据。

## 汇总

- V1 功能点：**155** 条（P0 19 / P1 117 / P2 19）
- 核心闭环：CL-05 申论批改重写、CL-08 选岗决策；其余跨模块能力纳入 CL-01/02/03/04/07/09。
- 验证：纯函数单测（能力/计划/洞察/申论/选岗/AI质量）+ Playwright CL-05/CL-08。
","## 逐条映射","

### 账号与首次使用

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0004 | P1 | 微信/Apple等快捷登录 | `/login`、`/api/auth/provider`、`src/lib/server/db.ts`（第三方登录/绑定/解绑） |
| F0005 | P1 | 手机号与第三方账号绑定/解绑 | `/login`、`/api/auth/provider`、`src/lib/server/db.ts`（第三方登录/绑定/解绑） |

### 备考目标与个人画像

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0019 | P1 | 关联目标岗位/岗位组 | `/onboarding`、`/me`、`src/lib/profile/conflicts.ts`（岗位目标、资源/偏好/教练风格、目标冲突） |
| F0023 | P2 | 已使用课程/题库/平台记录 | `/onboarding`、`/me`、`src/lib/profile/conflicts.ts`（岗位目标、资源/偏好/教练风格、目标冲突） |
| F0025 | P2 | 偏好短练/长练/视频/文字/互动 | `/onboarding`、`/me`、`src/lib/profile/conflicts.ts`（岗位目标、资源/偏好/教练风格、目标冲突） |
| F0026 | P2 | 直接/温和/苏格拉底式支持偏好 | `/onboarding`、`/me`、`src/lib/profile/conflicts.ts`（岗位目标、资源/偏好/教练风格、目标冲突） |
| F0029 | P1 | 考试日期冲突与时间不足提示 | `/onboarding`、`/me`、`src/lib/profile/conflicts.ts`（岗位目标、资源/偏好/教练风格、目标冲突） |

### 数据接入与建档

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0039 | P1 | 一次导入多次历史模考 | `/import/advanced`、`src/lib/import/advanced.ts`（历史/练习/错题批量导入、用时提取、原始证据、纠错入池） |
| F0042 | P1 | 导入模块练习结果截图/记录 | `/import/advanced`、`src/lib/import/advanced.ts`（历史/练习/错题批量导入、用时提取、原始证据、纠错入池） |
| F0043 | P2 | 截图/文本方式导入外部错题 | `/import/advanced`、`src/lib/import/advanced.ts`（历史/练习/错题批量导入、用时提取、原始证据、纠错入池） |
| F0044 | P1 | 提取总用时与题型用时 | `/import/advanced`、`src/lib/import/advanced.ts`（历史/练习/错题批量导入、用时提取、原始证据、纠错入池） |
| F0048 | P1 | 保留原截图与解析版本关联 | `/import/advanced`、`src/lib/import/advanced.ts`（历史/练习/错题批量导入、用时提取、原始证据、纠错入池） |
| F0049 | P1 | 用户修改识别值反哺解析评测集 | `/import/advanced`、`src/lib/import/advanced.ts`（历史/练习/错题批量导入、用时提取、原始证据、纠错入池） |

### 首页与今日

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0058 | P1 | 因时间/状态不合适申请替换任务 | `/today`、`src/lib/plan/adaptive.ts`（替换/难度/趋势/进步证据） |
| F0060 | P2 | 标注轻量/标准/挑战任务 | `/today`、`src/lib/plan/adaptive.ts`（替换/难度/趋势/进步证据） |
| F0061 | P1 | 自动突出最近最值得关注的趋势 | `/today`、`src/lib/plan/adaptive.ts`（替换/难度/趋势/进步证据） |
| F0063 | P1 | 识别稳定进步并指出证据 | `/today`、`src/lib/plan/adaptive.ts`（替换/难度/趋势/进步证据） |

### 个人基线与能力画像

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0071 | P1 | 细分到逻辑填空/图推/资料等题型 | `src/lib/ability/dimensions.ts`、`/progress`、训练会话落库 attemptRecords（题型/稳定性/自动化/遗忘/纠正） |
| F0074 | P1 | 跨场次波动与稳定程度 | `src/lib/ability/dimensions.ts`、`/progress`、训练会话落库 attemptRecords（题型/稳定性/自动化/遗忘/纠正） |
| F0075 | P1 | 快且正确的熟练程度指标 | `src/lib/ability/dimensions.ts`、`/progress`、训练会话落库 attemptRecords（题型/稳定性/自动化/遗忘/纠正） |
| F0076 | P1 | 根据间隔与复测表现估计复习需求 | `src/lib/ability/dimensions.ts`、`/progress`、训练会话落库 attemptRecords（题型/稳定性/自动化/遗忘/纠正） |
| F0079 | P1 | 允许纠正错因/薄弱项判断 | `src/lib/ability/dimensions.ts`、`/progress`、训练会话落库 attemptRecords（题型/稳定性/自动化/遗忘/纠正） |

### AI提分诊断

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0090 | P1 | 识别高波动模块的稳定性收益 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |
| F0091 | P1 | 识别高遗忘风险但曾掌握内容 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |
| F0095 | P1 | 解释为什么不是看似更弱的模块 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |
| F0098 | P1 | 用区间/等级表达潜在收益而非假精确 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |
| F0099 | P1 | 用户标记不认同并选择原因 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |
| F0100 | P1 | 证据不足时向用户追问最少必要信息 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |
| F0102 | P1 | 对比本周/上周诊断变化 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |
| F0103 | P1 | 当新数据显著变化时提示旧诊断失效 | `/diagnosis`、`src/lib/insights/v1.ts`（稳定性/复习机会/反事实/区间/不认同/补充/版本有效期） |

### 学习处方与计划

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0107 | P1 | 根据当前能力选择适当难度 | `src/lib/plan/adaptive.ts`、`/today`（难度组合/间隔复测/脚手架淡出/原因/缩短/里程碑） |
| F0108 | P1 | 专项/混合/复习/速度训练组合 | `src/lib/plan/adaptive.ts`、`/today`（难度组合/间隔复测/脚手架淡出/原因/缩短/里程碑） |
| F0109 | P1 | 对已学薄弱点安排间隔复测 | `src/lib/plan/adaptive.ts`、`/today`（难度组合/间隔复测/脚手架淡出/原因/缩短/里程碑） |
| F0111 | P1 | 能力提高后逐步减少提示与示例 | `src/lib/plan/adaptive.ts`、`/today`（难度组合/间隔复测/脚手架淡出/原因/缩短/里程碑） |
| F0116 | P1 | 时间不足/太难/计划不合理/其他 | `src/lib/plan/adaptive.ts`、`/today`（难度组合/间隔复测/脚手架淡出/原因/缩短/里程碑） |
| F0118 | P1 | 时间临时减少时生成轻量版 | `src/lib/plan/adaptive.ts`、`/today`（难度组合/间隔复测/脚手架淡出/原因/缩短/里程碑） |
| F0123 | P1 | 到达阶段节点自动复盘并重设目标 | `src/lib/plan/adaptive.ts`、`/today`（难度组合/间隔复测/脚手架淡出/原因/缩短/里程碑） |

### 行测训练中心

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0126 | P1 | 跨题型混合练习 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |
| F0128 | P1 | 按错因/遗忘风险复测 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |
| F0129 | P1 | 按目标/薄弱点自动组题 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |
| F0131 | P1 | 记录答案切换次数与最终答案 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |
| F0138 | P1 | 指出更优解题策略而非只给答案 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |
| F0140 | P1 | 错后推荐近邻问题验证是否真正掌握 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |
| F0143 | P1 | 继续同类/切换/结束休息建议 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |
| F0147 | P1 | 题目/解析修订版本留痕 | `/train`、`/train/session/[id]`、`src/lib/training/advanced.ts`（混合/复测/组卷/轨迹/策略/近邻/下一步/版本） |

### 错题与错因系统

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0150 | P1 | 高耗时/低信心但答对题进入关注库 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0154 | P1 | 计算/操作过程中出错 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0155 | P1 | 识别末段匆忙或超时导致错误 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0158 | P1 | 按错因而非只按题型统计 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0159 | P1 | 统计同类错因重复出现频率 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0160 | P1 | 未修复/验证中/已稳定修复 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0161 | P1 | 按错因生成5-15分钟针对性任务 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0162 | P1 | 用相似但不同题验证迁移 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |
| F0163 | P1 | 间隔后再次测试确认长期掌握 | `src/lib/insights/v1.ts`、`/train/wrongbook`、`src/lib/training/advanced.ts`（关注库/执行与时间压力/聚合/复发/微干预/迁移/延迟复测） |

### AI教练

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0165 | P1 | 教练读取能力画像与历史弱点 | `/coach`、`src/lib/plan/adaptive.ts`（画像上下文/近邻练习/脚手架/续接/风格） |
| F0170 | P1 | 对话结束生成相似练习 | `/coach`、`src/lib/plan/adaptive.ts`（画像上下文/近邻练习/脚手架/续接/风格） |
| F0171 | P1 | 重复掌握后减少提示强度 | `/coach`、`src/lib/plan/adaptive.ts`（画像上下文/近邻练习/脚手架/续接/风格） |
| F0174 | P2 | 同一学习上下文延续对话 | `/coach`、`src/lib/plan/adaptive.ts`（画像上下文/近邻练习/脚手架/续接/风格） |
| F0175 | P2 | 简洁/详细/提问式辅导 | `/coach`、`src/lib/plan/adaptive.ts`（画像上下文/近邻练习/脚手架/续接/风格） |

### 模考与分数预测

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0181 | P1 | 按备考阶段选择短模考/整卷 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |
| F0184 | P1 | 记录模块进入顺序与切换 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |
| F0189 | P1 | 按知识/策略/审题/时间分类 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |
| F0192 | P1 | 根据训练和模考给出预测区间 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |
| F0193 | P1 | 明确预测不确定性与数据量 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |
| F0195 | P1 | 基于历史效率给出作答顺序实验建议 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |
| F0196 | P1 | 生成下一次模考模块时间预算 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |
| F0197 | P1 | 下一场验证新顺序/时间策略效果 | `/mock`、`/progress`、`src/lib/insights/v1.ts`（短/整卷、顺序、错因结构、预测区间、时间策略实验） |

### 申论AI教练

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0198 | P0 | 概括/对策/公文/大作文等 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0199 | P0 | 按年份/地区选择真题 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0200 | P1 | 按历史薄弱维度推荐练习 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0201 | P0 | 键盘输入答案 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0203 | P0 | 实时字数与限制提醒 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0204 | P0 | 按题目评分规则给出参考分 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0205 | P0 | 内容/结构/语言/规范等维度 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0206 | P0 | 将答案要点与材料得分点对齐 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0207 | P0 | 指出遗漏要点及对应材料依据 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0208 | P1 | 识别重复/无效/偏题表达 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0209 | P1 | 识别层次/归类/因果/并列关系问题 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0210 | P1 | 口语化/模糊/不规范词替换建议 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0211 | P0 | 每个关键反馈指向原答案/材料片段 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0212 | P0 | 对主观评分显示置信等级与限制 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0213 | P0 | 只给最值得优先修改的1-3项 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0214 | P1 | 按句/段给出修改意见 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0215 | P1 | 提供结构范例/近邻范例而非直接替写 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0216 | P0 | 反馈后进入同题二次作答 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0217 | P1 | 高亮第一次与第二次改进点 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0218 | P1 | 按历次表现更新申论维度画像 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0224 | P1 | 各题型/评分维度趋势 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0225 | P1 | 统计长期重复出现的问题 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |
| F0226 | P1 | 根据高频问题生成下周训练 | `/essay`、`/essay/[id]`、`/essay/report`、`src/lib/essay/*`（CL-05） |

### 智能选岗

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0257 | P1 | 学历/专业/应届/政治面貌/基层经历 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0258 | P1 | 地区/单位层级/通勤/发展等偏好 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0259 | P0 | 确定性规则筛出可报/不可报 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0260 | P0 | 逐条展示不满足条件 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0261 | P1 | 专业名称/代码同义匹配与人工确认 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0262 | P1 | 资格通过后按偏好与风险排序 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0263 | P1 | 结合历史数据给出相对低竞争候选 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0264 | P1 | 按不确定性分为冲/稳/保 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0265 | P1 | 解释推荐依据而非只给分 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0266 | P1 | 招录人数/历史岗位变化 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0267 | P1 | 展示可获取的历史进面数据 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0268 | P1 | 报名热度/趋势与数据时间戳 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0270 | P0 | 每个关键数据标注来源与更新时间 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0271 | P1 | 3-5个职位多维表格对比 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0273 | P1 | 收藏意向岗位 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0274 | P1 | 报名/审核/缴费/准考证时间提醒 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |
| F0275 | P1 | 职位信息/报名数据变化通知 | `/jobs`、`/api/jobs/match`、`src/lib/jobs/*`（CL-08） |

### 趋势与复盘

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0279 | P1 | 各类错因频次随时间变化 | `/progress`、`/progress/weekly`、`src/lib/insights/v1.ts`（错因/处方有效性/无效投入/反思） |
| F0284 | P1 | 比较计划执行与结果变化 | `/progress`、`/progress/weekly`、`src/lib/insights/v1.ts`（错因/处方有效性/无效投入/反思） |
| F0285 | P1 | 识别投入高但改善弱的训练 | `/progress`、`/progress/weekly`、`src/lib/insights/v1.ts`（错因/处方有效性/无效投入/反思） |
| F0287 | P1 | 用户确认本周感受/困难/时间变化 | `/progress`、`/progress/weekly`、`src/lib/insights/v1.ts`（错因/处方有效性/无效投入/反思） |

### 提醒与行为支持

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0291 | P1 | 报名/缴费/准考证/笔试日期提醒 | `/messages`、`src/lib/notifications/engine.ts`、`/me`（节点/到期/降频/关闭/连续学习/证据） |
| F0292 | P1 | 遗忘风险较高内容到期提醒 | `/messages`、`src/lib/notifications/engine.ts`、`/me`（节点/到期/降频/关闭/连续学习/证据） |
| F0293 | P2 | 连续忽略后自动降低提醒频率 | `/messages`、`src/lib/notifications/engine.ts`、`/me`（节点/到期/降频/关闭/连续学习/证据） |
| F0294 | P1 | 高频主动建议可关闭/降频 | `/messages`、`src/lib/notifications/engine.ts`、`/me`（节点/到期/降频/关闭/连续学习/证据） |
| F0297 | P2 | 展示连续有效学习天数 | `/messages`、`src/lib/notifications/engine.ts`、`/me`（节点/到期/降频/关闭/连续学习/证据） |
| F0298 | P2 | 阶段目标达成庆祝但不过度游戏化 | `/messages`、`src/lib/notifications/engine.ts`、`/me`（节点/到期/降频/关闭/连续学习/证据） |
| F0299 | P1 | 用真实数据而非空泛鼓励反馈进步 | `/messages`、`src/lib/notifications/engine.ts`、`/me`（节点/到期/降频/关闭/连续学习/证据） |

### 内容与搜索

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0303 | P2 | 收藏代表题与复习标签 | `/train`、`/train/wrongbook`（收藏与复习标签、方法卡） |
| F0305 | P2 | 关键解题策略短卡片 | `/train`、`/train/wrongbook`（收藏与复习标签、方法卡） |

### 会员与支付

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0311 | P1 | App Store等恢复订阅 | `/membership`、`src/lib/profile/store.ts`（恢复购买/AI额度/到期提醒/退款） |
| F0313 | P2 | 显示AI调用/批改等剩余额度 | `/membership`、`src/lib/profile/store.ts`（恢复购买/AI额度/到期提醒/退款） |
| F0314 | P2 | 到期前提醒并说明影响 | `/membership`、`src/lib/profile/store.ts`（恢复购买/AI额度/到期提醒/退款） |
| F0315 | P1 | 展示不同渠道退款规则与入口 | `/membership`、`src/lib/profile/store.ts`（恢复购买/AI额度/到期提醒/退款） |

### 消息与客服

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0316 | P2 | 考试节点/产品更新/服务通知 | `/messages`、`/feedback`、`/help`、`/api/feedback`（系统/学习消息、纠错、人工支持） |
| F0317 | P1 | 任务/复习/周报消息统一管理 | `/messages`、`/feedback`、`/help`、`/api/feedback`（系统/学习消息、纠错、人工支持） |
| F0320 | P1 | 题目/解析/时政内容纠错 | `/messages`、`/feedback`、`/help`、`/api/feedback`（系统/学习消息、纠错、人工支持） |
| F0322 | P2 | 必要时进入人工支持 | `/messages`、`/feedback`、`/help`、`/api/feedback`（系统/学习消息、纠错、人工支持） |

### 设置与隐私

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0325 | P2 | 调整教练回答方式与主动程度 | `/me`、`/api/auth/delete`、`src/lib/profile/store.ts`（风格、截图策略、个性化、指定删除、注销） |
| F0328 | P1 | 选择原始成绩截图保留/自动删除策略 | `/me`、`/api/auth/delete`、`src/lib/profile/store.ts`（风格、截图策略、个性化、指定删除、注销） |
| F0329 | P1 | 允许关闭基于行为的个性化推荐 | `/me`、`/api/auth/delete`、`src/lib/profile/store.ts`（风格、截图策略、个性化、指定删除、注销） |
| F0332 | P1 | 删除指定成绩/对话/全部账号数据 | `/me`、`/api/auth/delete`、`src/lib/profile/store.ts`（风格、截图策略、个性化、指定删除、注销） |
| F0334 | P1 | 二次确认后发起账号注销 | `/me`、`/api/auth/delete`、`src/lib/profile/store.ts`（风格、截图策略、个性化、指定删除、注销） |

### 用户运营

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0337 | P1 | 封禁/解封/风险标记需权限与审计 | `/api/admin/users`、`/admin`（封禁/风险标记/补偿/审计） |
| F0339 | P2 | 客服补偿时长/额度并记录原因 | `/api/admin/users`、`/admin`（封禁/风险标记/补偿/审计） |

### 内容运营

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0344 | P1 | 题干/答案/解析修改版本对比 | `/api/admin/questions`、`/api/admin/content`、`/admin`（版本、材料、Rubric、范例） |
| F0345 | P1 | 配置材料/任务/字数/评分规则 | `/api/admin/questions`、`/api/admin/content`、`/admin`（版本、材料、Rubric、范例） |
| F0346 | P0 | 配置评分维度与得分点 | `/api/admin/questions`、`/api/admin/content`、`/admin`（版本、材料、Rubric、范例） |
| F0347 | P1 | 维护高质量范例与结构范例 | `/api/admin/questions`、`/api/admin/content`、`/admin`（版本、材料、Rubric、范例） |

### 考试与岗位

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0351 | P1 | 配置报名/审核/缴费/笔试等节点 | `/api/admin/exam-nodes`、`/api/admin/positions`、`/jobs`（节点/导入/规则/来源/历史） |
| F0352 | P0 | 批量导入职位表并字段映射 | `/api/admin/exam-nodes`、`/api/admin/positions`、`/jobs`（节点/导入/规则/来源/历史） |
| F0353 | P0 | 配置学历/专业/应届等确定性资格规则 | `/api/admin/exam-nodes`、`/api/admin/positions`、`/jobs`（节点/导入/规则/来源/历史） |
| F0354 | P0 | 记录来源文件/公告/更新时间 | `/api/admin/exam-nodes`、`/api/admin/positions`、`/jobs`（节点/导入/规则/来源/历史） |
| F0355 | P1 | 维护历年招录/进面分/竞争数据 | `/api/admin/exam-nodes`、`/api/admin/positions`、`/jobs`（节点/导入/规则/来源/历史） |

### 运营配置

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0356 | P2 | 配置公告/活动/重要提示 | `/api/admin/operations`、`/admin`、`src/lib/ai/quality.ts`（公告/模板/灰度） |
| F0357 | P1 | 学习/系统/考试提醒模板 | `/api/admin/operations`、`/admin`、`src/lib/ai/quality.ts`（公告/模板/灰度） |
| F0359 | P1 | 按用户分群灰度启停新功能 | `/api/admin/operations`、`/admin`、`src/lib/ai/quality.ts`（公告/模板/灰度） |

### 客服与审核

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0363 | P1 | 关联模型/Prompt/数据版本定位问题 | `/api/admin/tickets`、`/api/admin/aiops/config`（上下文版本关联与回归候选） |

### AI模型运营

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0370 | P1 | Prompt版本差异对比 | `/aiops`、`/api/admin/aiops/config`（Prompt diff/版本） |

### AI质量评测

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0374 | P1 | 评分一致性/证据/建议可操作性案例 | `src/lib/ai/quality.ts`、`/aiops`、`/api/admin/aiops/eval`（申论集/Rubric/校准/纠错入池/聚类） |
| F0376 | P1 | 语义质量用明确Rubric评分 | `src/lib/ai/quality.ts`、`/aiops`、`/api/admin/aiops/eval`（申论集/Rubric/校准/纠错入池/聚类） |
| F0377 | P1 | 人工对自动评分定期校准 | `src/lib/ai/quality.ts`、`/aiops`、`/api/admin/aiops/eval`（申论集/Rubric/校准/纠错入池/聚类） |
| F0380 | P1 | 匿名化真实失败进入候选评测集 | `src/lib/ai/quality.ts`、`/aiops`、`/api/admin/aiops/eval`（申论集/Rubric/校准/纠错入池/聚类） |
| F0381 | P1 | 按错误类型/模型/版本聚类 | `src/lib/ai/quality.ts`、`/aiops`、`/api/admin/aiops/eval`（申论集/Rubric/校准/纠错入池/聚类） |

### AI观测与成本

| ID | 优先级 | 功能点 | 实现证据 |
|---|---|---|---|
| F0388 | P1 | 主模型失败时切备用/规则流程 | `src/lib/ai/quality.ts`、`/aiops`（失败降级策略） |

## 需要真实外部资源的边界

- 微信/Apple 登录、短信、支付、模型 Provider 保持可运行 mock adapter；接口与状态机已实现，接入真实 SDK/密钥不改变产品交互。
- SQLite 模拟数据在 `data/jianan.db`；多实例部署迁 Postgres。
- 真实用户盲测与 Lighthouse 真机验证仍属发布前质量工作，不影响功能清单完成状态。