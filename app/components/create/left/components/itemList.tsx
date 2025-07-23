import type { StageEntityResponse } from "api";
import { PopWindow } from "@/components/common/popWindow";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useDeleteEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import { LocationListItem } from "./LocationList";
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
          <p className="text-xs text-gray-500 self-baseline mt-0.5 line-clamp-1">{item.entityInfo!.description}</p>
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
      id: item.id!.toString(),
      label: item.name!,
      type: ModuleItemEnum.ITEM,
    });
    setCurrentSelectedTabId(item.id!.toString());
  };

  const { data } = useQueryEntitiesQuery(stageId);

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  // // 选择场景
  const [selectedLocationId, setSelectedLocationId] = useState<number>(0);
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 创建物品并添加物品
  const { mutate: addItem } = useAddEntityMutation("item");
  const { mutate: deleteItem } = useDeleteEntityMutation();
  const handleCreateItemSubmit = () => {
    addItem({
      stageId,
      name: "新物品",
      entityInfo: {
        tip: "悄悄地告诉kp",
        description: "新物品です", // 描述
        image: "./favicon.ico",
      },
    });
  };

  const list = data?.data?.filter(i => i.entityType === "item");
  const locationList = data?.data?.filter(i => i.entityType === "location");
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
                  isSelected={currentSelectedTabId === item.id!.toString()}
                  onClick={() => handleClick(item)}
                  onDelete={() => {
                    removeModuleTabItem(item.id!.toString());
                    deleteItem({
                      id: item.id!,
                      stageId,
                    });
                  }}
                />
              ))
            )}
      </>
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <div className="p-4 space-y-4">
          <p className="text-xl font-bold">选择添加的物品所在的地点</p>
          <div className="space-y-2">
            {locationList?.map((location, index) => (
              <LocationListItem
                // key={scene.entityInfo!.sceneId}
                key={index}
                location={location}
                isSelected={selectedLocationId === location.id!}
                onClick={() => setSelectedLocationId(location.id!)}
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
