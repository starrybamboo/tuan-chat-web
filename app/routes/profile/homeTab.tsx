import type { Route } from "./+types/homeTab";
import { useParams } from "react-router";
import HomeTab from "@/components/profile/profileTab/homeTab";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.userId} 的主页 - tuan-chat` },
    { name: "description", content: `用户 ${params.userId} 的个人主页` },
  ];
}

export default function ProfileHome() {
  const { userId: urlUserId } = useParams();
  const userId = Number(urlUserId);

  return <HomeTab userId={userId} />;
}
