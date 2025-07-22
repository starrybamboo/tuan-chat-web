import type { StageResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ChevronDown, GearOutline, PlusOutline, Search } from "@/icons";
import { useStagingQuery } from "api/hooks/moduleQueryHooks";
import { useCallback, useMemo, useState } from "react";
import ModuleListItem from "./moduleListItem";

export default function TopBar() {
  const [editingStageId, setEditingStageId] = useState<number>(0);
  const { setStageId } = useModuleContext();
  const { data: stagingData, isSuccess } = useStagingQuery();

  // 从查询数据中获取模组数组
  const moduleArray = useMemo(() => {
    return isSuccess && stagingData?.data ? stagingData.data : [];
  }, [isSuccess, stagingData]);

  // 获取实际的当前编辑的stageId，如果没有选择则默认选择第一个
  const actualEditingStageId = useMemo(() => {
    if (moduleArray.length > 0) {
      // 如果当前选择的ID在数组中存在，则使用它；否则使用第一个
      if (editingStageId === 0 || !moduleArray.find(item => item.stageId === editingStageId)) {
        const firstStageId = moduleArray[0]?.stageId ?? 0;
        // 只在第一次加载时自动设置
        if (editingStageId === 0) {
          setTimeout(() => {
            setEditingStageId(firstStageId);
            setStageId(firstStageId);
          }, 0);
        }
        return firstStageId;
      }
      return editingStageId;
    }
    return editingStageId;
  }, [moduleArray, editingStageId, setStageId]);

  const handleModuleChange = useCallback((stageId: number) => {
    setEditingStageId(stageId);
    setStageId(stageId);
  }, [setStageId]);

  const currentModule = moduleArray.find(item =>
    item.stageId === actualEditingStageId,
  );

  return (
    <div className="w-full bg-base-100 pl-16 mb-0.5 border-b border-base-300">
      <details className="dropdown w-1/5 group">
        <summary className="h-12 w-full flex items-center relative list-none">
          <div className="flex items-center justify-between h-10 w-full px-4 rounded-md cursor-pointer transition-all duration-200 bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-200 shadow-sm hover:shadow-md">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-3 bg-purple-400" />
              <span className="text-sm font-medium text-gray-800 select-none">
                {currentModule?.moduleName || "请选择模组"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-600 transition-transform duration-200 group-open:rotate-180" />
          </div>
        </summary>
        <ul className="menu dropdown-content rounded-none bg-base-100 rounded-box z-1 top-12 w-full p-0 shadow-sm select-none">
          <div className="flex flex-col p-2 justify-center items-center">

            {/* 搜索栏 */}
            <label className="input w-full">
              <Search className="opacity-50" />
              <input type="search" required placeholder="请输入模组名" />
            </label>

            {/* 总数, 以及排序 */}
            <div className="flex w-full items-center justify-between mt-2">
              <span className="text-xs font-bold pl-1 inline-block">
                {`共有 ${moduleArray.length} 个模组`}
              </span>
              <div className="join gap-2">
                <button className="btn btn-xs btn-ghost" type="button">按时间</button>
                <button className="btn btn-xs btn-ghost" type="button">按名称</button>
              </div>
            </div>
          </div>
          <div className="divider my-0!" />

          <div className="max-h-128 h-100 overflow-y-auto flex flex-col gap-2 px-2">
            {moduleArray.map((item: StageResponse) => (
              <div key={item.stageId}>
                <ModuleListItem
                  item={item}
                  isSelected={actualEditingStageId === item.stageId}
                  onClick={() => {
                    handleModuleChange(item.stageId as number);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="divider my-0!" />

          {/* 下拉框的操作, 包括新建和跳转管理 */}
          <div className="flex w-full h-12 items-center">
            <button className="btn btn-sm btn-ghost" type="button">
              <PlusOutline className="w-5 h-5" />
              新建模组
            </button>
            <button className="btn btn-sm btn-ghost" type="button">
              <GearOutline className="w-6 h-6" />
              管理模组
            </button>
          </div>
        </ul>
      </details>
    </div>
  );
}
