import FeedbackPage from "@/components/feedback/feedbackPage";
import { createSeoMeta } from "@/utils/seo";

export function meta() {
  return createSeoMeta({
    title: "内部反馈",
    description: "提交和查看团剧共创内部反馈。",
    path: "/feedback",
    index: false,
  });
}

export default function Feedback() {
  return <FeedbackPage />;
}
