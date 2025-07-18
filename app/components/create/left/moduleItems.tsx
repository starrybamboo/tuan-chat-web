import ItemList from "./components/itemList";
import RoleList from "./components/roleList";
import { SceneList } from "./components/sceneList";

// const sections = ["角色", "物品", "场景"];
function ModuleItems({ stageId }: { stageId: number }) {
  return (
    <div className="w-full h-full flex flex-col">
      <RoleList stageId={stageId} />
      <ItemList stageId={stageId} />
      <SceneList stageId={stageId} />
      <div className="flex w-full">
        <details className="dropdown flex-1">
          <summary className="btn m-1 bg-primary text-primary-content">切换分支</summary>
          <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
            <li><a>Item 1</a></li>
            <li><a>Item 2</a></li>
          </ul>
        </details>
        <button className="btn btn-primary btn-md m-1 flex-1" type="button">提交</button>
      </div>
    </div>
  );
}

export default ModuleItems;
