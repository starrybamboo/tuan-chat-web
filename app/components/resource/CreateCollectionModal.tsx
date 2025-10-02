import { useState } from "react";
import { useCreateResourceCollectionMutation } from "../../../api/hooks/resourceQueryHooks";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  resourceType: "5" | "6";
}

export function CreateCollectionModal({ isOpen, onClose, onSuccess, resourceType }: CreateCollectionModalProps) {
  const [collectionName, setCollectionName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createCollectionMutation = useCreateResourceCollectionMutation();

  const handleCreate = async () => {
    if (!collectionName.trim()) {
      // TODO: 使用toast替代alert
      return;
    }

    try {
      setIsCreating(true);

      await createCollectionMutation.mutateAsync({
        collectionListName: collectionName,
        description,
        isPublic,
        resourceListType: resourceType,
      });

      // 重置表单
      setCollectionName("");
      setDescription("");
      setIsPublic(false);

      onSuccess();
      onClose();
    }
    catch (error) {
      console.error("创建失败:", error);
      // TODO: 使用toast替代alert
    }
    finally {
      setIsCreating(false);
    }
  };

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">新建素材集</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 素材集名称 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            素材集名称 *
          </label>
          <input
            type="text"
            value={collectionName}
            onChange={e => setCollectionName(e.target.value)}
            placeholder="请输入素材集名称"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
          />
        </div>

        {/* 描述 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            描述
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="请输入素材集描述（可选）"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 resize-none"
            rows={3}
          />
        </div>

        {/* 公开设置 */}
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">设为公开素材集</span>
          </label>
        </div>

        {/* 资源类型提示 */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{resourceType === "5" ? "🖼️" : "🎵"}</span>
            <span>
              此素材集将用于存储
              {resourceType === "5" ? "图片" : "音频"}
              资源
            </span>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !collectionName.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "创建中..." : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
