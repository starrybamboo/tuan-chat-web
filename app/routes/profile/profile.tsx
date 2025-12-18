import type { Route } from "./+types/profile";
import ProfilePage from "@/components/profile/profilePage";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `用户 ${params.userId} 的主页 - tuan-chat` },
    { name: "description", content: `查看用户 ${params.userId} 的个人主页` },
  ];
}

export default function Profile() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ProfilePage />
    </div>
  );
}
