import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/chatInputArea";

import type { RealtimeRenderOrchestratorApi } from "@/components/chat/realtimeRenderOrchestrator";
import type { RoomContextType } from "@/components/chat/roomContext";
import type { ClueMessage } from "api/models/ClueMessage";
import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, SpaceMember, UserRole } from "../../../api";
// hooks (local)
import ChatFrame from "@/components/chat/chatFrame";
import useChatInputStatus from "@/components/chat/hooks/useChatInputStatus";
import { useChatHistory } from "@/components/chat/indexedDB/useChatHistory";
import RealtimeRenderOrchestrator from "@/components/chat/realtimeRenderOrchestrator";
import RoomComposerPanel from "@/components/chat/roomComposerPanel";
import { RoomContext } from "@/components/chat/roomContext";
import RoomHeaderBar from "@/components/chat/roomHeaderBar";
import RoomPopWindows from "@/components/chat/roomPopWindows";
import RoomSideDrawerGuards from "@/components/chat/roomSideDrawerGuards";
import RoomSideDrawers from "@/components/chat/roomSideDrawers";
import useGetRoleSmartly from "@/components/chat/smallComponents/useGetRoleName";
import { SpaceContext } from "@/components/chat/spaceContext";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { sendLlmStreamMessage } from "@/components/chat/utils/llmUtils";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor, { isCommand } from "@/components/common/dicer/cmdPre";
import { useGlobalContext } from "@/components/globalContextProvider";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";
import { MessageType } from "api/wsModels";
// *** 导入新组件及其 Handle 类型 ***
import React, { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  useAddRoomRoleMutation,
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomModuleRoleQuery,
  useGetRoomRoleQuery,
  useGetSpaceInfoQuery,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "../../../api/queryHooks";

// const PAGE_SIZE = 50; // 每页消息数量
export function RoomWindow({ roomId, spaceId, targetMessageId, onSelectRoom }: { roomId: number; spaceId: number; targetMessageId?: number | null; onSelectRoom?: (roomId: number) => void }) {
  const spaceContext = use(SpaceContext);

  const space = useGetSpaceInfoQuery(spaceId).data?.data;
  const room = useGetRoomInfoQuery(roomId).data?.data;

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const webSocketUtils = globalContext.websocketUtils;
  const send = useCallback((message: ChatMessageRequest) => {
    webSocketUtils.send({ type: 3, data: message }); // 发送群聊消息
  }, [webSocketUtils]);

  // 用于插入消息功能的 mutations
  const sendMessageMutation = useSendMessageMutation(roomId);
  const updateMessageMutation = useUpdateMessageMutation();

  const chatInputRef = useRef<ChatInputAreaHandle>(null);
  const atMentionRef = useRef<AtMentionHandle>(null);

  // 输入区编辑态：放入 zustand store，避免 RoomWindow 每次敲字重渲染
  const resetChatInputUi = useChatInputUiStore(state => state.reset);
  // 附件/发送选项：放入 zustand store，避免 RoomWindow 因附件变化整体重渲染
  const resetChatComposer = useChatComposerStore(state => state.reset);

  const delayTimer = useRef<NodeJS.Timeout | null>(null);

  // *** ChatInputArea 的回调处理器 ***
  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    useChatInputUiStore.getState().setSnapshot({
      plainText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: roles,
    });
    // 检查 @ 提及触发
    atMentionRef.current?.onInput();
  }, []); // 空依赖，因为 setter 函数是稳定的

  /**
   * *** setInputText 现在调用 ref API ***
   * 如果想从外部控制输入框的内容，使用这个函数。
   * @param text 想要重置的inputText (注意：这里现在只接受纯文本，如果需要 HTML 请修改)
   */
  const setInputText = (text: string) => {
    chatInputRef.current?.setContent(text); // 命令子组件更新其 DOM
    chatInputRef.current?.triggerSync(); // 同步到 store
  };

  // 切换房间时清空输入区编辑态，避免跨房间串输入
  useEffect(() => {
    resetChatInputUi();
    resetChatComposer();
    return () => {
      resetChatInputUi();
      resetChatComposer();
    };
  }, [resetChatInputUi, resetChatComposer, roomId]);

  const uploadUtils = new UploadUtils();

  // 切换房间时清空引用消息 / 插入位置 / Thread 弹窗开关
  useLayoutEffect(() => {
    useRoomUiStore.getState().reset();
  }, [roomId]);

  // 获取用户的所有角色
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  // 获取当前群聊中的所有角色
  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  // 获取当前群聊中的所有NPC角色
  const roomNpcRolesQuery = useGetRoomModuleRoleQuery(roomId);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);
  // 用户拥有的角色 + 所有NPC角色
  const roomRolesThatUserOwn = useMemo(() => {
    // 先获取用户拥有的玩家角色
    const playerRoles = spaceContext.isSpaceOwner
      ? roomRoles
      : roomRoles.filter(role => userRoles.some(userRole => userRole.roleId === role.roleId));
    // 合并玩家角色和NPC角色
    return [...playerRoles, ...roomNpcRoles];
  }, [roomRoles, roomNpcRoles, spaceContext.isSpaceOwner, userRoles]);

  // 房间ID到角色ID、角色ID到头像ID 的映射（持久化）
  const curRoleIdMap = useRoomRoleSelectionStore(state => state.curRoleIdMap);
  const curAvatarIdMap = useRoomRoleSelectionStore(state => state.curAvatarIdMap);
  const setCurRoleIdForRoom = useRoomRoleSelectionStore(state => state.setCurRoleIdForRoom);
  const setCurAvatarIdForRole = useRoomRoleSelectionStore(state => state.setCurAvatarIdForRole);

  const curRoleId = curRoleIdMap[roomId] ?? roomRolesThatUserOwn[0]?.roleId ?? -1;
  const setCurRoleId = useCallback((roleId: number) => {
    setCurRoleIdForRoom(roomId, roleId);
  }, [roomId, setCurRoleIdForRoom]);

  const curAvatarId = curAvatarIdMap[curRoleId] ?? -1;
  const setCurAvatarId = useCallback((_avatarId: number) => {
    setCurAvatarIdForRole(curRoleId, _avatarId);
  }, [curRoleId, setCurAvatarIdForRole]);

  // 渲染对话
  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);

  // RealtimeRender 编排：用独立组件隔离 useEffect/订阅，避免 RoomWindow 被 status/initProgress/previewUrl 等高频变化拖着重渲染
  const realtimeRenderApiRef = useRef<RealtimeRenderOrchestratorApi | null>(null);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);

  const handleRealtimeRenderApiChange = useCallback((api: RealtimeRenderOrchestratorApi) => {
    realtimeRenderApiRef.current = api;
  }, []);

  const handleToggleRealtimeRender = useCallback(async () => {
    await realtimeRenderApiRef.current?.toggleRealtimeRender();
  }, []);

  const handleStopRealtimeRender = useCallback(() => {
    realtimeRenderApiRef.current?.stopRealtimeRender();
  }, []);

  // 获取当前群聊的成员列表
  const membersQuery = useGetMemberListQuery(roomId);
  const spaceMembers = useMemo(() => {
    return spaceContext.spaceMembers ?? [];
  }, [spaceContext.spaceMembers]);
  const members: SpaceMember[] = useMemo(() => {
    const members = membersQuery.data?.data ?? [];
    return members.map((member) => {
      const spaceMember = spaceMembers.find(m => m.userId === member.userId);
      return {
        ...member,
        ...spaceMember,
      };
    });
  }, [membersQuery.data?.data, spaceMembers]);

  // 全局登录用户对应的member
  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);

  // 与 sideDrawer 相关的副作用迁移到独立组件 RoomSideDrawerGuards，避免 RoomWindow 订阅 sideDrawerState

  /**
   * 获取历史消息
   */
  const chatHistory = useChatHistory(roomId);
  const historyMessages: ChatMessageResponse[] = chatHistory?.messages;

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollToGivenMessage = useCallback((messageId: number) => {
    const messageIndex = historyMessages.findIndex(m => m.message.messageId === messageId);
    if (messageIndex >= 0) {
      virtuosoRef.current?.scrollToIndex(messageIndex);
    }
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        // ... (highlight animation logic as-is) ...
        messageElement.classList.add("highlight-animation");
        messageElement.addEventListener("animationend", () => {
          messageElement.classList.remove("highlight-animation");
        }, { once: true });
      }
    }, 50);
  }, [historyMessages]);

  // 如果 URL 中有 targetMessageId，自动跳转到该消息
  const hasScrolledToTargetRef = useRef(false);
  useEffect(() => {
    if (targetMessageId && historyMessages.length > 0 && !chatHistory?.loading && !hasScrolledToTargetRef.current) {
      const messageExists = historyMessages.some(m => m.message.messageId === targetMessageId);
      if (messageExists) {
        // 延迟一点确保 Virtuoso 已经渲染完成，同时避免重复定时器
        if (delayTimer.current) {
          clearTimeout(delayTimer.current);
        }
        delayTimer.current = setTimeout(() => {
          scrollToGivenMessage(targetMessageId);
          delayTimer.current = null;
        }, 100);
        hasScrolledToTargetRef.current = true;
      }
    }
    return () => {
      if (delayTimer.current) {
        clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
    };
  }, [targetMessageId, historyMessages, chatHistory?.loading, scrollToGivenMessage]);

  // WebGAL 跳转到指定消息（具体是否可用仍由 isRealtimeRenderActive 控制）
  const jumpToMessageInWebGAL = useCallback((messageId: number): boolean => {
    return realtimeRenderApiRef.current?.jumpToMessage(messageId) ?? false;
  }, []);

  // WebGAL 更新消息渲染设置并重新渲染跳转（具体是否可用仍由 isRealtimeRenderActive 控制）
  const updateAndRerenderMessageInWebGAL = useCallback(async (
    message: ChatMessageResponse,
    regenerateTTS: boolean = false,
  ): Promise<boolean> => {
    return await realtimeRenderApiRef.current?.updateAndRerenderMessage(message, regenerateTTS) ?? false;
  }, []);

  const roomContext: RoomContextType = useMemo((): RoomContextType => {
    return {
      roomId,
      roomMembers: members,
      curMember,
      roomRolesThatUserOwn,
      curRoleId,
      curAvatarId,
      spaceId,
      chatHistory,
      scrollToGivenMessage,
      // WebGAL 跳转功能 - 只有在实时渲染激活时才启用
      jumpToMessageInWebGAL: isRealtimeRenderActive ? jumpToMessageInWebGAL : undefined,
      // WebGAL 更新渲染并跳转 - 只有在实时渲染激活时才启用
      updateAndRerenderMessageInWebGAL: isRealtimeRenderActive ? updateAndRerenderMessageInWebGAL : undefined,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, spaceId, chatHistory, scrollToGivenMessage, isRealtimeRenderActive, jumpToMessageInWebGAL, updateAndRerenderMessageInWebGAL]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  // 判断是否是观战成员 (memberType >= 3)
  const isSpectator = (curMember?.memberType ?? 3) >= 3;

  const { myStatus: myStatue, handleManualStatusChange } = useChatInputStatus({
    roomId,
    userId,
    webSocketUtils,
    inputTextSource: {
      get: () => useChatInputUiStore.getState().plainText,
      subscribe: (listener) => {
        return useChatInputUiStore.subscribe((state, prev) => {
          if (state.plainText !== prev.plainText) {
            listener(state.plainText);
          }
        });
      },
    },
    isSpectator, // 观战成员不发送状态
  });

  /**
   * ai自动补全
   */
  const llmMessageRef = useRef("");
  const isAutoCompletingRef = useRef(false);
  const hintNodeRef = useRef<HTMLSpanElement | null>(null); // Ref for the hint span itself
  const justAcceptedRewriteRef = useRef(false); // 标记刚刚接受了重写，防止触发自动补全

  // AI重写相关状态
  const originalTextBeforeRewriteRef = useRef(""); // 保存重写前的原文

  const setLLMMessage = (newLLMMessage: string) => {
    if (hintNodeRef.current) {
      hintNodeRef.current.remove(); // 移除旧的提示节点
    }
    llmMessageRef.current = newLLMMessage;

    // 创建容器用于包含补全文本和提示词
    const containerNode = document.createElement("span");
    containerNode.contentEditable = "false";
    containerNode.style.pointerEvents = "none";

    // 创建补全文本节点
    const hintNode = document.createElement("span");
    hintNode.textContent = newLLMMessage;
    hintNode.className = "opacity-60";

    // 创建提示词节点 (只在有补全内容时显示)
    const tipsNode = document.createElement("span");
    tipsNode.textContent = newLLMMessage ? " [Tab 接受]" : "";
    tipsNode.className = "opacity-40 text-xs";
    tipsNode.style.marginLeft = "4px";

    // 将补全文本和提示词添加到容器
    containerNode.appendChild(hintNode);
    if (newLLMMessage) {
      containerNode.appendChild(tipsNode);
    }

    // *** 调用 ref API 插入节点 ***
    chatInputRef.current?.insertNodeAtCursor(containerNode);
    hintNodeRef.current = containerNode; // 保存对新节点的引用

    const handleInput = () => {
      containerNode.remove();
      chatInputRef.current?.getRawElement()?.removeEventListener("input", handleInput);
      isAutoCompletingRef.current = false;
      hintNodeRef.current = null;
    };
    // *** 监听子组件的原始元素 ***
    chatInputRef.current?.getRawElement()?.addEventListener("input", handleInput);
  };

  const getRoleSmartly = useGetRoleSmartly();

  const autoComplete = async () => {
    if (isAutoCompletingRef.current || !chatInputRef.current)
      return;

    isAutoCompletingRef.current = true;
    setLLMMessage("");

    // *** 调用 ref API 获取文本 ***
    const { before: beforeMessage, after: afterMessage } = chatInputRef.current.getTextAroundCursor();

    const historyMessagesString = (await Promise.all(
      historyMessages.slice(historyMessages.length - 20).map(async (m) => {
        const roleId = m.message.roleId;
        if (typeof roleId !== "number") {
          return `旁白: ${m.message.content}`;
        }

        const role = await getRoleSmartly(roleId);
        return `${role?.roleName ?? role?.roleId}: ${m.message.content}`;
      }),
    )).join("\n");
    const insertAtMiddle = afterMessage !== "";
    const curRoleName = userRoles?.find(r => r.roleId === curRoleId)?.roleName;
    const currentPlainText = useChatInputUiStore.getState().plainText;
    const prompt = `
      你现在在进行一个跑团对话，请根据以下文本内容，提供一段自然连贯的${insertAtMiddle ? "插入语句" : "续写"}。
      重点关注上下文的逻辑和主题发展。只提供续写内容，不要额外解释，不要输入任何多余不属于跑团内容的文本信息。
      这是已有的历史聊天信息：
      === 聊天记录开始 ===
      ${historyMessagesString}.
      === 聊天记录结束 ===
      这是你所扮演的角色的名字：${curRoleName}.
      你所输出的文本会被直接插入到已输入的文字${insertAtMiddle ? "中间" : "末尾"}，所以也不要重复已有文本的任何句子或词语。
      ${insertAtMiddle ? `插入点前的文本：${beforeMessage},插入点后的文本${afterMessage}` : `已输入的文本内容：${currentPlainText}`}`;
    sendLlmStreamMessage(prompt, (newContent) => {
      if (!isAutoCompletingRef.current)
        return false;
      setLLMMessage(newContent);
      return true;
    });
  };

  const insertLLMMessageIntoText = () => {
    if (!chatInputRef.current)
      return;

    // 移除提示 span
    if (hintNodeRef.current) {
      hintNodeRef.current.remove();
      hintNodeRef.current = null;
    }

    // 检查是否是重写模式（有原文保存）
    if (originalTextBeforeRewriteRef.current) {
      // 重写模式：直接设置为重写后的文本
      const rewriteText = llmMessageRef.current.replace(/\u200B/g, ""); // 移除零宽字符
      setInputText(rewriteText);
      // 同步更新 DOM
      if (chatInputRef.current?.getRawElement()) {
        chatInputRef.current.getRawElement()!.textContent = rewriteText;
      }
      originalTextBeforeRewriteRef.current = ""; // 清空原文记录
      justAcceptedRewriteRef.current = true; // 标记刚刚接受了重写
      toast.success("已接受重写");
    }
    else {
      // 补全模式：插入到光标位置
      chatInputRef.current.insertNodeAtCursor(llmMessageRef.current, { moveCursorToEnd: true });
    }

    setLLMMessage(""); // 清空补全状态
    chatInputRef.current.triggerSync(); // 手动触发同步，更新 store
  };

  // AI重写：显示为虚影预览
  const handleQuickRewrite = async (prompt: string) => {
    const currentPlainText = useChatInputUiStore.getState().plainText;
    if (!currentPlainText.trim()) {
      toast.error("请先输入内容");
      return;
    }

    // 如果已有虚影补全，先清除
    if (llmMessageRef.current) {
      setLLMMessage("");
    }

    originalTextBeforeRewriteRef.current = currentPlainText; // 保存原文

    try {
      const fullPrompt = `${prompt}\n\n请根据上述要求重写以下文本：\n${currentPlainText}`;

      // 清空输入框，插入零宽字符作为锚点
      const rawElement = chatInputRef.current?.getRawElement();
      if (rawElement) {
        rawElement.textContent = "\u200B"; // 零宽空格
        rawElement.focus();
        // 光标移到末尾
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(rawElement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setInputText("\u200B");

      sendLlmStreamMessage(fullPrompt, (newContent) => {
        // 先清除零宽字符
        if (rawElement && rawElement.textContent === "\u200B") {
          rawElement.textContent = "";
        }
        // 显示为虚影
        setLLMMessage(newContent);
        return true;
      });

      toast.success("重写完成，按 Tab 接受或 Esc 取消");
    }
    catch (error) {
      toast.error(`AI重写失败: ${error}`);
      // 恢复原文
      setInputText(originalTextBeforeRewriteRef.current);
      originalTextBeforeRewriteRef.current = "";
    }
  };

  /**
   *处理与组件的各种交互
   */
  const handleSelectCommand = (cmdName: string) => {
    const prefixChar = useChatInputUiStore.getState().plainText[0] || "."; // 默认为 .
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const notMember = ((members.find(member => member.userId === userId)?.memberType ?? 3) >= 3); // 没有权限
  const noRole = curRoleId <= 0;

  /**
   * 发送消息的辅助函数
   * 如果设置了 insertAfterMessageId，则使用 HTTP API 发送并更新 position
   * 否则使用 WebSocket 发送
   */
  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
    const insertAfterMessageId = useRoomUiStore.getState().insertAfterMessageId;

    if (insertAfterMessageId && historyMessages) {
      // 找到目标消息的索引
      const targetIndex = historyMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
      if (targetIndex === -1) {
        // 如果找不到目标消息，降级为普通发送
        send(message);
        return;
      }

      try {
        // 使用 HTTP API 发送消息
        const result = await sendMessageMutation.mutateAsync(message);
        if (!result.success || !result.data) {
          toast.error("发送消息失败");
          return;
        }

        const newMessage = result.data;

        // 计算新消息的 position
        const targetMessage = historyMessages[targetIndex];
        const nextMessage = historyMessages[targetIndex + 1];
        const targetPosition = targetMessage.message.position;
        const nextPosition = nextMessage?.message.position ?? targetPosition + 1;
        const newPosition = (targetPosition + nextPosition) / 2;

        // 更新消息的 position
        await updateMessageMutation.mutateAsync({
          ...newMessage,
          position: newPosition,
        });

        // 手动更新本地缓存（构建 ChatMessageResponse 格式）
        if (chatHistory) {
          const updatedMessage: ChatMessageResponse = {
            message: {
              ...newMessage,
              position: newPosition,
            },
          };
          chatHistory.addOrUpdateMessage(updatedMessage);
        }
      }
      catch (error) {
        console.error("插入消息失败:", error);
        toast.error("插入消息失败");
      }
    }
    else {
      // 普通发送
      send(message);
    }
  }, [historyMessages, send, sendMessageMutation, updateMessageMutation, chatHistory]);

  const handleMessageSubmit = async () => {
    const {
      plainText: inputText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: mentionedRolesInInput,
    } = useChatInputUiStore.getState();

    const {
      imgFiles,
      emojiUrls,
      audioFile,
      sendAsBackground,
      audioPurpose,
      setImgFiles,
      setEmojiUrls,
      setAudioFile,
      setSendAsBackground,
      setAudioPurpose,
    } = useChatComposerStore.getState();

    const noInput = !(inputText.trim() || imgFiles.length > 0 || emojiUrls.length > 0 || audioFile);

    const {
      webgalLinkMode,
      dialogNotend,
      dialogConcat,
      defaultFigurePositionMap,
    } = useRoomPreferenceStore.getState();

    const currentDefaultFigurePosition = defaultFigurePositionMap[curRoleId];

    // WebGAL 联动模式下允许无角色发送（作为旁白）
    const disableSendMessage = (noRole && !webgalLinkMode) || notMember || noInput || isSubmitting;

    if (disableSendMessage) {
      if (notMember)
        toast.error("您是观战，不能发送消息");
      else if (noRole && !webgalLinkMode)
        toast.error("请先拉入你的角色，之后才能发送消息。");
      else if (noInput)
        toast.error("请输入内容");
      else if (isSubmitting)
        toast.error("正在发送中，请稍等");
      return;
    }
    if (inputText.length > 1024) {
      toast.error("输入内容过长, 最长未1024个字符");
      return;
    }
    setIsSubmitting(true);
    try {
      const uploadedImages: any[] = [];

      // 1. 上传图片
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        const { width, height, size } = await getImageSize(imgFiles[i]);
        uploadedImages.push({ url: imgDownLoadUrl, width, height, size, fileName: imgFiles[i].name });
      }
      setImgFiles([]);

      // 2. 上传表情 (视为图片)
      for (let i = 0; i < emojiUrls.length; i++) {
        const { width, height, size } = await getImageSize(emojiUrls[i]);
        uploadedImages.push({ url: emojiUrls[i], width, height, size, fileName: "emoji" });
      }
      setEmojiUrls([]);

      // 3. 上传语音
      let soundMessageData: any = null;
      if (audioFile) {
        const audio = new Audio(URL.createObjectURL(audioFile));
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => resolve(null);
        });
        const duration = audio.duration;
        const url = await uploadUtils.uploadAudio(audioFile, 1, 60);
        soundMessageData = {
          url,
          second: Math.round(duration),
          fileName: audioFile.name,
          size: audioFile.size,
        };
        setAudioFile(null);
      }

      // 4. 构建并发送消息
      const finalReplyId = useRoomUiStore.getState().replyMessage?.messageId || undefined;
      let isFirstMessage = true;

      const getCommonFields = () => {
        const fields: Partial<ChatMessageRequest> = {
          roomId,
          roleId: curRoleId,
          avatarId: curAvatarId,
        };

        if (isFirstMessage) {
          fields.replayMessageId = finalReplyId;
          if (webgalLinkMode) {
            const voiceRenderSettings = {
              ...(currentDefaultFigurePosition ? { figurePosition: currentDefaultFigurePosition } : {}),
              ...(dialogNotend ? { notend: true } : {}),
              ...(dialogConcat ? { concat: true } : {}),
            };

            if (Object.keys(voiceRenderSettings).length > 0) {
              fields.webgal = { voiceRenderSettings };
            }
          }
          isFirstMessage = false;
        }
        return fields;
      };

      let textContent = inputText.trim();
      if (textContent && isCommand(textContent)) {
        commandExecutor({ command: inputTextWithoutMentions, mentionedRoles: mentionedRolesInInput, originMessage: inputText });
        // 指令执行也被视为一次"发送"，消耗掉 firstMessage 状态
        isFirstMessage = false;
        textContent = "";
      }

      // B. 发送图片
      for (const img of uploadedImages) {
        const imgMsg: ChatMessageRequest = {
          ...getCommonFields() as any,
          content: textContent,
          messageType: MessageType.IMG,
          extra: {
            url: img.url,
            width: img.width,
            height: img.height,
            size: img.size,
            fileName: img.fileName,
            background: sendAsBackground,
          },
        };
        await sendMessageWithInsert(imgMsg);
        textContent = "";
      }

      // C. 发送音频
      if (soundMessageData) {
        const audioMsg: ChatMessageRequest = {
          ...getCommonFields() as any,
          content: textContent,
          messageType: MessageType.SOUND,
          extra: {
            ...soundMessageData,
            purpose: audioPurpose,
          },
        };
        await sendMessageWithInsert(audioMsg);
        textContent = "";
      }

      // A. 发送文本 (如果前面没有被图片或语音消耗掉)
      if (textContent) {
        const textMsg: ChatMessageRequest = {
          ...getCommonFields() as any,
          content: textContent,
          messageType: MessageType.TEXT,
          extra: {},
        };
        await sendMessageWithInsert(textMsg);
      }

      setInputText(""); // 调用重构的 setInputText 来清空
      useRoomUiStore.getState().setReplyMessage(undefined);
      setSendAsBackground(false);
      setAudioPurpose(undefined);
      useRoomUiStore.getState().setInsertAfterMessageId(undefined); // 清除插入位置
    }
    catch (e: any) {
      toast.error(e.message + e.stack, { duration: 3000 });
    }
    finally {
      setIsSubmitting(false);
    }
  };

  // 线索消息发送
  const handleClueSend = (clue: ClueMessage) => {
    const clueMessage: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      messageType: 1000,
      content: "",
      avatarId: curAvatarId,
      extra: {
        img: clue.img,
        name: clue.name,
        description: clue.description,
      },
    };
    send(clueMessage);
  };

  // *** 新增: onPasteFiles 的回调处理器 ***
  const handlePasteFiles = (files: File[]) => {
    useChatComposerStore.getState().updateImgFiles((draft) => {
      draft.push(...files);
    });
  };

  const isComposingRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 检查 @ 控制器是否打开并且是否处理了这个事件
    const isAtOpen = atMentionRef.current?.isDialogOpen() ?? false;
    if (isAtOpen) {
      const handled = atMentionRef.current?.onKeyDown(e) ?? false;
      if (handled) {
        return; // 事件已被 @ 控制器消耗（例如箭头导航）
      }
    }

    // Esc 键：取消重写，恢复原文
    if (e.key === "Escape" && originalTextBeforeRewriteRef.current) {
      e.preventDefault();
      setInputText(originalTextBeforeRewriteRef.current);
      originalTextBeforeRewriteRef.current = "";
      setLLMMessage("");
      toast("已取消重写", { icon: "ℹ️" });
      return;
    }

    // 如果 @ 控制器未处理，则继续执行原始逻辑
    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      handleMessageSubmit();
    }
    else if (e.altKey && e.key === "p") {
      e.preventDefault(); // 阻止浏览器默认行为
      autoComplete();
    }
    else if (e.key === "Tab") {
      e.preventDefault();
      insertLLMMessageIntoText();
      isAutoCompletingRef.current = false;
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // 总是通知 @ 控制器关于 keyup 事件
    atMentionRef.current?.onKeyUp(e);

    // 按Tab键触发虚影补全（但不在刚接受重写后触发，也不在输入只有零宽字符时触发）
    const currentPlainText = useChatInputUiStore.getState().plainText;
    const hasRealContent = currentPlainText.trim() && currentPlainText !== "\u200B";
    if (e.key === "Tab" && !llmMessageRef.current && !isAutoCompletingRef.current && hasRealContent && !justAcceptedRewriteRef.current) {
      e.preventDefault();
      autoComplete();
    }

    // 重置刚接受重写的标记
    if (e.key === "Tab" && justAcceptedRewriteRef.current) {
      justAcceptedRewriteRef.current = false;
    }

    // 快捷键阻止 (父组件逻辑)
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b": case "i": case "u":
          e.preventDefault();
          break;
      }
    }
  };

  function handleMouseDown(e: React.MouseEvent) {
    // 检查 @ 控制器是否处理了 mousedown（以防止失焦）
    atMentionRef.current?.onMouseDown(e);
  }

  const [isRoleHandleOpen, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { toast("添加角色成功"); },
    });
  };

  // *** 准备 props ***
  const placeholderText = notMember
    ? "你是观战成员，不能发送消息"
    : (noRole
        ? "请先拉入你的角色，之后才能发送消息。"
        : (curAvatarId <= 0 ? "请为你的角色添加至少一个表情差分（头像）。" : "在此输入消息...(shift+enter 换行，tab触发AI续写，上方工具栏可进行AI重写)"));

  const handleSendEffect = useCallback((effectName: string) => {
    // 特效消息不需要角色信息，类似旁白
    // 注意：extra 应该直接是 EffectMessage 对象，后端会自动包装到 MessageExtra 中
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: `[特效: ${effectName}]`,
      messageType: MessageType.EFFECT,
      extra: {
        effectName,
      },
    });
  }, [roomId, send]);

  const handleClearBackground = useCallback(() => {
    // 清除背景不需要角色信息，类似旁白
    // 注意：extra 应该直接是 EffectMessage 对象，后端会自动包装到 MessageExtra 中
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[清除背景]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearBackground",
      },
    });
    toast.success("已清除背景");
  }, [roomId, send]);

  const handleClearFigure = useCallback(() => {
    // 清除角色立绘不需要角色信息，类似旁白
    // 注意：extra 应该直接是 EffectMessage 对象，后端会自动包装到 MessageExtra 中
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[清除立绘]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearFigure",
      },
    });
    // 如果实时渲染开启，立即清除立绘
    if (isRealtimeRenderActive) {
      realtimeRenderApiRef.current?.clearFigure();
    }
    toast.success("已清除立绘");
  }, [isRealtimeRenderActive, roomId, send]);

  return (
    <RoomContext value={roomContext}>
      <RoomSideDrawerGuards spaceId={spaceId} />
      <RealtimeRenderOrchestrator
        spaceId={spaceId}
        roomId={roomId}
        room={room}
        roomRoles={roomRoles}
        historyMessages={historyMessages}
        chatHistoryLoading={!!chatHistory?.loading}
        onApiChange={handleRealtimeRenderApiChange}
      />
      <div className="flex flex-col h-full w-full shadow-sm min-h-0">
        <RoomHeaderBar
          roomName={room?.name}
          toggleLeftDrawer={spaceContext.toggleLeftDrawer}
        />
        <div className="h-px bg-base-300"></div>
        <div className="flex-1 w-full flex bg-base-100 relative min-h-0">
          <div className="flex flex-col flex-1 h-full">
            {/* 聊天框 */}
            <div className="bg-base-100 flex-1 flex-shrink-0">
              <ChatFrame
                key={roomId}
                virtuosoRef={virtuosoRef}
              >
              </ChatFrame>
            </div>
            <div className="h-px bg-base-300 flex-shrink-0"></div>
            {/* 输入区域 */}
            <RoomComposerPanel
              roomId={roomId}
              userId={userId}
              webSocketUtils={webSocketUtils}
              handleSelectCommand={handleSelectCommand}
              ruleId={space?.ruleId ?? -1}
              virtuosoRef={virtuosoRef as any}
              handleMessageSubmit={handleMessageSubmit}
              onAIRewrite={handleQuickRewrite}
              currentChatStatus={myStatue as any}
              onChangeChatStatus={handleManualStatusChange}
              isSpectator={isSpectator}
              onToggleRealtimeRender={handleToggleRealtimeRender}
              onSendEffect={handleSendEffect}
              onClearBackground={handleClearBackground}
              onClearFigure={handleClearFigure}
              noRole={noRole}
              notMember={notMember}
              isSubmitting={isSubmitting}
              placeholderText={placeholderText}
              curRoleId={curRoleId}
              curAvatarId={curAvatarId}
              setCurRoleId={setCurRoleId}
              setCurAvatarId={setCurAvatarId}
              roomRoles={roomRoles}
              chatInputRef={chatInputRef as any}
              atMentionRef={atMentionRef as any}
              onInputSync={handleInputAreaChange}
              onPasteFiles={handlePasteFiles}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onMouseDown={handleMouseDown}
              onCompositionStart={() => isComposingRef.current = true}
              onCompositionEnd={() => isComposingRef.current = false}
              inputDisabled={notMember && noRole}
            />
          </div>
          <RoomSideDrawers
            onClueSend={handleClueSend}
            stopRealtimeRender={handleStopRealtimeRender}
          />
        </div>
      </div>

      <RoomPopWindows
        spaceId={spaceId}
        spaceAvatar={space?.avatar}
        roomId={roomId}
        onSelectRoom={onSelectRoom}
        isRoleHandleOpen={isRoleHandleOpen}
        setIsRoleAddWindowOpen={setIsRoleAddWindowOpen}
        handleAddRole={handleAddRole}
        isRenderWindowOpen={isRenderWindowOpen}
        setIsRenderWindowOpen={setIsRenderWindowOpen}
      />
    </RoomContext>
  );
}

export default RoomWindow;
