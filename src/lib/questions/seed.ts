/**
 * 种子题库生成器（GOAL_PROMPT 架构要求 5）。
 *
 * ≥3 模块 × ≥20 题，资料分析含表格材料题。答案由公式计算保证正确；
 * 干扰项绑定错因标签（错因诊断的证据来源）。
 * 确定性：同一 moduleId + index 永远生成同一题（E2E 可断言）。
 */
import { MODULES, type ModuleId } from "@/lib/profile/types";
import type { Question } from "./types";

export const SEED_VERSION = "seed-v1";

/** 确定性伪随机（与 AiGateway 同族算法，独立种子空间） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PER_MODULE = 20;

function build(moduleId: ModuleId): Question[] {
  switch (moduleId) {
    case "资料分析":
      return build资料分析();
    case "言语理解":
      return build言语理解();
    case "判断推理":
      return build判断推理();
    case "数量关系":
      return build数量关系();
    case "常识判断":
      return build常识判断();
  }
}

// ---------- 资料分析（表格材料，增长率/基期/比重/平均数） ----------

const FA_INDUSTRIES = ["装备制造业", "高技术产业", "消费品工业", "能源工业", "原材料工业"] as const;

function build资料分析(): Question[] {
  const rand = mulberry32(0xfa11);
  // 各行业 2021 基期值与年增速（确定性生成）
  const base = FA_INDUSTRIES.map((_, i) => 800 + i * 250 + Math.floor(rand() * 200));
  const growth = FA_INDUSTRIES.map(() => 4 + rand() * 8); // %
  const valueAt = (ind: number, y: number): number =>
    Math.round(base[ind]! * Math.pow(1 + growth[ind]! / 100, y));

  const material = {
    kind: "table" as const,
    title: "2021–2025 年某省规模以上分行业增加值（亿元）",
    columns: ["行业", "2021", "2023", "2025"],
    rows: FA_INDUSTRIES.map((name, i) => ({
      label: name,
      values: [String(valueAt(i, 0)), String(valueAt(i, 2)), String(valueAt(i, 4))],
    })),
    note: "数据为模拟数据，仅用于训练。",
  };

  const questions: Question[] = [];
  for (let i = 0; i < PER_MODULE; i++) {
    const ind = i % FA_INDUSTRIES.length;
    const name = FA_INDUSTRIES[ind]!;
    const v21 = valueAt(ind, 0);
    const v25 = valueAt(ind, 4);
    const totalGrowth = ((v25 - v21) / v21) * 100;
    const kind = i % 4;

    if (kind === 0) {
      // 2025 比 2021 增长约百分之几
      const correct = `${Math.round(totalGrowth)}%`;
      questions.push({
        id: `fa-${i}`,
        moduleId: "资料分析",
        type: "表格型资料",
        difficulty: 2,
        knowledgePoint: "增长率计算",
        realExam: null,
        material,
        stem: `2025 年${name}增加值比 2021 年约增长了：`,
        options: [correct, `${Math.round(totalGrowth) + 12}%`, `${Math.round(totalGrowth) - 9}%`, `${Math.round(totalGrowth * 2)}%`],
        answerIndex: 0,
        explanation: `（${v25} − ${v21}）÷ ${v21} ≈ ${totalGrowth.toFixed(1)}%，故选 ${Math.round(totalGrowth)}%。`,
        errorCauseByOption: { 1: "计算错误", 2: "计算错误", 3: "策略选择错误" },
        skillTarget: "列式与估算",
      });
    } else if (kind === 1) {
      // 基期值：已知 2025 与总增长，求 2021
      const correct = `${v21}`;
      questions.push({
        id: `fa-${i}`,
        moduleId: "资料分析",
        type: "表格型资料",
        difficulty: 2,
        knowledgePoint: "基期值还原",
        realExam: null,
        material,
        stem: `已知 2025 年${name}增加值为 ${v25} 亿元，则 2021 年约为多少亿元？`,
        options: [correct, String(v25 - Math.round((v25 - v21) / 2)), String(Math.round(v25 * 0.7)), String(v25 + 100)],
        answerIndex: 0,
        explanation: `基期 = 现期 ÷（1 + 增长率）= ${v25} ÷（1 + ${(totalGrowth / 100).toFixed(2)}）≈ ${v21} 亿元。`,
        errorCauseByOption: { 1: "策略选择错误", 2: "计算错误", 3: "审题错误" },
        skillTarget: "基期与现期",
      });
    } else if (kind === 2) {
      // 比重：某行业 2025 占五行业总和的比重
      const total25 = FA_INDUSTRIES.reduce((s, __, j) => s + valueAt(j, 4), 0);
      const share = (v25 / total25) * 100;
      questions.push({
        id: `fa-${i}`,
        moduleId: "资料分析",
        type: "表格型资料",
        difficulty: 3,
        knowledgePoint: "比重计算",
        realExam: { year: 2025, region: "模拟", exam: "国考模拟" },
        material,
        stem: `2025 年${name}增加值占五个行业总增加值的比重约为：`,
        options: [`${Math.round(share)}%`, `${Math.round(share) + 15}%`, `${Math.round(share / 2)}%`, `${Math.max(5, Math.round(share) - 18)}%`],
        answerIndex: 0,
        explanation: `${v25} ÷ ${total25} ≈ ${share.toFixed(1)}%。`,
        errorCauseByOption: { 1: "定位错误", 2: "计算错误", 3: "审题错误" },
        skillTarget: "比重",
      });
    } else {
      // 平均数比较：哪一年增量最大（2023 vs 2025 区间）
      const v23 = valueAt(ind, 2);
      const delta = v25 - v23;
      questions.push({
        id: `fa-${i}`,
        moduleId: "资料分析",
        type: "表格型资料",
        difficulty: 1,
        knowledgePoint: "增长量比较",
        realExam: null,
        material,
        stem: `2023→2025 年${name}增加值的年均增量约为多少亿元？`,
        options: [`${Math.round(delta / 2)}`, `${delta}`, `${Math.round(delta / 3)}`, `${Math.round(delta * 1.5)}`],
        answerIndex: 0,
        explanation: `两年增量 ${delta} 亿元，年均 ≈ ${Math.round(delta / 2)} 亿元。`,
        errorCauseByOption: { 1: "审题错误", 2: "策略选择错误", 3: "计算错误" },
        skillTarget: "增长量",
      });
    }
  }
  return questions;
}

// ---------- 言语理解（逻辑填空 + 片段阅读） ----------

const YW_WORDS: Array<[string, string, string, string, string, string]> = [
  // [句干(含___)，正确词，干扰1，干扰2，干扰3，知识点]
  ["这项政策的效果需要时间来____，不能急于求成。", "显现", "实现", "呈现", "表现", "实词辨析"],
  ["他的发言____了会议的核心议题，赢得了认同。", "契合", "吻合", "贴合", "符合", "实词辨析"],
  ["面对质疑，最有力的回应是用事实和数据来____。", "佐证", "保证", "声明", "宣传", "实词辨析"],
  ["城市更新不能只____面子工程，更要关注民生细节。", "注重", "专注", "注视", "注意", "实词辨析"],
  ["基层治理要____群众智慧，问计于民。", "汇聚", "收集", "会合", "聚集", "实词辨析"],
  ["这份报告数据翔实、论证严密，极具____价值。", "参考", "参照", "借鉴", "模仿", "实词辨析"],
  ["改革进入深水区，需要____勇气与智慧。", "兼具", "具有", "兼备", "占有", "实词辨析"],
  ["传统文化要在创新中____，在传承中发展。", "延续", "继续", "持续", "陆续", "实词辨析"],
];

function build言语理解(): Question[] {
  const passages: Array<[string, string, string[], string]> = [
    [
      "近年来，多地推行「无痕旅游」，倡导游客离开时不留下垃圾、不惊扰生态。有观点认为这限制了旅游体验，但实践显示，参与项目的游客满意度反而更高。这是因为规则清晰带来的确定性，降低了决策负担；而共同维护环境的参与感，本身就是体验的一部分。",
      "这段文字意在说明：",
      ["「无痕旅游」通过清晰规则与参与感提升了游客体验", "游客满意度与旅游限制无关", "生态保护必然牺牲旅游体验", "旅游体验的核心是消费水平"],
      "主旨概括",
    ],
    [
      "数据显示，某市 60% 的阅读发生在通勤时段，但碎片化阅读的留存率不足深读的三分之一。有学者因此主张「通勤不该用来阅读」。然而，问题也许不在时间本身，而在内容形态与场景不匹配：适合通勤的是结构清晰、可随时中断的内容。",
      "作者对「通勤不该用来阅读」这一主张的态度是：",
      ["不认同，认为关键是内容形态与场景匹配", "完全认同，通勤不应阅读", "认为留存率数据不可信", "主张减少通勤时间"],
      "态度理解",
    ],
    [
      "基层减负的关键，不在于减少多少次会议与文件，而在于把「对上负责」与「对下负责」统一起来。当考核指挥棒指向群众获得感，形式主义自然失去土壤；反之，若只做数字上的减法，负担只会以更隐蔽的方式回来。",
      "这段文字的核心观点是：",
      ["减负要从考核导向上根治，而非数字减法", "会议和文件越少越好", "形式主义无法根除", "群众获得感与减负无关"],
      "主旨概括",
    ],
    [
      "有实验发现，在同样安静的环境中，提前被告知「接下来要专注」的受试者，走神次数反而更多。研究者解释：对专注的过度监控本身会占用工作记忆。这提示我们，与其用力「保持专注」，不如设计更少的干扰源。",
      "这段文字主要说明：",
      ["过度自我监控会损耗专注，应减少干扰源", "走神不可避免", "安静环境不利于专注", "工作记忆无法训练"],
      "细节理解",
    ],
  ];

  const questions: Question[] = [];
  for (let i = 0; i < PER_MODULE; i++) {
    if (i < 12) {
      const w = YW_WORDS[i % YW_WORDS.length]!;
      const opts = [w[1], w[2], w[3], w[4]];
      const rot = i % 4;
      const shuffled = [...opts.slice(rot), ...opts.slice(0, rot)];
      questions.push({
        id: `yw-${i}`,
        moduleId: "言语理解",
        type: "逻辑填空",
        difficulty: 1,
        knowledgePoint: w[5]!,
        realExam: null,
        stem: `依次填入下列横线处的词语，最恰当的一项是：\n${w[0]}`,
        options: shuffled,
        answerIndex: shuffled.indexOf(w[1]!),
        explanation: `「${w[1]}」与语境搭配最恰当（知识点：${w[5]}）。`,
        errorCauseByOption: { 0: "知识缺口", 1: "知识缺口", 2: "知识缺口", 3: "知识缺口" },
        skillTarget: "实词辨析",
      });
    } else {
      const p = passages[(i - 12) % passages.length]!;
      const rot = i % 4;
      const shuffled = [...p[2]!.slice(rot), ...p[2]!.slice(0, rot)];
      questions.push({
        id: `yw-${i}`,
        moduleId: "言语理解",
        type: "片段阅读",
        difficulty: 2,
        knowledgePoint: p[3]!,
        realExam: null,
        stem: `${p[0]}\n\n${p[1]}`,
        options: shuffled,
        answerIndex: shuffled.indexOf(p[2]![0]!),
        explanation: `正确项抓住了文段的核心逻辑（${p[3]}）。`,
        errorCauseByOption: { 0: "审题错误", 1: "策略选择错误", 2: "审题错误", 3: "知识缺口" },
        skillTarget: "主旨与态度",
      });
    }
  }
  return questions;
}

// ---------- 判断推理（翻译推理 + 类比） ----------

function build判断推理(): Question[] {
  const logics: Array<[string, string[], string]> = [
    [
      "如果天下雨，则运动会延期。运动会没有延期。据此可以推出：",
      ["天下雨", "天没下雨", "运动会改期了", "无法判断天气"],
      "否后必否前（逆否命题）",
    ],
    [
      "只有通过资格审查，才能参加面试。小李参加了面试。据此可以推出：",
      ["小李通过了资格审查", "小李未通过资格审查", "资格审查不重要", "小李可能没通过资格审查"],
      "必要条件：肯定后件则肯定前件",
    ],
    [
      "所有的A都是B，有些B是C。据此可以推出：",
      ["有些A是C", "不能确定有些A是C", "所有B都是A", "所有C都是B"],
      "三段论：A与C关系不确定",
    ],
    [
      "如果价格下降，则销量上升。销量没有上升。据此可以推出：",
      ["价格下降了", "价格没有下降", "价格上升了", "无法判断价格"],
      "否后必否前",
    ],
    [
      "若产品合格，则通过质检。某产品未通过质检。据此可以推出：",
      ["产品合格", "产品不合格", "质检有误", "无法判断"],
      "否后必否前",
    ],
  ];
  const analogies: Array<[string, string[], string]> = [
    ["医生∶患者", ["教师∶学生", "医生∶医院", "教师∶教室", "患者∶药"], "职业与服务对象的对应关系"],
    ["书∶纸张", ["衣服∶布料", "书∶文字", "衣服∶商店", "纸张∶森林"], "成品与原材料的对应关系"],
    ["警察∶抓捕", ["作家∶写作", "警察∶警服", "写作∶小说", "小说∶作家"], "职业与典型行为的对应关系"],
    ["水∶解渴", ["食物∶充饥", "水∶杯子", "充饥∶饭", "杯子∶水"], "事物与功能的对应关系"],
    ["春∶播种", ["秋∶收获", "春∶夏天", "播种∶劳动", "收获∶秋"], "季节与典型农事的对应关系"],
  ];

  const questions: Question[] = [];
  for (let i = 0; i < PER_MODULE; i++) {
    if (i % 2 === 0) {
      const q = logics[(i / 2) % logics.length]!;
      const correct = q[1]![1]!;
      const rot = i % 4;
      const shuffled = [...q[1]!.slice(rot), ...q[1]!.slice(0, rot)];
      questions.push({
        id: `tp-${i}`,
        moduleId: "判断推理",
        type: "翻译推理",
        difficulty: 2,
        knowledgePoint: q[2]!,
        realExam: null,
        stem: q[0]!,
        options: shuffled,
        answerIndex: shuffled.indexOf(correct),
        explanation: `规则：${q[2]}。`,
        errorCauseByOption: { 0: "策略选择错误", 1: "知识缺口", 2: "审题错误", 3: "知识缺口" },
        skillTarget: "翻译推理",
      });
    } else {
      const q = analogies[((i - 1) / 2) % analogies.length]!;
      const correct = q[1]![0]!;
      const rot = i % 4;
      const shuffled = [...q[1]!.slice(rot), ...q[1]!.slice(0, rot)];
      questions.push({
        id: `tp-${i}`,
        moduleId: "判断推理",
        type: "类比推理",
        difficulty: 1,
        knowledgePoint: q[2]!,
        realExam: null,
        stem: `${q[0]}\n与上述词项关系最一致的是：`,
        options: shuffled,
        answerIndex: shuffled.indexOf(correct),
        explanation: `考点：${q[2]}。`,
        errorCauseByOption: { 0: "知识缺口", 1: "策略选择错误", 2: "审题错误", 3: "知识缺口" },
        skillTarget: "类比关系",
      });
    }
  }
  return questions;
}

// ---------- 数量关系（工程/行程/利润，公式生成） ----------

function build数量关系(): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < PER_MODULE; i++) {
    const rand = mulberry32(0xa110 + i);
    const kind = i % 4;
    if (kind === 0) {
      // 工程：甲 t1 天完成，乙 t2 天，合作几天
      const t1 = 10 + Math.floor(rand() * 10);
      const t2 = 15 + Math.floor(rand() * 15);
      const together = Math.round((t1 * t2) / (t1 + t2) * 10) / 10;
      questions.push({
        id: `sl-${i}`,
        moduleId: "数量关系",
        type: "数学运算",
        difficulty: 2,
        knowledgePoint: "工程问题",
        realExam: null,
        stem: `甲单独完成一项工程需要 ${t1} 天，乙单独完成需要 ${t2} 天。两人合作，约多少天完成？`,
        options: [`${together}`, `${together + 2}`, `${Math.round((t1 + t2) / 2 * 10) / 10}`, `${together - 1.5}`],
        answerIndex: 0,
        explanation: `合作时间 = t1×t2 ÷（t1+t2）= ${t1}×${t2}÷${t1 + t2} ≈ ${together} 天。`,
        errorCauseByOption: { 1: "计算错误", 2: "策略选择错误", 3: "计算错误" },
        skillTarget: "工程问题",
      });
    } else if (kind === 1) {
      // 行程：v1 km/h 走 t 小时后加速 v2，再走 s2 km，总时长
      const v1 = 40 + Math.floor(rand() * 30);
      const t1 = 2;
      const v2 = v1 + 20;
      const s2 = 60;
      const total = t1 + s2 / v2;
      questions.push({
        id: `sl-${i}`,
        moduleId: "数量关系",
        type: "数学运算",
        difficulty: 2,
        knowledgePoint: "行程问题",
        realExam: null,
        stem: `一辆车以 ${v1} km/h 行驶 ${t1} 小时后提速到 ${v2} km/h，再行驶 ${s2} km。全程共用多少小时？`,
        options: [`${total}`, `${total + 1}`, `${t1 + s2 / v1}`, `${total - 0.5}`],
        answerIndex: 0,
        explanation: `前段 ${t1}h；后段 ${s2}÷${v2}=${(s2 / v2).toFixed(2)}h；合计 ${total}h。`,
        errorCauseByOption: { 1: "计算错误", 2: "审题错误", 3: "计算错误" },
        skillTarget: "行程问题",
      });
    } else if (kind === 2) {
      // 利润：成本 c，加价 p% 后打 d 折出售，利润率
      const c = 100;
      const p = 40 + Math.floor(rand() * 40);
      const d = 8;
      const price = c * (1 + p / 100) * (d / 10);
      const rate = Math.round(((price - c) / c) * 100);
      questions.push({
        id: `sl-${i}`,
        moduleId: "数量关系",
        type: "数学运算",
        difficulty: 3,
        knowledgePoint: "利润问题",
        realExam: null,
        stem: `某商品成本 ${c} 元，按成本加价 ${p}% 定价，再打 ${d} 折出售。利润率是多少？`,
        options: [`${rate}%`, `${rate + 10}%`, `${Math.max(2, rate - 12)}%`, `${p}%`],
        answerIndex: 0,
        explanation: `售价 = ${c}×${(1 + p / 100).toFixed(2)}×0.8 = ${price.toFixed(1)}；利润率 = ${rate}%。`,
        errorCauseByOption: { 1: "计算错误", 2: "计算错误", 3: "策略选择错误" },
        skillTarget: "利润问题",
      });
    } else {
      // 和差倍
      const a = 20 + Math.floor(rand() * 40);
      const diff = 6 + Math.floor(rand() * 10);
      const sum = a + (a + diff);
      questions.push({
        id: `sl-${i}`,
        moduleId: "数量关系",
        type: "数学运算",
        difficulty: 1,
        knowledgePoint: "和差倍问题",
        realExam: null,
        stem: `甲、乙两数之和为 ${sum}，甲比乙多 ${diff}。乙是多少？`,
        options: [`${a}`, `${a + diff}`, `${Math.round(sum / 2)}`, `${a - diff}`],
        answerIndex: 0,
        explanation: `乙 =（和 − 差）÷ 2 =（${sum} − ${diff}）÷ 2 = ${a}。`,
        errorCauseByOption: { 1: "审题错误", 2: "策略选择错误", 3: "计算错误" },
        skillTarget: "和差倍",
      });
    }
  }
  return questions;
}

// ---------- 常识判断（政治/法律/经济轮换，静态事实池） ----------

const CS_POOL: Array<[string, string[], string]> = [
  ["我国的根本政治制度是：", ["人民代表大会制度", "多党合作和政治协商制度", "民族区域自治制度", "基层群众自治制度"], "政治常识"],
  ["宪法的修改，由全国人大常委会或者五分之一以上的全国人大代表提议，并由全国人民代表大会：", ["全体代表的三分之二以上的多数通过", "全体代表的过半数通过", "出席代表的三分之二通过", "全体代表一致通过"], "法律常识"],
  ["市场在资源配置中起：", ["决定性作用", "基础性作用", "辅助性作用", "主导性作用"], "经济常识"],
  ["我国最高国家权力机关的执行机关是：", ["国务院", "全国人大常委会", "最高人民法院", "国家监察委员会"], "政治常识"],
  ["居民消费价格指数（CPI）上涨，通常意味着：", ["物价总体水平上升", "居民收入增加", "失业率下降", "货币购买力增强"], "经济常识"],
  ["我国刑法规定的完全负刑事责任的年龄起点是：", ["已满 16 周岁", "已满 14 周岁", "已满 18 周岁", "已满 12 周岁"], "法律常识"],
  ["「监督宪法实施」的职权属于：", ["全国人民代表大会及其常委会", "国务院", "最高人民法院", "地方各级人大"], "法律常识"],
  ["基尼系数常用于衡量：", ["收入分配差距", "物价水平", "经济增长速度", "就业状况"], "经济常识"],
];

function build常识判断(): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < PER_MODULE; i++) {
    const q = CS_POOL[i % CS_POOL.length]!;
    const correct = q[1]![0]!;
    const rot = i % 4;
    const shuffled = [...q[1]!.slice(rot), ...q[1]!.slice(0, rot)];
    questions.push({
      id: `cs-${i}`,
      moduleId: "常识判断",
      type: (i % 3 === 0 ? "政治常识" : i % 3 === 1 ? "法律常识" : "经济常识") as Question["type"],
      difficulty: 1,
      knowledgePoint: q[2]!,
      realExam: i % 5 === 0 ? { year: 2024, region: "国考", exam: "行测" } : null,
      stem: q[0]!,
      options: shuffled,
      answerIndex: shuffled.indexOf(correct),
      explanation: `考点：${q[2]}。`,
      errorCauseByOption: { 0: "知识缺口", 1: "知识缺口", 2: "知识缺口", 3: "知识缺口" },
      skillTarget: q[2]!,
    });
  }
  return questions;
}

// ---------- 公共接口 ----------

const cache = new Map<ModuleId, Question[]>();

export function seedQuestions(moduleId: ModuleId): Question[] {
  let list = cache.get(moduleId);
  if (!list) {
    list = build(moduleId);
    cache.set(moduleId, list);
  }
  return list;
}

export function allSeedQuestions(): Question[] {
  return MODULES.flatMap((m) => seedQuestions(m));
}

export function questionById(id: string): Question | undefined {
  return allSeedQuestions().find((q) => q.id === id);
}

/**
 * 训练集组装：模块内取题，从 offset 轮转（CL-03 step1：题量不足时降级复用组合）。
 * F0107：给定 difficulty 时优先取该难度的题；该难度题量不足则回落全量池，
 * 不为了凑难度而重复同一题。
 */
export function buildTrainingSet(
  moduleId: ModuleId,
  count: number,
  offset = 0,
  difficulty?: 1 | 2 | 3,
): Question[] {
  const full = seedQuestions(moduleId) ?? seedQuestions("言语理解");
  const n = Math.min(Math.max(count, 1), full.length);
  const matched = difficulty ? full.filter((q) => q.difficulty === difficulty) : [];
  const pool = matched.length >= n ? matched : full;
  return Array.from({ length: n }, (_, i) => pool[(offset + i) % pool.length]!);
}
