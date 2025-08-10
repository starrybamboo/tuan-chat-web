import type { ChatMessageResponse, Message } from "api";
import { ExpressionChooser } from "@/components/chat/expressionChooser";
import ForwardMessage from "@/components/chat/forwardMessage";
import RoleChooser from "@/components/chat/roleChooser";
import { RoomContext } from "@/components/chat/roomContext";
import { PreviewMessage } from "@/components/chat/smallComponents/previewMessage";
import { SpaceContext } from "@/components/chat/spaceContext";
import BetterImg from "@/components/common/betterImg";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { EditableField } from "@/components/common/editableField";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetRoleQuery } from "api/queryHooks";
import React, { use, useMemo } from "react";
import { useUpdateMessageMutation } from "../../../api/hooks/chatQueryHooks";

export function ChatBubble({ chatMessageResponse, useChatBubbleStyle }: {
  /** 包含聊天消息内容、发送者等信息的数据对象 */
  chatMessageResponse: ChatMessageResponse;
  /** 控制是否应用气泡样式，默认为false */
  useChatBubbleStyle?: boolean;
}) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId);

  const role = useRoleRequest.data?.data;
  const [isExpressionChooserOpen, setIsExpressionChooserOpen] = useSearchParamsState<boolean>(`exprPop${message.messageID}`, false);
  const [isRoleChooserOpen, setIsRoleChooserOpen] = useSearchParamsState<boolean>(`roleChoosePop${message.messageID}`, false);

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalContext().userId;

  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
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

  const canEdit = userId === message.userId || spaceContext.isSpaceOwner;

  function handleAvatarClick() {
    if (canEdit) {
      setIsExpressionChooserOpen(true);
    }
  }
  function handleContentUpdate(content: string) {
    if (content.trim() === "") {
      updateMessageMutation.mutate({
        ...message,
        status: 1,
      });
    }
    else if (message.content !== content) {
      updateMessageMutation.mutate({
        ...message,
        content,
      });
    }
  }
  const imgMsg = message.extra?.imageMessage;

  const renderedContent = useMemo(() => {
    if (message.messageType === 2) {
      return (
        <div className="overflow-hidden">
          <BetterImg
            src={imgMsg?.url || message.extra?.fileMessage?.url}
            size={{ width: imgMsg?.width, height: imgMsg?.height }}
            className="max-h-[40vh] w-full"
            popWindowKey={`${message.messageID}img_${imgMsg?.url}`}
          />
          {imgMsg?.background && <div className="text-xs text-gray-500 dark:text-gray-400">已设置为背景</div>}
        </div>
      );
    }
    else if (message.messageType === 5) {
      return <ForwardMessage messageResponse={chatMessageResponse}></ForwardMessage>;
    }
    return (
      <>
        {
          message.replyMessageId
          && (
            <div className="flex flex-row gap-2 my-1 ">
              <span className="opacity-60 inline flex-shrink-0 text-sm">| 回复</span>
              <PreviewMessage
                message={message.replyMessageId}
              >
              </PreviewMessage>
            </div>
          )
        }

        <EditableField
          content={message.content}
          handleContentUpdate={handleContentUpdate}
          className="whitespace-pre-wrap editable-field overflow-auto" // 为了方便select到这个节点
          canEdit={canEdit}
          fieldId={`msg${message.messageID}`}
        >
        </EditableField>
      </>

    );
  }, [message.content, message.extra, message.messageType]);

  // @角色
  function handleRoleNameClick() {
    if (canEdit) {
      setIsRoleChooserOpen(true);
    }
    else {
      const roleName = role?.roleName?.trim() || "Undefined";
      const inputElement = document.querySelector(".chatInputTextarea") as HTMLTextAreaElement;
      if (inputElement) {
        const currentText = inputElement.value;
        const atText = `@${roleName} `;
        // 如果已经@过这个角色，就不再添加
        if (!currentText.includes(atText)) {
          inputElement.value = currentText + atText;
          inputElement.focus();
          // 触发React的状态更新
          const event = new Event("input", { bubbles: true });
          inputElement.dispatchEvent(event);
        }
      }
    }
  }

  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div
              className="flex w-full items-start gap-3 py-1"
              key={message.messageID}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 cursor-pointer" onClick={handleAvatarClick}>
                <RoleAvatarComponent
                  avatarId={message.avatarId}
                  width={10}
                  isRounded={true}
                  withTitle={false}
                  stopPopWindow={true}
                />
              </div>
              <div className="flex flex-col items-start">
                <div
                  className={`text-xs pb-1 cursor-pointer `}
                  onClick={handleRoleNameClick}
                >
                  {role?.roleName?.trim() || "Undefined"}
                </div>
                <div
                  className={`max-w-xs sm:max-w-md break-words rounded-lg px-4 py-2 shadow 
                  bg-white dark:bg-black rounded-bl-none`}
                >
                  {renderedContent}
                </div>
              </div>
            </div>
          )
        : (
            <div className="flex w-full pb-4" key={message.messageID}>
              {/* 圆角矩形头像 */}
              <div className="flex-shrink-0 mr-3">
                <div className="w-20 h-20 rounded-md overflow-hidden" onClick={handleAvatarClick}>
                  <RoleAvatarComponent
                    avatarId={message.avatarId}
                    width={20}
                    isRounded={false}
                    withTitle={false}
                    stopPopWindow={true}
                  >
                  </RoleAvatarComponent>
                </div>
              </div>
              {/* 消息内容 */}
              <div className="flex-1 overflow-auto">
                {/* 角色名 */}
                <div
                  className={`cursor-pointer font-semibold ${userId === message.userId ? "hover:underline" : ""}`}
                  onClick={handleRoleNameClick}
                >
                  {role?.roleName?.trim() || "Undefined"}
                </div>
                {renderedContent}
                {/* 时间 */}
                {/* <div className="text-xs text-gray-500 dark:text-gray-400 pt-1"> */}
                {/*  {message.createTime ?? ""} */}
                {/* </div> */}
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
                <ExpressionChooser
                  roleId={message.roleId}
                  handleExpressionChange={handleExpressionChange}
                >
                </ExpressionChooser>
              </div>
            </PopWindow>
            {/* role选择窗口 */}
            <PopWindow isOpen={isRoleChooserOpen} onClose={() => setIsRoleChooserOpen(false)}>
              <div className="flex flex-col items-center gap-4">
                <div>选择新的角色</div>
                <RoleChooser
                  handleRoleChange={role => handleRoleChange(role.roleId)}
                  className=" menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm overflow-y-auto"
                >
                </RoleChooser>
              </div>
            </PopWindow>
          </>
        )
      }
    </div>
  );
}
