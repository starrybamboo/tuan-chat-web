import type { Route } from "./+types/settings";
import SettingsPage from "@/components/settings/settingsPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "设置",
    description: "配置团剧共创账号与应用偏好。",
    path: "/settings",
    index: false,
  });
}

export default function Settings() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <SettingsPage></SettingsPage>
    </div>
  );
}
