/* eslint-disable react-dom/no-missing-button-type */
import { BaselineAnnouncement, MapPlaceHolderIcon, StageIcon } from "@/icons";
import { useModuleIdQuery } from "api/hooks/moduleAndStageQueryHooks";
import { useEffect, useMemo } from "react";
import { useModuleContext } from "../workPlace/context/_moduleContext";
import { ModuleItemEnum, ModuleListEnum } from "../workPlace/context/types";

export default function SideTopbar() {
  const { activeList, setActiveList, moduleId, pushModuleTabItem, setCurrentSelectedTabId } = useModuleContext();
  // 兼容 moduleId 尚未就绪或类型不一致（string/number）的场景，优先使用上下文，其次从 localStorage 读取
  const effectiveModuleId = useMemo(() => {
    let mid: unknown = moduleId;
    if (mid == null) {
      try {
        const snapId = localStorage.getItem("currentModuleId");
        if (snapId) {
          mid = Number(snapId);
        }
      }
      catch { }
    }
    if (typeof mid === "string") {
      return Number(mid);
    }
    if (typeof mid === "number") {
      return mid;
    }
    return undefined;
  }, [moduleId]);

  const moduleItem = useModuleIdQuery(effectiveModuleId as number)?.data?.data;

  // 同步“当前模组”标签的内容：当接口数据 moduleItem 变化时，刷新 Tab 的 content，避免编辑保存后因旧 content 回退
  useEffect(() => {
    if (!moduleItem) {
      return;
    }
    const id = "当前模组";
    pushModuleTabItem({
      id,
      label: "当前模组",
      type: ModuleItemEnum.MODULE,
      content: moduleItem,
    });
  }, [moduleItem, pushModuleTabItem]);

  const items = useMemo(
    () => [
      { id: ModuleListEnum.STAGE, icon: StageIcon, label: "素材", tooltip: "素材管理" },
      { id: ModuleListEnum.MAP, icon: MapPlaceHolderIcon, label: "剧情树", tooltip: "剧情/地点 流程图" },
      { id: ModuleListEnum.MODULE, icon: StageIcon, label: "模组", tooltip: "模组信息与管理" },
      { id: ModuleListEnum.CLUE, icon: BaselineAnnouncement, label: "线索", tooltip: "线索管理" },
    ],
    [],
  );

  return (
    <div className="h-full w-16 bg-base-100 border-r border-base-300 flex flex-col items-center py-4 gap-2">
      {items.map((item) => {
        const IconComponent = item.icon as React.ElementType<{ className?: string }>;
        const isActive = activeList === item.id;
        const className = [
          "w-12 h-12 mb-2 rounded-lg flex flex-col items-center justify-center transition-colors",
          isActive ? "bg-primary text-primary-content" : "bg-base-200 hover:bg-base-300",
        ].join(" ");
        return (
          <div key={item.id} className="tooltip tooltip-right" data-tip={item.tooltip}>
            <button
              onClick={() => {
                if (item.id === ModuleListEnum.MODULE) {
                  const id = "当前模组";
                  pushModuleTabItem({
                    id,
                    label: "当前模组",
                    type: ModuleItemEnum.MODULE,
                    content: moduleItem!,
                  });
                  setCurrentSelectedTabId(id);
                }
                setActiveList(item.id);
              }}
              className={className}
            >
              <IconComponent className="w-6 h-6 mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
