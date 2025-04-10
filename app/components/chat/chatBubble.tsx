import type { ChatMessageResponse, Message } from "api";
import { ExpressionChooser } from "@/components/chat/ExpressionChooser";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGetRoleQuery, useUpdateMessageMutation } from "api/queryHooks";
import { useState } from "react";
/**
 * 聊天风格的对话框组件
 */

export function ChatBubble({ chatMessageResponse, useChatBubbleStyle }: { chatMessageResponse: ChatMessageResponse; useChatBubbleStyle: boolean }) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId);

  const role = useRoleRequest.data?.data;
  const [isOpen, setIsOpen] = useState(false);

  const updateMessageMutation = useUpdateMessageMutation();

  function handleExpressionChange(avatarId: number) {
    const newMessage: Message = {
      ...message,
      avatarId,
    };
    updateMessageMutation.mutate(newMessage, {
      onSettled: () => setIsOpen(false),
    });
  }

  function handleContentUpdate(content: string) {
    const newMessage: Message = {
      ...message,
      content,
    };
    updateMessageMutation.mutate(newMessage);
  }

  // eslint-disable-next-line react/no-nested-component-definitions
  function EditableField({ content }: { content: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    return isEditing
      ? (
          <textarea
            className="whitespace-pre-wrap border-none bg-transparent resize-none textarea w-full"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleContentUpdate(editContent)}
            onBlur={() => {
              handleContentUpdate(editContent);
              setIsEditing(false);
            }}

            autoFocus
          />
        )
      : (
          <div
            className="whitespace-pre-wrap"
            onDoubleClick={() => setIsEditing(true)}
          >
            {content}
          </div>
        );
  };

  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div className="chat chat-start" key={message.messageID}>
              <div className="avatar chat-image" onClick={() => setIsOpen(true)}>
                <RoleAvatarComponent avatarId={message.avatarId} width={10} isRounded={true} withTitle={false} stopPopWindow={true}></RoleAvatarComponent>
              </div>

              <div className={message.messageType !== 0 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}>
                {/* <div className="whitespace-pre-wrap"> */}
                {/*  {message.content} */}
                {/* </div> */}
                <EditableField content={message.content}></EditableField>
              </div>
              <div className="chat-footer">
                {role?.roleName?.trim() || "Undefined"}
                <time className="text-xs opacity-50">
                  {message.createTime ?? ""}
                </time>
              </div>
            </div>
          )
        : (
            <div className="flex w-full mb-4" key={message.messageID}>
              {/* 圆角矩形头像 */}
              <div className="flex-shrink-0 mr-3">
                <div className="w-20 h-20 rounded-md overflow-hidden" onClick={() => setIsOpen(true)}>
                  <RoleAvatarComponent avatarId={message.avatarId} width={20} isRounded={false} withTitle={false} stopPopWindow={true}></RoleAvatarComponent>
                </div>
              </div>

              {/* 消息内容 */}
              <div className="flex-1">
                {/* 角色名 */}
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {role?.roleName?.trim() || "Undefined"}
                </div>

                {/* 消息文本（纯文字，无边框） */}
                <EditableField content={message.content}></EditableField>

                {/* 时间 */}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {message.createTime?.toLocaleString() ?? ""}
                </div>
              </div>
            </div>
          )}
      <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="flex flex-col">
          <div>选择</div>
          <ExpressionChooser roleId={message.roleId} handleExpressionChange={handleExpressionChange}></ExpressionChooser>
        </div>
      </PopWindow>
    </div>
  );
}
