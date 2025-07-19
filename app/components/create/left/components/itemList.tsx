import type { StageEntityResponse } from "api";
import { PopWindow } from "@/components/common/popWindow";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import { SceneListItem } from "./sceneList";
import Section from "./section";

function ItemListItem({
  item,
  isSelected,
  onClick,
  onDelete,
}: {
  item: StageEntityResponse;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2">
        <img
          src={item.entityInfo!.image || "./favicon.ico"}
          alt="item"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline font-medium">{item.name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5">{item.entityInfo!.description}</p>
        </div>
      </div>

      {/* 右侧按钮 */}
      {onDelete && (
        <button
          type="button"
          className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
          onClick={(e) => {
            if (onDelete)
              onDelete();
            e.stopPropagation();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// 物品列表
export default function ItemList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  // const queryClient = useQueryClient();

  const handleClick = (item: StageEntityResponse) => {
    pushModuleTabItem({
      id: item.createTime! + item.name!,
      label: item.name!,
      type: ModuleItemEnum.ITEM,
    });
    setCurrentSelectedTabId(item.createTime! + item.name!);
  };

  const { data } = useQueryEntitiesQuery(stageId);

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  // // 选择场景
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 创建物品并添加物品
  const { mutate: addAndDeleteItem } = useAddMutation();
  const handleCreateItemSubmit = () => {
    addAndDeleteItem({
      stageId,
      name: "新物品",
      entityType: "item",
      operationType: 0,
      entityInfo: {
        tip: "悄悄地告诉kp",
        description: "新物品です", // 描述
        image: "./favicon.ico",
      },
    });
  };

  const list = data?.data?.filter(i => i.entityType === "item");
  const sceneList = data?.data?.filter(i => i.entityType === "scene");
  const isEmpty = !list || list.length === 0;

  return (
    <Section label="物品" onClick={handleOpen}>
      <>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有物品哦
              </div>
            )
          : (
              list.map((item, index) => (
                <ItemListItem
                  // key={item.entityInfo!.itemId}
                  key={index}
                  item={item}
                  isSelected={currentSelectedTabId === item.createTime! + item.name}
                  onClick={() => handleClick(item)}
                  onDelete={() => {
                    removeModuleTabItem(item.createTime! + item.name);
                    addAndDeleteItem({ operationType: 1, entityType: "item", entityInfo: item.entityInfo!, stageId, name: item.name! });
                  }}
                />
              ))
            )}
      </>
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <div className="p-4 space-y-4">
          <p className="text-xl font-bold">选择添加的物品所在的场景</p>
          <div className="space-y-2">
            {sceneList?.map((scene, index) => (
              <SceneListItem
                // key={scene.entityInfo!.sceneId}
                key={index}
                scene={scene}
                isSelected={selectedSceneId === scene.createTime! + scene.name}
                onClick={() => setSelectedSceneId(scene.createTime! + scene.name)}
              />
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleCreateItemSubmit();
                setIsOpen(false);
              }}
              title="创建物品"
            >
              创建物品
            </button>
          </div>
        </div>
      </PopWindow>
    </Section>
  );
}
