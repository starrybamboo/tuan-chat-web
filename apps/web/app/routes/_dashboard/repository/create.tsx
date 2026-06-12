import { createFileRoute } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import RepositoryCreateMain from "@/components/repository/create/RepositoryCreateMain";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "创建模组仓库",
    description: "在团剧共创中创建新的模组仓库。",
    path: "/repository/create",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/repository/create")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: RepositoryCreate,
});

function RepositoryCreate() {
  return (
    <div className="bg-base-100 overflow-auto">
      {/* 这里添加创建仓库的表单 */}
      <RepositoryCreateMain />
    </div>
  );
}
