import { ChatsCircleIcon, CompassIcon } from "@phosphor-icons/react";

import RepositoryHome from "./home/RepositoryHome";

export default function RepositoryWithTabs() {
  const tabs = [
    { key: "repository" as const, label: "仓库", icon: ChatsCircleIcon },
  ];

  return (
    <div className="
      flex flex-row flex-1 min-h-0 min-w-0 h-full bg-base-200 overflow-x-hidden
    ">
      <div className="
        flex flex-row flex-1 min-h-0 min-w-0 bg-base-200 rounded-tl-xl h-full
      ">
        {/* 左侧竖向标签栏 */}
        <aside className="
          w-56
          md:w-64
          shrink-0 bg-base-200 border-l border-t border-base-300
          dark:border-base-300
          rounded-tl-xl
        ">
          <div className="sticky top-0">
            <div className="
              flex items-center h-10 px-2 border-b border-base-300
              dark:border-base-300
              text-base font-bold
            ">
              <CompassIcon className="size-4 mr-2" weight="regular" />
              发现
            </div>
            <div className="flex flex-col gap-1 py-2 px-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  className="
                    w-full text-left px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors bg-base-300/60 text-base-content
                  "
                >
                  <span className="flex items-center gap-2">
                    <tab.icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
        {/* 右侧内容区域 - 统一样式包装 */}
        <div className="flex-1 min-w-0 bg-base-100">
          <div className="
            px-4
            md:px-8
            py-6
          ">
            <RepositoryHome />
          </div>
        </div>
      </div>
    </div>
  );
}
