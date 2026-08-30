import { Card } from "@/components/ui/Card";

/** 帮助中心（F0321）：常见问题与使用指南。 */
const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "见岸和刷题 App 有什么不同？",
    a: "题库类产品给你更多题；见岸根据你的真实成绩与训练数据，判断此刻最值得解决的一个问题，并把它变成今天可以完成的训练。",
  },
  {
    q: "上传的成绩截图会被如何使用？",
    a: "仅用于生成你的个人基线与诊断。识别结果必须经你逐项确认才会写入；你可以在「我的-数据与隐私」查看与清除全部数据。",
  },
  {
    q: "AI 的判断一定对吗？",
    a: "不一定。每个诊断都附证据与置信度；数据不足时会明确说「证据还不够稳定」。你随时可以纠正 AI 的错因判断，纠正本身就是校准。",
  },
  {
    q: "为什么处方只有 1–3 个任务？",
    a: "每日核心任务控制在 1–3 项、总时长不超过你的可用预算。少而具体，比长清单更容易完成并产生可验证的进步。",
  },
  {
    q: "诊断次数用完了怎么办？",
    a: "免费额度每周重置；训练产生的常规反馈不受额度限制。见「订阅与权益」了解升级选项。",
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-[430px] px-margin-mobile pb-xl pt-xl">
      <h1 className="text-headline-xl text-ink">帮助中心</h1>
      <div className="mt-lg space-y-md">
        {FAQ.map((f) => (
          <Card key={f.q}>
            <p className="text-title-md text-ink">{f.q}</p>
            <p className="mt-sm text-body-md text-body">{f.a}</p>
          </Card>
        ))}
      </div>
      <p className="mt-xl text-caption text-muted">
        没有找到答案？在「反馈」里提交问题，或查看「AI 数据使用说明」了解数据边界。
      </p>
    </main>
  );
}
