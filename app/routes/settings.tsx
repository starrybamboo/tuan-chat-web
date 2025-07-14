import type { Route } from "./+types/home";
import SettingsPage from "@/components/settings/settingsPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "设置" },
  ];
}

export default function Settings() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <SettingsPage></SettingsPage>
    </div>
  );
}
