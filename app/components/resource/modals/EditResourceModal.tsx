import type { ResourceResponse } from "../../../../api/models/ResourceResponse";

import { ApiError } from "api/core/ApiError";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useUpdateResourceMutation } from "../../../../api/hooks/resourceQueryHooks";

interface EditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceResponse | null;
  onSuccess?: () => void;
  onDelete?: (resourceId: number) => void;
}

/**
 * 编辑资源弹窗组件
 * 支持修改资源名称和公开性设置
 */
export function EditResourceModal({
  isOpen,
  onClose,
  resource,
  onSuccess,
  onDelete,
}: EditResourceModalProps) {
  const [name, setName] = useState(() => resource?.name || "");
  const [isPublic, setIsPublic] = useState(() => resource?.isPublic || false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateResourceMutation = useUpdateResourceMutation();

  // 验证表单
  const validateForm = () => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = "资源名称不能为空";
    }
    else if (name.trim().length > 100) {
      newErrors.name = "资源名称不能超过100个字符";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理保存
  const handleSave = async () => {
    if (!resource?.resourceId || !validateForm()) {
      return;
    }

    try {
      await updateResourceMutation.mutateAsync({
        resourceId: resource.resourceId,
        name: name.trim(),
        isPublic,
      });

      // 成功后关闭弹窗并调用成功回调
      onClose();
      onSuccess?.();
    }
    catch (error) {
      console.error("更新资源失败:", error);
      if (error instanceof ApiError) {
        toast.error(error.body?.errMsg || "添加失败，请重试");
      }
      else {
        toast.error("添加失败，请重试");
      }
    }
  };

  // 处理取消
  const handleCancel = () => {
    onClose();
    // 重置表单状态
    setErrors({});
    setShowDeleteConfirm(false);
  };

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (resource?.resourceId && onDelete) {
      onDelete(resource.resourceId);
      onClose();
    }
  };

  // 处理删除取消
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  if (!isOpen || !resource) {
    return null;
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">编辑资源</h3>

        <div className="space-y-4">
          {/* 资源类型显示 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">资源类型</span>
            </label>
            <div className="flex gap-2">
              <div className="badge badge-outline">
                {resource.typeDescription || "未知类型"}
              </div>
              {resource.isAi && (
                <div className="badge badge-outline badge-secondary">AI生成</div>
              )}
            </div>
          </div>

          {/* 资源名称 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">资源名称 *</span>
            </label>
            <input
              type="text"
              className={`input input-bordered w-full ${
                errors.name ? "input-error" : ""
              }`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors({ ...errors, name: undefined });
                }
              }}
              placeholder="请输入资源名称"
              maxLength={100}
            />
            {errors.name && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.name}</span>
              </label>
            )}
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {name.length}
                /100
              </span>
            </label>
          </div>

          {/* 公开设置 */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <div>
                <span className="label-text font-medium">设为公开素材</span>
                <div className="text-xs text-base-content/60">其他用户可以使用此素材</div>
              </div>
            </label>
          </div>

          {/* 创建时间显示 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">创建时间</span>
            </label>
            <div className="text-sm text-base-content/60">
              {resource.createTime}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="modal-action">
          {!showDeleteConfirm
            ? (
                <>
                  {onDelete && (
                    <button
                      type="button"
                      className="btn btn-error mr-auto"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={updateResourceMutation.isPending}
                    >
                      删除
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleCancel}
                    disabled={updateResourceMutation.isPending}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={updateResourceMutation.isPending}
                  >
                    {updateResourceMutation.isPending
                      ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            保存中...
                          </>
                        )
                      : (
                          "保存"
                        )}
                  </button>
                </>
              )
            : (
                <>
                  <div className="flex-1 text-left">
                    <p className="text-error font-medium">确定要删除这个资源吗？</p>
                    <p className="text-sm text-base-content/60 mt-1">此操作无法撤销</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleDeleteCancel}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-error"
                    onClick={handleDeleteConfirm}
                  >
                    确定删除
                  </button>
                </>
              )}
        </div>
      </div>
    </div>
  );
}
