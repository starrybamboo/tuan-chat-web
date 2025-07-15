import type { Route } from "./+types/home";
import ProfilePage from "@/components/profile/profilePage";
import { useParams } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Profile() {
  const { userId: urlUserId } = useParams();
  const userId = Number(urlUserId);

  // 如果 userId 无效，显示错误提示
  if (!urlUserId || Number.isNaN(userId)) {
    // 未来应该跳转到 404 页面
    return <div className="text-red-500 p-4">无效的用户 ID</div>;
  }

  return (
    <div className="h-full bg-base-200 overflow-auto">
      <ProfilePage userId={userId} />
    </div>
  );
}
