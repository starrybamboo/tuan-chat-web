import type { Route } from "../+types/home";
import ModuleHome from "@/components/module/home/Modulehome";

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
    <div className="bg-base-100 overflow-x-hidden">
      <ModuleHome />
    </div>
  );
}
