import type { CollectionCheckRequest } from "../../../../api";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { Arrowleft, Arrowright, RoundStarBorder, RoundStarFilled } from "@/icons";
import { useRef, useState } from "react";
import { toast } from "react-hot-toast";

import {
  useAddCollectionMutation,
  useCheckUserCollectionQuery,
  useDeleteCollectionMutation,
  useGetUserCollectionListsQuery,
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
  const [isCollected, setIsCollected] = useState(isCollectedQuery.data?.data ?? false); // 优先 false

  // 查询收藏数
  const countData = useGetCounterQuery({
    targetId: targetInfo.resourceId,
    targetType: Number(targetInfo.resourceType),
  });
  const [collectionCount, setCollectionCount] = useState(countData?.data?.data ?? initialCount ?? 0);

  const addCollectionMutation = useAddCollectionMutation();
  const deleteCollectionMutation = useDeleteCollectionMutation();

  const userId: number | null = useGlobalContext().userId;

  const pageSize = 4;
  const [pageIndex, setPageIndex] = useState(1);
  const { data, isLoading, isError } = useGetUserCollectionListsQuery({
    pageNo: pageIndex,
    pageSize,
  });
  const collectionLists = data?.data?.list;

  // 收藏夹弹窗
  const toastRef = useRef<{ update: (c: React.ReactNode) => void; close: () => void } | null>(null);
  const showCollectionList = () => {
    const instance = toastWindow(_close => (
      <div className="overflow-y-auto space-y-4 h-auto max-h-[80vh] w-[60vw] sm:h-auto sm:max-h-[80vh] sm:w-[60vw] md:h-[15vh] md:w-[40vw] lg:h-[40vh] lg:w-[30vw] max-w-full flex flex-col items-center justify-start">
        <h2 className="text-xl font-bold">添加至收藏夹</h2>
        <div className="w-full flex justify-center">
          {isLoading
            ? (
                <div className="flex">加载中...</div>)
            : isError
              ? (<div>加载失败！</div>)
              : (collectionLists && collectionLists.length === 0)
                  ? (
                      <div>
                        <h3>你还没有收藏夹</h3>
                        <button type="button" className="flex justify-between w-[90%] sm:w-[95%] lg:w-full sm:h-[3vh] lg:h-[5vh] bg-blue-500/10 hover:text-blue-500 cursor-pointer rounded-sm px-4 py-2">创建收藏夹</button>
                      </div>
                    )
                  : (
                      <div className="flex flex-col j w-full gap-2 mt-4 sm:mt-2">
                        {collectionLists?.map(collectionList => (
                          <div key={collectionList.collectionListId} className="flex justify-between w-full sm:h-[3vh] lg:h-[5vh] bg-blue-500/10 hover:text-blue-500 cursor-pointer rounded-sm px-4 py-2">
                            <span>{collectionList.collectionListName}</span>
                            <span>{collectionList.createTime}</span>
                          </div>
                        ))}
                        <div className="flex w-[20%] items-center justify-between mx-auto">
                          <Arrowleft className="w-6 h-6 cursor-pointer text-gray-300" onClick={() => setPageIndex(prev => prev - 1)} />
                          <div className="whitespace-nowrap">
                            第
                            {pageIndex}
                            页
                          </div>
                          <Arrowright className="w-6 h-6 cursor-pointer text-gray-300" onClick={() => setPageIndex(prev => prev + 1)} />
                        </div>
                      </div>
                    )}
        </div>
      </div>
    ),
    );
    toastRef.current = instance;
  };
  const toggleCollection = () => {
    if (userId == null) {
      toast.error("请先登录！");
      return;
    }
    if (isCollected) {
      setIsCollected(false);
      setCollectionCount(prev => prev - 1);
      deleteCollectionMutation.mutate(targetInfo.resourceId);
    }
    else {
      showCollectionList();
      setIsCollected(true);
      setCollectionCount(prev => prev + 1);
      addCollectionMutation.mutate({ ...targetInfo, comment: "default" });
    }
  };

  return (
    <button
      onClick={() => toggleCollection()}
      className={`flex items-center justify-center ${
        direction === "row" ? "flex-row gap-1" : "flex-col"
      } ${className}`}
      type="button"
    >
      {isCollected
        ? <RoundStarFilled className={` ${direction === "row" ? "w-5 h-5" : "w-6 h-6"}  text-yellow-400 `} />
        : <RoundStarBorder className={` ${direction === "row" ? "w-5 h-5" : "w-6 h-6"}`} />}
      <span className={`w-4 ${isCollected
        ? "text-yellow-400 dark:text-yellow-500"
        : ""} ${direction === "row" ? "text-sm" : "text-xs mt-1"}`}
      >
        {collectionCount}
      </span>
    </button>
  );
}
