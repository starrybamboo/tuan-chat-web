import type { Route } from "./+types/resource";
import ResourcePage from "@/components/resource/pages/resourcePage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "资源管理",
    description: "管理团剧共创中的资源文件与素材引用。",
    path: "/resource",
    index: false,
  });
}

export default function Resource() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <ResourcePage />
    </div>
  );
}
