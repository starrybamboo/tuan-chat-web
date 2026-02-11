import { BookmarksIcon, ChatsCircleIcon, CompassIcon, PackageIcon } from "@phosphor-icons/react";
import { useState } from "react";
import CollectionPage from "@/components/common/collection/collectionPage";
import ResourcePage from "@/components/resource/pages/resourcePage";
import RepositoryHome from "./home/RepositoryHome";

type TabType = "repository" | "resource" | "collection";

export default function RepositoryWithTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("repository");

  const tabs = [
    { key: "repository" as const, label: "仓库", icon: ChatsCircleIcon },
    { key: "resource" as const, label: "素材", icon: PackageIcon },
    { key: "collection" as const, label: "收藏", icon: BookmarksIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "repository":
        return <RepositoryHome />;
      case "resource":
        return (
          <div className="[&>div]:bg-transparent! [&>div]:min-h-0! [&>div>div:first-child]:hidden! [&>div>div:nth-child(2)]:p-0!">
            <ResourcePage />
          </div>
        );
      case "collection":
        return (
          <div className="[&>div]:bg-transparent! [&>div]:min-h-0! [&>div]:p-0! [&>div>div:first-child]:hidden! [&>div>div:nth-child(2)]:mt-0!">
            <CollectionPage />
          </div>
        );
      default:
        return <RepositoryHome />;
    }
  };

  return (
    <div className="flex flex-row flex-1 min-h-0 min-w-0 h-full bg-base-200 overflow-x-hidden">
      <div className="flex flex-row flex-1 min-h-0 min-w-0 bg-base-200 rounded-tl-xl h-full">
        {/* 左侧竖向标签栏 */}
        <aside className="w-56 md:w-64 shrink-0 bg-base-200 border-l border-t border-gray-300 dark:border-gray-700 rounded-tl-xl">
          <div className="sticky top-0">
            <div className="flex items-center h-10 px-2 border-b border-gray-300 dark:border-gray-700 text-base font-bold">
              <CompassIcon className="size-4 mr-2" weight="fill" />
              发现
            </div>
            <div className="flex flex-col gap-1 py-2 px-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-base-300/60 text-base-content"
                      : "text-base-content/60 hover:text-base-content hover:bg-base-300/40"
                  }`}
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
          <div className="px-4 md:px-8 py-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
