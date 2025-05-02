import type { Route } from "./+types/home";
import FeedPage from "@/components/feed/feedPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Feed() {
  return (
    <div className="h-screen bg-base-200 overflow-auto">
      <FeedPage></FeedPage>
    </div>
  );
}
