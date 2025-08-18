import React from "react";

/**
 * 热榜的卡片
 */
export default function TrendingTopics() {
  const topics = [
    { id: "1", name: "2", posts: 1234, isHot: true },
    { id: "2", name: "1", posts: 890, isHot: true },
    { id: "3", name: "喵喵", posts: 2341, isHot: false },
    { id: "4", name: "呜呜", posts: 567, isHot: true },
    { id: "5", name: "闹麻了", posts: 445, isHot: false },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-orange-500 text-lg">📈</span>
        <h3 className="font-bold text-gray-900">热门话题</h3>
      </div>
      <div className="space-y-3">
        {topics.map((topic, index) => (
          <div key={topic.id} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-400 w-4">{index + 1}</span>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    #
                    {topic.name}
                  </span>
                  {topic.isHot && <span className="text-orange-500">🔥</span>}
                </div>
                <span className="text-xs text-gray-500">
                  {topic.posts}
                  条动态
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
