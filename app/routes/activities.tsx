import type { Route } from "./+types/home";
import ActivitiesPage from "@/components/activities/activitiesPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Activities() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <ActivitiesPage />
    </div>
  );
}
