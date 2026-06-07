import { createFileRoute } from "@tanstack/react-router";
import FeedbackPage from "@/components/feedback/feedbackPage";
import { createSeoMeta } from "@/utils/seo";

export function meta() {
  return createSeoMeta({
    title: "内部反馈",
    description: "查看团剧共创内部反馈详情。",
    path: "/feedback",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/feedback/$issueId")({
  head: () => ({
    meta: meta(),
  }),
  component: Feedback,
});

function Feedback() {
  const { issueId } = Route.useParams();
  return <FeedbackPage rawIssueId={issueId} />;
}
