import type { CollectionCheckRequest } from "../../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import { toast } from "react-hot-toast";
import {
  useAddCollectionMutation,
  useCheckUserCollectionQuery,
  useDeleteCollectionMutation,
} from "../../../../api/hooks/collectionQueryHooks";

export default function CollectionIconButton({ targetInfo }: { targetInfo: CollectionCheckRequest }) {
  const isCollectedQuery = useCheckUserCollectionQuery(targetInfo);

  const isCollected = isCollectedQuery.data?.data;
  const collectionCount = targetInfo.resourceId; // 假设targetId包含收藏数

  const addCollectionMutation = useAddCollectionMutation();
  const deleteCollectionMutation = useDeleteCollectionMutation();

  const userId: number | null = useGlobalContext().userId;

  const toggleCollection = () => {
    if (userId == null) {
      toast.error("请先登录！");
    }
    if (isCollected) {
      deleteCollectionMutation.mutate(targetInfo.resourceId);
    }
    else {
      addCollectionMutation.mutate({ ...targetInfo, comment: "default" });
    }
  };

  return (
    <button
      onClick={toggleCollection}
      className="flex flex-col items-center"
      type="button"
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
      <span className="text-xs mt-1">{isCollected ? collectionCount + 1 : collectionCount}</span>
    </button>
  );
}
