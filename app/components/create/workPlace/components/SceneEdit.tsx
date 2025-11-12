/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
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
  const { stageId, beginSelectionLock, endSelectionLock, updateModuleTabLabel, setTabSaveFunction, currentSelectedTabId, setIsCommitted } = useModuleContext();

  // 获取所有实体
  const { data: entities } = useQueryEntitiesQuery(stageId as number);
  // 获取地图
  const mapDataRef = useRef<StageEntityResponse>(entities?.data?.find(item => item.entityType === 5));

  useEffect(() => {
    mapDataRef.current = entities?.data?.find(item => item.entityType === 5);
  }, [entities]);

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

  // 名称内联编辑（与其他编辑器一致）
  const nameInputRef = useRef(scene.name || "");
  // 乐观更新，保持名称同步
  const nameRef = useRef(scene.name);
  // 悲观更新，同步地图
  const oldNameRef = useRef(scene.name);
  const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  useLayoutEffect(() => {
    oldNameRef.current = scene.name;
    if ((scene.name || "") !== nameInputRef.current) {
      nameRef.current = scene.name;
      nameInputRef.current = scene.name || "";
    }
  }, [scene.name]);

  // const optimisticUpdateEntityName = (newName: string) => {
  //   if (!stageId) {
  //     return;
  //   }
  //   queryClient.setQueryData<any>(["queryEntities", stageId], (oldData: any) => {
  //     if (!oldData) {
  //       return oldData;
  //     }
  //     const cloned = { ...oldData };
  //     if (Array.isArray(cloned.data)) {
  //       cloned.data = cloned.data.map((ent: any) => ent.id === scene.id ? { ...ent, name: newName } : ent);
  //     }
  //     return cloned;
  //   });
  // };

  // 保存引用（需早于名称防抖使用）
  const localSceneRef = useRef(localScene);
  useEffect(() => {
    localSceneRef.current = localScene;
  }, [localScene]);

  const handleNameChange = (val: string) => {
    beginSelectionLock("editing-scene-name", 10000);
    // oldName 仅用于旧逻辑（基于名称的 sceneMap 重写），已不再需要
    nameInputRef.current = val;
    updateModuleTabLabel(scene.id!.toString(), val || "未命名");
    // optimisticUpdateEntityName(val || "未命名");
    nameRef.current = val;
    if (nameDebounceTimer.current) {
      clearTimeout(nameDebounceTimer.current);
    }
    nameDebounceTimer.current = setTimeout(() => {
      updateScene({ id: scene.id!, entityType: 3, entityInfo: localSceneRef.current, name: val }, {
        onSuccess: () => {
          // map.sceneMap 现已改为 versionId 映射，重命名场景无需再同步修改 map
          setIsCommitted(false);
          oldNameRef.current = val;
          setTimeout(() => endSelectionLock(), 600);
        },
        onError: () => endSelectionLock(),
      });
    }, 600);
  };

  // 如果在名称输入框 blur 时还有未触发的防抖提交，不立即解除锁，避免用户立刻切换到其它模块
  const handleNameInputBlur = () => {
    // 若正在等待提交（存在定时器），交由提交成功/失败回调释放锁
    if (nameDebounceTimer.current) {
      return;
    }
    endSelectionLock();
  };

  // 新增状态
  const [locations, setLocations] = useState<StageEntityResponse[]>([]);
  const [items, setItems] = useState<StageEntityResponse[]>([]);
  const [roles, setRoles] = useState<StageEntityResponse[]>([]);

  // 弹窗相关
  const [isOpen, setIsOpen] = useState(false);

  const handleAddEntityOpen = (entityType: "item" | "role" | "location") => {
    setIsOpen(true);
    setEditEntityType(entityType);
  };

  const handleAddEntity = (entities: StageEntityResponse[]) => {
    beginSelectionLock("adding-entity", 2000);
    const entityType = entities[0]?.entityType;
    // 后端已固定使用 number[] 存储 versionId，不做字符串兼容
    const newIds: number[] = entities
      .map(ent => ent.versionId!)
      .filter(v => typeof v === "number" && !Number.isNaN(v));

    if (entityType === 1) {
      const merged = [...(localScene.items || []), ...newIds];
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, items: merged },
      });
      setLocalScene(prev => ({ ...prev, items: merged }));
    }
    if (entityType === 2) {
      const merged = [...(localScene.roles || []), ...newIds];
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, roles: merged },
      });
      setLocalScene(prev => ({ ...prev, roles: merged }));
    }
    if (entityType === 4) {
      const merged = [...(localScene.locations || []), ...newIds];
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, locations: merged },
      });
      setLocalScene(prev => ({ ...prev, locations: merged }));
    }
    setTimeout(() => {
      endSelectionLock();
    }, 2000);
  };

  const handleDeleteEntity = (entity: StageEntityResponse) => {
    beginSelectionLock("deleting-entity", 2000);
    if (entity.entityType! === 1) {
      const filteredItems = localScene.items?.filter((item: number | undefined) => item !== entity.versionId!);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, items: (filteredItems || []) },
      }, {
        onSuccess: () => endSelectionLock(),
      });
      setLocalScene(prev => ({ ...prev, items: (filteredItems || []) }));
    }
    if (entity.entityType! === 2) {
      const filteredRoles = localScene.roles?.filter((item: number | undefined) => item !== entity.versionId!);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, roles: (filteredRoles || []) },
      });
      setLocalScene(prev => ({ ...prev, roles: (filteredRoles || []) }));
    }
    if (entity.entityType! === 4) {
      const filteredLocations = localScene.locations?.filter((item: number | undefined) => item !== entity.versionId!);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, locations: (filteredLocations || []) },
      });

      setLocalScene(prev => ({ ...prev, locations: (filteredLocations || []) }));
    }
    setTimeout(() => endSelectionLock(), 1000);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 初始化/同步本地场景：确保三个引用字段永远是 number[]，避免后续筛选被 undefined 阻断
  useEffect(() => {
    setLocalScene({
      ...entityInfo,
      items: Array.isArray(entityInfo.items) ? entityInfo.items : [],
      roles: Array.isArray(entityInfo.roles) ? entityInfo.roles : [],
      locations: Array.isArray(entityInfo.locations) ? entityInfo.locations : [],
    });
  }, [scene, entityInfo]);

  // 根据本地 scene 引用直接派生显示列表；不再要求其它数组同时存在
  useEffect(() => {
    if (!entities || !entities.data) {
      return;
    }
    const all = entities.data;
    const locIds: number[] = Array.isArray(localScene.locations) ? localScene.locations : [];
    const itemIds: number[] = Array.isArray(localScene.items) ? localScene.items : [];
    const roleIds: number[] = Array.isArray(localScene.roles) ? localScene.roles : [];

    const locationsData = all.filter(ent => ent.entityType === 4 && roleIds !== undefined && locIds.includes(ent.versionId!));
    const itemsData = all.filter(ent => ent.entityType === 1 && itemIds.includes(ent.versionId!));
    const rolesData = all.filter(ent => ent.entityType === 2 && roleIds.includes(ent.versionId!));

    // 调试日志（如需关闭可删除）
    console.warn("[SceneEdit] derived lists", {
      locIds,
      itemIds,
      roleIds,
      locationsCount: locationsData.length,
      itemsCount: itemsData.length,
      rolesCount: rolesData.length,
    });

    setLocations(locationsData);
    setItems(itemsData);
    setRoles(rolesData);
  }, [entities, localScene]);

  // 监听 entities 变化：用 versionId 重新收集当前场景引用的实体，更新显示列表
  // 监听后端 entities 变动时，若对应场景实体发生变化则刷新本地引用（仅覆盖 localScene 的三组引用）
  useEffect(() => {
    if (!entities || !entities.data) {
      return;
    }
    const serverScene = entities.data.find(ent => ent.entityType === 3 && ent.id === scene.id);
    if (serverScene && serverScene.entityInfo) {
      const { items: sItems = [], roles: sRoles = [], locations: sLocs = [] } = serverScene.entityInfo as any;
      setLocalScene(prev => ({
        ...prev,
        items: Array.isArray(sItems) ? sItems : [],
        roles: Array.isArray(sRoles) ? sRoles : [],
        locations: Array.isArray(sLocs) ? sLocs : [],
      }));
    }
  }, [entities, scene.id]);

  // 定时器的更新 (localSceneRef 已在前面声明并更新)
  const handleSave = () => {
    beginSelectionLock("scene-save", 10000);
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      updateScene(
        { id: scene.id!, entityType: 3, entityInfo: localSceneRef.current, name: nameRef.current || scene.name },
        {
          onSuccess: () => {
            toast.success("场景保存成功");
            setIsCommitted(false);
            setTimeout(() => endSelectionLock(), 300);
          },
          onError: () => {
            endSelectionLock();
          },
        },
      );
    }, 300);
  };

  // 保存函数注册：使用稳定包装器防止闭包陈旧 & 初始为 no-op
  const latestHandleSaveRef = useRef(handleSave);
  latestHandleSaveRef.current = handleSave; // 每次 render 更新指针
  useEffect(() => {
    const tabId = scene.id?.toString();
    if (!tabId) {
      return;
    }
    if (currentSelectedTabId === tabId) {
      // 仅在自己被选中时注册保存函数
      setTabSaveFunction(() => {
        latestHandleSaveRef.current();
      });
    }
    // 若不是自身，不需要主动清除（新激活 tab 会覆盖），除非卸载阶段仍占用
    return () => {
      if (currentSelectedTabId === tabId) {
        setTabSaveFunction(() => {});
      }
    };
  }, [currentSelectedTabId, scene.id, setTabSaveFunction]);

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
                onBlur={handleNameInputBlur}
                placeholder="输入场景名称"
                title="点击编辑场景名称"
                className="font-semibold text-2xl md:text-3xl my-2 bg-transparent outline-none w-full truncate px-1 -mx-1 border-b border-dashed border-transparent focus:border-primary/70 focus:bg-primary/5 hover:border-base-content/40 hover:bg-base-200/40 rounded-sm transition-colors caret-primary"
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
            <div className="flex-1 min-w-0 p-2">
              <QuillEditor
                id={VeditorIdForDescription}
                placeholder={localScene.description || "玩家能看到的描述"}
                onchange={(value) => {
                  if (value === "")
                    return;
                  setLocalScene(prev => ({ ...prev, description: value }));
                  saveTimer.current && clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(() => handleSave(), 8000);
                }}
                onSpecialKey={handleAddEntity}
                onDeleteSpecialKey={handleDeleteEntity}
                persistSelectionKey={id ? `scene-description-${id}` : undefined}
                active={currentSelectedTabId === scene.id?.toString() && selectedTab === "description"}
                focusOnActive
              />
            </div>
          </div>
        )}
        {selectedTab === "tip" && (
          <div className="flex items-center gap-8">
            <div className="flex-1 min-w-0 p-2">
              <QuillEditor
                id={VeditorId}
                placeholder={localScene.tip || "对KP的提醒（对于剧情的书写）"}
                onchange={(value) => {
                  if (value === "")
                    return;
                  // 之前这里错误地写入了 description 导致切换 Tab 时 tip 覆盖 description
                  setLocalScene(prev => ({ ...prev, tip: value }));
                  saveTimer.current && clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(() => handleSave(), 8000);
                }}
                onSpecialKey={handleAddEntity}
                onDeleteSpecialKey={handleDeleteEntity}
                persistSelectionKey={id ? `scene-tip-${id}` : undefined}
                active={currentSelectedTabId === scene.id?.toString() && selectedTab === "tip"}
                focusOnActive
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
              // 直接传递当前场景已包含的 versionId 数组，避免在弹窗内再从对象取出
              existIdSet={editEntityType === "item" ? (localScene.items || []) : editEntityType === "role" ? (localScene.roles || []) : (localScene.locations || [])}
              onConfirm={entities => handleAddEntity(entities)}
            />
          </>
        )}
      </div>

    </div>
  );
}
