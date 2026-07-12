import { createFileRoute } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import FeaturePlaceholderPage from "@/components/common/featurePlaceholderPage";
import { createSeoMeta } from "@/utils/seo";

type MaterialRouteSearch = {
  tab?: "public" | "mine";
};

function validateMaterialRouteSearch(search: Record<string, unknown>): MaterialRouteSearch {
  return search.tab === "public" || search.tab === "mine"
    ? { tab: search.tab }
    : {};
}

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "素材库",
    description: "管理和浏览团剧共创中的局外素材库。",
    path: "/material",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/material")({
  validateSearch: validateMaterialRouteSearch,
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: MaterialRoute,
});

function MaterialRoute() {
  return (
    <div className="h-full overflow-hidden bg-base-200">
      <FeaturePlaceholderPage
        title="素材库正在重写"
        description="公共素材、个人素材与素材编辑器正在重新设计，当前入口暂时保留。"
      />
    </div>
  );
}
