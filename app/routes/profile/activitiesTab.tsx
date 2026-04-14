import type { Route } from "./+types/activitiesTab";
import ActivitiesTab from "@/components/profile/profileTab/activitiesTab";
import { createSeoMeta } from "@/utils/seo";

export function meta({ params }: Route.MetaArgs) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的动态`,
    description: `查看团剧共创用户 ${params.userId} 的公开动态更新。`,
    path: `/profile/${params.userId}/activities`,
    index: false,
    type: "profile",
  });
}

export default function ProfileActivities({ params }: Route.ComponentProps) {
  const userId = Number(params.userId);

  return <ActivitiesTab userId={userId} />;
}
