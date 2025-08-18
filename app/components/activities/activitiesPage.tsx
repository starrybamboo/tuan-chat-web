import ActivityNotice from "@/components/activities/cards/activituNoticeCard";
import DynamicCard from "@/components/activities/cards/postsCard";
import PublishBox from "@/components/activities/cards/publishPostCard";
import TrendingTopics from "@/components/activities/cards/trendingTopicsCard";
import React, { useState } from "react";

/**
 * 动态页面的入口文件
 */

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
