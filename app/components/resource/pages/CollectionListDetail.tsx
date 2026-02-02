import type { CollectionList } from "../../../../api/models/CollectionList";
import type { ResourceResponse } from "../../../../api/models/ResourceResponse";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGetResourcesInCollectionQuery } from "../../../../api/hooks/resourceQueryHooks";
import { CollectionResourceCard } from "../cards/CollectionResourceCard";

interface CollectionListDetailProps {
  collectionList?: CollectionList;
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (collectionList: CollectionList) => void;
  onDelete?: (collectionListId: number) => void;
  onRemoveResource?: (collectionId: number) => void;
}

// 资源项接口 - 扩展 ResourceResponse 以包含收藏ID
interface ResourceItem extends ResourceResponse {
}

// 编辑表单状态类型
interface EditFormState {
  collectionListName: string;
  description: string;
  isPublic: boolean;
}

// 共享逻辑hook
function useCollectionListDetail({
  collectionList,
  onEdit,
  onRemoveResource,
}: {
  collectionList?: CollectionList;
  onEdit?: (collectionList: CollectionList) => void;
  onRemoveResource?: (collectionId: number) => void;
}) {
  // 获取收藏列表中的资源
  const { data: resourcesData } = useGetResourcesInCollectionQuery({
    collectionListId: collectionList?.collectionListId || 0,
    pageNo: 1,
    pageSize: 10,
  });

  const resources: ResourceItem[] = useMemo(() => {
    return resourcesData?.data?.list || [];
  }, [resourcesData?.data?.list]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormState, setEditFormState] = useState<EditFormState | null>(null);

  // 计算当前表单值
  const editForm = useMemo(() => {
    if (isEditMode && editFormState) {
      return editFormState;
    }
    return {
      collectionListName: collectionList?.collectionListName || "",
      description: collectionList?.description || "",
      isPublic: collectionList?.isPublic || false,
    };
  }, [isEditMode, editFormState, collectionList]);

  const setEditForm = useCallback((updater: any) => {
    if (typeof updater === "function") {
      setEditFormState(prev => updater(prev || editForm));
    }
    else {
      setEditFormState(updater);
    }
  }, [editForm]);

  const handleEdit = useCallback(() => {
    if (isEditMode && onEdit && collectionList) {
      const updatedCollectionList: CollectionList = {
        ...collectionList,
        ...editForm,
      };
      onEdit(updatedCollectionList);
      setIsEditMode(false);
      setEditFormState(null); // 重置编辑状态
    }
    else {
      setIsEditMode(true);
      setEditFormState(editForm); // 初始化编辑状态
    }
  }, [isEditMode, onEdit, collectionList, editForm]);

  const handleRemoveResource = useCallback((resourceId: number) => {
    if (!collectionList?.collectionListId) {
      toast.error("收藏列表ID不存在");
      return;
    }

    // 根据 resourceId 找到对应的收藏项
    const resource = resources.find(r => r.resourceId === resourceId);
    if (!resource?.collectionId) {
      toast.error("找不到对应的收藏信息");
      return;
    }

    if (onRemoveResource && resource.collectionId) {
      onRemoveResource(resource.collectionId);
    }
  }, [collectionList?.collectionListId, resources, onRemoveResource]);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString)
      return "";
    return new Date(dateString).toLocaleDateString("zh-CN");
  }, []);

  return {
    resources,
    isEditMode,
    setIsEditMode,
    editForm,
    setEditForm,
    handleEdit,
    handleRemoveResource,
    formatDate,
  };
}

