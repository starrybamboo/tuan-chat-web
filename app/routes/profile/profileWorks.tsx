import type { Route } from "./+types/profileWorks";
import WorksTab from "@/components/profile/profileTab/worksTab";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.userId} 的作品 - tuan-chat` },
    { name: "description", content: `查看用户 ${params.userId} 发布的作品` },
  ];
}

export default function ProfileWorks({ params }: Route.ComponentProps) {
  const userId = Number(params.userId);

  return <WorksTab userId={userId} />;
}
