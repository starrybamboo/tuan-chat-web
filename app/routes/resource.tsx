import type { RouteMetaArgs } from "@/router/routeTypes";
import { createFileRoute } from "@tanstack/react-router";
import ResourcePage from "@/components/resource/pages/resourcePage";
import { createSeoMeta } from "@/utils/seo";
import "@/components/resource/resourceRouteStyles.css";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "资源管理",
    description: "管理团剧共创中的资源文件与素材引用。",
    path: "/resource",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/resource")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: Resource,
});

export default function Resource() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <ResourcePage />
    </div>
  );
}
