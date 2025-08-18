import { useGlobalContext } from "@/components/globalContextProvider";
import { BarChartOutlineIcon, EmojiIconWhite, Image2Fill } from "@/icons";
import React, { useState } from "react";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

export default function PublishBox() {
  const [content, setContent] = useState("");
  const loginUserId = useGlobalContext().userId ?? -1;
  const userQuery = useGetUserInfoQuery(loginUserId);
  const user = userQuery.data?.data;

  return (
    <div className=" rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-start space-x-4">
        <div className="pointer-events-none relative">
          <img
            src={user?.avatar || undefined}
            alt={user?.username}
            className="mask mask-circle w-14 h-14 object-cover"
          />
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="有什么新鲜事想告诉大家？"
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
          />
          {/* 下方操作栏 */}
          <div className="flex items-center justify-between mt-3">
            {/* 左边的功能按钮 */}
            <div className="flex space-x-3">
              <button className="text-gray-500 hover:text-primary transition-colors" type="button">
                <EmojiIconWhite />
              </button>
              <button className="text-gray-500 hover:text-primary transition-colors" type="button">
                <Image2Fill />
              </button>
              <button className="text-gray-500 hover:text-primary transition-colors" type="button">
                <BarChartOutlineIcon />
              </button>
            </div>
            {/* 发布按钮 */}
            <button
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                content.trim()
                  ? "bg-primary text-white hover:bg-pink-600 cursor-pointer"
                  : "bg-gray-200 text-gray-400"
              }`}
              disabled={!content.trim()}
              type="button"
            >
              发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
