import type { CollectionList } from "../../../../api/models/CollectionList";
import type { ResourceResponse } from "../../../../api/models/ResourceResponse";

import { useState } from "react";
import { toast } from "react-hot-toast";

import {
  useGetPublicResourceCollectionsByTypeQuery,
  useGetPublicResourcesByTypeQuery,
  useGetResourcesInCollectionQuery,
  useGetUserResourceCollectionsByTypeQuery,
  useGetUserResourcesByTypeQuery,
} from "../../../../api/hooks/resourceQueryHooks";
import UserAvatarComponent from "../../common/userAvatar";
import { EmptyState } from "../../resource/ui/EmptyState";
import { LoadingState } from "../../resource/ui/LoadingState";
import { Pagination } from "../../resource/ui/Pagination";
import MoreBetterImg from "../../resource/utils/MoreBetterImg";

type TabType = "myResources" | "publicResources" | "myCollections" | "publicCollections";

type ViewMode = "grid" | "collection";

interface CollectionCardProps {
  collection: CollectionList;
  onSelect: () => void;
}

/**
 * 素材集卡片组件
 */
function CollectionCard({ collection, onSelect }: CollectionCardProps) {
  return (
    <div
      className="card bg-base-100 shadow-sm hover:shadow-lg transition-all duration-200 border border-base-300 hover:border-primary/50 cursor-pointer group overflow-hidden"
      onClick={onSelect}
    >
      {/* 素材集封面 */}
      <div className="relative bg-base-200 overflow-hidden aspect-[4/3]">
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-16 h-16 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        {/* 标签 */}
        <div className="absolute top-2 left-2 flex gap-1">
          {collection.isPublic && (
            <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
          )}
        </div>
      </div>

      {/* 素材集信息 */}
      <div className="card-body p-3">
        <h3 className="text-sm font-medium truncate">
          {collection.collectionListName || "未命名素材集"}
        </h3>
        <p className="text-xs text-base-content/60 line-clamp-2">
          {collection.description || "暂无描述"}
        </p>
        <div className="flex items-center gap-2 text-xs text-base-content/60 mt-2">
          <UserAvatarComponent
            userId={collection.userId ?? -1}
            width={6}
            isRounded={true}
            withName={false}
          />
        </div>
      </div>
    </div>
  );
}

interface ResourceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (resourceUrl: string) => void;
  title?: string;
  resourceType?: "5" | "6"; // 5: 图片, 6: 音频，默认图片
}

/**
 * 资源选择器组件
 * 用于在上传头像、地点图片等场景中选择已有的资源
 */
