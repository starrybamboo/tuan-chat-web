import { createFileRoute, useParams } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import FeaturePlaceholderPage from "@/components/common/featurePlaceholderPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(args: RouteMetaArgs) {
  return createSeoMeta({
    title: `空间 ${args.params.spaceId} 的局内素材包`,
    description: "局内素材包功能正在重新设计。",
    path: `/material/space/${args.params.spaceId}`,
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/material/space/$spaceId")({
  head: ({ params }) => ({
    meta: meta({ params }),
  }),
  component: SpaceMaterialRoute,
});

function SpaceMaterialRoute() {
  const { spaceId: spaceIdParam } = useParams({ strict: false });
  const spaceId = Number(spaceIdParam);
  return (
    <div className="h-full overflow-auto bg-base-200">
      <FeaturePlaceholderPage
        title="局内素材包正在重写"
        description={`空间 ${Number.isFinite(spaceId) ? spaceId : "-"} 的素材入口暂时保留。`}
      />
    </div>
  );
}
