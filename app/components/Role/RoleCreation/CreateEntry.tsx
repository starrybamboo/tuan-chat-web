import { Link } from "react-router";

// 空状态组件
export default function CreateEntry({
  animationTrigger,
}: {
  AICreate: () => void;
  createBySelf: () => void;
  STCreate: () => void;
  animationTrigger?: number; // 动画触发器，每次变化时重新触发动画
}) {
  return (
    <div
      key={animationTrigger || 0} // 使用key来强制重新渲染，触发CSS动画
      className="animate-scale-in flex flex-col items-center justify-center h-full min-h-[calc(100vh-6rem)] p-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-base-content mb-2">创建新角色</h1>
        <p className="text-sm text-base-content/70 mb-8">选择一种角色类型开始创建</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto max-w-3xl">
          {/* 创建普通角色卡片 */}
          <Link
            to="/role?type=normal"
            className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-lg transition-all duration-200 h-auto md:h-100 cursor-pointer transform hover:scale-105"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 text-primary/60 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" strokeWidth={2} />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2 text-center">创建普通角色</h3>
            <p className="text-sm text-base-content/70 text-center leading-relaxed">
              创建普通游戏角色，用于日常对话和互动
            </p>
          </Link>

          {/* 创建骰娘卡片 */}
          <Link
            to="/role?type=dice"
            className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-lg transition-all duration-200 h-auto md:h-100 cursor-pointer transform hover:scale-105"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-dashed border-success/40 bg-success/5 text-success/60 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2} />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2 text-center">创建骰娘</h3>
            <p className="text-sm text-base-content/70 text-center leading-relaxed">
              创建跑团骰娘，用于TRPG游戏
            </p>
          </Link>

          {/* 去扮演卡片 */}
          <Link
            to="/chat"
            className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-lg transition-all duration-200 h-auto md:h-100 cursor-pointer transform hover:scale-105"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-dashed border-info/40 bg-info/5 text-info/60 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2 text-center">去扮演</h3>
            <p className="text-sm text-base-content/70 text-center leading-relaxed">
              选择已有角色开始聊天扮演
            </p>
          </Link>
        </div>

        <p className="mt-10 text-xs text-base-content/70 text-center">
          💡 提示：也可以从现有角色页面点击"转换为骰娘"快速创建骰娘角色
        </p>
      </div>
    </div>
  );
}
