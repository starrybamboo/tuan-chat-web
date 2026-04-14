import type { Route } from "./+types/profileWorks";
import WorksTab from "@/components/profile/profileTab/worksTab";
import { createSeoMeta } from "@/utils/seo";

export function meta({ params }: Route.MetaArgs) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的作品`,
    description: `查看团剧共创用户 ${params.userId} 发布的公开作品与模组。`,
    path: `/profile/${params.userId}/works`,
    index: true,
    type: "profile",
  });
}

export default function ProfileWorks({ params }: Route.ComponentProps) {
  const userId = Number(params.userId);

  return <WorksTab userId={userId} />;
}
