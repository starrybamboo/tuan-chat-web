import CollectionList from "@/components/common/collection/collectionList";
import CollectionPreview from "@/components/common/collection/collectionPreview";
import CollectionSearchBar from "@/components/common/collection/collectionSearchBar";
import { useState } from "react";

// --- 模拟收藏数据 ---
interface MockCollectionItem {
  collectionId: number;

  resourceId: 2 | 3 | 4; // 2=帖子, 3=模组, 4=评论
  comment: string;
  createTime: string;
}

// 三种类型随机分配
const resourceTypes: Array<2 | 3 | 4> = [2, 3, 4];

const mockCollections: MockCollectionItem[] = Array.from({ length: 40 }).map((_, i) => ({
  collectionId: i + 1,
  resourceId: resourceTypes[Math.floor(Math.random() * resourceTypes.length)],
  comment: `这是第 ${i + 1} 个收藏`,
  createTime: new Date(
    Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30), // 最近30天内随机时间
  ).toISOString(),
}));

// 可以在组件中直接使用 mockCollections 渲染

export default function CollectionPage() {
  if (typeof window === "undefined")
    return null; // ⛔️ SSR 时跳过
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [selectedListId, setSelectedListId] = useState(1); // 默认收藏夹 id

  const isLoading = false;
  const isError = false;
  const collections = mockCollections;
  // 获取当前收藏夹内容
  // const PAGE_SIZE = 20;
  // const { data, isLoading, isError } = useGetListCollectionsQuery({
  //   pageSize: PAGE_SIZE,
  //   collectionListId: selectedListId,
  // });
  // const collections = data?.pages.flatMap(page => page?.data?.list) ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-base-200/70 dark:bg-base-200 p-4 lg:p-6 gap-6 font-sans">
      {/* 顶部搜索栏 */}
      <div className="fixed w-full z-10 top-16">
        <CollectionSearchBar />
      </div>

      {/* 主体区域 */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mt-16">
        {/* 左侧收藏夹列表 */}
        <div className="card lg:fixed flex flex-col w-full lg:w-1/4 bg-base-100 shadow-lg border border-gray-300 dark:border-black p-4">
          <CollectionList
            selectedId={selectedListId}
            onSelect={setSelectedListId}
          />
        </div>

        {/* 右侧收藏内容 */}
        <div className="flex-1 lg:ml-[28%]">
          <div className="grid grid-cols-3 auto-rows-[10px] gap-5">
            {isLoading
              ? (
                  "加载中..."
                )
              : isError
                ? (
                    "加载失败！"
                  )
                : collections && collections.length === 0
                  ? (
                      "空空如也"
                    )
                  : collections?.map(c => (
                    <CollectionPreview
                      key={c?.collectionId}
                      collectionId={c?.collectionId}
                      resourceId={c?.resourceId}
                      collectionTypeId={c?.resourceId}
                      collectTime={c?.createTime}
                    />
                  ))}
          </div>
        </div>
      </div>
    </div>
  );
}
