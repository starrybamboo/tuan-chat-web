/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import QuillEditor from "../../../common/quillEditor/quillEditor";
import { useModuleContext } from "../context/_moduleContext";
import AddEntityToScene from "./addEntityToScene";
import CreateEntityList from "./createEntityList";
import EntityDetailList from "./EntityDetailList"; // 引入 EntityDetailList 组件
import { invokeSaveWithTinyRetry } from "./invokeSaveWithTinyRetry";

interface SceneEditProps {
  scene: StageEntityResponse;
  id: string | number; // 当前sceneEdit在moduleTabs中的id
}

const types = {
  item: "物品",
  role: "角色",
  location: "地点",
};
function Folder({ moduleData, entityType, onClick, onDelete }:
{
  moduleData: StageEntityResponse[];
  entityType: "item" | "location" | "role";
  onClick?: () => void;
  onDelete?: (entity: StageEntityResponse) => void;
}) {
  return (
    <div className="collapse collapse-arrow bg-base-300 mb-2">
      <input type="checkbox" className="peer" defaultChecked />
      <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
        <span className="flex items-center h-7">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6 text-accent align-middle"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
          </svg>
        </span>
        <span className="leading-none">{ types[entityType] }</span>
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
      <div className="collapse-content bg-base-200">
        {
          entityType === "role"
            ? (
                <EntityDetailList moduleData={moduleData} onDelete={onDelete} />
              )
            : (
                <CreateEntityList moduleData={moduleData} entityType={entityType} onDelete={onDelete} />
              )
        }
      </div>
    </div>
  );
}

