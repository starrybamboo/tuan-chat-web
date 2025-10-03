import type { StageEntityResponse } from "api";
import { useAddEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import { useModuleContext } from "../../workPlace/context/_moduleContext";
import { ModuleItemEnum } from "../../workPlace/context/types";
import SceneList from "./SceneList";

// 重构后的地图模块：挂载即打开地图标签，并包含剧情管理功能
export default function MapModule({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, moduleTabItems, activeList } = useModuleContext();
  const { data } = useQueryEntitiesQuery(stageId);
  const { mutate: addMap } = useAddEntityMutation(5);
  const { mutate: addScene } = useAddEntityMutation(3);
  const { mutate: updateMap } = useUpdateEntityMutation(stageId);

  // 剧情搜索状态
  const [searchQuery, setSearchQuery] = useState("");

  // 获取实体数据并分类
  const entities = useMemo(() => data?.data ?? [], [data]);
  const listByType = useMemo(() => ({
    3: entities.filter(e => e.entityType === 3), // scene
    5: entities.filter(e => e.entityType === 5), // map
  }), [entities]);

  const sceneCount = listByType[3]?.length ?? 0;

  // 生成唯一名称的工具函数
  const genUniqueName = (base: string, existing: Array<{ name?: string | null }>) => {
    let idx = 1;
    let name = `${base}${idx}`;
    const hasName = (n: string) => existing.some(e => e.name === n);
    while (hasName(name)) {
      idx++;
      name = `${base}${idx}`;
    }
    return name;
  };

  // 创建新剧情
  const handleCreateScene = () => {
    const name = genUniqueName("新剧情", listByType[3]);
    const mapData = listByType[5][0];
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
                ...mapData.entityInfo?.sceneMap,
                [name]: [],
              },
            },
          });
        }
      },
    });
  };

  useEffect(() => {
    if (!data?.data) {
      return;
    }
    const mapEntity = data.data.find(i => i.entityType === 5) as StageEntityResponse | undefined;

    const openTab = (m: StageEntityResponse) => {
      const tabId = m.id!.toString();
      const exists = moduleTabItems.some(t => t.id === tabId);
      if (!exists) {
        pushModuleTabItem({ id: tabId, label: m.name!, content: m, type: ModuleItemEnum.MAP });
      }
      setCurrentSelectedTabId(tabId);
    };

    if (mapEntity) {
      openTab(mapEntity);
    }
    else {
      // 若无地图则创建后打开
      addMap({
        stageId,
        name: `${stageId}模组地图`,
        entityInfo: { sceneMap: { 新场景1: ["新场景2"], 新场景2: [] } },
      }, {
        onSuccess: (resp: any) => {
          const created = resp?.data as StageEntityResponse | undefined;
          if (created) {
            openTab(created);
          }
        },
      });
    }
    // 仅在数据变更时尝试一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeList]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 剧情管理区域 */}
      <div className="px-4 py-2 border-b border-base-300">
        <label className="input input-bordered flex items-center gap-2">
          <svg className="h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="grow"
            placeholder="搜索剧情..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </label>
      </div>

      {/* 剧情列表头部 */}
      <div className="px-4 py-2 border-b border-base-300 flex items-center justify-between gap-2">
        <h3>
          <span>
            剧情列表 (
            {sceneCount}
            )
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCreateScene}
            aria-label="新建剧情"
          >
            新建剧情
          </button>
        </div>
      </div>

      {/* 剧情列表 */}
      <div className="flex-1 overflow-y-auto">
        <SceneList
          stageId={stageId}
          searchQuery={searchQuery}
          showCreateButton={false}
        />
      </div>
    </div>
  );
}
