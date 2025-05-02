import type { ChatMessageResponse, Message } from "api";
import { ExpressionChooser } from "@/components/chat/expressionChooser";
import ForwardMessage from "@/components/chat/forwardMessage";
import RoleChooser from "@/components/chat/roleChooser";
import { RoomContext } from "@/components/chat/roomContext";
import BetterImg from "@/components/common/betterImg";
import { EditableField } from "@/components/common/editableFiled";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetRoleQuery } from "api/queryHooks";
import React, { use, useMemo, useState } from "react";
import { useUpdateMessageMutation } from "../../../api/hooks/chatQueryHooks";

export function ChatBubble({ chatMessageResponse, useChatBubbleStyle }: {
  chatMessageResponse: ChatMessageResponse;
  useChatBubbleStyle?: boolean;
}) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId);

  const role = useRoleRequest.data?.data;
  const [isExpressionChooserOpen, setIsExpressionChooserOpen] = useState(false);
  const [isRoleChooserOpen, setIsRoleChooserOpen] = useState(false);

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalContext().userId;

  const roomContext = use(RoomContext);
  useChatBubbleStyle = useChatBubbleStyle || roomContext.useChatBubbleStyle;

  function handleExpressionChange(avatarId: number) {
    const newMessage: Message = {
      ...message,
      avatarId,
    };
    updateMessageMutation.mutate(newMessage, {
      onSettled: () => setIsExpressionChooserOpen(false),
    });
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

  const canEdit = userId === message.userId
    || roomContext.curMember?.userId === message.userId
    || roomContext.curMember?.memberType === 1;

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
  // console.log("render message");

  const renderedContent = useMemo(() => {
    if (message.messageType === 2) {
      return (<BetterImg src={message.extra?.imageMessage?.url} className="max-h-[40vh]" />);
    }
    else if (message.messageType === 5) {
      return <ForwardMessage messageList={message.extra?.forwardMessage?.messageList ?? []}></ForwardMessage>;
    }
    return (<EditableField content={message.content} handleContentUpdate={handleContentUpdate} className="whitespace-pre-wrap" canEdit={canEdit}></EditableField>);
  }, [message.content, message.extra, message.messageType]);

  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div className="chat chat-start" key={message.messageID}>
              <div className="avatar chat-image" onClick={handleAvatarClick}>
                <RoleAvatarComponent avatarId={message.avatarId} width={10} isRounded={true} withTitle={false} stopPopWindow={true}></RoleAvatarComponent>
              </div>
              <div className={message.messageType !== 0 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}>
                {renderedContent}
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
                {renderedContent}
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
