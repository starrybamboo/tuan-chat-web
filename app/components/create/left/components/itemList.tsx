import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useDeleteEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
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
      content: item,
      type: ModuleItemEnum.ITEM,
    });
    setCurrentSelectedTabId(item.id!.toString());
  };

  const { data } = useQueryEntitiesQuery(stageId);

  // 创建物品并添加物品
  const { mutate: addItem } = useAddEntityMutation(1);
  const { mutate: deleteItem } = useDeleteEntityMutation();
  const { mutate: updateScene } = useUpdateEntityMutation(stageId);

  const list = data?.data?.filter(i => i.entityType === 1);

  // 添加搜索状态
  const [searchQuery, setSearchQuery] = useState("");

  // 根据搜索查询过滤列表
  const filteredList = list?.filter(i =>
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sceneList = data?.data?.filter(i => i.entityType === 3);
  const isEmpty = !filteredList || filteredList.length === 0;
  const handleCreateItemSubmit = () => {
    let t = 1;
    let name = "新物品1";
    while (list!.some(item => item.name === name)) {
      name = `新物品${t}`;
      t++;
    }
    addItem({
      stageId,
      name,
      entityInfo: {
        tip: "悄悄地告诉kp",
        description: "新物品です", // 描述
        image: "./favicon.ico",
      },
    });
  };

  return (
    <Section label="物品" onClick={handleCreateItemSubmit}>
      <>
        {/* 添加搜索框 */}
        <div className="px-2 pb-2">
          <label className="input input-bordered flex items-center gap-2">
            <svg className="h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="grow"
              placeholder="搜索物品..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
        </div>

        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有物品哦
              </div>
            )
          : (
              filteredList.map((item, index) => (
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
                    }, {
                      onSuccess: () => {
                        const newScenes = sceneList?.map((scene) => {
                          const newItems = scene.entityInfo?.items.filter((i: string | undefined) => i !== item.name);
                          return { ...scene, entityInfo: { ...scene.entityInfo, items: newItems } };
                        });
                        newScenes?.forEach(scene => updateScene({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
                      },
                    });
                  }}
                />
              ))
            )}
      </>
    </Section>
  );
}
