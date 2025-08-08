import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useDeleteEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
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
  const { mutate: updateMap } = useUpdateEntityMutation(stageId);
  const list = data?.data!.filter(i => i.entityType === 3);
  // 同步到地图
  const mapData = data?.data!.filter(i => i.entityType === 5)[0];
  const isEmpty = !list || list!.length === 0;

  // 添加模组场景
  const { mutate: addScene } = useAddEntityMutation(3);
  // 删除模组场景
  const { mutate: deleteScene } = useDeleteEntityMutation();

  const handleAddSceneSubmit = () => {
    let index = 1;
    let name = "新场景1";
    while (list?.some(i => i.name === name)) {
      name = `新场景${index}`;
      index++;
    }
    addScene({
      stageId,
      name,
      entityInfo: {
        description: "无",
        tip: "无",
        items: [],
        roles: [],
        locations: [],
      },
    }, {
      onSuccess: () => {
        if (mapData) {
          updateMap({
            id: mapData.id!,
            name: mapData.name,
            entityType: 5,
            entityInfo: {
              ...mapData.entityInfo,
              sceneMap: {
                ...mapData.entityInfo!.sceneMap,
                [name]: [],
              },
            },
          });
        }
      },
    });
  };

  return (
    <Section label="场景" onClick={handleAddSceneSubmit}>
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
                  if (mapData) {
                    const oldMap = mapData?.entityInfo?.sceneMap;
                    const newMap: Record<string, any> = {};
                    if (oldMap) {
                      Object.entries(oldMap).forEach(([key, value]) => {
                        if (key !== i.name) {
                          if (Array.isArray(value)) {
                            newMap[key] = value.filter(item => item !== i.name);
                          }
                          else {
                            newMap[key] = value;
                          }
                        }
                      });
                    }
                    updateMap({
                      id: mapData.id!,
                      entityType: 5,
                      entityInfo: {
                        ...mapData.entityInfo,
                        sceneMap: newMap,
                      },
                    });
                  }
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
    </Section>
  );
}
