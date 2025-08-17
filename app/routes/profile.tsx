import type { Route } from "./+types/home";
import { RedirectErrorPage } from "@/components/common/RedirectErrorPage";
import { useGlobalContext } from "@/components/globalContextProvider";
import ProfilePage from "@/components/profile/profilePage";
import { useParams } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Profile() {
  // 从URL直接拿userId
  const { userId: urlUserId } = useParams();
  const userId = Number(urlUserId);
  // 获取用户登录的ID
  const { userId: loginId } = useGlobalContext();

  if (Number.isNaN(userId) || userId <= 0) {
    // 跳转到 404 页面
    return (
      <RedirectErrorPage
        errorMessage="您访问的用户ID无效或不存在"
        countdownSeconds={3}
      />
    );
  }

  if (!loginId) {
    return (
      <RedirectErrorPage
        errorMessage="抱歉，您尚未登录"
        countdownSeconds={3}
      />
    );
  }

  return (
    <div className="h-full bg-base-200 overflow-auto">
      <ProfilePage userId={userId} />
    </div>
  );
}
