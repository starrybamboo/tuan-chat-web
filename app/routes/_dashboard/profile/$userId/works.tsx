import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute, useParams } from "@tanstack/react-router";
import WorksTab from "@/components/profile/profileTab/worksTab";
import { createSeoMeta } from "@/utils/seo";

export function meta({ params }: RouteMetaArgs) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的作品`,
    description: `查看团剧共创用户 ${params.userId} 发布的公开作品与模组。`,
    path: `/profile/${params.userId}/works`,
    index: true,
    type: "profile",
  });
}

export const Route = createFileRoute("/_dashboard/profile/$userId/works")({
  head: ({ params }) => ({
    meta: meta({ params }),
  }),
  component: ProfileWorks,
});

function ProfileWorks() {
  const { userId: userIdParam } = useParams({ strict: false });
  const userId = Number(userIdParam);

  return <WorksTab userId={userId} />;
}
