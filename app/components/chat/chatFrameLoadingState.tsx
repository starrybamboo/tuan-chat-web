import React from "react";

export default function ChatFrameLoadingState() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-base-200">
      <div className="flex flex-col items-center gap-2">
        {/* 加载动画 */}
        <span className="loading loading-spinner loading-lg text-info"></span>
        {/* 提示文字 */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-medium text-base-content">正在获取历史消息</h3>
          <p className="text-sm text-base-content/70">请稍候...</p>
        </div>
      </div>
    </div>
  );
}
