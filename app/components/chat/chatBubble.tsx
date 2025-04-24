import type { ChatMessageResponse, Message } from "api";
import { ExpressionChooser } from "@/components/chat/expressionChooser";
import RoleChooser from "@/components/chat/roleChooser";
import { RoomContext } from "@/components/chat/roomContext";
import BetterImg from "@/components/common/betterImg";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetRoleQuery, useUpdateMessageMutation } from "api/queryHooks";
import React, { use, useState } from "react";

function EditableField({ content, handleContentUpdate, canEdit = true }: { content: string; handleContentUpdate: (content: string) => void; canEdit?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  function handleDoubleClick() {
    if (canEdit) {
      setIsEditing(true);
    }
  }
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
          onDoubleClick={handleDoubleClick}
        >
          {content}
        </div>
      );
}

export function ChatBubble({ chatMessageResponse, useChatBubbleStyle }: { chatMessageResponse: ChatMessageResponse; useChatBubbleStyle: boolean }) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId);

  const role = useRoleRequest.data?.data;
  const [isExpressionChooserOpen, setIsExpressionChooserOpen] = useState(false);
  const [isRoleChooserOpen, setIsRoleChooserOpen] = useState(false);

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalContext().userId;

  const roomContext = use(RoomContext);

  function handleExpressionChange(avatarId: number) {
    const newMessage: Message = {
      ...message,
      avatarId,
    };
    updateMessageMutation.mutate(newMessage, {
      onSettled: () => setIsExpressionChooserOpen(false),
    });
  }

  function handleContentUpdate(content: string) {
    if (content.trim() === "") {
      updateMessageMutation.mutate({
        ...message,
        status: 1,
      });
    }
    else {
      updateMessageMutation.mutate({
        ...message,
        content,
      });
    }
  }

  function handleRoleChange(new_roleId: number) {
    const newMessage: Message = {
      ...message,
      roleId: new_roleId,
      avatarId: roomContext.roomRolesThatUserOwn.find(role => role.roleId === new_roleId)?.avatarId ?? -1,
    };
    updateMessageMutation.mutate(newMessage, {
      onSettled: () => setIsRoleChooserOpen(false),
    });
  }

  const canEdit = userId === message.userId || roomContext.curMember?.userId === message.userId;

  function handleAvatarClick() {
    if (canEdit) {
      setIsExpressionChooserOpen(true);
    }
  }
  function handleRoleNameClick() {
    if (canEdit) {
      setIsRoleChooserOpen(true);
    }
  }
  // console.log("render message");

  function renderContent() {
    if (message.messageType === 2) {
      return (<BetterImg src={message.extra?.imageMessage?.url} className="max-h-[40vh]" />);
    }
    return (<EditableField content={message.content} handleContentUpdate={handleContentUpdate} canEdit={userId === message.userId}></EditableField>);
  }

  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div className="chat chat-start" key={message.messageID}>
              <div className="avatar chat-image" onClick={handleAvatarClick}>
                <RoleAvatarComponent avatarId={message.avatarId} width={10} isRounded={true} withTitle={false} stopPopWindow={true}></RoleAvatarComponent>
              </div>
              <div className={message.messageType !== 0 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}>
                {renderContent()}
              </div>
              <div className="chat-footer">
                <div className={`cursor-pointer ${userId === message.userId ? "hover:underline" : ""}`} onClick={handleRoleNameClick}>
                  {role?.roleName?.trim() || "Undefined"}
                </div>
                <time className="text-xs opacity-50">
                  {message.createTime ?? ""}
                  {` pos: ${message.position}`}
                  {` id: ${message.messageID}`}
                </time>
              </div>
            </div>
          )
        : (
            <div className="flex w-full mb-4" key={message.messageID}>
              {/* 圆角矩形头像 */}
              <div className="flex-shrink-0 mr-3">
                <div className="w-20 h-20 rounded-md overflow-hidden" onClick={handleAvatarClick}>
                  <RoleAvatarComponent avatarId={message.avatarId} width={20} isRounded={false} withTitle={false} stopPopWindow={true}></RoleAvatarComponent>
                </div>
              </div>
              {/* 消息内容 */}
              <div className="flex-1">
                {/* 角色名 */}
                <div className={`text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer ${userId === message.userId ? "hover:underline" : ""}`} onClick={handleRoleNameClick}>
                  {role?.roleName?.trim() || "Undefined"}
                </div>
                {renderContent()}
                {/* 时间 */}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {message.createTime ?? ""}
                </div>
              </div>
            </div>
          )}
      {
        canEdit
        && (
          <>
            {/* 表情选择窗口 */}
            <PopWindow isOpen={isExpressionChooserOpen} onClose={() => setIsExpressionChooserOpen(false)}>
              <div className="flex flex-col">
                <div>选择新的表情差分</div>
                <ExpressionChooser roleId={message.roleId} handleExpressionChange={handleExpressionChange}></ExpressionChooser>
              </div>
            </PopWindow>
            {/* role选择窗口 */}
            <PopWindow isOpen={isRoleChooserOpen} onClose={() => setIsRoleChooserOpen(false)}>
              <div className="flex flex-col items-center gap-4">
                <div>选择新的角色</div>
                <RoleChooser handleRoleChange={handleRoleChange} className=" menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm overflow-y-auto"></RoleChooser>
              </div>
            </PopWindow>
          </>
        )
      }
    </div>
  );
}
