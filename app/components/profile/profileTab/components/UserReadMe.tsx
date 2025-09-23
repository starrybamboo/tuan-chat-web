import type { UserInfoResponse } from "../../../../../api";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import React, { useState } from "react";

interface UserReadMeProps {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  onSave: (content: string) => Promise<void>;
  isSaving: boolean;
}

export const UserReadMe: React.FC<UserReadMeProps> = ({
  user,
  userId,
  loginUserId,
  onSave,
  isSaving,
}) => {
  const [isEditingReadMe, setIsEditingReadMe] = useState(false);
  const [editingReadMe, setEditingReadMe] = useState("");

  const isOwner = userId === loginUserId;

  const startEditingReadMe = () => {
    setEditingReadMe(user?.readMe || "");
    setIsEditingReadMe(true);
  };

  const saveReadMe = async () => {
    try {
      await onSave(editingReadMe);
      setIsEditingReadMe(false);
    }
    catch (error) {
      console.error("保存ReadMe失败:", error);
    }
  };

  const cancelEditingReadMe = () => {
    setIsEditingReadMe(false);
    setEditingReadMe("");
  };

  return (
    <div className="flex-1 lg:m-2">
      <div className="p-4 shadow-md rounded-xl">
        <div className="p-2">
          {isOwner && isEditingReadMe
            ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">编辑 ReadMe</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={saveReadMe}
                        className="btn btn-sm btn-success"
                        disabled={isSaving}
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEditingReadMe}
                        className="btn btn-sm btn-ghost"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                  <MarkdownEditor
                    defaultContent={editingReadMe}
                    onChange={value => setEditingReadMe(value)}
                  />
                  <div className="text-xs text-neutral-500">
                    提示：支持 Markdown 语法，使用 Ctrl+Enter 保存
                  </div>
                </div>
              )
            : (
                <div className="relative">
                  {/* 头部区域，包含标题和编辑按钮 */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">README</h2>
                    {isOwner && (
                      <button
                        onClick={startEditingReadMe}
                        className="btn btn-sm btn-outline btn-primary gap-1 hover:btn-primary"
                        title="编辑个人简介"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        编辑
                      </button>
                    )}
                  </div>

                  {/* README内容区域 */}
                  <div className="min-h-[120px]">
                    <MarkDownViewer
                      content={
                        user?.readMe
                        || (isOwner
                          ? `## 👋 欢迎来到我的主页

还没有写下个人 ReadMe？点击 **右上角「编辑」按钮** 开始介绍自己吧！

可以包含：
- 自我介绍和专业背景
- 当前项目和研究方向  
- 技术栈和擅长领域
- 寻求的合作机会
- 联系方式

支持 **Markdown** 格式，让你的简介更加生动！`
                          : `该用户还没有撰写个人简介。`)
                      }
                    />
                  </div>
                </div>
              )}
        </div>
      </div>
    </div>
  );
};
