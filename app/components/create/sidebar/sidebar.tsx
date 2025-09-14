/* eslint-disable react-dom/no-missing-button-type */
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleListEnum } from "@/components/module/workPlace/context/types";
import { ArrowBackThickFill, BranchIcon, HistoryIcon, StageIcon } from "@/icons";
import { useNavigate } from "react-router";

export default function Sidebar() {
  const { activeList, setActiveList } = useModuleContext();
  const navigate = useNavigate();

  const sidebarItems = [
    { id: ModuleListEnum.BACK, icon: ArrowBackThickFill, label: "返回", tooltip: "返回上一级" },
    { id: ModuleListEnum.STAGE, icon: StageIcon, label: "暂存区", tooltip: "暂存区管理" },
    { id: ModuleListEnum.HISTORY, icon: HistoryIcon, label: "历史", tooltip: "历史记录" },
    { id: ModuleListEnum.BRANCH, icon: BranchIcon, label: "分支", tooltip: "分支管理" },
  ];

  return (
    <div className="w-16 bg-base-100 border-r border-t border-base-300 flex flex-col items-center py-4 space-y-2">
      {sidebarItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeList === item.id;

        return (
          <div key={item.id} className="tooltip tooltip-right" data-tip={item.tooltip}>
            <button
              onClick={() => {
                if (item.id === ModuleListEnum.BACK) {
                  navigate("/create", { replace: true });
                  return;
                }
                setActiveList(item.id);
              }}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group ${
                isActive
                  ? "bg-primary text-primary-content shadow-md"
                  : "bg-base-200 text-base-content hover:bg-base-300 hover:shadow-sm"
              }`}
            >
              <IconComponent
                className={`w-6 h-6 transition-transform duration-200 ${
                  isActive ? "scale-110" : "group-hover:scale-105"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};
