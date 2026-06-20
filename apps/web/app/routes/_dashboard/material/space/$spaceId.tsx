import { createFileRoute, useParams } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import SpaceMaterialLibraryPage from "@/components/material/pages/spaceMaterialLibraryPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(args: RouteMetaArgs) {
  return createSeoMeta({
    title: `空间 ${args.params.spaceId} 的局内素材包`,
    description: "查看当前空间的局内素材包与资源配置。",
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
      <SpaceMaterialLibraryPage spaceId={Number.isFinite(spaceId) ? spaceId : -1} />
    </div>
  );
}
