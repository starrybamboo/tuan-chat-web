import type { StageEntityResponse } from "api";
import { PopWindow } from "@/components/common/popWindow";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useDeleteEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import Section from "./section";

// 场景表单项
function SceneListItem(
  { scene, name, isSelected, onClick, onDelete }: {
    scene: StageEntityResponse;
    name: string;
    isSelected: boolean;
    onClick?: () => void;
    onDelete?: () => void;
  },
) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2">
        <img
          src={scene.entityInfo!.avatar || "./favicon.ico"}
          alt="avatar"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline">{name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5 line-clamp-1">{scene.entityInfo!.description}</p>
        </div>
      </div>

      {/* 右侧按钮 */}
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
    </div>
  );
}

export default function SceneList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const handleClick = (scene: StageEntityResponse) => {
    pushModuleTabItem({
      id: scene.id!.toString(),
      label: scene.name!,
      content: scene,
      type: ModuleItemEnum.SCENE,
    });
    setCurrentSelectedTabId(scene.id!.toString());
  };

  // 模组相关
  const { data, isSuccess: _isSuccess } = useQueryEntitiesQuery(stageId);
  const list = data?.data!.filter(i => i.entityType === 3);
  const isEmpty = !list || list!.length === 0;

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 添加模组场景
  const { mutate: addScene } = useAddEntityMutation(3);
  // 删除模组场景
  const { mutate: deleteScene } = useDeleteEntityMutation();

  const handleAddSceneSubmit = () => {
    addScene({
      stageId,
      name: "新场景",
      entityInfo: {
        name: "新场景",
        description: "无",
      },
    });
  };

  return (
    <Section label="场景" onClick={handleOpen}>
      <>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有场景哦
              </div>
            )
          : (list?.map(i => (
              <SceneListItem
                key={i!.id ?? 0}
                scene={i!}
                name={i!.name || "未命名"}
                onDelete={() => {
                  removeModuleTabItem(i.id!.toString());
                  deleteScene({
                    id: i.id!,
                    stageId,
                  });
                }}
                isSelected={currentSelectedTabId === (i!.id!.toString())}
                onClick={() => handleClick(i!)}
              />
            )))}
      </>
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <div className="p-4 space-y-4">
          <p className="text-xl font-bold">添加场景</p>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleAddSceneSubmit();
                handleClose();
              }}
              title="创建一个全新的模组场景"
            >
              创建场景
            </button>
          </div>
        </div>
      </PopWindow>
    </Section>
  );
}
