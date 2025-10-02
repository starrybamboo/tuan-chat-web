import { useState } from "react";
import { CreateCollectionModal } from "./CreateCollectionModal";
import { ResourceCollectionList } from "./resourceCollectionList";
import { ResourceList } from "./resourceList";
import { UploadModal } from "./UploadModal";

type TabType = "myResources" | "myCollections" | "publicResources" | "publicCollections";

export default function ResourcePage() {
  const [activeTab, setActiveTab] = useState<TabType>("publicResources");
  const [resourceType, setResourceType] = useState<"5" | "6">("5"); // 5: 图片, 6: 音频
  const [searchText, setSearchText] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [_previousTab, setPreviousTab] = useState<TabType>("publicResources");

  const tabs: { key: TabType; label: string }[] = [
    { key: "myResources", label: "我的素材" },
    { key: "myCollections", label: "我的素材集" },
    { key: "publicResources", label: "公开素材" },
    { key: "publicCollections", label: "公开素材集" },
  ];

  const resourceTypes = [
    { key: "5" as const, label: "图片", icon: "🖼️" },
    { key: "6" as const, label: "音频", icon: "🎵" },
  ];

  const handleTabChange = (newTab: TabType) => {
    if (newTab !== activeTab) {
      setPreviousTab(activeTab);
      setActiveTab(newTab);
    }
  };

  const getTabIndex = (tabKey: TabType) => {
    return tabs.findIndex(tab => tab.key === tabKey);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "myResources":
        return <ResourceList type={resourceType} isPublic={false} searchText={searchText} />;
      case "myCollections":
        return <ResourceCollectionList type={resourceType} isPublic={false} searchText={searchText} />;
      case "publicResources":
        return <ResourceList type={resourceType} isPublic={true} searchText={searchText} />;
      case "publicCollections":
        return <ResourceCollectionList type={resourceType} isPublic={true} searchText={searchText} />;
      default:
        return null;
    }
  };

  const handleUploadSuccess = () => {
    // 刷新当前页面数据，这里可以通过context或者其他方式通知子组件刷新
    window.location.reload();
  };

  return (
    <div className="bg-base-100 relative">
      {/* Header区域 */}
      <div className="bg-gradient-to-b from-cyan-500/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-500 text-sm font-medium mb-4">
              资源中心
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">资源管理</h1>
            <p className="text-lg text-muted-foreground mb-4">
              为你的跑团模组寻找完美的图片和音频素材
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* 标签栏 */}
          <div className="flex justify-center mb-6">
            <div className="relative flex bg-base-200 rounded-full p-1 gap-1">
              {/* 滑动背景指示器 */}
              <div
                className="absolute bg-primary rounded-full transition-transform duration-300 ease-out shadow-sm"
                style={{
                  width: `calc(25% - 4px)`,
                  height: "calc(100% - 8px)",
                  top: "4px",
                  left: "4px",
                  transform: `translateX(${getTabIndex(activeTab) * 100}%)`,
                }}
              />

              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.key
                      ? "text-primary-content"
                      : "text-base-content/70 hover:text-base-content"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 过滤和操作栏 */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* 左侧：资源类型选择 */}
            <div className="flex gap-2">
              {resourceTypes.map(type => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => setResourceType(type.key)}
                  className={`btn btn-sm md:btn-md ${
                    resourceType === type.key
                      ? "btn-secondary"
                      : "btn-outline"
                  }`}
                >
                  <span>{type.icon}</span>
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              ))}
            </div>

            {/* 右侧：操作按钮和搜索 */}
            <div className="flex flex-1 gap-2 lg:justify-end">
              {/* 搜索框 */}
              <div className="flex-1 lg:flex-initial lg:w-64">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>

              {/* 操作按钮 - 仅在我的资源页面显示 */}
              {(activeTab === "myResources" || activeTab === "myCollections") && (
                <>
                  {/* 桌面端上传按钮 */}
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="hidden md:flex btn btn-primary gap-2 shadow-lg hover:shadow/30"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    上传资源
                  </button>

                  {activeTab === "myCollections" && (
                    <button
                      type="button"
                      onClick={() => setShowCreateCollectionModal(true)}
                      className="btn btn-secondary btn-sm md:btn-md"
                    >
                      <span>📁</span>
                      <span className="hidden sm:inline">新建素材集</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="divider mt-0 mb-8"></div>

          {/* 内容区域 */}
          <div className="min-h-96">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* 上传模态框 */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* 新建素材集模态框 */}
      <CreateCollectionModal
        isOpen={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
        onSuccess={handleUploadSuccess}
        resourceType={resourceType}
      />

      {/* 移动端悬浮上传按钮 - 仅在我的资源页面显示 */}
      {(activeTab === "myResources" || activeTab === "myCollections") && (
        <button
          type="button"
          className="md:hidden fixed bottom-8 right-8 z-50 btn btn-square btn-primary btn-lg shadow-2xl transition-all duration-300"
          onClick={() => setShowUploadModal(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>
      )}
    </div>
  );
}
