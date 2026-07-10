import type { ApiResultSpace } from "@tuanchat/openapi-client/models/ApiResultSpace";

import { createFileRoute, useParams } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import SpaceMaterialLibraryPage from "@/components/material/pages/spaceMaterialLibraryPage";
import { queryClient } from "@/queryClient";
import { createSeoMeta } from "@/utils/seo";
import { fetchSpaceInfoWithCache } from "api/hooks/chatQueryHooks";
import {
  fetchSpaceMaterialPackagesFirstPageWithCache,
  MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
} from "api/hooks/materialPackageQueryHooks";

type SpaceMaterialRouteLoaderData = {
  spaceInfo: ApiResultSpace | null;
};

export function meta(args: RouteMetaArgs<SpaceMaterialRouteLoaderData | null>) {
  const spaceName = args.data?.spaceInfo?.data?.name?.trim();
  const title = spaceName ? `${spaceName} 的局内素材包` : `空间 ${args.params.spaceId} 的局内素材包`;
  return createSeoMeta({
    title,
    description: "查看当前空间的局内素材包与资源配置。",
    path: `/material/space/${args.params.spaceId}`,
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/material/space/$spaceId")({
  loader: async ({ params }): Promise<SpaceMaterialRouteLoaderData | null> => {
    const spaceId = Number(params.spaceId);
    if (!Number.isFinite(spaceId) || spaceId <= 0) {
      return null;
    }
    const [spaceInfoResult] = await Promise.allSettled([
      fetchSpaceInfoWithCache(queryClient, spaceId),
      fetchSpaceMaterialPackagesFirstPageWithCache(queryClient, {
        pageNo: 1,
        pageSize: MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
        spaceId,
      }),
    ]);
    return {
      spaceInfo: spaceInfoResult.status === "fulfilled" ? spaceInfoResult.value : null,
    };
  },
  head: ({ loaderData, params }) => ({
    meta: meta({ data: loaderData, params }),
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
