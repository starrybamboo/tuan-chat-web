/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { CollectionCheckRequest } from "../../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import { Arrowleft, Arrowright, RoundStarBorder, RoundStarFilled } from "@/icons";
import { useEffect, useState } from "react";

import toast from "react-hot-toast";
import {
  useAddCollectionMutation,
  useAddToListMutation,
  useCheckUserCollectionQuery,
  useDeleteCollectionMutation,
  useGetCollectionCountQuery,
  useGetUserCollectionListsQuery,
} from "../../../../api/hooks/collectionQueryHooks";
import toastWindow from "../toastWindow/toastWindow";

interface CollectionListPopProps {
  resourceId: number;
  resourceType: number;
}
// 收藏夹弹窗
function CollectionListPop({ resourceId, resourceType }: CollectionListPopProps) {
  const pageSize = 4;
  const [pageIndex, setPageIndex] = useState(1);
  const { data, isLoading, isError } = useGetUserCollectionListsQuery({
    pageNo: pageIndex,
    pageSize,
  });
  const collectionLists = data?.data?.list;
  const totalCount = data?.data?.totalRecords;
  const isLast = data?.data?.isLast;

  // 日期转化
  const formatToMonthDay = (isoString: string | undefined) => {
    if (!isoString) {
      return null;
    }
    const date = new Date(isoString);
    return `${date.getMonth() + 1}-${date.getDate()}`;
  };

  // 收藏描述
  const [description, setDescription] = useState<string>("");

  // 添加收藏
  const addCollection = useAddCollectionMutation();
  const addListCollection = useAddToListMutation();
  const handleAddCollection = async (resourceId: number, resourceType: number, comment: string, listId?: number) => {
    try {
      const newCollection = await addCollection.mutateAsync({ resourceId, resourceType, comment });
      const collectionId = newCollection.data?.collectionId;
      if (!collectionId || !listId) {
        toast.error("收藏失败，请重试！");
        return;
      }
      await addListCollection.mutateAsync({ collectionListId: listId, collectionId });
      toast.success("收藏成功！");
    }
    catch (error) {
      // 打印出完整的错误信息，以便检查后端返回的错误详情（通常在 error.response 或 error.message 中）
      console.error("收藏失败的详细错误:", error);
      // 尝试显示具体的错误信息，如果后端有提供
      const errorMessage = (error as any)?.body?.message || (error as any)?.message || "请检查控制台获取详细错误。";
      toast.error(`收藏失败: ${errorMessage}`);
      toast.error("收藏失败，请重试！");
    }
  };

  return (
    <div className="overflow-y-auto space-y-4 h-auto max-h-[80vh] w-[60vw] sm:h-auto sm:max-h-[80vh] sm:w-[60vw] md:h-[15vh] md:w-[40vw] lg:h-[40vh] lg:w-[30vw] max-w-full flex flex-col flex-grow items-center justify-start">
      <div className="text-xl font-bold">添加至收藏夹</div>
      <div className="w-full flex flex-col justify-center">
        <input name="description" type="text" maxLength={20} placeholder="收藏描述..." value={description} onChange={e => setDescription(e.target.value)} className="w-full  h-[2vh]  placeholder:italic placeholder-gray-400 border px-4 py-4 rounded focus:outline-none focus:ring-0" />
        {isLoading
          ? (
              <div className="flex">加载中...</div>)
          : isError
            ? (<div>加载失败！</div>)
            : (collectionLists && totalCount === 0)
                ? (
                    <div>
                      <div className="mx-auto py-2">你还没有收藏夹!</div>
                      <button type="button" className="flex justify-between w-[90%] sm:w-[95%] lg:w-full sm:h-[3vh] lg:h-[5vh] bg-blue-500/10 hover:text-blue-500 cursor-pointer rounded-sm px-4 py-2">创建收藏夹</button>
                    </div>
                  )
                : (
                    <div className="flex flex-col w-full gap-2 mt-4 sm:mt-2">
                      {collectionLists?.map(collectionList => (
                        <div key={collectionList.collectionListId} className="flex justify-between w-full sm:h-[3vh] lg:h-[5vh] bg-blue-500/10 hover:text-blue-500 cursor-pointer rounded-sm px-4 py-2" onClick={() => handleAddCollection(resourceId, resourceType, description, collectionList.collectionListId)}>
                          <span>{collectionList.collectionListName}</span>
                          <span>{formatToMonthDay(collectionList.createTime)}</span>
                        </div>
                      ))}
                    </div>
                  )}
        <div className="flex w-[20%] justify-center items-center mx-auto mt-auto">
          <button type="button" disabled={pageIndex === 1}><Arrowleft className="w-6 h-6 cursor-pointer text-gray-300" onClick={() => setPageIndex(prev => prev - 1)} /></button>
          <div className="whitespace-nowrap">
            第
            {pageIndex}
            页
          </div>
          <button type="button" disabled={isLast}><Arrowright className="w-6 h-6 cursor-pointer text-gray-300" onClick={() => setPageIndex(prev => prev + 1)} /></button>
        </div>
      </div>
    </div>
  );
};
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
  const countData = useGetCollectionCountQuery(
    targetInfo.resourceId,
    String(targetInfo.resourceType),
  );
  const [collectionCount, setCollectionCount] = useState(initialCount ?? 0);
  useEffect(() => {
    const serverCount = countData?.data?.data;
    if (typeof serverCount === "number") {
      setCollectionCount(() => serverCount);
    }
  }, [countData]);

  // const addCollectionMutation = useAddCollectionMutation();
  const deleteCollectionMutation = useDeleteCollectionMutation();

  const userId: number | null = useGlobalContext().userId;

  // 收藏弹窗
  const toggleCollection = () => {
    const showCollectionList = () => {
      toastWindow(_close => (<CollectionListPop resourceId={targetInfo.resourceId} resourceType={targetInfo.resourceType} />));
    };
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
