import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useMemo, useRef, useState } from "react";
import EntityList from "../../detail/ContentTab/entityLists";
import { useModuleContext } from "../context/_moduleContext";
import AddEntityToScene from "./addEntityToScene";
import EntityDetailList from "./EntityDetailList"; // 引入 EntityDetailList 组件
import Veditor from "./veditor";

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
                <EntityList moduleData={moduleData} entityType={entityType} />
              )
        }
      </div>
    </div>
  );
}

export default function SceneEdit({ scene, id }: SceneEditProps) {
  const entityInfo = useMemo(() => scene.entityInfo || {}, [scene.entityInfo]);
  const { stageId, removeModuleTabItem } = useModuleContext();

  // 本地状态
  const [localScene, setLocalScene] = useState({ ...entityInfo });
  const [name, setName] = useState(scene.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editEntityType, setEditEntityType] = useState<"item" | "role" | "location">("role");
  const VeditorId = `scene-tip-editor-${id}`;
  const VeditorIdForDescription = `scene-description-editor-${id}`;

  // 自动保存定时器
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // 接入接口
  const { mutate: updateScene } = useUpdateEntityMutation(stageId as number);

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
    if (editEntityType === "item") {
      const filteredItems = localScene.items?.filter((item: string | undefined) => item !== entity.name);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, items: (filteredItems || []) },
      });
      setLocalScene(prev => ({ ...prev, items: (filteredItems || []) }));
    }
    if (editEntityType === "role") {
      const filteredRoles = localScene.roles?.filter((item: string | undefined) => item !== entity.name);
      updateScene({
        id: scene.id!,
        name: scene.name!,
        entityType: 3,
        entityInfo: { ...localScene, roles: (filteredRoles || []) },
      });
      setLocalScene(prev => ({ ...prev, roles: (filteredRoles || []) }));
    }
    if (editEntityType === "location") {
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
    setName(scene.name);
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

  // 定时器的更新
  const localSceneRef = useRef(localScene);
  useEffect(() => {
    localSceneRef.current = localScene;
  }, [localScene]);
  const handleSave = () => {
    setIsTransitioning(true);
    let changed = false;
    const oldName = scene.name;
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      if (name !== scene.name) {
        removeModuleTabItem(scene.id!.toString());
        changed = true;
      }
      updateScene({ id: scene.id!, entityType: 3, entityInfo: localSceneRef.current, name });
      if (changed && mapData) {
        const oldMap = { ...mapData.entityInfo?.sceneMap } as Record<string, any>;
        const newMap: Record<string, any> = {};
        Object.entries(oldMap).forEach(([key, value]) => {
          if (key === oldName) {
            newMap[name as string] = value;
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
                newArray[index] = name as string;
              }
            });
            // 将修改后的数组赋值回newMap
            if (key === oldName) {
              newMap[name as string] = newArray;
            }
            else {
              newMap[key] = newArray;
            }
          }
        });
        updateScene({ id: mapData.id!, entityType: 5, entityInfo: { ...mapData.entityInfo, sceneMap: newMap }, name: mapData.name });
      }
    }, 300);
  };

  return (
    <div className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      {/* 场景信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex items-center gap-8">
            {/* 右侧内容 */}
            <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
              <>
                <div>
                  <label className="label">
                    <span className="label-text font-bold mb-1">场景名称</span>
                  </label>
                  <input
                    type="text"
                    value={name || ""}
                    onChange={e => setName(e.target.value)}
                    placeholder="请输入场景名称"
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text font-bold mb-1">场景描述（玩家可见）</span>
                  </label>
                  <Veditor
                    id={VeditorIdForDescription}
                    placeholder={localScene.description || "玩家能看到的描述"}
                    onchange={(value) => {
                      setLocalScene(prev => ({ ...prev, description: value }));
                      saveTimer.current && clearTimeout(saveTimer.current);
                      saveTimer.current = setTimeout(handleSave, 8000);
                    }}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text font-bold mb-1">剧情详细</span>
                  </label>
                  {/* <textarea
                    value={localScene.tip || ""}
                    onChange={(e) => {
                      setLocalScene(prev => ({ ...prev, tip: e.target.value }));
                      setCharCount(e.target.value.length);
                    }}
                    placeholder="对KP的提醒（检定，PL需要做什么来获得线索）"
                    className="textarea textarea-bordered w-full h-24 resize-none"
                  /> */}

                  <Veditor
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
              </>
            </div>
          </div>
          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            <button
              type="submit"
              onClick={handleSave}
              className={`btn btn-primary ${isTransitioning ? "scale-95" : ""}`}
              disabled={isTransitioning}
            >
              {isTransitioning
                ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  )
                : (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      保存
                    </span>
                  )}
            </button>
          </div>
        </div>
      </div>

      {/* 新增模块：locations, items, roles */}
      <div className="space-y-4">
        <Folder moduleData={locations} entityType="location" onClick={() => handleAddEntityOpen("location")} />
        <Folder moduleData={items} entityType="item" onClick={() => handleAddEntityOpen("item")} />
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

    </div>
  );
}
