import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute } from "@tanstack/react-router";
import ProfilePage from "@/components/profile/profilePage";
import { createSeoMeta } from "@/utils/seo";

export function meta({ params }: RouteMetaArgs) {
  return createSeoMeta({
    title: `用户 ${params.userId} 的主页`,
    description: `查看团剧共创用户 ${params.userId} 的公开主页、简介与作品。`,
    path: `/profile/${params.userId}`,
    index: true,
    type: "profile",
  });
}

export const Route = createFileRoute("/_dashboard/profile/$userId")({
  head: ({ params }) => ({
    meta: meta({ params }),
  }),
  component: Profile,
});

export default function Profile() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ProfilePage />
    </div>
  );
}
