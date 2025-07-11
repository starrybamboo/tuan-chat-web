import { useGlobalContext } from "@/components/globalContextProvider";
import React, { useState } from "react";
import { useGetUerSCBalanceQuery } from "../../../../api/hooks/scQueryHooks";

interface HomeTabProps {
  userId: number;
}

const HomeTab: React.FC<HomeTabProps> = () => {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  const [activeTab, setActiveTab] = useState<"likes" | "comments">("likes");
  const getUserSCBalanceQuery = useGetUerSCBalanceQuery(userId);

  // DEMO: 获取用户点赞内容的 标题 - 正文
  const mockLikedPosts = [
    { id: "1", title: "标题111", content: "正文正文正文正文正文正文正文正文正文正文正文正文正文正文", date: "2025-05-15" },
    { id: "2", title: "标题222", content: "内容内容内容内容内容内容内容内容内容内容内容内容内容内容", date: "2025-05-10" },
  ];

  // DEMO: 获取用户评论 标题 - 评论 - 日期（按日期排序，按热度排序）
  const mockComments = [
    { id: "c1", title: "标题1", content: "奇奇怪怪的内容", date: "2025-05-16" },
    { id: "c2", title: "标题2", content: "香香甜甜小蛋糕", date: "2025-05-11" },
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="card-body">
        <div className="card-title">
          <span>SC余额</span>
        </div>
        <div className="card-actions justify-end">
          <div className="badge badge-outline">{getUserSCBalanceQuery.data?.data?.balance}</div>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-6">
        最近点赞或评论的内容
      </h2>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          type="button"
          className={`py-2 px-4 font-medium ${activeTab === "likes" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("likes")}
        >
          点赞内容
        </button>
        <button
          type="button"
          className={`py-2 px-4 font-medium ${activeTab === "comments" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("comments")}
        >
          评论内容
        </button>
      </div>

      {/* 点赞和评论内容 */}
      <div className="space-y-4">
        {activeTab === "likes"
          ? (
              <>
                {/* 只展示10条 */}
                <h3 className="text-xl font-semibold mb-4">点赞的内容</h3>
                {mockLikedPosts.slice(0, 10).map(post => (
                  <div key={post.id} className="p-4 border rounded-lg cursor-pointer">
                    <h4 className="font-medium text-lg">{post.title}</h4>
                    <p className="text-gray-600 my-2">{post.content}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>
                        Post ID:
                        {post.id}
                      </span>
                      <span>{post.date}</span>
                    </div>
                  </div>
                ))}
              </>
            )
          : (
              <>
                {/* 只展示10条 */}
                <h3 className="text-xl font-semibold mb-4">发表的评论</h3>
                {mockComments.slice(0, 10).map(comment => (
                  <div key={comment.id} className="p-4 border rounded-lg cursor-pointer">
                    <p className="text-gray-600 my-2">{comment.content}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>
                        Comment ID:
                        {comment.id}
                      </span>
                      <span>{comment.date}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
      </div>
    </div>
  );
};

export default HomeTab;
