// Work.tsx
import LeftContent from "@/components/create/left";
import { SceneDemo } from "../scene/sceneGraph";
import { ModuleProvider } from "./context/_moduleContext";
import EditModule from "./EditModule";

export default function Work() {
  return (
    <ModuleProvider>
      <SceneDemo />
      <div className="min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] bg-base-200">
        <div className="w-full h-full flex flex-col">
          <div className="flex flex-grow">
            <div className="bg-base-300 basis-1/5">
              <LeftContent />
            </div>
            <div className="basis-3/5">
              <EditModule />
            </div>
            <div className="bg-cyan-700 basis-1/5">
              AI 面板
            </div>
          </div>
        </div>
      </div>
    </ModuleProvider>
  );
}
