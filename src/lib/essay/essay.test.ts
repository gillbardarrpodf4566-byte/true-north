import { describe, expect, it } from "vitest";
import { countWords, exampleOutlineFor, gradeEssay, isValidEssayRubric, splitSentences, weakestDimension } from "./grade";
import { buildEssayReport, compareRewrite, updateEssayAbility } from "./rewrite";
import { ESSAY_SEED, essayQuestionById } from "./bank";

const q = essayQuestionById("essay-gaikuang-1")!;

const goodAnswer = [
  "S市推进基层智慧治理的做法主要有以下几方面。一是建平台强统筹：依托一网统管平台，将网格上报、市民热线、物联感知统一接入，事件自动分派、限时办结，处置时间明显缩短。",
  "二是发动群众参与：推行随手拍小程序，居民上报后就近派单处置。",
  "三是再造政务服务：实行免申即享，通过数据比对实现政策找人，补贴直达；上线一表通，精简基层报表，减轻台账负担。",
  "四是守护特殊群体：为独居老人安装水表智感设备，异常自动预警，社区上门处置。",
  "上述做法提升了基层治理效率，也增强了群众的获得感和满意度。",
].join("\n");

const weakAnswer = "S市搞了很多智慧化建设，老百姓办事方便了，基层也减负了，效果挺好。";

describe("申论评分引擎（V1 / F0204–F0213）", () => {
  it("句子切分与字数统计（F0203）", () => {
    expect(splitSentences("第一句。第二句！\n第三句")).toHaveLength(3);
    expect(countWords("你好 世界\n再次")).toBe(6);
  });

  it("高分答案：采点命中多、置信度高、有证据引用（F0206/F0211/F0212）", () => {
    const g = gradeEssay({ id: "s1", text: goodAnswer }, q);
    expect(g.hits.length).toBeGreaterThanOrEqual(4);
    expect(g.confidence).toBe("高");
    expect(g.score).toBeGreaterThan(60);
    for (const h of g.hits.slice(0, 2)) {
      expect(h.userSentence.length).toBeGreaterThan(0);
    }
    expect(g.confidenceNote).toContain("参考");
  });

  it("低分答案：漏点带材料依据（F0207）、低置信、字数不足进 topFixes", () => {
    const g = gradeEssay({ id: "s2", text: weakAnswer }, q);
    expect(g.misses.length).toBeGreaterThanOrEqual(3);
    for (const m of g.misses.slice(0, 2)) {
      expect(m.materialQuote.length).toBeGreaterThan(0);
    }
    expect(g.confidence).toBe("低");
    const fixTitles = g.topFixes.map((f) => f.title).join("｜");
    expect(fixTitles).toContain("漏答高分要点");
    expect(fixTitles).toContain("字数明显不足");
  });

  it("topFixes 不超过 3 条且按失分排序（F0213）", () => {
    const g = gradeEssay({ id: "s3", text: weakAnswer }, q);
    expect(g.topFixes.length).toBeLessThanOrEqual(3);
    const losses = g.topFixes.map((f) => f.lostPoints);
    expect([...losses].sort((a, b) => b - a)).toEqual(losses);
  });

  it("口语词给出规范替换建议（F0210）", () => {
    const g = gradeEssay({ id: "s4", text: weakAnswer }, q);
    expect(g.normSuggestions.some((n) => n.bad === "老百姓")).toBe(true);
  });

  it("重复句识别为冗余（F0208）", () => {
    const dup = goodAnswer + "。" + goodAnswer.split("\n")[1];
    const g = gradeEssay({ id: "s5", text: dup }, q);
    expect(g.redundancies.length).toBeGreaterThanOrEqual(0);
    expect(g.wordCount).toBeGreaterThan(countWords(goodAnswer));
  });

  it("结构信号缺失给出结构问题（F0209）", () => {
    const g = gradeEssay({ id: "s6", text: weakAnswer }, q);
    expect(g.structureIssues.some((s) => s.includes("分层标记"))).toBe(true);
  });

  it("范例对照：结构提纲而非替写（F0215）", () => {
    const outline = exampleOutlineFor(q);
    expect(outline.length).toBeGreaterThanOrEqual(4);
    expect(outline.every((o) => o.length < 40)).toBe(true);
  });

  it("专项弱项识别（F0200）", () => {
    const g = gradeEssay({ id: "s7", text: weakAnswer }, q);
    const weak = weakestDimension([g]);
    expect(weak).not.toBeNull();
    expect(weak!.ratio).toBeLessThan(0.8);
  });
});

describe("重写闭环与报告（F0216–F0226 / CL-05 step4–5）", () => {
  it("前后对比高亮改善（F0217）", () => {
    const first = gradeEssay({ id: "r1", text: weakAnswer }, q);
    const second = gradeEssay({ id: "r2", text: goodAnswer }, q);
    const cmp = compareRewrite(first, second);
    expect(cmp.scoreDelta).toBeGreaterThan(0);
    expect(cmp.newHits.length).toBeGreaterThan(0);
    expect(cmp.summary).toContain("新采到要点");
  });

  it("能力更新：滚动均值（F0218）", () => {
    const g1 = gradeEssay({ id: "a1", text: weakAnswer }, q);
    const a1 = updateEssayAbility(null, q.type, g1);
    expect(a1.attempts).toBe(1);
    const g2 = gradeEssay({ id: "a2", text: goodAnswer }, q);
    const a2 = updateEssayAbility(a1, q.type, g2);
    expect(a2.attempts).toBe(2);
    const content = a2.dimensions.find((d) => d.id === "内容")!;
    expect(content.score).toBeGreaterThan(0.3);
  });

  it("报告：趋势 + 高频问题 + 专项处方 1–3 项（F0224–F0226）", () => {
    const subs = [
      { id: "p1", questionId: q.id, text: weakAnswer, submittedAt: "2026-08-01", round: 0 },
      { id: "p2", questionId: q.id, text: weakAnswer + "一表通减轻负担。", submittedAt: "2026-08-08", round: 0 },
    ];
    const grades = Object.fromEntries(
      subs.map((s) => [s.id, gradeEssay({ id: s.id, text: s.text }, q)]),
    );
    const report = buildEssayReport(subs, grades, { [q.id]: q.type });
    expect(report.trends.some((t) => t.points.length >= 2)).toBe(true);
    expect(report.frequentIssues.length).toBeGreaterThan(0);
    expect(report.nextWeekPlan.length).toBeGreaterThanOrEqual(1);
    expect(report.nextWeekPlan.length).toBeLessThanOrEqual(3);
  });

  it("后台 Rubric 必须完整校验，不能缺维度导致所有分为零（F0346）", () => {
    expect(isValidEssayRubric(q.rubric)).toBe(true);
    expect(isValidEssayRubric({ dimensions: [{ id: "内容", weight: 1 }] })).toBe(false);
    expect(isValidEssayRubric({ ...q.rubric, dimensions: q.rubric.dimensions.map((d) => ({ ...d, weight: 0.2 })) })).toBe(false);
  });

  it("四题型题库齐备且含真题标识（F0198/F0199）", () => {
    const types = new Set(ESSAY_SEED.map((x) => x.type));
    expect([...types].sort()).toEqual(["公文", "大作文", "概括", "对策"].sort());
    for (const item of ESSAY_SEED) {
      expect(item.year).toBeGreaterThan(2020);
      expect(item.region.length).toBeGreaterThan(0);
      expect(item.materials[0]!.paragraphs.length).toBeGreaterThanOrEqual(2);
      expect(item.scorePoints.length).toBeGreaterThanOrEqual(5);
    }
  });
});
