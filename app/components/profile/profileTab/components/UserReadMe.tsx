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
                <div
                  className={
                    isOwner
                      ? "cursor-pointer hover:bg-base-200 p-2 rounded transition-colors relative"
                      : ""
                  }
                  onClick={isOwner ? startEditingReadMe : undefined}
                  title={isOwner ? "点击编辑 ReadMe" : undefined}
                >
                  <MarkDownViewer
                    content={
                      user?.readMe
                      || (isOwner
                        ? `## 👋 欢迎来到我的主页

还没有写下个人 ReadMe？花几分钟介绍你自己，帮助关注者快速了解你。

可以从这些开始（写完删除提示即可）：

### 我是谁
- 一句话自我介绍（角色/领域/兴趣）

### 我在做什么
- 当前项目 / 研究方向 / 学习路线

### 我擅长
- 技术栈/工具：\`React\` \`TypeScript\` \`Node.js\`（示例，可修改）

### 我在寻找
- 合作方向 / 招募 / 接受的反馈

### 如何联系我
- Email：your@email.com
- 其它：Twitter / Telegram / 微信

小贴士：支持 Markdown，使用列表、图片、代码块让内容更清晰。`
                        : `该用户还没有撰写 ReadMe。`)
                    }
                  />
                  {isOwner && (
                    <div className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
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
                    </div>
                  )}
                </div>
              )}
        </div>
      </div>
    </div>
  );
};
