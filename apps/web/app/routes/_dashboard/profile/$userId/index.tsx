import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute, useParams } from "@tanstack/react-router";
import HomeTab from "@/components/profile/profileTab/homeTab";
import { createSeoMeta } from "@/utils/seo";

export function meta({ params }: RouteMetaArgs) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的主页`,
    description: `查看团剧共创用户 ${params.userId} 的公开主页、简介与作品。`,
    path: `/profile/${params.userId}`,
    index: true,
    type: "profile",
  });
}

export const Route = createFileRoute("/_dashboard/profile/$userId/")({
  head: ({ params }) => ({
    meta: meta({ params }),
  }),
  component: ProfileHome,
});

function ProfileHome() {
  const { userId: urlUserId } = useParams({ strict: false });
  const userId = Number(urlUserId);

  return <HomeTab userId={userId} />;
}
