/**
 * 热榜的卡片 - 纯内容组件，容器由父组件处理
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
    <div className="space-y-2">
      <div className="flex items-center space-x-2 mb-4">
        <h3 className="font-bold text-base-400 p-2">热门话题</h3>
      </div>
      {topics.map((topic, index) => (
        <div
          key={topic.id}
          className="
            flex items-center justify-between
            hover:bg-base-200
            p-2 rounded-lg cursor-pointer transition-colors group
          "
        >
          <div className="flex items-center space-x-3">
            <span
              className={`
                text-sm font-medium w-4 text-center
                ${
                index < 3 ? "text-info font-bold" : "text-base-content/60"
              }
              `}
            >
              {index + 1}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="
                  font-medium text-base-content
                  group-hover:text-info
                  transition-colors text-sm
                ">
                  #
                  {topic.name}
                </span>
                {topic.isHot && (
                  <span className="text-xs" role="img" aria-label="热门">
                    🔥
                  </span>
                )}
              </div>
              <span className="text-xs text-base-content/60">
                {topic.posts.toLocaleString()}
                条动态
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
