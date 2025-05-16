import type { Route } from "./+types/home";
import WorkspaceContext from "@/components/create/context/module";
import Work from "@/components/module/workPlace/work";
import { useMemo } from "react";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "工作室" },
    {
      name: "description",
      content: "欢迎来到tuan chat工作室, 你可以在这里自由创建和修改模组!",
    },
  ];
}

export default function Create() {
  // const location = useLocation();
  const contextValue = useMemo(() => ({
    // moduleId: location.pathname.split("/").pop()!,
    moduleId: 23,
  }), []);

  return (
    <WorkspaceContext value={contextValue}>
      <Work></Work>
    </WorkspaceContext>
  );
}
