import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useDeleteEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import Section from "./section";

export function SceneListItem({
  scene,
  isSelected,
  onClick,
  onDelete,
}: {
  scene: StageEntityResponse;
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
          src={scene.entityInfo!.image || "./favicon.ico"}
          alt="scene"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline font-medium">{scene.name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5 line-clamp-1">{scene.entityInfo!.sceneDescription}</p>
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

export function SceneList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const handleClick = (scene: StageEntityResponse) => {
    const sceneId = scene.id!.toString();
    const sceneName = scene.name!;

    pushModuleTabItem({
      id: sceneId,
      label: sceneName,
      type: ModuleItemEnum.SCENE,
    });
    setCurrentSelectedTabId(sceneId);
  };

  // 创建场景和删除
  const { mutate: createScene } = useAddEntityMutation("scene");
  const { mutate: deleteScene } = useDeleteEntityMutation();

  const handleAddScene = () => {
    createScene({
      stageId,
      name: "新场景",
      entityInfo: {
        tip: "给予的提示",
        sceneDescription: "新场景です", // 场景描述（可选）
        image: "./favicon.ico",
      },
    });
  };

  const { data } = useQueryEntitiesQuery(stageId);

  const list = data?.data?.filter(i => i!.entityType === "scene");

  // 判断列表是否存在且非空
  const isEmpty = !list || list.length === 0;

  return (
    <Section label="场景" onClick={handleAddScene}>
      {isEmpty
        ? (
            <div className="text-sm text-gray-500 px-2 py-4">暂时没有场景哦</div>
          )
        : (
            <>
              {list?.map((scene, index) => (
                <SceneListItem
                  // key={scene.entityInfo!.moduleSceneId}
                  key={index}
                  scene={scene}
                  isSelected={currentSelectedTabId === scene.id!.toString()}
                  onClick={() => handleClick(scene)}
                  onDelete={() => {
                    removeModuleTabItem(scene.id!.toString());
                    deleteScene({
                      id: scene.id!,
                      stageId,
                    });
                  }}
                />
              ))}
            </>
          )}
    </Section>
  );
}
