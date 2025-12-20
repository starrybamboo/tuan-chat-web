import type { FigureAnimationSettings, FigurePosition } from "@/types/voiceRenderTypes";
import type { ChatMessageResponse, Message } from "../../../../api";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import RoleChooser from "@/components/chat/input/roleChooser";
import AudioMessage from "@/components/chat/message/media/AudioMessage";
import ForwardMessage from "@/components/chat/message/preview/forwardMessage";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import { VoiceRenderPanel } from "@/components/chat/message/voiceRenderPanel";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import BetterImg from "@/components/common/betterImg";
import { EditableField } from "@/components/common/editableField";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChatBubbleEllipsesOutline } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { formatTimeSmartly } from "@/utils/dateUtil";
import React, { use, useMemo, useState } from "react";
import { useUpdateMessageMutation } from "../../../../api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import ClueMessage from "./clue/clueMessage";

function ChatBubbleComponent({ chatMessageResponse, useChatBubbleStyle, threadHintMeta }: {
  /** 包含聊天消息内容、发送者等信息的数据对象 */
  chatMessageResponse: ChatMessageResponse;
  /** 控制是否应用气泡样式，默认为false */
  useChatBubbleStyle?: boolean;
  /** 当该消息被创建子区后，在其下方展示 Thread 提示条（主消息流“看起来只有一条”） */
  threadHintMeta?: { rootId: number; title: string; replyCount: number };
}) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId ?? 0);
  // 获取头像详情（包含 avatarTitle）
  const avatarQuery = useGetRoleAvatarQuery(message.avatarId ?? 0);
  const avatar = avatarQuery.data?.data;

  const role = useRoleRequest.data?.data;

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalContext().userId;

  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const useChatBubbleStyleFromStore = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  useChatBubbleStyle = useChatBubbleStyle ?? useChatBubbleStyleFromStore;

  const isThreadRoot = message.messageType === MESSAGE_TYPE.THREAD_ROOT && message.threadId === message.messageId;
  const threadTitle = (message.extra as any)?.title || message.content;
  const threadReplyCount = useMemo(() => {
    if (!isThreadRoot) {
      return 0;
    }
    const allMessages = roomContext.chatHistory?.messages ?? [];
    return allMessages.filter(m => m.message.threadId === message.messageId && m.message.messageId !== message.messageId).length;
  }, [isThreadRoot, message.messageId, roomContext.chatHistory?.messages]);

  const shouldShowThreadHint = !!threadHintMeta
    && !isThreadRoot
    // reply 不展示提示条（reply 也不会出现在主消息流，但 thread 面板里也无需显示）
    && (!message.threadId || message.threadId === message.messageId);

  const handleOpenThreadById = React.useCallback((rootId: number) => {
    // 打开 Thread 时，清除“插入消息”模式，避免错位。
    setInsertAfterMessageId(undefined);
    setThreadRootMessageId(rootId);
    setComposerTarget("thread");
    // Thread 以右侧固定分栏展示：关闭其它右侧抽屉
    setSideDrawerState("none");
  }, [setComposerTarget, setInsertAfterMessageId, setSideDrawerState, setThreadRootMessageId]);

  const threadHintNode = shouldShowThreadHint
    ? (
        <div className="mt-2">
          <div
            className="w-full rounded-md border border-base-300 bg-base-200/60 px-3 py-2 cursor-pointer hover:bg-base-200 transition-colors border-l-4 border-l-info shadow-sm"
            onClick={() => handleOpenThreadById(threadHintMeta!.rootId)}
          >
            <div className="flex items-center gap-2 text-sm text-base-content/80">
              <ChatBubbleEllipsesOutline className="w-4 h-4 opacity-70" />
              <span className="badge badge-info badge-sm">子区</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-base-content/90 truncate">
                  {threadHintMeta!.title}
                </div>
                <div className="text-xs text-base-content/60">
                  {threadHintMeta!.replyCount}
                  {" "}
                  条消息
                  <span className="mx-1">·</span>
                  <button
                    type="button"
                    className="link link-hover text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenThreadById(threadHintMeta!.rootId);
                    }}
                  >
                    查看所有子区
                  </button>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenThreadById(threadHintMeta!.rootId);
                  }}
                >
                  打开
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    : null;

  const handleOpenThreadRoot = React.useCallback(() => {
    if (!isThreadRoot) {
      return;
    }
    // 打开 Thread 时，清除“插入消息”模式，避免错位。
    setInsertAfterMessageId(undefined);
    setThreadRootMessageId(message.messageId);
    setComposerTarget("thread");
    // Thread 以右侧固定分栏展示：关闭其它右侧抽屉
    setSideDrawerState("none");
  }, [isThreadRoot, message.messageId, setComposerTarget, setInsertAfterMessageId, setSideDrawerState, setThreadRootMessageId]);

  // 角色名编辑状态
  const [isEditingRoleName, setIsEditingRoleName] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState("");

  // 判断是否为旁白（无角色）- 包括 roleId 为空/undefined/0/负数 的情况
  const isNarrator = !message.roleId || message.roleId <= 0;
  // 判断是否为黑屏文字
  const isIntroText = message.messageType === MESSAGE_TYPE.INTRO_TEXT;
  // 获取自定义角色名（如果有）
  const customRoleName = (message.webgal as any)?.customRoleName as string | undefined;
  // 获取黑屏文字的 hold 设置
  const introHold = (message.webgal as any)?.introHold as boolean | undefined;

  // 更新消息并同步到本地缓存
  function updateMessageAndSync(newMessage: Message) {
    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        // 更新成功后同步到本地 IndexedDB
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          // 如果 WebGAL 联动模式开启，则重渲染并跳转
          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
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
                roleId={message.roleId as number}
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
  function handleVoiceRenderSettingsChange(
    emotionVector: number[],
    figurePosition: FigurePosition,
    notend: boolean,
    concat: boolean,
    figureAnimation?: FigureAnimationSettings,
  ) {
    console.warn("[ChatBubble] 保存语音渲染设置:", {
      messageId: message.messageId,
      figurePosition,
      figurePositionType: typeof figurePosition,
    });

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
          notend,
          concat,
          figureAnimation,
        },
      },
    } as Message;

    console.warn("[ChatBubble] 准备发送的消息:", JSON.stringify(newMessage.webgal?.voiceRenderSettings, null, 2));

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        // 更新成功后同步到本地 IndexedDB
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
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

  // 处理音频用途切换（语音/BGM/音效）
  function handleAudioPurposeChange(purpose: string) {
    const soundMessage = message.extra?.soundMessage;
    if (!soundMessage)
      return;

    const newMessage = {
      ...message,
      extra: {
        ...message.extra,
        soundMessage: {
          ...soundMessage,
          purpose,
        },
      },
    };

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          // 如果 WebGAL 联动模式开启，则重渲染
          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
  }

  // 处理角色名编辑
  function handleRoleNameClick() {
    if (canEdit) {
      // 无需联动模式：点击角色名直接进入自定义名字编辑
      setEditingRoleName(customRoleName || role?.roleName || "");
      setIsEditingRoleName(true);
    }
    else {
      // 不可编辑时，@角色
      const roleName = role?.roleName?.trim() || "Undefined";
      const inputElement = document.querySelector(".chatInputTextarea") as HTMLTextAreaElement;
      if (inputElement) {
        const currentText = inputElement.value;
        const atText = `@${roleName} `;
        if (!currentText.includes(atText)) {
          inputElement.value = currentText + atText;
          inputElement.focus();
          const event = new Event("input", { bubbles: true });
          inputElement.dispatchEvent(event);
        }
      }
    }
  }

  // 保存自定义角色名
  function handleRoleNameSave() {
    const trimmedName = editingRoleName.trim();
    const newMessage = {
      ...message,
      webgal: {
        ...message.webgal,
        customRoleName: trimmedName || undefined, // 空字符串时清除自定义名称
      },
    } as Message;

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
    setIsEditingRoleName(false);
  }

  // 处理消息类型切换（普通文本 ↔ 黑屏文字）
  function handleToggleIntroText() {
    if (!canEdit)
      return;

    const newMessageType = isIntroText ? MESSAGE_TYPE.TEXT : MESSAGE_TYPE.INTRO_TEXT;
    const newMessage = {
      ...message,
      messageType: newMessageType,
    } as Message;

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
  }

  // 处理黑屏文字 -hold 设置切换
  function handleToggleIntroHold() {
    if (!canEdit || !isIntroText)
      return;

    const newMessage = {
      ...message,
      webgal: {
        ...message.webgal,
        introHold: !introHold,
      },
    } as Message;

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
  }

  // 切换旁白状态
  function handleToggleNarrator() {
    if (!canEdit)
      return;

    if (isNarrator) {
      // 如果当前是旁白，切换回普通角色 -> 打开角色选择器
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col items-center gap-4">
              <div>选择角色</div>
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
      // 如果当前是普通角色，切换为旁白 -> roleId设为-1
      const newMessage = {
        ...message,
        roleId: -1,
      };
      updateMessageAndSync(newMessage);
    }
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
    // 只要有内容或者类型为文本(1)或黑屏文字(9)就渲染文本编辑框
    if (message.content || message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT) {
      contentElements.push(
        <EditableField
          key="text"
          content={message.content}
          handleContentUpdate={handleContentUpdate}
          className="whitespace-pre-wrap editable-field overflow-auto"
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
      let legacyImg: any = message.extra?.imageMessage || message.extra?.fileMessage;
      // 支持扁平化 extra (如果 extra 本身包含 url)
      if (!legacyImg && (message.extra as any)?.url) {
        legacyImg = message.extra;
      }
      if (legacyImg)
        images.push(legacyImg);
    }

    if (images.length > 0) {
      contentElements.push(
        <div key="images" className="flex flex-col gap-2 mt-2 items-start">
          {images.map((img, idx) => (
            <div key={img.url || idx} className="inline-block max-w-full overflow-hidden rounded-md">
              <BetterImg
                src={img.url}
                size={{ width: img.width, height: img.height }}
                className="block max-h-[40vh] max-w-full object-left origin-left rounded-md"
              />
              {img.background && <div className="text-xs text-gray-500 dark:text-gray-400">已设置为背景</div>}
            </div>
          ))}
        </div>,
      );
    }

    // (D) 语音内容
    // 支持 Type 7 和 extra.soundMessage
    let soundMsg: any = message.extra?.soundMessage;
    // 支持扁平化 extra (如果 extra 本身包含 url 且是 SOUND 类型)
    if (!soundMsg && message.messageType === 7 && (message.extra as any)?.url) {
      soundMsg = message.extra;
    }

    if (soundMsg) {
      const currentPurpose = soundMsg.purpose || "";
      contentElements.push(
        <div key="audio" className="mt-2">
          <AudioMessage
            url={soundMsg.url || ""}
            duration={soundMsg.second}
          />
          {/* 音频类型选择器 */}
          {canEdit && (
            <div className="flex items-center gap-3 mt-1 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`audio-purpose-${message.messageId}`}
                  className="radio radio-xs"
                  checked={!currentPurpose}
                  onChange={() => handleAudioPurposeChange("")}
                />
                <span>语音</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`audio-purpose-${message.messageId}`}
                  className="radio radio-xs"
                  checked={currentPurpose === "bgm"}
                  onChange={() => handleAudioPurposeChange("bgm")}
                />
                <span>BGM</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`audio-purpose-${message.messageId}`}
                  className="radio radio-xs"
                  checked={currentPurpose === "se"}
                  onChange={() => handleAudioPurposeChange("se")}
                />
                <span>音效</span>
              </label>
            </div>
          )}
        </div>,
      );
    }

    return <div className="flex flex-col">{contentElements}</div>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.content, message.extra, message.messageType, message.messageId, message.replyMessageId]);

  const formattedTime = useMemo(() => {
    return message.updateTime ? formatTimeSmartly(message.updateTime) : "未知时间";
  }, [message.updateTime]);

  // 判断消息是否被编辑过（createTime 和 updateTime 不同）
  const isEdited = useMemo(() => {
    if (!message.createTime || !message.updateTime)
      return false;
    return message.createTime !== message.updateTime;
  }, [message.createTime, message.updateTime]);

  // 获取当前的语音渲染设置
  const voiceRenderSettings = (message.webgal as any)?.voiceRenderSettings;

  // 获取显示的角色名
  const displayRoleName = customRoleName || role?.roleName?.trim() || (isNarrator ? "" : "Undefined");

  // 黑屏文字的特殊渲染
  if (isIntroText) {
    return (
      <div className="flex w-full py-2 group">
        <div className="flex-1 min-w-0 p-2">
          {/* 黑屏文字样式：黑色背景，白色文字，居中显示 */}
          <div className="bg-black text-white rounded-lg p-4 text-center relative">
            {/* 类型标识和操作按钮 */}
            <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <>
                  <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs checkbox-primary"
                      checked={introHold ?? false}
                      onChange={handleToggleIntroHold}
                    />
                    <span className="text-white/70">保持</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost text-white/70 hover:text-white"
                    onClick={handleToggleIntroText}
                    title="切换为普通对话"
                  >
                    切换对话
                  </button>
                </>
              )}
              <span className="badge badge-xs badge-primary">黑屏文字</span>
            </div>
            {/* 内容 */}
            <EditableField
              content={message.content}
              handleContentUpdate={handleContentUpdate}
              className="whitespace-pre-wrap text-lg"
              canEdit={canEdit}
              fieldId={`msg${message.messageId}`}
            />

            {/* 时间 */}
            <div className="text-xs text-white/50 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 旁白的特殊渲染（无角色）
  if (isNarrator) {
    return (
      <div className="flex w-full py-1 group">
        <div className="flex-1 min-w-0 px-2 py-1">
          {/* 旁白样式：无头像，居中或左对齐，斜体 */}
          <div className="bg-base-200/50 rounded-lg p-2 relative">
            {/* 类型标识和操作按钮 */}
            <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* WebGAL 联动模式下显示切换黑屏按钮 */}
              {message.messageType === MESSAGE_TYPE.TEXT && canEdit && webgalLinkMode && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost text-base-content/60 hover:text-primary px-1"
                  onClick={handleToggleIntroText}
                  title="切换为黑屏文字"
                >
                  → 黑屏
                </button>
              )}
              {/* 切换为角色对话按钮 */}
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost text-base-content/60 hover:text-primary px-1"
                  onClick={handleToggleNarrator}
                  title="切换为角色对话"
                >
                  → 角色
                </button>
              )}
              {/* 根据消息类型显示不同标签 */}
              {message.messageType === MESSAGE_TYPE.EFFECT
                ? (<span className="badge badge-xs badge-info">特效</span>)
                : (<span className="badge badge-xs badge-secondary">旁白</span>)}
            </div>
            {/* 内容 - 支持文本、图片、音频等 */}
            <div className="italic text-base-content/80">
              {renderedContent}
            </div>

            {/* 时间 */}
            <div className="text-xs text-base-content/50 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Thread Root（Discord 风格提示条）
  if (isThreadRoot) {
    const creatorName = displayRoleName || role?.roleName?.trim() || "";
    return (
      <div className="w-full py-2">
        <div
          className="w-full rounded-md border border-base-300 bg-base-200/40 px-3 py-2 cursor-pointer hover:bg-base-200 transition-colors"
          onClick={handleOpenThreadRoot}
        >
          <div className="flex items-center gap-2 text-sm text-base-content/80">
            <ChatBubbleEllipsesOutline className="w-4 h-4 opacity-70" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-base-content/90">{creatorName || "某人"}</span>
              <span className="mx-1">开始了一个子区：</span>
              <span className="font-medium text-base-content/90 truncate">{threadTitle}</span>
              <button
                type="button"
                className="ml-2 link link-hover text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenThreadRoot();
                }}
              >
                查看所有子区
              </button>
            </div>
            <div className="text-xs text-base-content/50 flex-shrink-0">{formattedTime}</div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md bg-base-100/70 border border-base-300 px-2 py-1">
              <RoleAvatarComponent
                avatarId={message.avatarId ?? 0}
                width={6}
                isRounded={true}
                withTitle={false}
                stopPopWindow={true}
              />
              <div className="text-sm text-base-content/80 max-w-[60vw] sm:max-w-[360px] truncate">
                {threadTitle}
              </div>
              <div className="text-xs text-base-content/60 flex-shrink-0">
                {threadReplyCount}
                {" "}
                条消息
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  avatarId={message.avatarId ?? 0}
                  width={10}
                  isRounded={true}
                  withTitle={false}
                  stopPopWindow={true}
                />
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-4">
                  {isEditingRoleName
                    ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            className="input input-xs input-bordered w-32 bg-base-200 border-base-300 px-2 shadow-sm focus:outline-none focus:border-info"
                            value={editingRoleName}
                            onChange={e => setEditingRoleName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleRoleNameSave();
                              if (e.key === "Escape")
                                setIsEditingRoleName(false);
                            }}
                            placeholder="输入角色名"
                            autoFocus
                          />
                          <button type="button" className="btn btn-xs btn-primary" onClick={handleRoleNameSave}>✓</button>
                          <button type="button" className="btn btn-xs btn-ghost" onClick={() => setIsEditingRoleName(false)}>✕</button>
                        </div>
                      )
                    : (
                        <span
                          onClick={handleRoleNameClick}
                          className={`text-sm text-base-content/85 pb-1 cursor-pointer transition-all duration-200 hover:text-primary ${canEdit ? "hover:underline" : ""}`}
                        >
                          {displayRoleName}
                          {customRoleName && <span className="text-xs text-primary ml-1">*</span>}
                        </span>
                      )}
                  <span className="text-xs text-base-content/50 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                    {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
                    {formattedTime}
                  </span>
                </div>
                <div
                  className="max-w-xs sm:max-w-md break-words rounded-lg px-4 py-2 shadow bg-base-200 text-base transition-all duration-200 hover:shadow-lg hover:bg-base-300 cursor-pointer"
                >
                  {renderedContent}
                  {threadHintNode}
                  {/* 内嵌语音渲染设置面板 - 文本消息显示 */}
                  {message.messageType === MESSAGE_TYPE.TEXT && (
                    <VoiceRenderPanel
                      emotionVector={voiceRenderSettings?.emotionVector}
                      figurePosition={voiceRenderSettings?.figurePosition}
                      avatarTitle={avatar?.avatarTitle}
                      notend={voiceRenderSettings?.notend}
                      concat={voiceRenderSettings?.concat}
                      figureAnimation={voiceRenderSettings?.figureAnimation}
                      onChange={handleVoiceRenderSettingsChange}
                      canEdit={canEdit}
                      isIntroText={isIntroText}
                      onToggleIntroText={canEdit && webgalLinkMode ? handleToggleIntroText : undefined}
                      onToggleNarrator={canEdit && webgalLinkMode ? handleToggleNarrator : undefined}
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
                    avatarId={message.avatarId ?? 0}
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
                  {isEditingRoleName
                    ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            className="input input-sm input-bordered w-40 bg-base-200 border-base-300 px-3 shadow-sm focus:outline-none focus:border-info"
                            value={editingRoleName}
                            onChange={e => setEditingRoleName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleRoleNameSave();
                              if (e.key === "Escape")
                                setIsEditingRoleName(false);
                            }}
                            placeholder="输入角色名"
                            autoFocus
                          />
                          <button type="button" className="btn btn-sm btn-primary" onClick={handleRoleNameSave}>✓</button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setIsEditingRoleName(false)}>✕</button>
                        </div>
                      )
                    : (
                        <div
                          className={`cursor-pointer font-semibold transition-all duration-200 hover:text-primary ${userId === message.userId ? "hover:underline" : ""} min-w-0 flex-shrink`}
                          onClick={handleRoleNameClick}
                        >
                          <div className="truncate">
                            {`【${displayRoleName}】`}
                            {customRoleName && <span className="text-xs text-primary ml-1">*</span>}
                          </div>
                        </div>
                      )}
                  <div className="text-xs text-base-content/50 pt-1 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
                    {formattedTime}
                  </div>
                </div>
                <div className="transition-all duration-200 hover:bg-base-200/50 rounded-lg p-2 cursor-pointer break-words">
                  {renderedContent}
                  {threadHintNode}
                  {/* 内嵌语音渲染设置面板 - 文本消息显示 */}
                  {message.messageType === MESSAGE_TYPE.TEXT && (
                    <VoiceRenderPanel
                      emotionVector={voiceRenderSettings?.emotionVector}
                      figurePosition={voiceRenderSettings?.figurePosition}
                      avatarTitle={avatar?.avatarTitle}
                      notend={voiceRenderSettings?.notend}
                      concat={voiceRenderSettings?.concat}
                      figureAnimation={voiceRenderSettings?.figureAnimation}
                      onChange={handleVoiceRenderSettingsChange}
                      canEdit={canEdit}
                      isIntroText={isIntroText}
                      onToggleIntroText={canEdit && webgalLinkMode ? handleToggleIntroText : undefined}
                      onToggleNarrator={canEdit && webgalLinkMode ? handleToggleNarrator : undefined}
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
    && prevMsg.status === nextMsg.status
    && prevMsg.replyMessageId === nextMsg.replyMessageId
    && prevProps.useChatBubbleStyle === nextProps.useChatBubbleStyle
    && prevProps.threadHintMeta?.rootId === nextProps.threadHintMeta?.rootId
    && prevProps.threadHintMeta?.title === nextProps.threadHintMeta?.title
    && prevProps.threadHintMeta?.replyCount === nextProps.threadHintMeta?.replyCount
  );

  // 如果基础属性不相等,直接返回 false
  if (!isEqual) {
    return false;
  }

  // 深度比较 extra 对象
  if (prevMsg.extra === nextMsg.extra) {
    // 继续检查 webgal
  }
  else if (!prevMsg.extra || !nextMsg.extra) {
    return false;
  }
  else {
    // 比较 extra 的关键属性
    const prevExtra = prevMsg.extra;
    const nextExtra = nextMsg.extra;

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

    if (JSON.stringify(prevExtra.forwardMessage) !== JSON.stringify(nextExtra.forwardMessage)) {
      return false;
    }

    if (JSON.stringify(prevExtra.clueMessage) !== JSON.stringify(nextExtra.clueMessage)) {
      return false;
    }

    if (JSON.stringify(prevExtra.soundMessage) !== JSON.stringify(nextExtra.soundMessage)) {
      return false;
    }

    if (JSON.stringify(prevExtra.diceResult) !== JSON.stringify(nextExtra.diceResult)) {
      return false;
    }
  }

  // 检查 webgal 设置
  const prevWebgal = prevMsg.webgal as any;
  const nextWebgal = nextMsg.webgal as any;
  if (JSON.stringify(prevWebgal) !== JSON.stringify(nextWebgal)) {
    return false;
  }

  return true;
});

ChatBubble.displayName = "ChatBubble";
