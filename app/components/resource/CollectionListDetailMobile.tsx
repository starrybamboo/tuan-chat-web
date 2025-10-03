import type { CollectionList } from "../../../api/models/CollectionList";
import type { ResourceResponse } from "../../../api/models/ResourceResponse";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useGetResourcesInCollectionQuery } from "../../../api/hooks/resourceQueryHooks";
import { CollectionResourceCard } from "./CollectionResourceCard";

interface CollectionListDetailMobileProps {
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
  /**
   * 收藏id - 用于删除操作
   */
  collectionId?: number;
}

/**
 * 收藏列表详情弹窗组件 - 移动端版本
 * 从底部滑动出现，占据下5/6屏幕
 */
export function CollectionListDetailMobile({
  collectionList,
  isLoading = false,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onRemoveResource,
}: CollectionListDetailMobileProps) {
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editFormState, setEditFormState] = useState<{
    collectionListName: string;
    description: string;
    isPublic: boolean;
  } | null>(null);

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

  const formatDate = (dateString?: string) => {
    if (!dateString)
      return "";
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  if (!isOpen) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 rounded-t-2xl animate-slide-up h-5/6 overflow-hidden">
          <div className="flex justify-center items-center h-full">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!collectionList) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 rounded-t-2xl animate-slide-up h-5/6 overflow-hidden">
          <div className="p-6 text-center h-full flex flex-col justify-center">
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
        </div>
      </div>
    );
  }

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
              {/* 封面图片 */}
              <div className="aspect-video bg-base-200 rounded-lg overflow-hidden">
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
                        <div className="text-6xl">📁</div>
                      </div>
                    )}
              </div>

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
                    <InfoDisplay collectionList={collectionList} formatDate={formatDate} resources={resources} />
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

              {resources.length === 0
                ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📭</div>
                      <h4 className="text-md font-semibold mb-2">暂无收藏资源</h4>
                    </div>
                  )
                : (
                    <div className="grid gap-3 grid-cols-2">
                      {resources.map((resource: ResourceItem) => (
                        <CollectionResourceCard
                          key={resource.resourceId}
                          resource={resource}
                          formatDate={formatDate}
                          onRemoveResource={handleRemoveResource}
                          isMobile={true}
                        />
                      ))}
                    </div>
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 编辑表单组件
function EditForm({ editForm, setEditForm }: any) {
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
function InfoDisplay({ collectionList, formatDate, resources }: any) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">
        {collectionList.collectionListName || "未命名收藏列表"}
      </h1>

      {collectionList.description && (
        <p className="text-base-content/70 leading-relaxed text-sm">
          {collectionList.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-base-content/60">创建者：</span>
          <span className="font-medium">
            用户_
            {collectionList.userId}
          </span>
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

export default CollectionListDetailMobile;
