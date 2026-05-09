import type { RouteMetaArgs } from "@/router/routeTypes";
import WorksTab from "@/components/profile/profileTab/worksTab";
import { useParams } from "@/router/reactRouterCompat";
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

export default function ProfileWorks() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = Number(userIdParam);

  return <WorksTab userId={userId} />;
}
