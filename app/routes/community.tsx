import type { Route } from "./+types/community";
import CommunityPage from "@/components/community/communityPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Community() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <CommunityPage></CommunityPage>
    </div>
  );
}
