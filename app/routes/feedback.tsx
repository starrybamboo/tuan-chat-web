import FeedbackPage from "@/components/feedback/feedbackPage";

export function meta() {
  return [
    { title: "反馈 - tuan-chat" },
    { name: "description", content: "团剧共创内部反馈页" },
  ];
}

export default function Feedback() {
  return <FeedbackPage />;
}
