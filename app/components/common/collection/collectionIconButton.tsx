import type { CollectionCheckRequest } from "../../../../api";
import { toast } from "react-hot-toast";
import {
  useAddCollectionMutation,
  useCheckUserCollectionQuery,
  useDeleteCollectionMutation,
} from "../../../../api/hooks/collectionQueryHooks";

interface CollectionIconButtonProps {
  targetInfo: CollectionCheckRequest;
  collectionCount?: number;
}

export default function CollectionIconButtonFixed({ targetInfo, collectionCount = 0 }: CollectionIconButtonProps) {
  // 查询是否已收藏，data 为 collectionId，未收藏为 0
  const checkQuery = useCheckUserCollectionQuery(targetInfo);
  const collectionId = checkQuery.data?.data ?? 0;
  const isCollected = collectionId > 0;

  const addCollectionMutation = useAddCollectionMutation();
  const deleteCollectionMutation = useDeleteCollectionMutation();

  const toggleCollection = () => {
    const isLogin = Boolean(localStorage.getItem("token"));
    if (!isLogin) {
      toast.error("请先登录！");
      return;
    }
    if (isCollected) {
      // 取消收藏
      deleteCollectionMutation.mutate(collectionId, {
        onSuccess: () => toast.success("已取消收藏"),
        onError: (error: any) => {
          toast.error(error?.response?.data?.errMsg || "取消收藏失败");
        },
      });
    } else {
      // 添加收藏
      if (
        typeof targetInfo.resourceId !== "number" ||
        !targetInfo.resourceType ||
        typeof targetInfo.resourceType !== "string" ||
        !targetInfo.resourceType.trim()
      ) {
        toast.error("缺少必要参数");
        return;
      }
      addCollectionMutation.mutate(
        {
          resourceId: targetInfo.resourceId,
          resourceType: targetInfo.resourceType,
          comment: "", // comment 字段必须为字符串，这里传入空字符串
        },
        {
          onSuccess: () => toast.success("收藏成功！"),
          onError: (error: any) => {
            toast.error(error?.response?.data?.errMsg || "收藏失败，请重试！");
          },
        }
      );
    }
  };

  return (
    <button
      onClick={toggleCollection}
      className="flex flex-col items-center"
      type="button"
      disabled={addCollectionMutation.isPending || deleteCollectionMutation.isPending}
    >
      <div className="relative w-10 h-10">
        <div className={`absolute inset-0 ${isCollected ? "text-yellow-500" : ""}`}>
          <svg
            viewBox="0 0 24 24"
            fill={isCollected ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            {/* 五角星图标 - 保持与心形图标相同的视觉权重 */}
            <path
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <span className="text-xs mt-1">{collectionCount + (isCollected ? 1 : 0)}</span>
    </button>
  );
}