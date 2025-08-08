import { PopWindow } from "@/components/common/popWindow";
import { useCommitMutation } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import ItemList from "./components/itemList";
import { LocationList } from "./components/LocationList";
import MapModule from "./components/MapModule";
import RoleList from "./components/roleList";
import SceneList from "./components/SceneList";

// const sections = ["角色", "物品", "场景"];
function ModuleItems({ stageId }: { stageId: number }) {
  const { mutate: commit } = useCommitMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const handleSubmit = () => {
    if (message.trim() === "") {
      commit({
        stageId,
        message: "无提交说明",
      });
    }
    else {
      commit({
        stageId,
        message,
      });
    }
    setIsOpen(false);
    setMessage("");
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <MapModule stageId={stageId} />
        <RoleList stageId={stageId} />
        <ItemList stageId={stageId} />
        <LocationList stageId={stageId} />
        <SceneList stageId={stageId} />
        <button
          className="btn btn-primary btn-md flex-1 w-full"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          提交
        </button>
      </div>
      <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="space-y-4">
          <div className="text-xl font-bold">是否确认提交？</div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">提交说明：</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="请输入提交说明"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
            >
              确认提交
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsOpen(false)}
            >
              取消
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}

export default ModuleItems;
