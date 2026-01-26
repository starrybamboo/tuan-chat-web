import type { Route } from "./+types/index";
import ModuleWithTabs from "@/components/module/ModuleWithTabs";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "模组系统" },
    {
      name: "description",
      content: "You can browse others modules, and create your own freely!",
    },
  ];
}

export default function Home() {
  return (
    <div className="bg-base-200 h-full w-full overflow-x-hidden">
      <ModuleWithTabs />
    </div>
  );
}
