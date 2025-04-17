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
    <div className="h-screen">
      <ProfilePage></ProfilePage>
    </div>
  );
}
