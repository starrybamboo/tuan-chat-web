import type { FigurePosition } from "@/types/voiceRenderTypes";
import type { ChatMessageResponse, Message } from "api";
import { ExpressionChooser } from "@/components/chat/expressionChooser";
import RoleChooser from "@/components/chat/roleChooser";
import { RoomContext } from "@/components/chat/roomContext";
import AudioMessage from "@/components/chat/smallComponents/AudioMessage";
import ForwardMessage from "@/components/chat/smallComponents/forwardMessage";
import { PreviewMessage } from "@/components/chat/smallComponents/previewMessage";
import { SpaceContext } from "@/components/chat/spaceContext";
import { VoiceRenderPanel } from "@/components/chat/voiceRenderPanel";
import BetterImg from "@/components/common/betterImg";
import { EditableField } from "@/components/common/editableField";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { formatTimeSmartly } from "@/utils/dateUtil";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "api/queryHooks";
import React, { use, useMemo } from "react";
import { useUpdateMessageMutation } from "../../../api/hooks/chatQueryHooks";
import ClueMessage from "./smallComponents/clueMessage";

function ChatBubbleComponent({ chatMessageResponse, useChatBubbleStyle }: {
  /** 包含聊天消息内容、发送者等信息的数据对象 */
  chatMessageResponse: ChatMessageResponse;
  /** 控制是否应用气泡样式，默认为false */
  useChatBubbleStyle?: boolean;
}) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId);
  // 获取头像详情（包含 avatarTitle）
  const avatarQuery = useGetRoleAvatarQuery(message.avatarId);
  const avatar = avatarQuery.data?.data;

  const role = useRoleRequest.data?.data;

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalContext().userId;

  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  useChatBubbleStyle = useChatBubbleStyle || roomContext.useChatBubbleStyle;

  // 更新消息并同步到本地缓存
  function updateMessageAndSync(newMessage: Message) {
    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        // 更新成功后同步到本地 IndexedDB
        if (response?.data && roomContext.chatHistory) {
          roomContext.chatHistory.addOrUpdateMessage({
            ...chatMessageResponse,
            message: response.data,
          });
        }
      },
    });
  }

  function handleExpressionChange(avatarId: number) {
    const newMessage: Message = {
      ...message,
      avatarId,
    };
    updateMessageAndSync(newMessage);
  }

  function handleRoleChange(new_roleId: number) {
    const newMessage: Message = {
      ...message,
      roleId: new_roleId,
      avatarId: roomContext.roomRolesThatUserOwn.find(role => role.roleId === new_roleId)?.avatarId ?? -1,
    };
    updateMessageAndSync(newMessage);
  }

  const canEdit = userId === message.userId || spaceContext.isSpaceOwner;

  function handleAvatarClick() {
    if (canEdit) {
      // 打开表情选择器的 toast 窗口
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col">
              <ExpressionChooser
                roleId={message.roleId}
                handleExpressionChange={(avatarId) => {
                  handleExpressionChange(avatarId);
                  onClose();
                }}
                handleRoleChange={(roleId) => {
                  handleRoleChange(roleId);
                  onClose();
                }}
              />
            </div>
          </RoomContext>
        ),
      );
    }
  }

  function handleContentUpdate(content: string) {
    if (message.content !== content) {
      updateMessageAndSync({
        ...message,
        content,
      });
    }
  }

  // 处理语音渲染设置更新
  function handleVoiceRenderSettingsChange(emotionVector: number[], figurePosition: FigurePosition) {
    // 判断情感向量是否改变（用于决定是否重新生成 TTS）
    const oldEmotionVector = message.webgal?.voiceRenderSettings?.emotionVector;
    const emotionVectorChanged = JSON.stringify(emotionVector) !== JSON.stringify(oldEmotionVector);

    const newMessage = {
      ...message,
      webgal: {
        ...message.webgal,
        voiceRenderSettings: {
          emotionVector,
          figurePosition,
        },
      },
    } as Message;

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        // 更新成功后同步到本地 IndexedDB
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
            webgal: {
              ...chatMessageResponse.message.webgal,
              voiceRenderSettings: {
                emotionVector,
                figurePosition,
              },
            },
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          // 如果 WebGAL 联动模式开启，则重渲染并跳转
          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, emotionVectorChanged);
          }
        }
      },
    });
  }

  const scrollToGivenMessage = roomContext.scrollToGivenMessage;

  const renderedContent = useMemo(() => {
    // 1. 特殊类型消息（独占显示）
    if (message.messageType === 5) {
      return <ForwardMessage messageResponse={chatMessageResponse}></ForwardMessage>;
    }
    else if (message.messageType === 1000) {
      return <ClueMessage messageResponse={chatMessageResponse}></ClueMessage>;
    }

    // 2. 组合消息内容 (文本 + 图片 + 语音)
    const contentElements: React.ReactNode[] = [];

    // (A) 回复引用
    if (message.replyMessageId) {
      contentElements.push(
        <div
          key="reply"
          className="flex flex-row gap-2 py-1 "
          onClick={() => (message.replyMessageId && scrollToGivenMessage) && scrollToGivenMessage(message.replyMessageId)}
        >
          <span className="opacity-60 inline flex-shrink-0 text-sm">| 回复</span>
          <PreviewMessage
            message={message.replyMessageId}
          >
          </PreviewMessage>
        </div>,
      );
    }

    // (B) 文本内容
    // 只要有内容或者类型为文本(1)就渲染文本编辑框
    if (message.content || message.messageType === 1) {
      contentElements.push(
        <EditableField
          key="text"
          content={message.content}
          handleContentUpdate={handleContentUpdate}
          className="whitespace-pre-wrap editable-field overflow-auto" // 为了方便select到这个节点
          canEdit={canEdit}
          fieldId={`msg${message.messageId}`}
        >
        </EditableField>,
      );
    }

    // (C) 图片内容
    // 仅支持单图 (Type 2)
    const images: any[] = [];
    if (message.messageType === 2) {
      let legacyImg = message.extra?.imageMessage || message.extra?.fileMessage;
      // 支持扁平化 extra (如果 extra 本身包含 url)
      if (!legacyImg && message.extra?.url) {
        legacyImg = message.extra;
      }
      if (legacyImg)
        images.push(legacyImg);
    }

    if (images.length > 0) {
      contentElements.push(
        <div key="images" className="flex flex-col gap-2 mt-2 items-start">
          {images.map((img, idx) => (
            <div key={img.url || idx} className="overflow-hidden">
              <BetterImg
                src={img.url}
                size={{ width: img.width, height: img.height }}
                className="max-h-[40vh] w-max object-left origin-left"
              />
              {img.background && <div className="text-xs text-gray-500 dark:text-gray-400">已设置为背景</div>}
            </div>
          ))}
        </div>,
      );
    }

    // (D) 语音内容
    // 支持 Type 7 和 extra.soundMessage
    let soundMsg = message.extra?.soundMessage;
    // 支持扁平化 extra (如果 extra 本身包含 url 且是 SOUND 类型)
    if (!soundMsg && message.messageType === 7 && message.extra?.url) {
      soundMsg = message.extra;
    }

    if (soundMsg) {
      contentElements.push(
        <div key="audio" className="mt-2">
          <AudioMessage
            url={soundMsg.url || ""}
            duration={soundMsg.second}
          />
        </div>,
      );
    }

    return <div className="flex flex-col">{contentElements}</div>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.content, message.extra, message.messageType, message.messageId, message.replyMessageId]);

  // @角色
  function handleRoleNameClick() {
    if (canEdit) {
      // 打开角色选择器的 toast 窗口
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col items-center gap-4">
              <div>选择新的角色</div>
              <RoleChooser
                handleRoleChange={(role) => {
                  handleRoleChange(role.roleId);
                  onClose();
                }}
                className="menu bg-base-100 rounded-box z-1 p-2 shadow-sm overflow-y-auto"
              />
            </div>
          </RoomContext>
        ),
      );
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

  const formattedTime = useMemo(() => {
    return message.updateTime ? formatTimeSmartly(message.updateTime) : "未知时间";
  }, [message.updateTime]);

  // 获取当前的语音渲染设置
  const voiceRenderSettings = (message.webgal as any)?.voiceRenderSettings;

  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div
              className="flex w-full items-start gap-1 py-2 group"
              key={message.messageId}
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
                <div className="flex items-center gap-4">
                  <span
                    onClick={handleRoleNameClick}
                    className={`text-sm text-base-content/85 pb-1 cursor-pointer transition-all duration-200 hover:text-primary ${canEdit ? "hover:underline" : ""}`}
                  >
                    {role?.roleName?.trim() || "Undefined"}
                  </span>
                  <span className="text-xs text-base-content/50 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                    {formattedTime}
                  </span>
                </div>
                <div
                  className="max-w-xs sm:max-w-md break-words rounded-lg px-4 py-2 shadow bg-base-200 text-base transition-all duration-200 hover:shadow-lg hover:bg-base-300 cursor-pointer"
                >
                  {renderedContent}
                  {/* 内嵌语音渲染设置面板 - 仅文本消息显示 */}
                  {message.messageType === 1 && (
                    <VoiceRenderPanel
                      emotionVector={voiceRenderSettings?.emotionVector}
                      figurePosition={voiceRenderSettings?.figurePosition}
                      avatarTitle={avatar?.avatarTitle}
                      onChange={handleVoiceRenderSettingsChange}
                      canEdit={canEdit}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        : (
            <div
              className="flex w-full py-2"
              key={message.messageId}
            >
              {/* 圆角矩形头像 */}
              <div className="flex-shrink-0 pr-2 sm:pr-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-md overflow-hidden" onClick={handleAvatarClick}>
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
              <div className="flex-1 min-w-0 p-1 pr-2 sm:pr-5">
                {/* 角色名 */}
                <div className="flex justify-between items-center w-full gap-2">
                  <div
                    className={`cursor-pointer font-semibold transition-all duration-200 hover:text-primary ${userId === message.userId ? "hover:underline" : ""} min-w-0 flex-shrink`}
                    onClick={handleRoleNameClick}
                  >
                    <div className="truncate">
                      { `【${role?.roleName?.trim() || "Undefined"}】`}
                    </div>
                  </div>
                  <div className="text-xs text-base-content/50 pt-1 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    {formattedTime}
                  </div>
                </div>
                <div className="transition-all duration-200 hover:bg-base-200/50 rounded-lg p-2 cursor-pointer break-words">
                  {renderedContent}
                  {/* 内嵌语音渲染设置面板 - 仅文本消息显示 */}
                  {message.messageType === 1 && (
                    <VoiceRenderPanel
                      emotionVector={voiceRenderSettings?.emotionVector}
                      figurePosition={voiceRenderSettings?.figurePosition}
                      avatarTitle={avatar?.avatarTitle}
                      onChange={handleVoiceRenderSettingsChange}
                      canEdit={canEdit}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
    </div>
  );
}

// 使用 React.memo 优化性能,避免不必要的重新渲染
// 只在 chatMessageResponse 的内容真正变化时才重新渲染
export const ChatBubble = React.memo(ChatBubbleComponent, (prevProps, nextProps) => {
  // 自定义比较函数:只比较消息的关键属性
  const prevMsg = prevProps.chatMessageResponse.message;
  const nextMsg = nextProps.chatMessageResponse.message;

  // 如果消息ID不同,肯定需要重新渲染
  if (prevMsg.messageId !== nextMsg.messageId) {
    return false;
  }

  // 检查所有可能影响渲染的属性
  const isEqual = (
    prevMsg.content === nextMsg.content
    && prevMsg.avatarId === nextMsg.avatarId
    && prevMsg.roleId === nextMsg.roleId
    && prevMsg.updateTime === nextMsg.updateTime
    && prevMsg.messageType === nextMsg.messageType
    && prevMsg.status === nextMsg.status // 新增: 检查消息状态(删除/正常)
    && prevMsg.replyMessageId === nextMsg.replyMessageId // 新增: 检查回复消息ID
    && prevProps.useChatBubbleStyle === nextProps.useChatBubbleStyle
  );

  // 如果基础属性不相等,直接返回 false
  if (!isEqual) {
    return false;
  }

  // 深度比较 extra 对象
  // 如果两者都没有 extra,或者都是同一个引用,则相等
  if (prevMsg.extra === nextMsg.extra) {
    return true;
  }

  // 如果一个有 extra 另一个没有,则不相等
  if (!prevMsg.extra || !nextMsg.extra) {
    return false;
  }

  // 比较 extra 的关键属性
  const prevExtra = prevMsg.extra;
  const nextExtra = nextMsg.extra;

  // 检查 imageMessage
  if (prevExtra.imageMessage !== nextExtra.imageMessage) {
    if (!prevExtra.imageMessage || !nextExtra.imageMessage) {
      return false;
    }
    if (prevExtra.imageMessage.url !== nextExtra.imageMessage.url
      || prevExtra.imageMessage.background !== nextExtra.imageMessage.background
      || prevExtra.imageMessage.width !== nextExtra.imageMessage.width
      || prevExtra.imageMessage.height !== nextExtra.imageMessage.height) {
      return false;
    }
  }

  // 检查 fileMessage
  if (prevExtra.fileMessage !== nextExtra.fileMessage) {
    if (!prevExtra.fileMessage && !nextExtra.fileMessage) {
      // 都没有,继续检查其他属性
    }
    else if (!prevExtra.fileMessage || !nextExtra.fileMessage) {
      return false;
    }
    else if (prevExtra.fileMessage.url !== nextExtra.fileMessage.url) {
      return false;
    }
  }

  // 检查 forwardMessage - 使用 JSON 序列化比较
  if (JSON.stringify(prevExtra.forwardMessage) !== JSON.stringify(nextExtra.forwardMessage)) {
    return false;
  }

  // 检查 clueMessage
  if (JSON.stringify(prevExtra.clueMessage) !== JSON.stringify(nextExtra.clueMessage)) {
    return false;
  }

  // 检查 soundMessage
  if (JSON.stringify(prevExtra.soundMessage) !== JSON.stringify(nextExtra.soundMessage)) {
    return false;
  }

  // 检查 diceResult
  if (JSON.stringify(prevExtra.diceResult) !== JSON.stringify(nextExtra.diceResult)) {
    return false;
  }

  // 检查 voiceRenderSettings
  const prevVoiceSettings = (prevMessage.webgal as any)?.voiceRenderSettings;
  const nextVoiceSettings = (nextMessage.webgal as any)?.voiceRenderSettings;
  if (JSON.stringify(prevVoiceSettings) !== JSON.stringify(nextVoiceSettings)) {
    return false;
  }

  return true;
});

ChatBubble.displayName = "ChatBubble";
