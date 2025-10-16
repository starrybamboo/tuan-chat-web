import type { CollectionList as CollectionListType } from "api";
import { BaselineDeleteOutline, Edit2Outline, EllipsisVertical, LockKeyhole, LockKeyholeOpen,
} from "@/icons";
import { useGetCollectionListQuery, useGetUserCollectionListsQuery } from "api/hooks/collectionQueryHooks";
import { useState } from "react";

function CollectionListItem({ c, selectedId, onSelect }: { c: CollectionListType; selectedId?: number; onSelect?: (id: number) => void }) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  return (
    <div
      onClick={() => onSelect?.(c.collectionListId!)}
      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition-colors ${
        selectedId === c.collectionListId
          ? "bg-purple-200 text-purple-900 font-semibold"
          : "hover:bg-gray-100 text-gray-700 dark:text-white"
      }`}
    >
      <span>{c.collectionListName ?? "未命名收藏夹"}</span>
      <div className="relative">
        <button type="button" className="text-sm font-medium" onClick={() => setShowMoreOptions(!showMoreOptions)}>
          <EllipsisVertical />
        </button>
        {showMoreOptions
          && (
            <div className="absolute right-0 top-full z-20 flex flex-col bg-base-100 rounded-lg shadow-2xl gap-2 p-2">
              <span className="flex items-center gap-2 cursor-pointer">
                <Edit2Outline className="w-5 h-5" />
                <p className="whitespace-nowrap text-sm">重命名</p>
              </span>
              <span className="flex items-center gap-2 cursor-pointer">
                {c?.isPublic ? <LockKeyhole className="w-5 h-5" /> : <LockKeyholeOpen />}
                <p className="whitespace-nowrap text-sm">{c.isPublic ? "私密" : "公开"}</p>
              </span>
              <span className="flex items-center gap-2 cursor-pointer">
                <BaselineDeleteOutline className="w-5 h-5" />
                <p className="whitespace-nowrap text-sm">删除</p>
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

interface CollectionListProps {
  selectedId?: number;
  onSelect?: (id: number) => void;
}

export default function CollectionList({ onSelect, selectedId }: CollectionListProps) {
  const [pageIndex, setPageIndex] = useState(1);
  const pageSize = 4;
  const { data, isLoading, isError } = useGetUserCollectionListsQuery({
    pageNo: pageIndex,
    pageSize,
  });

  const collectionLists: CollectionListType[] | undefined = data?.data?.list;

  // 收藏夹详情信息
  const [selectId, setSelectId] = useState(0);
  const { data: collectionListDetail } = useGetCollectionListQuery(selectId);
  const description = collectionListDetail?.data?.description;
  const imageUrl = collectionListDetail?.data?.coverImageUrl;

  // 收藏夹设置

  return (
    <div className="space-y-2 w-full ">
      <div className="w-full aspect-[1618/1000] relative overflow-hidden rounded-lg">
        <img
          src={imageUrl ?? "http://101.126.143.129:9000/avatar/avatar/5275ec2f0e6ba166343a5ec60c5674d8_31076.webp"}
          alt="收藏夹封面"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <p className="text-gray-500 mx-2 truncate">{description ?? "还没有添加描述喵~"}</p>
      {isLoading
        ? (
            <div>加载中...</div>)
        : isError
          ? (<div>加载失败！</div>)
          : (collectionLists && collectionLists.length === 0)
              ? (
                  <div>
                    <h3>你还没有收藏夹</h3>
                    <button type="button" className="flex justify-between w-[90%] sm:w-[95%] lg:w-full sm:h-[3vh] lg:h-[5vh] bg-blue-500/10 hover:text-blue-500 cursor-pointer rounded-sm px-4 py-2">创建收藏夹</button>
                  </div>
                )
              : (collectionLists?.map(c => (
                  <div key={c.collectionListId}>
                    <CollectionListItem c={c} selectedId={selectedId} onSelect={() => setSelectId(c.collectionListId ?? 0)} />
                  </div>
                )))}
    </div>
  );
}
