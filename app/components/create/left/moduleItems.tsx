import type { ItemResponse } from "api/models/ItemResponse";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { getEntityListByType } from "@/components/module/detail/moduleUtils";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useQueryClient } from "@tanstack/react-query";
import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import { use } from "react";
import WorkspaceContext from "../context/module";

function Section({ label, children, onClick }: { label: string; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="collapse collapse-arrow bg-base-100 border-base-300 border rounded-none border-x-0">
      <input type="checkbox" />
      <div className="collapse-title font-semibold relative pr-10 flex items-center">
        {label}
        {/* 按钮放置在 .collapse-title 内部 */}
        <div className="absolute right-15 top-1/2 transform -translate-y-1/2 z-10">
          <button
            type="button"
            className="btn btn-primary btn-md btn-square"
            onClick={onClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="collapse-content p-0 text-sm flex flex-col">
        {children}
      </div>
    </div>
  );
}

// 角色表单项
function RoleListItem(
  { avatarId, name, isSelected, onClick }: {
    avatarId: number;
    name: string;
    isSelected: boolean;
    onClick: () => void;
  },
) {
  return (
    <div
      className={`w-full h-12 p-2 flex gap-2 items-center hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""
      }`}
      onClick={onClick}
    >
      <RoleAvatarComponent
        avatarId={avatarId}
        width={10}
        withTitle={false}
        isRounded={true}
        stopPopWindow={true}
      />
      <p className="self-baseline">{name}</p>
    </div>
  );
}

function RoleList() {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId } = useModuleContext();
  const queryClient = useQueryClient();
  const handleClick = (roleId: number, roleName: string) => {
    pushModuleTabItem({
      id: roleId.toString(),
      label: roleName,
      type: ModuleItemEnum.ROLE,
    });
    setCurrentSelectedTabId(roleId.toString());
    queryClient.invalidateQueries({
      queryKey: ["role", roleId],
    });
  };

  const ctx = use(WorkspaceContext);
  const { data: moduleInfo, isSuccess: _isSuccess } = useModuleInfoQuery(ctx.moduleId);

  // 从模组信息中获取角色列表
  const roleList = getEntityListByType(moduleInfo, "role");
  const list = roleList.map(entity => entity.entityInfo);

  return (
    <Section label="角色">
      {list?.map(roleInfo => (
        <RoleListItem
          key={roleInfo!.roleId}
          avatarId={roleInfo!.avatarId}
          name={roleInfo!.roleName}
          isSelected={currentSelectedTabId === roleInfo!.roleId.toString()}
          onClick={() => handleClick(roleInfo!.roleId, roleInfo!.roleName)}
        />
      ))}
    </Section>
  );
}

function ItemListItem(
  { item, isSelected, onClick }: {
    item: ItemResponse;
    isSelected: boolean;
    onClick: () => void;
  },
) {
  return (
    <div
      className={`w-full h-12 p-2 flex gap-2 items-center hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""
      }`}
      onClick={onClick}
    >
      {/* 物品名称 */}
      <p className="self-baseline font-medium">{item.name}</p>

      {/* 可选：显示物品描述 */}
      {item.description && (
        <p className="text-xs text-gray-500">
          {item.description}
        </p>
      )}
    </div>
  );
}

// 可能用得上
function ItemList() {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId } = useModuleContext();

  const handleClick = (item: ItemResponse) => {
    const itemId = item.itemId!;
    const itemName = item.name!;

    pushModuleTabItem({
      id: itemId.toString(),
      label: itemName,
      type: ModuleItemEnum.ITEM,
    });
    setCurrentSelectedTabId(itemId.toString());
  };

  const ctx = use(WorkspaceContext);
  const { data: moduleInfo } = useModuleInfoQuery(ctx.moduleId);

  // 从模组信息中获取物品列表
  const itemList = getEntityListByType(moduleInfo, "item");
  const list = itemList.map(entity => entity.entityInfo);
  const isEmpty = !list || list.length === 0;

  return (
    <Section label="物品">
      <>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有物品哦
              </div>
            )
          : (
              list.map((item) => {
                if (!item) {
                  return null;
                }
                return (
                  <ItemListItem
                    key={item.itemId}
                    item={item as ItemResponse}
                    isSelected={currentSelectedTabId === item.itemId?.toString()}
                    onClick={() => handleClick(item as ItemResponse)}
                  />
                );
              })
            )}
      </>
    </Section>
  );
}

function SceneListItem(
  { scene, isSelected, onClick }: {
    scene: any; // 使用 any 类型，因为没有具体的场景类型定义
    isSelected: boolean;
    onClick: () => void;
  },
) {
  return (
    <div
      className={`w-full h-12 p-2 flex gap-2 items-center hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""
      }`}
      onClick={onClick}
    >
      {/* 场景名称 */}
      <p className="self-baseline font-medium">{scene.moduleSceneName}</p>
      {scene.sceneDescription && (
        <p className="text-xs text-gray-500 truncate">{scene.sceneDescription}</p>
      )}
    </div>
  );
}

function SceneList() {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId } = useModuleContext();
  const ctx = use(WorkspaceContext);
  const handleClick = (scene: any) => {
    const sceneId = scene.moduleSceneId!;
    const sceneName = scene.moduleSceneName!;

    pushModuleTabItem({
      id: sceneId.toString(),
      label: sceneName,
      type: ModuleItemEnum.SCENE,
    });
    setCurrentSelectedTabId(sceneId.toString());
  };

  const handleAddScene = () => {
    // TODO: 实现添加场景功能
    // console.log("添加场景功能待实现");
  };

  const { data: moduleInfo } = useModuleInfoQuery(ctx.moduleId);

  // 从模组信息中获取场景列表
  const sceneList = getEntityListByType(moduleInfo, "scene");
  const list = sceneList.map(entity => entity.entityInfo);

  // 判断列表是否存在且非空
  const isEmpty = !list || list.length === 0;

  return (
    <div>
      <Section label="场景" onClick={handleAddScene}>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">暂时没有场景哦</div>
            )
          : (
              <>
                {list?.map((scene) => {
                  if (!scene) {
                    return null;
                  }
                  return (
                    <SceneListItem
                      key={scene.moduleSceneId}
                      scene={scene}
                      isSelected={currentSelectedTabId === scene.moduleSceneId?.toString()}
                      onClick={() => handleClick(scene)}
                    />
                  );
                })}
              </>
            )}
      </Section>
    </div>
  );
}

// const sections = ["角色", "物品", "场景"];
function ModuleItems() {
  return (
    <div className="w-full h-full">
      <RoleList />
      <ItemList />
      <SceneList />
      {/* {sections.map((i) => {
        return <Section key={i} label={i}></Section>;
      })} */}
    </div>
  );
}

export default ModuleItems;
