import type { Route } from "./+types/create";
import RepositoryCreateMain from "@/components/repository/create/RepositoryCreateMain";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "创建模组仓库",
    description: "在团剧共创中创建新的模组仓库。",
    path: "/repository/create",
    index: false,
  });
}

export default function RepositoryCreate() {
  return (
    <div className="bg-base-100 overflow-auto">
      {/* 这里添加创建仓库的表单 */}
      <RepositoryCreateMain />
    </div>
  );
}
