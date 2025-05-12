import type { Route } from "./+types/home";
import WorkspaceContext from "@/components/create/context/module";
import LeftContent from "@/components/create/left";
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
      <div className="min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] bg-base-200">
        <div className="w-full h-full flex flex-col">
          <div className="flex flex-grow">
            <div className="bg-base-300 basis-1/5">
              <LeftContent />
            </div>
            <div className="bg-emerald-400 basis-3/5">
              预览内容
            </div>
            <div className="bg-cyan-700 basis-1/5">
              AI 面板
            </div>
          </div>
        </div>
      </div>
    </WorkspaceContext>
  );
}
