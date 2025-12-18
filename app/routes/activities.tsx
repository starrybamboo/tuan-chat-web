import type { Route } from "./+types/activities";
import ActivitiesPage from "@/components/activities/activitiesPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Activities() {
  return (
    <div className="bg-base-200 h-full w-full overflow-y-auto overflow-x-hidden">
      <ActivitiesPage />
    </div>
  );
}
