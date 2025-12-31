import CollectionPage from "@/components/common/collection/collectionPage";
import ResourcePage from "@/components/resource/pages/resourcePage";
import { useState } from "react";
import ModuleHome from "./home/Modulehome";

type TabType = "module" | "resource" | "collection" | "create";

export default function ModuleWithTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("module");

  const tabs = [
    { key: "module" as const, label: "模组列表" },
    { key: "resource" as const, label: "跑团素材" },
    { key: "collection" as const, label: "收藏的素材" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "module":
        return <ModuleHome />;
      case "resource":
        return (
          <div className="[&>div]:!bg-transparent [&>div]:!min-h-0 [&>div>div:first-child]:!hidden [&>div>div:nth-child(2)]:!p-0">
            <ResourcePage />
          </div>
        );
      case "collection":
        return (
          <div className="[&>div]:!bg-transparent [&>div]:!min-h-0 [&>div]:!p-0 [&>div>div:first-child]:!hidden [&>div>div:nth-child(2)]:!mt-0">
            <CollectionPage />
          </div>
        );
      default:
        return <ModuleHome />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="flex gap-6 md:gap-8">
        {/* 左侧竖向标签栏 */}
        <div className="w-32 md:w-40 flex-shrink-0">
          <div className="sticky top-20 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm md:text-base font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-content shadow-sm"
                    : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="divider divider-horizontal divider-accent min-h-[calc(100vh-8rem)] my-0"></div>
        {/* 右侧内容区域 - 统一样式包装 */}
        <div className="flex-1 min-w-0">
          <div className="bg-base-100">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
