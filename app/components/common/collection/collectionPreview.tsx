import { useLayoutEffect, useRef, useState } from "react";
import UserAvatarComponent from "@/components/common/userAvatar";
import { EllipsisVertical } from "@/icons";

interface CollectionPreviewProps {
  collectionId?: number;
  resourceId?: number;
  collectionTypeId?: number;
  collectTime: string;
}

export default function CollectionPreview({ collectionId, resourceId, collectionTypeId, collectTime }: CollectionPreviewProps) {
  // 收藏时间
  const date = new Date(collectTime);
  const formattedDate = date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });

  // 卡片动态高度
  const BASE_ROW_HEIGHT = 25; // 基础行高
  const [span, setSpan] = useState(10);
  const previewRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(
    () => {
      const actualHeight = previewRef.current?.offsetHeight;
      if (actualHeight) {
        setSpan(Math.ceil(actualHeight / BASE_ROW_HEIGHT));
      }
    },
    [previewRef],
  );

  const handleClick = () => {
    let targetUrl = "/";
    switch (collectionTypeId) {
      case 2:
      // 类型为帖子
        targetUrl = `/community/1/${resourceId}`;
        break;

      case 3:
      // 类型为仓库
        targetUrl = `/repository/detail/${resourceId}`;
        break;

      case 4:
      // 假设类型为评论
        targetUrl = `/comment/${collectionId}`;// 需要修改为对应内容
        break;
    }

    window.location.href = targetUrl; // 刷新页面
  };
  return (
    <article
      className={`bg-base-100 border border-base-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden `}
      style={{ gridRowEnd: `span ${span}` }}
      onClick={handleClick}
      ref={previewRef}
    >
      <div className="p-3 flex flex-col gap-3 relative">

        {/* 帖子预览图 */}
        <div className="relative rounded-lg overflow-hidden w-full">
          {(collectionTypeId === 2) && (
            <div className="flex items-center justify-center w-full h-full text-sm text-gray-500">
              <img src="https://tuan.chat/avatar/avatar/5275ec2f0e6ba166343a5ec60c5674d8_31076.webp" className="object-cover w-full h-40"></img>
            </div>
          )}
        </div>
        <div className="flex justify-between">
          <h1>标题</h1>
          <button
            className="btn btn-xs btn-ghost btn-circle hover:bg-base-200"
            type="button"
          >
            <EllipsisVertical className="w-4 h-4 text-base-content/60" />
          </button>
        </div>
      </div>
      {/* 创作者信息和收藏时间 */}
      <div className="flex justify-between items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <UserAvatarComponent
            userId={1}
            width={8}
            isRounded
            withName={true}
          />
          <span className="text-xs text-base-content/60">
            名字
            {collectionId}
          </span>
        </div>
        <div className="text-sm text-gray-300">
          收藏于
          {formattedDate}
        </div>
      </div>
    </article>
  );
}
