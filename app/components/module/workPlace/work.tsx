// Work.tsx
import LeftContent from "@/components/create/left";
import Sidebar from "@/components/create/sidebar/sidebar";
import TopBar from "@/components/create/top/topbar";
import { ModuleProvider } from "./context/_moduleContext";
import EditModule from "./EditModule";

export default function Work() {
  return (
    <ModuleProvider>
      <div className="h-[calc(100vh-4rem)] flex bg-base-200 overflow-hidden">
        <div className="flex-grow flex flex-col min-h-0">
          <div className="h-12 flex-shrink-0">
            <TopBar />
          </div>
          {" "}
          <div className="flex flex-1 min-h-0">
            <div className="flex">
              <Sidebar />
            </div>
            <div className="bg-base-300 basis-1/5 flex flex-col overflow-hidden">
              <LeftContent />
            </div>
            <div className="basis-3/5 flex flex-col overflow-hidden">
              <EditModule />
            </div>
            <div className="bg-cyan-700 basis-1/5 flex flex-col overflow-hidden">
              AI 面板
            </div>
          </div>
        </div>
      </div>
    </ModuleProvider>
  );
}
