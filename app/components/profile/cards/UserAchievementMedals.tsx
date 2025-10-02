import React, { useState } from "react";

interface Medal {
  id: number;
  name: string;
  desc: string;
  date: string;
}

interface UserAchievementMedalsProps {
  medals?: Medal[];
  className?: string;
}

/**
 * 用户的成就系统，目前只有一个框架在吃灰
 */
const UserAchievementMedals: React.FC<UserAchievementMedalsProps> = ({
  medals = [],
  className = "",
}) => {
  const [expandedMedals, setExpandedMedals] = useState(false);

  // 使用默认的测试数据
  const defaultMedals: Medal[] = [
    { id: 1, name: "Your Story", desc: "首次设计了一个模组", date: "2025-07-21" },
    { id: 2, name: "神秘观测者", desc: "围观了一场跑团超过2个小时", date: "2025-06-15" },
    { id: 3, name: "始作俑者", desc: "担任kp并且结团时无一生还", date: "2025-05-28" },
    { id: 4, name: "模组大师", desc: "设计了5个以上模组", date: "2025-04-12" },
    { id: 5, name: "团本收割机", desc: "完成10次以上跑团", date: "2025-03-22" },
    { id: 6, name: "守秘人", desc: "担任KP超过10次", date: "2025-02-18" },
    { id: 7, name: "剧情推动者", desc: "在跑团中推动关键剧情发展", date: "2025-01-15" },
    { id: 8, name: "完美扮演", desc: "获得其他玩家一致好评的角色扮演", date: "2024-12-20" },
  ];

  const medalList = medals.length > 0 ? medals : defaultMedals;
  const visibleMedals = expandedMedals ? medalList : medalList.slice(0, 6);

  return (
    <div className={`${className}`}>
      <div className="bg-indigo-50 rounded-xl p-10 h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-indigo-800 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            成就勋章
            {medals.length === 0 ? "（测试）" : ""}
          </h2>
          {medalList.length > 6 && (
            <button
              type="button"
              onClick={() => setExpandedMedals(!expandedMedals)}
              className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
            >
              {expandedMedals ? "收起" : `更多 (${medalList.length - 6}+)`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {visibleMedals.map(medal => (
            <div
              key={medal.id}
              className="group relative flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <span className="mt-2 text-xs text-center font-medium text-gray-700 group-hover:text-indigo-700 transition-colors truncate w-full">
                {medal.name}
              </span>

              {/* 悬停提示 */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-white p-3 rounded-lg shadow-lg z-10 w-64">
                <p className="font-bold text-indigo-700">{medal.name}</p>
                <p className="text-sm mt-1 text-gray-600">{medal.desc}</p>
                <p className="text-xs text-gray-500 mt-2">
                  达成日期:
                  {" "}
                  {medal.date}
                </p>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserAchievementMedals;
