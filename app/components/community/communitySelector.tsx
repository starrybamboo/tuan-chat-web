import type { CommunityResponse } from "../../../api/models/CommunityResponse";
import { PopWindow } from "@/components/common/popWindow";
import React, { useState } from "react";

interface CommunitySelectorProps {
  /** 社区列表数据 */
  communityList: CommunityResponse[];
  /** 当前选中的社区ID */
  selectedCommunityId?: number;
  /** 选择社区时的回调 */
  onSelect: (communityId: number) => void;
  /** 是否显示为必选 */
  required?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否显示选择提示 */
  showSelectionHint?: boolean;
}

/**
 * 社区选择器组件
 * 支持按钮模式
 */
export default function CommunitySelector({
  communityList,
  selectedCommunityId,
  onSelect,
  required: _required = false,
  className = "",
  showSelectionHint: _showSelectionHint = true,
}: CommunitySelectorProps) {
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);

  // 获取当前选中的社区信息
  const selectedCommunity = communityList.find(c => c.communityId === selectedCommunityId);

  // 处理社区选择
  const handleCommunitySelect = (communityId: number) => {
    onSelect(communityId);
    setIsSelectionOpen(false);
  };

  if (communityList.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 border-2 border-dashed border-base-300 rounded-lg ${className}`}>
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-base-content/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p className="mt-2 text-sm text-base-content/50">暂无可用社区</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`w-full ${className}`}>
        <button
          type="button"
          onClick={() => setIsSelectionOpen(true)}
          className={`
            w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${selectedCommunity
      ? "border-info bg-info/5 hover:bg-info/10"
      : "border-dashed border-base-300 hover:border-base-400 bg-base-100"
    }
          `}
        >
          {selectedCommunity
            ? (
                <div className="flex items-center space-x-3">
                  {/* 社区头像/图标 */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden bg-info text-info-content">
                    {selectedCommunity.avatar
                      ? (
                          <img
                            src={selectedCommunity.avatar}
                            alt={selectedCommunity.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              if (target.nextSibling) {
                                (target.nextSibling as HTMLElement).style.display = "block";
                              }
                            }}
                          />
                        )
                      : null}
                    <span className={selectedCommunity.avatar ? "hidden" : ""}>
                      {selectedCommunity.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>

                  {/* 社区信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-info truncate">
                      {selectedCommunity.name}
                    </p>
                    {selectedCommunity.description && (
                      <p className="text-xs text-base-content/60 truncate mt-1">
                        {selectedCommunity.description}
                      </p>
                    )}
                  </div>

                  {/* 更换图标 */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-info"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                </div>
              )
            : (
                <div className="flex items-center justify-center space-x-2 text-base-content/60">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>选择社区</span>
                </div>
              )}
        </button>
      </div>

      {/* 选择社区的弹窗 */}
      <PopWindow
        isOpen={isSelectionOpen}
        onClose={() => setIsSelectionOpen(false)}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">选择社区</h3>
          {communityList.length === 0
            ? (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-base-300 rounded-lg">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-base-content/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-base-content/50">暂无可用社区</p>
                  </div>
                </div>
              )
            : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {communityList.map(community => (
                    <div
                      key={community.communityId}
                      className={`
                      cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md
                      ${selectedCommunityId === community.communityId
                      ? "border-info bg-info/10 shadow-sm"
                      : "border-base-300 bg-base-100 hover:border-base-400"
                    }
                    `}
                      onClick={() => handleCommunitySelect(community.communityId!)}
                    >
                      <div className="flex items-center space-x-3">
                        {/* 社区头像/图标 */}
                        <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden
                        ${selectedCommunityId === community.communityId
                      ? "bg-info text-info-content"
                      : "bg-base-300 text-base-content"
                    }
                      `}
                        >
                          {community.avatar
                            ? (
                                <img
                                  src={community.avatar}
                                  alt={community.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    if (target.nextSibling) {
                                      (target.nextSibling as HTMLElement).style.display = "block";
                                    }
                                  }}
                                />
                              )
                            : null}
                          <span className={community.avatar ? "hidden" : ""}>
                            {community.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>

                        {/* 社区信息 */}
                        <div className="flex-1 min-w-0">
                          <p className={`
                          font-medium text-base truncate
                          ${selectedCommunityId === community.communityId
                      ? "text-info"
                      : "text-base-content"}
                        `}
                          >
                            {community.name}
                          </p>
                          {community.description && (
                            <p className="text-sm text-base-content/60 truncate mt-1">
                              {community.description}
                            </p>
                          )}
                        </div>

                        {/* 选中状态指示器 */}
                        {selectedCommunityId === community.communityId && (
                          <div className="flex-shrink-0">
                            <svg
                              className="w-6 h-6 text-info"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </PopWindow>
    </>
  );
}
