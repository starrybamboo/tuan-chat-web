import type { Route } from "./+types/activitiesTab";
import ActivitiesTab from "@/components/profile/profileTab/activitiesTab";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.userId} 的动态 - tuan-chat` },
    { name: "description", content: `查看用户 ${params.userId} 发布的动态` },
  ];
}

export default function ProfileActivities({ params }: Route.ComponentProps) {
  const userId = Number(params.userId);

  return <ActivitiesTab userId={userId} />;
}
