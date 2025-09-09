import type { CollectionCheckRequest } from "../../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import { RoundStarBorder } from "@/icons";
import { toast } from "react-hot-toast";
import {
  useAddCollectionMutation,
  useCheckUserCollectionQuery,
  useDeleteCollectionMutation,
} from "../../../../api/hooks/collectionQueryHooks";
import { useGetCounterQuery } from "../../../../api/hooks/couterQueryHooks";

interface CollectionIconButtonProps {
  targetInfo: CollectionCheckRequest;
  className?: string;
  direction?: "row" | "column";
  collectionCount?: number; // 外部可传已有值
}

export default function CollectionIconButton({
  targetInfo,
  className,
  direction = "row",
  collectionCount: initialCount, // 优先使用已有值
}: CollectionIconButtonProps) {
  // 查询用户收藏状态
  const isCollectedQuery = useCheckUserCollectionQuery(targetInfo);
  const isCollected = isCollectedQuery.data?.data ?? false; // 优先 false

  // 查询收藏数
  const countData = useGetCounterQuery({
    targetId: targetInfo.resourceId,
    targetType: Number(targetInfo.resourceType),
  });
  const collectionCount = countData?.data?.data ?? initialCount ?? 0;

  const addCollectionMutation = useAddCollectionMutation();
  const deleteCollectionMutation = useDeleteCollectionMutation();

  const userId: number | null = useGlobalContext().userId;

  const toggleCollection = () => {
    if (userId == null) {
      toast.error("请先登录！");
      return;
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
      className={`flex items-center justify-center ${
        direction === "row" ? "flex-row gap-1" : "flex-col"
      } ${className}`}
      type="button"
    >
      <RoundStarBorder
        className={`${direction === "row" ? "w-5 h-5" : "w-6 h-6"}`}
      />
      <span className={`${direction === "row" ? "text-sm" : "text-xs mt-1"}`}>
        {collectionCount}
      </span>
    </button>
  );
}
