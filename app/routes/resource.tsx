import type { Route } from "./+types/resource";
import ResourcePage from "@/components/resource/pages/resourcePage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "资源管理 - tuan-chat" },
    { name: "description", content: "资源管理" },
  ];
}

export default function Resource() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <ResourcePage />
    </div>
  );
}