export function ResourceSelectorModal({
  isOpen,
  onClose,
  onSelect,
  title = "选择素材",
  resourceType = "5", // 默认为图片
}: ResourceSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("publicResources");
  const [searchText, setSearchText] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [selectedResource, setSelectedResource] = useState<ResourceResponse | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const pageSize = 20;

  // 获取资源列表
  const publicQuery = useGetPublicResourcesByTypeQuery(
    { type: resourceType, pageNo, pageSize },
    { enabled: isOpen && activeTab === "publicResources" },
  );
  const userQuery = useGetUserResourcesByTypeQuery(
    { type: resourceType, pageNo, pageSize },
    { enabled: isOpen && activeTab === "myResources" },
  );

  // 获取素材集列表
  const publicCollectionsQuery = useGetPublicResourceCollectionsByTypeQuery(
    { type: resourceType, pageNo, pageSize },
    { enabled: isOpen && activeTab === "publicCollections" },
  );
  const userCollectionsQuery = useGetUserResourceCollectionsByTypeQuery(
    { type: resourceType, pageNo, pageSize },
    { enabled: isOpen && activeTab === "myCollections" },
  );

  // 获取素材集内的资源 - 只有当选中了素材集时才使用结果
  const collectionResourcesQuery = useGetResourcesInCollectionQuery({
    collectionListId: selectedCollectionId || 0, // 提供默认值避免undefined
    pageNo,
    pageSize,
  });

  const { data: resourcesData, isLoading }
    = selectedCollectionId && viewMode === "collection"
      ? (selectedCollectionId ? collectionResourcesQuery : { data: null, isLoading: false })
      : activeTab === "publicResources"
        ? publicQuery
        : activeTab === "myResources"
          ? userQuery
          : activeTab === "publicCollections"
            ? publicCollectionsQuery
            : userCollectionsQuery;

  const resources = resourcesData?.data?.list || [];
  const _collections = (activeTab === "publicCollections" || activeTab === "myCollections")
    ? (resourcesData?.data?.list || [])
    : [];

  const tabs: { key: TabType; label: string }[] = [
    { key: "publicResources", label: "公开素材" },
    { key: "publicCollections", label: "公开素材集" },
    { key: "myResources", label: "我的素材" },
    { key: "myCollections", label: "我的素材集" },
  ];

  const handleResourceSelect = (resource: ResourceResponse) => {
    setSelectedResource(resource);
  };

  const handleCollectionSelect = (collection: CollectionList) => {
    setSelectedCollectionId(collection.collectionListId!);
    setViewMode("collection");
    setSelectedResource(null); // 清除之前选中的资源
  };

  const handleBackToCollections = () => {
    setSelectedCollectionId(null);
    setViewMode("grid");
    setSelectedResource(null);
  };

  const handleConfirmSelect = () => {
    if (selectedResource?.url) {
      onSelect(selectedResource.url);
      // 重置状态
      setSelectedResource(null);
      setSelectedCollectionId(null);
      setViewMode("grid");
      setSearchText("");
      onClose();
      toast.success("素材选择成功");
    }
    else {
      toast.error("请先选择一个素材");
    }
  };

  const handleClose = () => {
    // 重置所有状态
    setSelectedResource(null);
    setSelectedCollectionId(null);
    setViewMode("grid");
    setSearchText("");
    setPageNo(1);
    onClose();
  };

  const handleTabChange = (newTab: TabType) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      setPageNo(1); // 切换标签页时重置页码
      setSelectedResource(null); // 清除选中状态
      setSelectedCollectionId(null); // 清除选中的素材集
      setViewMode("grid"); // 重置为网格视图
      setSearchText(""); // 清除搜索文本
    }
  };

  const getTabIndex = (tabKey: TabType) => {
    return tabs.findIndex(tab => tab.key === tabKey);
  };

  // 过滤搜索结果
  const filteredItems = resources.filter((item) => {
    // 如果正在查看素材集内容，则显示资源
    if (selectedCollectionId && viewMode === "collection") {
      const resource = item as ResourceResponse;
      return resource.name?.toLowerCase().includes(searchText.toLowerCase()) || "";
    }

    // 否则根据当前标签页类型过滤
    const isCollection = activeTab === "publicCollections" || activeTab === "myCollections";
    if (isCollection) {
      const collection = item as CollectionList;
      return collection.collectionListName?.toLowerCase().includes(searchText.toLowerCase()) || "";
    }
    else {
      const resource = item as ResourceResponse;
      return resource.name?.toLowerCase().includes(searchText.toLowerCase()) || "";
    }
  });

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      {" "}
      {/* 模态框内容 */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl max-w-4xl w-full h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签栏 */}
        <div className="flex justify-center p-4 border-b border-base-300">
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
                className={`relative z-10 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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

        {/* 搜索栏 */}
        <div className="p-4 border-b border-base-300">
          <div className="flex gap-4">
            {/* 返回按钮 - 仅在查看素材集内容时显示 */}
            {selectedCollectionId && viewMode === "collection" && (
              <button
                type="button"
                onClick={handleBackToCollections}
                className="btn btn-sm btn-ghost"
                title="返回素材集列表"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}

            <div className="flex-1">
              <input
                type="text"
                placeholder={selectedCollectionId && viewMode === "collection" ? "搜索素材集内的资源..." : "搜索素材..."}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading
            ? (
                <LoadingState />
              )

            : filteredItems.length === 0
              ? (
                  <EmptyState type="resources" isPublic={activeTab === "publicResources" || activeTab === "publicCollections"} />
                )

              : (
                  <div className="space-y-4">
                    {/* 根据当前状态显示不同内容 */}
                    { selectedCollectionId && viewMode === "collection"
                      ? (
                    // 显示素材集内的资源
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {filteredItems.map((item) => {
                              const resource = item as ResourceResponse;
                              return (
                                <div
                                  key={resource.resourceId}
                                  className={`card bg-base-100 shadow-sm hover:shadow-lg transition-all duration-200 border cursor-pointer group overflow-hidden ${
                                    selectedResource?.resourceId === resource.resourceId
                                      ? "border-primary ring-2 ring-primary/20"
                                      : "border-base-300 hover:border-primary/50"
                                  }`}
                                  onClick={() => handleResourceSelect(resource)}
                                >
                                  {/* 资源预览 */}
                                  <div className="relative bg-base-200 overflow-hidden">
                                    {resourceType === "5"
                                      ? (
                                          <div className="aspect-[4/3]">
                                            <MoreBetterImg
                                              src={resource.url}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            />
                                          </div>
                                        )
                                      : (
                                          <div className="aspect-[4/3] flex items-center justify-center">
                                            <svg className="w-12 h-12 text-base-content/40" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                            </svg>
                                          </div>
                                        )}

                                    {/* 选中状态指示器 */}
                                    {selectedResource?.resourceId === resource.resourceId && (
                                      <div className="absolute top-2 right-2">
                                        <div className="btn btn-sm btn-circle btn-primary">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                      </div>
                                    )}

                                    {/* 标签 */}
                                    <div className="absolute top-2 left-2 flex gap-1">
                                      {resource.isPublic && (
                                        <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
                                      )}
                                      {resource.isAi && (
                                        <div className="badge badge-sm text-white bg-purple-500 border-purple-500">AI</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* 资源信息 */}
                                  <div className="card-body p-2">
                                    <h3 className="text-sm font-medium truncate">
                                      {resource.name || "未命名素材"}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-base-content/60">
                                      <UserAvatarComponent
                                        userId={resource.userId ?? -1}
                                        width={6}
                                        isRounded={true}
                                        withName={false}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      : (
                          activeTab === "publicCollections" || activeTab === "myCollections")
                          ? (
                        // 显示素材集
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredItems.map((item) => {
                                  const collection = item as CollectionList;
                                  return (
                                    <CollectionCard
                                      key={collection.collectionListId}
                                      collection={collection}
                                      onSelect={() => handleCollectionSelect(collection)}
                                    />
                                  );
                                })}
                              </div>
                            )
                          : (
                        // 显示单个资源
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredItems.map((item) => {
                                  const resource = item as ResourceResponse;
                                  return (
                                    <div
                                      key={resource.resourceId}
                                      className={`card bg-base-100 shadow-sm hover:shadow-lg transition-all duration-200 border cursor-pointer group overflow-hidden ${
                                        selectedResource?.resourceId === resource.resourceId
                                          ? "border-primary ring-2 ring-primary/20"
                                          : "border-base-300 hover:border-primary/50"
                                      }`}
                                      onClick={() => handleResourceSelect(resource)}
                                    >
                                      {/* 资源预览 */}
                                      <div className="relative bg-base-200 overflow-hidden">
                                        {resourceType === "5"
                                          ? (
                                              <div className="aspect-[4/3]">
                                                <MoreBetterImg
                                                  src={resource.url}
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                />
                                              </div>
                                            )
                                          : (
                                              <div className="aspect-[4/3] flex items-center justify-center">
                                                <svg className="w-12 h-12 text-base-content/40" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                                </svg>
                                              </div>
                                            )}

                                        {/* 选中状态指示器 */}
                                        {selectedResource?.resourceId === resource.resourceId && (
                                          <div className="absolute top-2 right-2">
                                            <div className="btn btn-sm btn-circle btn-primary">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </div>
                                          </div>
                                        )}

                                        {/* 标签 */}
                                        <div className="absolute top-2 left-2 flex gap-1">
                                          {resource.isPublic && (
                                            <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
                                          )}
                                          {resource.isAi && (
                                            <div className="badge badge-sm text-white bg-purple-500 border-purple-500">AI</div>
                                          )}
                                        </div>
                                      </div>

                                      {/* 资源信息 */}
                                      <div className="card-body p-2">
                                        <h3 className="text-sm font-medium truncate">
                                          {resource.name || "未命名素材"}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-base-content/60">
                                          <UserAvatarComponent
                                            userId={resource.userId ?? -1}
                                            width={6}
                                            isRounded={true}
                                            withName={false}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                    {/* 分页 */}
                    <Pagination
                      currentPage={pageNo}
                      totalItems={filteredItems.length}
                      pageSize={pageSize}
                      onPageChange={setPageNo}
                      showBottomMessage={false}
                    />
                  </div>
                )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-6 border-t border-base-300">
          <div className="text-sm text-base-content/60">
            {selectedCollectionId && viewMode === "collection"
              ? (
                  selectedResource ? `已选择: ${selectedResource.name || "未命名素材"}` : "请从素材集中选择一个素材"
                )
              : (
                  selectedResource ? `已选择: ${selectedResource.name || "未命名素材"}` : "请选择一个素材"
                )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmSelect}
              disabled={!selectedResource}
              className="btn btn-primary"
            >
              确定选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
