/* eslint-disable react-dom/no-missing-button-type */
import { PopWindow } from "@/components/common/popWindow";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum, ModuleListEnum } from "@/components/module/workPlace/context/types";
import { ArrowBackThickFill, ChevronSmallTripleUp, StageIcon } from "@/icons";
import { useCommitMutation, useModuleIdQuery } from "api/hooks/moduleAndStageQueryHooks";
import { useEffect, useMemo, useState } from "react";
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
      catch {}
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
  const { mutate: commit } = useCommitMutation();
  const { stageId } = useModuleContext();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

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

  // const currentModule: Module | null = useMemo(() => {
  //   // 优先使用详情接口（包含更全字段，如 ruleId），无则回退列表项
  //   const detail = moduleInfo as any | undefined;
  //   const listItem = moduleItem as any | undefined;
  //   if (detail) {
  //     return { ...detail, readMe: detail.readMe ?? "" } as Module;
  //   }
  //   if (listItem) {
  //     return { ...listItem, readMe: listItem.readMe ?? "" } as Module;
  //   }
  //   return null;
  // }, [moduleInfo, moduleItem]);
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
      { id: ModuleListEnum.COMMIT, icon: ChevronSmallTripleUp, label: "保存当前版本", tooltip: "保存所有您做的改动到当前模组" },
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
                  pushModuleTabItem({
                    id,
                    label: "当前模组",
                    type: ModuleItemEnum.MODULE,
                    // 以简单对象作为内容，供 ModuleEdit 使用
                    content: moduleItem!,
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
