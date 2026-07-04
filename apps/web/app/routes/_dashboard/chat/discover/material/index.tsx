import { createFileRoute } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import DiscoverPage from "@/components/chat/discover/discoverPage";
import { queryClient } from "@/queryClient";
import { createSeoMeta } from "@/utils/seo";
import {
  fetchPublicMaterialPackagesFirstPageWithCache,
  MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
} from "api/hooks/materialPackageQueryHooks";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "素材广场",
    description: "浏览团剧共创公开素材包与创作资源，为你的模组和设定寻找可复用素材。",
    path: "/chat/discover/material",
    index: true,
  });
}

export const Route = createFileRoute("/_dashboard/chat/discover/material/")({
  loader: async () => {
    if (import.meta.env.MODE === "production") {
      return null;
    }
    await fetchPublicMaterialPackagesFirstPageWithCache(queryClient, {
      pageNo: 1,
      pageSize: MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
    });
    return null;
  },
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: ChatDiscoverMaterialRoute,
});

function ChatDiscoverMaterialRoute() {
  return (
    <div className="bg-base-200 size-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="material" mode="public" />
    </div>
  );
}
