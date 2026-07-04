import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import {
  fetchMyMaterialPackagesFirstPageWithCache,
  fetchPublicMaterialPackagesFirstPageWithCache,
  MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
} from "api/hooks/materialPackageQueryHooks";
import { queryClient } from "@/queryClient";
import { createSeoMeta } from "@/utils/seo";

const LazyMaterialLibraryPage = lazy(() => import("@/components/material/pages/materialLibraryPage"));
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
  loaderDeps: ({ search }) => ({
    tab: search.tab ?? "mine",
  }),
  loader: async ({ deps }) => {
    const request = {
      pageNo: 1,
      pageSize: MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
    };
    await (deps.tab === "public"
      ? fetchPublicMaterialPackagesFirstPageWithCache(queryClient, request)
      : fetchMyMaterialPackagesFirstPageWithCache(queryClient, request));
    return null;
  },
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: MaterialRoute,
});

function MaterialRoute() {
  const { tab } = Route.useSearch();

  return (
    <div className="h-full overflow-hidden bg-base-200">
      <Suspense fallback={<div className="
        flex h-full items-center justify-center text-sm text-base-content/60
      ">正在加载素材库...</div>}>
        <LazyMaterialLibraryPage initialTab={tab} />
      </Suspense>
    </div>
  );
}
