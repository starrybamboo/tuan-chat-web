import { createFileRoute } from "@tanstack/react-router";

import type { RouteMetaArgs } from "@/routes/routeTypes";

import SettingsPage from "@/components/settings/settingsPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "设置",
    description: "配置团剧共创账号与应用偏好。",
    path: "/settings",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/settings")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: Settings,
});

function Settings() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <SettingsPage></SettingsPage>
    </div>
  );
}
