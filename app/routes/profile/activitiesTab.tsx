import ActivitiesTab from "@/components/profile/profileTab/activitiesTab";
import { createSeoMeta } from "@/utils/seo";

type ProfileActivitiesRouteParams = {
  params: {
    userId?: string;
  };
};

export function meta({ params }: ProfileActivitiesRouteParams) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的动态`,
    description: `查看团剧共创用户 ${params.userId} 的公开动态更新。`,
    path: `/profile/${params.userId}/activities`,
    index: false,
    type: "profile",
  });
}

export default function ProfileActivities({ params }: ProfileActivitiesRouteParams) {
  const userId = Number(params.userId);

  return <ActivitiesTab userId={userId} />;
}
