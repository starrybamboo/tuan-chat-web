import ActivityNotice from "@/components/activities/cards/activituNoticeCard";
import PostsCard from "@/components/activities/cards/postsCard";
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

export default function ActivitiesPage() {
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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* 移动端固定顶部侧边栏，桌面端正常布局 */}
        <div className="block lg:grid lg:grid-cols-12 lg:gap-6">
          {/* 移动端顶部侧边栏 */}
          <div className="lg:hidden mb-4">
            <div className="grid grid-cols-1 gap-3">
              <ActivityNotice />
              <TrendingTopics />
            </div>
          </div>

          {/* 主内容区 */}
          <div className="lg:col-span-9">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-base-content px-1">
              动态
            </h1>

            {/* 发布动态框 */}
            <div className="mb-4 sm:mb-6">
              <PublishBox />
            </div>

            {/* 导航标签 */}
            <div className="mb-4 sm:mb-6">
              <div className="flex space-x-4 sm:space-x-6 text-sm bg-base-100 rounded-t-lg px-3 sm:px-4 pt-3">
                <button
                  className="text-primary font-medium border-b-2 border-primary pb-2 transition-colors"
                  type="button"
                >
                  全部
                </button>
                <button
                  className="text-base-content/70 hover:text-primary pb-2 transition-colors"
                  type="button"
                >
                  模组动态
                </button>
              </div>
            </div>

            {/* 动态列表 */}
            <div className="space-y-3 sm:space-y-4">
              {dynamics.map(dynamic => (
                <PostsCard
                  key={dynamic.id}
                  dynamic={dynamic}
                />
              ))}
            </div>
          </div>

          {/* 桌面端右侧边栏 */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-6 space-y-6">
              <ActivityNotice />
              <TrendingTopics />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
