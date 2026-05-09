import { createFileRoute } from "@tanstack/react-router";
import { useParams } from "@/router/native";
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

export const Route = createFileRoute("/_dashboard/profile/$userId/activities")({
  head: ({ params }) => ({
    meta: meta({ params }),
  }),
  component: ProfileActivities,
});

export default function ProfileActivities() {
  const { userId } = useParams<{ userId: string }>();

  return <ActivitiesTab userId={Number(userId)} />;
}
