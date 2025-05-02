import type { Route } from "./+types/home";
import ProfilePage from "@/components/profile/profilePage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Profile() {
  return (
    <div className="h-screen bg-base-200 overflow-auto">
      <ProfilePage></ProfilePage>
    </div>
  );
}