export default function SceneEdit({ scene, id }: SceneEditProps) {
  const [selectedTab, setSelectedTab] = useState<"description" | "tip" | "assets">("description");
  const entityInfo = useMemo(() => scene.entityInfo || {}, [scene.entityInfo]);
  const { stageId, beginSelectionLock, endSelectionLock, forceSetCurrentSelectedTabId, currentSelectedTabId, updateModuleTabLabel } = useModuleContext();

  // 本地状态
  const [localScene, setLocalScene] = useState({ ...entityInfo });
  const initialRef = useRef(true);
  // 名称改为列表侧重命名，这里不再编辑
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editEntityType, setEditEntityType] = useState<"item" | "role" | "location">("role");
  const VeditorId = `scene-tip-editor-${id}`;
  const VeditorIdForDescription = `scene-description-editor-${id}`;

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
    }
  }, []);

  // 自动保存定时器
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // 接入接口
  const { mutate: updateScene } = useUpdateEntityMutation(stageId as number);
  const queryClient = useQueryClient();

  // 名称内联编辑（与其他编辑器一致）
  const nameInputRef = useRef(scene.name || "");
  const nameRef = useRef(scene.name);
  const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  useLayoutEffect(() => {
    if ((scene.name || "") !== nameInputRef.current) {
      nameRef.current = scene.name;
      nameInputRef.current = scene.name || "";
    }
  }, [scene.name]);

  const optimisticUpdateEntityName = (newName: string) => {
    if (!stageId) {
      return;
    }
    queryClient.setQueryData<any>(["queryEntities", stageId], (oldData: any) => {
      if (!oldData) {
        return oldData;
      }
      const cloned = { ...oldData };
      if (Array.isArray(cloned.data)) {
        cloned.data = cloned.data.map((ent: any) => ent.id === scene.id ? { ...ent, name: newName } : ent);
      }
      return cloned;
    });
  };

  // 保存引用（需早于名称防抖使用）
  const localSceneRef = useRef(localScene);
  useEffect(() => {
    localSceneRef.current = localScene;
  }, [localScene]);

  const handleNameChange = (val: string) => {
    beginSelectionLock("editing-scene-name", 1200);
    nameInputRef.current = val;
    updateModuleTabLabel(scene.id!.toString(), val || "未命名");
    optimisticUpdateEntityName(val || "未命名");
    nameRef.current = val;
    if (nameDebounceTimer.current) {
      clearTimeout(nameDebounceTimer.current);
    }
    nameDebounceTimer.current = setTimeout(() => {
      updateScene({ id: scene.id!, entityType: 3, entityInfo: localSceneRef.current, name: val }, {
        onSuccess: () => {
          endSelectionLock();
        },
        onError: () => endSelectionLock(),
      });
    }, 600);
  };

  // （重复的 localSceneRef 已移除）

  // 新增状态
  const [locations, setLocations] = useState<StageEntityResponse[]>([]);
  const [items, setItems] = useState<StageEntityResponse[]>([]);
  const [roles, setRoles] = useState<StageEntityResponse[]>([]);

  // 获取所有实体
  const { data: entities } = useQueryEntitiesQuery(stageId as number);
  // 获取地图
  const mapData = entities?.data?.filter(item => item.entityType === 5)[0];

  // 弹窗相关
  const [isOpen, setIsOpen] = useState(false);

  const handleAddEntityOpen = (entityType: "item" | "role" | "location") => {
    setIsOpen(true);
    setEditEntityType(entityType);
  };

  const handleAddEntity = (entities: StageEntityResponse[]) => {
    const entitiesNames = entities.map(entity => entity.name);
    if (editEntityType === "item") {
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, items: [...(localScene.items || []), ...entitiesNames] },
      });
      setLocalScene(prev => ({ ...prev, items: [...(prev.items || []), ...entitiesNames] }));
    }
    if (editEntityType === "role") {
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, roles: [...(localScene.roles || []), ...entitiesNames] },
      });
      setLocalScene(prev => ({ ...prev, roles: [...(prev.roles || []), ...entitiesNames] }));
    }
    if (editEntityType === "location") {
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, locations: [...(localScene.locations || []), ...entitiesNames] },
      });
      setLocalScene(prev => ({ ...prev, locations: [...(prev.locations || []), ...entitiesNames] }));
    }
  };

  const handleDeleteEntity = (entity: StageEntityResponse) => {
    if (entity.entityType! === 1) {
      const filteredItems = localScene.items?.filter((item: string | undefined) => item !== entity.name);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, items: (filteredItems || []) },
      });
      setLocalScene(prev => ({ ...prev, items: (filteredItems || []) }));
    }
    if (entity.entityType! === 2) {
      const filteredRoles = localScene.roles?.filter((item: string | undefined) => item !== entity.name);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, roles: (filteredRoles || []) },
      });
      setLocalScene(prev => ({ ...prev, roles: (filteredRoles || []) }));
    }
    if (entity.entityType! === 4) {
      const filteredLocations = localScene.locations?.filter((item: string | undefined) => item !== entity.name);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, locations: (filteredLocations || []) },
      });

      setLocalScene(prev => ({ ...prev, locations: (filteredLocations || []) }));
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    setLocalScene({ ...entityInfo });
  }, [scene, entityInfo]);

  useEffect(() => {
    if (entities && localScene.locations && localScene.items && localScene.roles) {
      const locationsData = entities.data!.filter(item =>
        item.entityType === 4 && (localScene.locations || []).includes(item.name!));
      const itemsData = entities.data!.filter(item =>
        item.entityType === 1 && (localScene.items || []).includes(item.name!));
      const rolesData = entities.data!.filter(item =>
        item.entityType === 2 && (localScene.roles || []).includes(item.name!));

      setLocations(locationsData);
      setItems(itemsData);
      setRoles(rolesData);
    }
  }, [entities, localScene, scene]);

  // 监听entities变化，当场景中的物品、地点或角色名称发生变化时更新本地状态
  useEffect(() => {
    if (entities && entities.data) {
      // 获取当前场景在entities中的最新数据
      const currentScene = entities.data.find(item => item.entityType === 3 && item.id === scene.id);
      if (currentScene && currentScene.entityInfo) {
        // 从entities中获取当前场景引用的物品、地点、角色的最新数据
        const sceneItems = currentScene.entityInfo.items || [];
        const currentItems = entities.data.filter(item =>
          item.entityType === 1 && sceneItems.includes(item.name!));
        const currentItemNames = currentItems.map(item => item.name);

        const sceneLocations = currentScene.entityInfo.locations || [];
        const currentLocations = entities.data.filter(item =>
          item.entityType === 4 && sceneLocations.includes(item.name!));
        const currentLocationNames = currentLocations.map(item => item.name);

        const sceneRoles = currentScene.entityInfo.roles || [];
        const currentRoles = entities.data.filter(item =>
          item.entityType === 2 && sceneRoles.includes(item.name!));
        const currentRoleNames = currentRoles.map(item => item.name);

        // 更新显示列表状态
        setItems(currentItems);
        setLocations(currentLocations);
        setRoles(currentRoles);

        // 检查是否有名称变化需要更新本地场景状态
        const hasItemChanges = JSON.stringify(currentItemNames) !== JSON.stringify(localScene.items || []);
        const hasLocationChanges = JSON.stringify(currentLocationNames) !== JSON.stringify(localScene.locations || []);
        const hasRoleChanges = JSON.stringify(currentRoleNames) !== JSON.stringify(localScene.roles || []);

        if (hasItemChanges || hasLocationChanges || hasRoleChanges) {
          // 更新本地场景状态以反映名称的变化
          setLocalScene(prev => ({
            ...prev,
            items: hasItemChanges ? currentItemNames : prev.items,
            locations: hasLocationChanges ? currentLocationNames : prev.locations,
            roles: hasRoleChanges ? currentRoleNames : prev.roles,
          }));
        }
      }
    }
  }, [entities, scene.id, localScene]);

  // 定时器的更新 (localSceneRef 已在前面声明并更新)
  const handleSave = () => {
    // 保存前开启一个短暂选中锁，防止保存期间异步刷新导致 tab 被切换
    if (scene.id != null) {
      beginSelectionLock("scene-save", 800);
      // 强制保持当前 tab 选中
      if (currentSelectedTabId !== scene.id.toString()) {
        forceSetCurrentSelectedTabId(scene.id.toString());
      }
      else {
        // 即便一致也再设一次，确保其它竞争 update 之后仍是该 id
        forceSetCurrentSelectedTabId(scene.id.toString());
      }
    }
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      const oldName = scene.name;
      const changed = false; // 名称单独通过 handleNameChange 修改
      // 先更新场景自身，成功后再同步地图引用及关闭标签
      updateScene(
        { id: scene.id!, entityType: 3, entityInfo: localSceneRef.current, name: nameRef.current || scene.name },
        {
          onSuccess: () => {
            if (changed && mapData) {
              const oldMap = { ...mapData.entityInfo?.sceneMap } as Record<string, any>;
              const newMap: Record<string, any> = {};
              Object.entries(oldMap).forEach(([key, value]) => {
                if (key === oldName) {
                  newMap[scene.name as string] = value;
                }
                else {
                  newMap[key] = value;
                }
                // 处理值的替换（只处理数组类型的值）
                if (Array.isArray(value)) {
                  // 创建数组副本以避免修改只读数组
                  const newArray = [...value] as Array<string>;
                  newArray.forEach((item, index) => {
                    if (item === oldName) {
                      newArray[index] = scene.name as string;
                    }
                  });
                  // 将修改后的数组赋值回newMap
                  if (key === oldName) {
                    newMap[scene.name as string] = newArray;
                  }
                  else {
                    newMap[key] = newArray;
                  }
                }
              });
              updateScene({ id: mapData.id!, entityType: 5, entityInfo: { ...mapData.entityInfo, sceneMap: newMap }, name: mapData.name });
            }
            // 成功后稍晚释放锁，确保任何 refetch 回调已落地
            setTimeout(() => endSelectionLock(), 300);
          },
          onError: () => {
            // 出错也及时释放锁，避免长时间阻塞切换
            endSelectionLock();
          },
        },
      );
    }, 300);
  };

  // 对外注册保存函数（保持稳定引用，避免 effect 依赖 handleSave）
  const saveRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    saveRef.current = handleSave;
  });

  return (
    <div className={`max-w-4xl mx-auto pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      <div className="flex flex-col md:flex-row items-end justify-between gap-3">
        {/* 左侧标题区域 */}
        <div className="flex items-center gap-4 self-start md:self-auto">
          <div>
            <div className="group relative max-w-full">
              <input
                type="text"
                aria-label="编辑场景名称"
                value={nameInputRef.current}
                onChange={e => handleNameChange(e.target.value)}
                onFocus={() => beginSelectionLock("editing-scene-name", 1500)}
                onBlur={() => endSelectionLock()}
                placeholder="输入场景名称"
                title="点击编辑场景名称"
                className="font-semibold text-2xl md:text-3xl my-2 bg-transparent outline-none w-full truncate px-1 -mx-1 border-b border-dashed border-transparent focus:border-primary/70 focus:bg-primary/5 hover:border-base-content/40 hover:bg-base-200/40 rounded-sm transition-colors caret-primary"
                maxLength={60}
              />
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 group-focus-within:opacity-80 transition-opacity text-base-content/60 pr-1">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </span>
            </div>
            <p className="text-base-content/60">
              {selectedTab === "description" && "场景描述"}
              {selectedTab === "tip" && "剧情详细"}
              {selectedTab === "assets" && "场景素材"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn btn-md rounded-md ${selectedTab === "description" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelectedTab("description")}
          >
            场景描述
          </button>
          <button
            type="button"
            className={`btn btn-md rounded-md ${selectedTab === "tip" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelectedTab("tip")}
          >
            剧情详细
          </button>
          <button
            type="button"
            className={`btn btn-md rounded-md ${selectedTab === "assets" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelectedTab("assets")}
          >
            场景素材
          </button>
          <button
            type="button"
            onClick={() => {
              // 使用微小重试机制，处理名字变更导致的短暂未注册窗口
              invokeSaveWithTinyRetry(handleSave);
            }}
            className="btn btn-accent rounded-md flex-shrink-0 self-start md:self-auto"
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              保存
            </span>
          </button>
        </div>
      </div>
      <div className="divider"></div>
      {/* 场景信息卡片 */}
      <div className={` bg-base-100 space-y-6 ${isEditing ? "ring-2 ring-primary" : ""}`}>
        {selectedTab === "description" && (
          <div className="flex items-center gap-8">
            <div className="flex-1 min-w-0 overflow-hidden p-2">
              <QuillEditor
                id={VeditorIdForDescription}
                placeholder={initialRef.current ? localScene.description : "玩家能看到的描述"}
                onchange={(value) => {
                  setLocalScene(prev => ({ ...prev, description: value }));
                  saveTimer.current && clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(handleSave, 8000);
                }}
              />
            </div>
          </div>
        )}
        {selectedTab === "tip" && (
          <div className="flex items-center gap-8">
            <div className="flex-1 min-w-0 overflow-hidden p-2">
              <QuillEditor
                id={VeditorId}
                placeholder={localScene.tip || "对KP的提醒（对于剧情的书写）"}
                onchange={(value) => {
                  if (value !== entityInfo.tip) {
                    setLocalScene(prev => ({ ...prev, tip: value }));
                    saveTimer.current && clearTimeout(saveTimer.current);
                    saveTimer.current = setTimeout(handleSave, 8000);
                  }
                }}
              />
            </div>
          </div>
        )}
        {selectedTab === "assets" && (
          <>
            <div className="space-y-4">
              <Folder moduleData={locations} entityType="location" onClick={() => handleAddEntityOpen("location")} onDelete={handleDeleteEntity} />
              <Folder moduleData={items} entityType="item" onClick={() => handleAddEntityOpen("item")} onDelete={handleDeleteEntity} />
              <Folder moduleData={roles} entityType="role" onClick={() => handleAddEntityOpen("role")} onDelete={handleDeleteEntity} />
            </div>
            <AddEntityToScene
              isOpen={isOpen}
              onClose={handleClose}
              stageId={stageId as number}
              entityType={editEntityType}
              existIdSet={editEntityType === "item" ? items : editEntityType === "role" ? roles : locations}
              onConfirm={entities => handleAddEntity(entities)}
            />
          </>
        )}
      </div>

    </div>
  );
}
