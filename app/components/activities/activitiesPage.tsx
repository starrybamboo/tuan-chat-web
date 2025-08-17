import ActivityNotice from "@/components/activities/cards/activituNoticeCard";
import DynamicCard from "@/components/activities/cards/postsCard";
import TrendingTopics from "@/components/activities/cards/trendingTopicsCard";
import { EmojiIconWhite } from "@/icons";
import React, { useState } from "react";

// 动态类型枚举
export enum DynamicType {
  TEXT = "text",
  IMAGE = "image",
  FORWARD = "forward",
}

// 用户信息接口
export interface User {
  id: string;
  username: string;
  avatar: string;
}

// 动态数据接口
export interface Dynamic {
  id: string;
  user: User;
  publishTime: string;
  type: DynamicType;
  content: string;
  images?: string[];
  forwardedDynamic?: Dynamic;
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  isLiked: boolean;
}

// 动态卡片事件处理接口
// export interface DynamicCardActions {
//   onLike: (id: string) => void;
//   onComment: (id: string) => void;
//   onShare: (id: string) => void;
// }

// 发布动态组件
const PublishBox: React.FC = () => {
  const [content, setContent] = useState("");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-start space-x-4">
        <img
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop&crop=face"
          alt="我的头像"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="有什么新鲜事想告诉大家？"
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex space-x-3">
              <button className="text-gray-500 hover:text-pink-500 transition-colors" type="button">
                <EmojiIconWhite />
              </button>
              <button className="text-gray-500 hover:text-pink-500 transition-colors" type="button">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8" cy="10" r="2.2" />
                  <polyline points="7,17 12,12 15,15 18,13 21,17" />
                </svg>
              </button>
              <button className="text-gray-500 hover:text-pink-500 transition-colors" type="button">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="5" y="12" width="3" height="7" rx="1" />
                  <rect x="10" y="9" width="3" height="10" rx="1" />
                  <rect x="15" y="5" width="3" height="14" rx="1" />
                </svg>
              </button>
            </div>
            <button
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                content.trim()
                  ? "bg-pink-500 text-white hover:bg-pink-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
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

// 热门话题组件

const ActivitiesPage: React.FC = () => {
  const [dynamics] = useState<Dynamic[]>([
    {
      id: "1",
      user: {
        id: "user2",
        username: "测试",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      },
      publishTime: "5小时前",
      type: DynamicType.IMAGE,
      content: "你好",
      images: [
        "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
      ],
      stats: { likes: 256, comments: 45, shares: 18 },
      isLiked: true,
    },
  ]);

  // const handleLike = (): void => {
  // };
  //
  // const handleComment = (): void => {
  // };
  //
  // const handleShare = (): void => {
  // };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 主内容区 */}
          <div className="col-span-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">动态</h1>
            {/* 发布动态框 */}
            <PublishBox />
            {/* 导航标签 */}
            <div className="mb-6">
              <div className="flex space-x-6 text-sm border-b border-gray-200">
                <button className="text-pink-500 font-medium border-b-2 border-pink-500 pb-2" type="button">
                  全部
                </button>
                <button className="text-gray-500 hover:text-gray-700 pb-2" type="button">
                  模组动态
                </button>
              </div>
            </div>
            {/* 动态列表 */}
            {dynamics.map(dynamic => (
              <DynamicCard
                key={dynamic.id}
                dynamic={dynamic}
              />
            ))}
          </div>

          {/* 右侧边栏 */}
          <div className="col-span-4">
            <div className="sticky top-6 space-y-6">
              <ActivityNotice />
              <TrendingTopics />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesPage;
