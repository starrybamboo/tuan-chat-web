import type { Route } from "./+types/profile";
import ProfilePage from "@/components/profile/profilePage";
import { createSeoMeta } from "@/utils/seo";

export function meta({ params }: Route.MetaArgs) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的主页`,
    description: `查看团剧共创用户 ${params.userId} 的公开主页、简介与作品。`,
    path: `/profile/${params.userId}`,
    index: true,
    type: "profile",
  });
}

export default function Profile() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ProfilePage />
    </div>
  );
}
