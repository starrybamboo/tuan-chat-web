/* eslint-disable react-dom/no-missing-button-type */
import type { Module } from "api";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum, ModuleListEnum } from "@/components/module/workPlace/context/types";
import { ArrowBackThickFill, ChevronSmallTripleUp, StageIcon } from "@/icons";
import { useCommitMutation, useModuleListByUserQuery } from "api/hooks/moduleAndStageQueryHooks";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

// 简易 Map 图标，占位用
function MapPlaceholderIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={props.className ?? "w-5 h-5"}
    >
      <path d="M9.5 4.5 3 6.75v12l6.5-2.25 6 2.25L21 16.5v-12l-5.5 2.25-6-2.25zM9.5 6.9v11.1L4.5 19.5V8.4l5-1.5zm1.5.45 5 1.875V20.1l-5-1.875V7.35zM19.5 6.6v10.95l-2.5 1v-11l2.5-0.95z" />
    </svg>
  );
}

export default function Topbar() {
  const { activeList, setActiveList, moduleId, pushModuleTabItem, setCurrentSelectedTabId } = useModuleContext();
  const navigate = useNavigate();
  // 查询所有模组并过滤
  const userId = useGlobalContext().userId ?? -1;
  const moduleItem = useModuleListByUserQuery({ userId }).data?.data?.list?.find(m => m.moduleId === moduleId);
  // 提交模组所用
  const { mutate: commit } = useCommitMutation();
  const { stageId } = useModuleContext();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const currentModule: Module | null = useMemo(() => {
    try {
      const snap = localStorage.getItem("currentModule");
      if (snap) {
        return JSON.parse(snap) as Module;
      }
    }
    catch {}
    return (moduleItem as Module | undefined) ?? null;
  }, [moduleItem]);
  const handleSubmit = () => {
    if (message.trim() === "") {
      commit({
        stageId: stageId as number,
        message: "无提交说明",
      });
    }
    else {
      commit({
        stageId: stageId as number,
        message,
      });
    }
    setIsOpen(false);
    setMessage("");
  };

  const items = useMemo(
    () => [
      { id: ModuleListEnum.BACK, icon: ArrowBackThickFill, label: "返回", tooltip: "返回上一级" },
      { id: ModuleListEnum.STAGE, icon: StageIcon, label: "暂存区", tooltip: "暂存区管理" },
      { id: ModuleListEnum.MAP, icon: MapPlaceholderIcon, label: "流程图", tooltip: "剧情/地点 流程图" },
      { id: ModuleListEnum.MODULE, icon: StageIcon, label: "模组", tooltip: "模组信息与管理" },
      { id: ModuleListEnum.COMMIT, icon: ChevronSmallTripleUp, label: "保存草稿", tooltip: "保存所有您做的改动到当前模组" },
    ],
    [],
  );

  return (
    <div className="w-full h-14 bg-base-100 border-b border-base-300 flex items-center px-2 gap-2">
      {items.map((item) => {
        const IconComponent = item.icon as React.ElementType<{ className?: string }>;
        const isActive = activeList === item.id;

        const className = [
          "h-10 px-3 rounded-md inline-flex items-center gap-2 text-sm transition-colors",
          isActive ? "bg-primary text-primary-content" : "bg-base-200 hover:bg-base-300",
        ].join(" ");

        return (
          <div key={item.id} className="tooltip tooltip-bottom" data-tip={item.tooltip}>
            <button
              onClick={() => {
                if (item.id === ModuleListEnum.BACK) {
                  navigate("/create", { replace: true });
                  return;
                }
                if (item.id === ModuleListEnum.COMMIT) {
                  setIsOpen(true);
                  return;
                }
                if (item.id === ModuleListEnum.MODULE) {
                  // 推入一个新的 模组 Tab，并切换到它
                  const id = "当前模组"; // 写死 id
                  const normalized = {
                    ruleId: currentModule?.ruleId ?? 1,
                    moduleName: currentModule?.moduleName ?? "当前模组",
                    description: currentModule?.description ?? "",
                    instruction: (currentModule as any)?.instruction ?? "",
                    authorName: currentModule?.authorName ?? "",
                    minTime: (currentModule as any)?.minTime ?? 0,
                    minPeople: (currentModule as any)?.minPeople ?? 0,
                    maxTime: (currentModule as any)?.maxTime ?? 0,
                    maxPeople: (currentModule as any)?.maxPeople ?? 0,
                    image: currentModule?.image ?? "",
                  };
                  pushModuleTabItem({
                    id,
                    label: "当前模组",
                    type: ModuleItemEnum.MODULE,
                    // 以简单对象作为内容，供 ModuleEdit 使用
                    content: normalized as any,
                  });
                  setCurrentSelectedTabId(id);
                }
                setActiveList(item.id);
              }}
              className={className}
            >
              <IconComponent className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          </div>
        );
      })}
      <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="space-y-4">
          <div className="text-xl font-bold">是否确认提交？</div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">提交说明：</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="请输入提交说明"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
            >
              确认提交
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsOpen(false)}
            >
              取消
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
