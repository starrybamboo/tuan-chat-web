import { createFileRoute } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import DiscoverPage from "@/components/chat/discover/discoverPage";
import { queryClient } from "@/queryClient";
import { createSeoMeta } from "@/utils/seo";
import {
  fetchMyMaterialPackagesFirstPageWithCache,
  MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
} from "api/hooks/materialPackageQueryHooks";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "我的素材包",
    description: "查看当前账号在团剧共创中的个人素材包。",
    path: "/chat/discover/material/my",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/chat/discover/material/my")({
  loader: async () => {
    if (import.meta.env.MODE === "production") {
      return null;
    }
    await fetchMyMaterialPackagesFirstPageWithCache(queryClient, {
      pageNo: 1,
      pageSize: MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
    });
    return null;
  },
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: ChatDiscoverMaterialMyRoute,
});

function ChatDiscoverMaterialMyRoute() {
  return (
    <div className="bg-base-200 size-full overflow-y-auto overflow-x-visible">
      <DiscoverPage section="material" mode="mine" />
    </div>
  );
}