// 编辑表单组件
function EditForm({ editForm, setEditForm }: {
  editForm: EditFormState;
  setEditForm: (updater: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">
          <span className="label-text">收藏列表名称</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={editForm.collectionListName}
          onChange={e => setEditForm((prev: any) => ({ ...prev, collectionListName: e.target.value }))}
          placeholder="输入收藏列表名称"
        />
      </div>
      <div>
        <label className="label">
          <span className="label-text">描述</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={editForm.description}
          onChange={e => setEditForm((prev: any) => ({ ...prev, description: e.target.value }))}
          placeholder="输入收藏列表描述"
        />
      </div>
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={editForm.isPublic}
            onChange={e => setEditForm((prev: any) => ({ ...prev, isPublic: e.target.checked }))}
          />
          <span className="label-text">公开收藏列表</span>
        </label>
      </div>
    </div>
  );
}

// 信息展示组件
function InfoDisplay({
  collectionList,
  formatDate,
  resources,
  isMobile = false,
}: {
  collectionList: CollectionList;
  formatDate: (dateString?: string) => string;
  resources: ResourceItem[];
  isMobile?: boolean;
}) {
  return (
    <div className="space-y-4">
      <h1 className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>
        {collectionList.collectionListName || "未命名收藏列表"}
      </h1>

      {collectionList.description && (
        <p className={`text-base-content/70 leading-relaxed ${isMobile ? "text-sm" : ""}`}>
          {collectionList.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base-content/60 shrink-0">创建者：</span>
          <div className="flex items-center min-w-0">
            <UserAvatarComponent
              userId={collectionList.userId ?? -1}
              width={6}
              isRounded={true}
              withName={true}
            />
          </div>
        </div>
        <div>
          <span className="text-base-content/60">创建时间：</span>
          <span className="font-medium">{formatDate(collectionList.createTime)}</span>
        </div>
        <div>
          <span className="text-base-content/60">更新时间：</span>
          <span className="font-medium">{formatDate(collectionList.updateTime)}</span>
        </div>
        <div>
          <span className="text-base-content/60">资源数量：</span>
          <span className="font-medium">
            {resources.length}
            {" "}
            个
          </span>
        </div>
      </div>
    </div>
  );
}

// 封面图片组件
function CoverImage({
  collectionList,
  isMobile = false,
}: {
  collectionList: CollectionList;
  isMobile?: boolean;
}) {
  return (
    <div className={`bg-base-200 rounded-lg overflow-hidden ${
      isMobile ? "aspect-video" : "aspect-square"
    }`}
    >
      {collectionList.coverImageUrl
        ? (
            <img
              src={collectionList.coverImageUrl}
              alt={collectionList.collectionListName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/moduleDefaultImage.webp";
              }}
            />
          )
        : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-secondary/20">
              <div className={`${isMobile ? "text-6xl" : "text-8xl"}`}>📁</div>
            </div>
          )}
    </div>
  );
}

// 资源列表组件
function ResourceList({
  resources,
  formatDate,
  onRemoveResource,
  isMobile = false,
}: {
  resources: ResourceItem[];
  formatDate: (dateString?: string) => string;
  onRemoveResource: (resourceId: number) => void;
  isMobile?: boolean;
}) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📭</div>
        <h4 className="text-md font-semibold mb-2">暂无收藏资源</h4>
      </div>
    );
  }

  return (
    <div className={`grid gap-${isMobile ? "3" : "4"} ${
      isMobile
        ? "grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto"
    }`}
    >
      {resources.map((resource: ResourceItem) => (
        <CollectionResourceCard
          key={resource.resourceId}
          resource={resource}
          formatDate={formatDate}
          onRemoveResource={onRemoveResource}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

/**
 * 收藏列表详情弹窗组件 - 统一组件
 * 根据屏幕大小自动适配桌面端或移动端布局
 */
export function CollectionListDetail(props: CollectionListDetailProps) {
  const {
    collectionList,
    isLoading = false,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onRemoveResource,
  } = props;

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  // 删除确认状态 - 移动端和桌面端共用
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    resources,
    isEditMode,
    setIsEditMode,
    editForm,
    setEditForm,
    handleEdit,
    handleRemoveResource,
    formatDate,
  } = useCollectionListDetail({
    collectionList,
    onEdit,
    onRemoveResource,
  });

  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile((prev) => {
        if (prev !== isMobileView) {
          return isMobileView;
        }
        return prev;
      });
    };

    // 监听窗口大小变化
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // 删除处理 - 移动端和桌面端共用
  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (collectionList?.collectionListId && onDelete) {
      onDelete(collectionList.collectionListId);
      setShowDeleteConfirm(false);
    }
  }, [collectionList?.collectionListId, onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  if (!isOpen) {
    return null;
  }

  // 加载状态
  if (isLoading) {
    const LoadingContent = (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );

    if (isMobile) {
      return (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
          <div className="fixed bottom-0 left-0 right-0 bg-base-100 rounded-t-2xl animate-slide-up h-5/6 overflow-hidden">
            {LoadingContent}
          </div>
        </div>
      );
    }

    return (
      <div className="modal modal-open">
        <div className="modal-box w-11/12 max-w-2xl">
          {LoadingContent}
        </div>
        <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
      </div>
    );
  }

  // 无数据状态
  if (!collectionList) {
    const EmptyContent = (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-xl font-semibold mb-2">收藏列表不存在</h2>
        <p className="text-base-content/60 mb-4">抱歉，找不到您要查看的收藏列表</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onClose}
        >
          关闭
        </button>
      </div>
    );

    if (isMobile) {
      return (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
          <div className="fixed bottom-0 left-0 right-0 bg-base-100 rounded-t-2xl animate-slide-up h-5/6 overflow-hidden">
            <div className="p-6 h-full flex flex-col justify-center">
              {EmptyContent}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="modal modal-open">
        <div className="modal-box w-11/12 max-w-2xl">
          {EmptyContent}
        </div>
        <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
      </div>
    );
  }

  // 移动端布局
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 rounded-t-2xl animate-slide-up h-5/6 flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="flex-shrink-0 p-4 border-b border-base-300">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold truncate">
                {collectionList.collectionListName || "收藏列表详情"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleEdit}
                >
                  {isEditMode ? "保存" : "编辑"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={onClose}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* 封面和基本信息 */}
              <div className="space-y-4">
                <CoverImage collectionList={collectionList} isMobile={true} />

                {/* 标签 */}
                <div className="flex items-center gap-2">
                  {collectionList.isPublic && (
                    <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
                  )}
                  <div className="badge badge-sm text-white bg-purple-500 border-purple-500">收藏列表</div>
                </div>

                {isEditMode
                  ? (
                      <EditForm editForm={editForm} setEditForm={setEditForm} />
                    )
                  : (
                      <InfoDisplay
                        collectionList={collectionList}
                        formatDate={formatDate}
                        resources={resources}
                        isMobile={true}
                      />
                    )}
              </div>

              {/* 操作按钮 */}
              {!isEditMode && (
                <div className="flex gap-2">
                  {!showDeleteConfirm
                    ? (
                        <button
                          type="button"
                          className="btn btn-error btn-outline flex-1"
                          onClick={handleDelete}
                        >
                          删除收藏列表
                        </button>
                      )
                    : (
                        <div className="flex flex-col gap-3 w-full">
                          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                            <p className="text-error font-medium text-sm">确定要删除这个收藏列表吗？</p>
                            <p className="text-xs text-base-content/60 mt-1">此操作无法撤销，将同时删除所有收藏的资源</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn btn-ghost flex-1"
                              onClick={handleDeleteCancel}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              className="btn btn-error flex-1"
                              onClick={handleDeleteConfirm}
                            >
                              确定删除
                            </button>
                          </div>
                        </div>
                      )}
                </div>
              )}

              {/* 资源列表 */}
              <div className="border-t border-base-300 pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">收藏的资源</h3>
                </div>
                <ResourceList
                  resources={resources}
                  formatDate={formatDate}
                  onRemoveResource={handleRemoveResource}
                  isMobile={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 桌面端布局
  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">收藏列表详情</h2>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setIsEditMode(false)}
              >
                取消
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleEdit}
            >
              {isEditMode ? "保存" : "编辑"}
            </button>
            {!showDeleteConfirm
              ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-error btn-outline"
                    onClick={handleDelete}
                  >
                    删除
                  </button>
                )
              : (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={handleDeleteCancel}
                    >
                      取消删除
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-error"
                      onClick={handleDeleteConfirm}
                    >
                      确认删除
                    </button>
                  </>
                )}
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 收藏列表基本信息 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 封面图片 */}
          <div className="lg:col-span-1">
            <CoverImage collectionList={collectionList} isMobile={false} />
          </div>

          {/* 详细信息 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {collectionList.isPublic && (
                <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
              )}
              <div className="badge badge-sm text-white bg-purple-500 border-purple-500">收藏列表</div>
            </div>

            {isEditMode
              ? (
                  <EditForm editForm={editForm} setEditForm={setEditForm} />
                )
              : (
                  <InfoDisplay
                    collectionList={collectionList}
                    formatDate={formatDate}
                    resources={resources}
                    isMobile={false}
                  />
                )}
          </div>
        </div>

        {/* 删除确认提示 - 桌面端 */}
        {showDeleteConfirm && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
            <p className="text-error font-medium">确定要删除这个收藏列表吗？</p>
            <p className="text-sm text-base-content/60 mt-1">此操作无法撤销，将同时删除所有收藏的资源</p>
          </div>
        )}

        {/* 资源列表 */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">收藏的资源</h3>
          </div>
          <ResourceList
            resources={resources}
            formatDate={formatDate}
            onRemoveResource={handleRemoveResource}
            isMobile={false}
          />
        </div>
      </div>

      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}
