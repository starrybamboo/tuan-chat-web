import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute } from "@tanstack/react-router";
import RepositoryWithTabs from "@/components/repository/RepositoryWithTabs";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "模组仓库",
    description: "浏览团剧共创中的公开模组、世界观与共创作品，快速找到可阅读、可 Fork 的内容。",
    path: "/repository",
    index: true,
  });
}

export const Route = createFileRoute("/_dashboard/repository/")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: Home,
});

function Home() {
  return (
    <div className="bg-base-200 h-full w-full overflow-x-hidden">
      <RepositoryWithTabs />
    </div>
  );
}
