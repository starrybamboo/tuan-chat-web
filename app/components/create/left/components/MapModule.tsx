import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum, ModuleListEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useEffect } from "react";

// 重构后的地图模块：挂载即打开地图标签，并将左侧切换到 ModuleItems（剧情列表）
export default function MapModule({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, moduleTabItems, setActiveList, activeList } = useModuleContext();
  const { data } = useQueryEntitiesQuery(stageId);
  const { mutate: addMap } = useAddEntityMutation(5);

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
      // 打开后将左侧切换到 ModuleItems（显示剧情列表）
      // 为了避免事件在 ModuleItems 挂载前发出被丢失，这里先用 sessionStorage 做一次性兜底
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("moduleitems.initialTab", "3");
        }
      }
      catch {
        // ignore
      }
      setActiveList(ModuleListEnum.STAGE);
      // 通知 ModuleItems 切换到剧情列表（SceneList），不修改上下文，使用全局事件桥接
      try {
        // 立即发一次
        window.dispatchEvent(new CustomEvent("switch-moduleitems-tab", { detail: { tab: 3 } }));
        // 再在微任务阶段再发一次，最大化捕获刚挂载完成的监听器
        Promise.resolve().then(() => {
          try {
            window.dispatchEvent(new CustomEvent("switch-moduleitems-tab", { detail: { tab: 3 } }));
          }
          catch {
            // ignore
          }
        });
      }
      catch {
        // ignore
      }
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

  // 不再渲染列表，直接返回空（或可渲染一个轻量提示）
  return null;
}
