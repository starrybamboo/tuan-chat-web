import { createFileRoute, Outlet } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import { createSeoMeta } from "@/utils/seo";

export function meta({ params }: RouteMetaArgs) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的主页`,
    description: `查看团剧共创用户 ${params.userId} 的公开主页与简介。`,
    path: `/profile/${params.userId}`,
    index: true,
    type: "profile",
  });
}

export const Route = createFileRoute("/_dashboard/profile/$userId")({
  head: ({ params }) => ({
    meta: meta({ params }),
  }),
  component: Profile,
});

function Profile() {
  return (
    <div className="w-full overflow-x-hidden bg-base-200">
      <div className="flex min-h-full flex-col bg-base-100">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
