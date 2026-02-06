import type { Route } from "./+types/index";
import RepositoryWithTabs from "@/components/repository/RepositoryWithTabs";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "仓库系统" },
    {
      name: "description",
      content: "You can browse others repositories, and create your own freely!",
    },
  ];
}

export default function Home() {
  return (
    <div className="bg-base-200 h-full w-full overflow-x-hidden">
      <RepositoryWithTabs />
    </div>
  );
}
