import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { createSeoMeta } from "@/utils/seo";

const LazyMaterialLibraryPage = lazy(() => import("@/components/material/pages/materialLibraryPage"));

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "素材库",
    description: "管理和浏览团剧共创中的局外素材库。",
    path: "/material",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/material")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: MaterialRoute,
});

function MaterialRoute() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.searchStr);
  const tab = searchParams.get("tab");
  const initialTab = tab === "public" || tab === "mine" ? tab : undefined;

  return (
    <div className="h-full overflow-hidden bg-base-200">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-base-content/60">正在加载素材库...</div>}>
        <LazyMaterialLibraryPage initialTab={initialTab} />
      </Suspense>
    </div>
  );
}
