import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import MaterialLibraryPage from "@/components/material/pages/materialLibraryPage";
import { createSeoMeta } from "@/utils/seo";

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

export default function MaterialRoute() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.searchStr);
  const tab = searchParams.get("tab");
  const initialTab = tab === "public" || tab === "mine" ? tab : undefined;

  return (
    <div className="h-full overflow-hidden bg-base-200">
      <MaterialLibraryPage initialTab={initialTab} />
    </div>
  );
}
