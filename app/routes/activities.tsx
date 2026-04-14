import type { Route } from "./+types/activities";
import ActivitiesPage from "@/components/activities/activitiesPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "动态",
    description: "查看团剧共创中的动态流与更新。",
    path: "/activities",
    index: false,
  });
}

export default function Activities() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ActivitiesPage />
    </div>
  );
}
