import type { StageResponse } from "api/models/StageResponse";
import { MoreMenu } from "@/icons";

export default function ModuleListItem({
  item,
  onClick,
  isSelected,
}: {
  item: StageResponse;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <div
      className={`w-full p-2 rounded-md transition-all duration-200 cursor-pointer hover:shadow-sm ${
        isSelected
          ? "bg-base-300 border border-primary/30"
          : "bg-base-300 border border-base-content/10 hover:border-base-content/20"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        {/* 左侧圆形图标 */}
        <div className="w-14 h-14 rounded-md">
          <img
            src={item.image || "./favicon.ico"}
            alt="module-icon"
            className="w-full h-full object-cover rounded-md"
          />
        </div>

        {/* 中间内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 模组名称和在线状态 */}
          <div className="flex items-center space-x-1 mb-0.5">
            <h3 className="text-sm font-medium text-base-content truncate">
              {item.moduleName || "未命名模组"}
            </h3>
          </div>

          {/* 模组描述 */}
          <p className="text-xs text-gray-600 mb-1 truncate max-w-60 min-w-60">
            {item.description || "暂无描述"}
          </p>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center space-x-1">
          {/* 收藏按钮 */}
          <button className="p-1 hover:bg-gray-100 rounded transition-colors" type="button">
            <svg
              className="w-3 h-3 text-gray-400 hover:text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>

          {/* 更多操作按钮 */}
          <button className="p-1 hover:bg-gray-100 rounded transition-colors" type="button">
            <MoreMenu className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
