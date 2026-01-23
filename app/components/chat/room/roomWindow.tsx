import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, SpaceMember, UserRole } from "../../../../api";

import type { ClueMessage } from "../../../../api/models/ClueMessage";
import type { AtMentionHandle } from "@/components/atMentionController";
import type { RealtimeRenderOrchestratorApi } from "@/components/chat/core/realtimeRenderOrchestrator";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { SpaceWebgalVarsRecord, WebgalVarMessagePayload } from "@/types/webgalVar";
// *** 导入新组件及其 Handle 类型 ***
import React, { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
// hooks (local)
import ChatFrame from "@/components/chat/chatFrame";
import RealtimeRenderOrchestrator from "@/components/chat/core/realtimeRenderOrchestrator";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatInputStatus from "@/components/chat/hooks/useChatInputStatus";
import { useChatHistory } from "@/components/chat/infra/indexedDB/useChatHistory";
import BgmFloatingBall from "@/components/chat/room/bgmFloatingBall";
import RoomComposerPanel from "@/components/chat/room/roomComposerPanel";
import RoomHeaderBar from "@/components/chat/room/roomHeaderBar";
import RoomPopWindows from "@/components/chat/room/roomPopWindows";
import RoomSideDrawerGuards from "@/components/chat/room/roomSideDrawerGuards";
import RoomSideDrawers from "@/components/chat/room/roomSideDrawers";
import SubRoomWindow from "@/components/chat/room/subRoomWindow";
import PixiOverlay from "@/components/chat/shared/components/pixiOverlay";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";
import { sendLlmStreamMessage } from "@/components/chat/utils/llmUtils";
import ImportChatMessagesWindow from "@/components/chat/window/importChatMessagesWindow";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor, { isCommand } from "@/components/common/dicer/cmdPre";
import UTILS from "@/components/common/dicer/utils/utils";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";

import { parseWebgalVarCommand } from "@/types/webgalVar";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";
import {
  useAddRoomRoleMutation,
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomModuleRoleQuery,
  useGetRoomRoleQuery,
  useGetSpaceInfoQuery,
  useSendMessageMutation,
  useSetSpaceExtraMutation,
  useUpdateMessageMutation,
} from "../../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../../api/instance";
import { useGetUserRolesQuery } from "../../../../api/queryHooks";
import { MessageType } from "../../../../api/wsModels";

// const PAGE_SIZE = 50; // 每页消息数量
export function RoomWindow({ roomId, spaceId, targetMessageId }: { roomId: number; spaceId: number; targetMessageId?: number | null }) {
  const spaceContext = use(SpaceContext);

  // BGM：切换/卸载房间时视为“打断”，停止播放但不影响用户是否已主动关闭（dismiss）
  useEffect(() => {
    useBgmStore.getState().setActiveRoomId(roomId);
    return () => {
      useBgmStore.getState().setActiveRoomId(null);
    };
  }, [roomId]);

  const space = useGetSpaceInfoQuery(spaceId).data?.data;
  const room = useGetRoomInfoQuery(roomId).data?.data;
  const roomHeaderOverride = useEntityHeaderOverrideStore(state => state.headers[`room:${roomId}`]);

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const webSocketUtils = globalContext.websocketUtils;
  const send = useCallback((message: ChatMessageRequest) => {
    webSocketUtils.send({ type: 3, data: message }); // 发送群聊消息
  }, [webSocketUtils]);

  // 用于插入消息功能的 mutations
  const sendMessageMutation = useSendMessageMutation(roomId);
  const updateMessageMutation = useUpdateMessageMutation();
  const setSpaceExtraMutation = useSetSpaceExtraMutation(); // 设置空间 extra 字段 (key/value)

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

  const storedRoleId = curRoleIdMap[roomId];
  const fallbackRoleId = roomRolesThatUserOwn[0]?.roleId ?? -1;
  const curRoleId = (storedRoleId == null)
    ? fallbackRoleId
    : (storedRoleId <= 0 && !spaceContext.isSpaceOwner)
        ? fallbackRoleId
        : storedRoleId;
  const setCurRoleId = useCallback((roleId: number) => {
    if (roleId <= 0 && !spaceContext.isSpaceOwner) {
      toast.error("只有KP可以使用旁白");
      return;
    }
    setCurRoleIdForRoom(roomId, roleId);
  }, [roomId, setCurRoleIdForRoom, spaceContext.isSpaceOwner]);

  const curAvatarId = curAvatarIdMap[curRoleId] ?? -1;
  const setCurAvatarId = useCallback((_avatarId: number) => {
    setCurAvatarIdForRole(curRoleId, _avatarId);
  }, [curRoleId, setCurAvatarIdForRole]);

  // 渲染对话
  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);
  const [isImportChatTextOpen, setIsImportChatTextOpen] = useSearchParamsState<boolean>("importChatTextPop", false);

  // RealtimeRender 编排：用独立组件隔离 useEffect/订阅，避免 RoomWindow 被 status/initProgress/previewUrl 等高频变化拖着重渲染
  const realtimeRenderApiRef = useRef<RealtimeRenderOrchestratorApi | null>(null);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);

  const handleRealtimeRenderApiChange = useCallback((api: RealtimeRenderOrchestratorApi) => {
    realtimeRenderApiRef.current = api;
  }, []);

  const handleToggleRealtimeRender = useCallback(async () => {
    await realtimeRenderApiRef.current?.toggleRealtimeRender();
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

  // Discord 风格：主消息流不包含 thread 回复
  const mainHistoryMessages = useMemo(() => {
    return (historyMessages ?? []).filter((m) => {
      // Thread Root（10001）不在主消息流中单独显示：改为挂在“原消息”下方的提示条
      if (m.message.messageType === MessageType.THREAD_ROOT) {
        return false;
      }
      const threadId = m.message.threadId;
      return !threadId || threadId === m.message.messageId;
    });
  }, [historyMessages]);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollToGivenMessage = useCallback((messageId: number) => {
    const messageIndex = mainHistoryMessages.findIndex(m => m.message.messageId === messageId);
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
  }, [mainHistoryMessages]);

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
   * AI重写（虚影预览）
   */
  const llmMessageRef = useRef("");
  const isAutoCompletingRef = useRef(false);
  const hintNodeRef = useRef<HTMLSpanElement | null>(null); // Ref for the hint span itself

  // AI重写相关状态
  const originalTextBeforeRewriteRef = useRef(""); // 保存重写前的原文

  const setLLMMessage = (newLLMMessage: string) => {
    if (hintNodeRef.current) {
      hintNodeRef.current.remove(); // 移除旧的提示节点
    }
    llmMessageRef.current = newLLMMessage;

    // 创建容器用于包含 AI 虚影结果和提示词
    const containerNode = document.createElement("span");
    containerNode.contentEditable = "false";
    containerNode.style.pointerEvents = "none";

    // 创建虚影文本节点
    const hintNode = document.createElement("span");
    hintNode.textContent = newLLMMessage;
    hintNode.className = "opacity-60";

    // 创建提示词节点 (只在有内容时显示)
    const tipsNode = document.createElement("span");
    tipsNode.textContent = newLLMMessage ? " [Tab 接受]" : "";
    tipsNode.className = "opacity-40 text-xs";
    tipsNode.style.marginLeft = "4px";

    // 将虚影文本和提示词添加到容器
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
      toast.success("已接受重写");
    }
    else {
      // 理论上不会进入：当前仅保留重写虚影，但为安全起见仍支持插入
      chatInputRef.current.insertNodeAtCursor(llmMessageRef.current, { moveCursorToEnd: true });
    }

    setLLMMessage(""); // 清空虚影状态
    chatInputRef.current.triggerSync(); // 手动触发同步，更新 store
  };

  // AI重写：显示为虚影预览
  const handleQuickRewrite = async (prompt: string) => {
    const currentPlainText = useChatInputUiStore.getState().plainText;
    if (!currentPlainText.trim()) {
      toast.error("请先输入内容");
      return;
    }

    if (isAutoCompletingRef.current) {
      return;
    }

    isAutoCompletingRef.current = true;

    // 如果已有虚影，先清除
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

      await sendLlmStreamMessage(fullPrompt, (newContent) => {
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
    finally {
      isAutoCompletingRef.current = false;
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

  const containsCommandRequestAllToken = useCallback((text: string) => {
    const raw = String(text ?? "");
    return /@all\b/i.test(raw) || raw.includes("@全员");
  }, []);

  const stripCommandRequestAllToken = useCallback((text: string) => {
    return String(text ?? "")
      .replace(/@all\b/gi, " ")
      .replace(/@全员/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const extractFirstCommandText = useCallback((text: string): string | null => {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) {
      return null;
    }
    if (isCommand(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(/[.。/][A-Z][^\n]*/i);
    if (!match) {
      return null;
    }
    const candidate = match[0].trim();
    return isCommand(candidate) ? candidate : null;
  }, []);

  const handleExecuteCommandRequest = useCallback((payload: { command: string; threadId?: number; requestMessageId: number }) => {
    const { command, threadId, requestMessageId } = payload;
    const rawCommand = String(command ?? "").trim();
    if (!rawCommand) {
      toast.error("指令为空");
      return;
    }

    const isKP = spaceContext.isSpaceOwner;
    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (noRole && !isKP) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      toast.error("正在发送中，请稍等");
      return;
    }

    commandExecutor({
      command: rawCommand,
      originMessage: rawCommand,
      threadId,
      replyMessageId: requestMessageId,
    });
  }, [commandExecutor, isSubmitting, noRole, notMember, spaceContext.isSpaceOwner]);

  /**
   * 发送消息的辅助函数
   * 如果设置了 insertAfterMessageId，则使用 HTTP API 发送并更新 position
   * 否则使用 WebSocket 发送
   */
  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
    const insertAfterMessageId = useRoomUiStore.getState().insertAfterMessageId;

    if (insertAfterMessageId && mainHistoryMessages) {
      // 找到目标消息的索引
      const targetIndex = mainHistoryMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
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
        const targetMessage = mainHistoryMessages[targetIndex];
        const nextMessage = mainHistoryMessages[targetIndex + 1];
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
  }, [mainHistoryMessages, send, sendMessageMutation, updateMessageMutation, chatHistory]);

  const webgalVarSendingRef = useRef(false);

  const handleSetWebgalVar = useCallback(async (key: string, expr: string) => {
    const rawKey = String(key ?? "").trim();
    const rawExpr = String(expr ?? "").trim();

    const isKP = spaceContext.isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isNarrator && !isKP) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting || webgalVarSendingRef.current) {
      toast.error("正在设置变量，请稍等");
      return;
    }

    if (!rawKey || !rawExpr) {
      toast.error("变量名/表达式不能为空");
      return;
    }
    if (!/^[A-Z_]\w*$/i.test(rawKey)) {
      toast.error("变量名格式不正确");
      return;
    }

    const payload: WebgalVarMessagePayload = {
      scope: "space",
      op: "set",
      key: rawKey,
      expr: rawExpr,
      global: true,
    };

    webgalVarSendingRef.current = true;
    try {
      const varMsg: ChatMessageRequest = {
        roomId,
        roleId: curRoleId,
        avatarId: curAvatarId,
        content: "",
        messageType: MessageType.WEBGAL_VAR,
        extra: {
          webgalVar: payload,
        },
      };

      // 发送区自定义角色名（与联动模式无关）
      const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
      if (draftCustomRoleName?.trim()) {
        varMsg.webgal = {
          ...(varMsg.webgal as any),
          customRoleName: draftCustomRoleName.trim(),
        } as any;
      }

      await sendMessageWithInsert(varMsg);

      // 空间级持久化：写入 space.extra 的 webgalVars（后端以 key/value 存储）
      try {
        const rawExtra = space?.extra || "{}";
        let parsedExtra: Record<string, any> = {};
        try {
          parsedExtra = JSON.parse(rawExtra) as Record<string, any>;
        }
        catch {
          parsedExtra = {};
        }

        let currentVars: SpaceWebgalVarsRecord = {};
        const stored = parsedExtra.webgalVars;
        if (typeof stored === "string") {
          try {
            currentVars = JSON.parse(stored) as SpaceWebgalVarsRecord;
          }
          catch {
            currentVars = {};
          }
        }
        else if (stored && typeof stored === "object") {
          currentVars = stored as SpaceWebgalVarsRecord;
        }

        const now = Date.now();
        const nextVars: SpaceWebgalVarsRecord = {
          ...currentVars,
          [payload.key]: {
            expr: payload.expr,
            updatedAt: now,
          },
        };

        await setSpaceExtraMutation.mutateAsync({
          spaceId,
          key: "webgalVars",
          value: JSON.stringify(nextVars),
        });
      }
      catch (error) {
        console.error("写入 space.extra.webgalVars 失败:", error);
        toast.error("变量已发送，但写入空间持久化失败");
      }
    }
    finally {
      webgalVarSendingRef.current = false;
    }
  }, [curAvatarId, curRoleId, isSubmitting, notMember, roomId, sendMessageWithInsert, setSpaceExtraMutation, space?.extra, spaceContext.isSpaceOwner, spaceId]);

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

    const isKP = spaceContext.isSpaceOwner;
    const isNarrator = noRole;

    // 旁白不再依赖联动模式，但仅KP可用
    const disableSendMessage = (notMember || noInput || isSubmitting)
      || (isNarrator && !isKP);

    if (disableSendMessage) {
      if (notMember)
        toast.error("您是观战，不能发送消息");
      else if (isNarrator && !isKP)
        toast.error("旁白仅KP可用，请先选择/拉入你的角色");
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

        // Thread 模式：给本次发送的消息挂上 threadId（root messageId）
        const { threadRootMessageId: activeThreadRootId, composerTarget } = useRoomUiStore.getState();
        if (composerTarget === "thread" && activeThreadRootId) {
          fields.threadId = activeThreadRootId;
        }

        // 发送区自定义角色名（与联动模式无关）
        const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
        if (draftCustomRoleName?.trim()) {
          fields.webgal = {
            ...(fields.webgal as any),
            customRoleName: draftCustomRoleName.trim(),
          } as any;
        }

        if (isFirstMessage) {
          fields.replayMessageId = finalReplyId;
          if (webgalLinkMode) {
            const voiceRenderSettings = {
              ...(currentDefaultFigurePosition ? { figurePosition: currentDefaultFigurePosition } : {}),
              ...(dialogNotend ? { notend: true } : {}),
              ...(dialogConcat ? { concat: true } : {}),
            };

            if (Object.keys(voiceRenderSettings).length > 0) {
              fields.webgal = {
                ...(fields.webgal as any),
                voiceRenderSettings,
              } as any;
            }
          }
          isFirstMessage = false;
        }
        return fields;
      };

      let textContent = inputText.trim();

      // WebGAL 空间变量指令：/var set a=1
      const trimmedWithoutMentions = inputTextWithoutMentions.trim();
      const isWebgalVarCommandPrefix = /^\/var\b/i.test(trimmedWithoutMentions);
      const webgalVarPayload = parseWebgalVarCommand(trimmedWithoutMentions);

      // 如果用户输入了 /var 前缀但格式不正确：不交给骰娘命令系统处理，直接提示
      if (isWebgalVarCommandPrefix && !webgalVarPayload) {
        toast.error("变量指令格式：/var set a=1");
        return;
      }

      const isCommandRequestByAll = isKP && containsCommandRequestAllToken(inputText);
      const extractedCommandForRequest = isCommandRequestByAll ? extractFirstCommandText(trimmedWithoutMentions) : null;
      const requestCommand = extractedCommandForRequest ? stripCommandRequestAllToken(extractedCommandForRequest) : null;
      const shouldSendCommandRequest = Boolean(requestCommand && isCommand(requestCommand));

      if (shouldSendCommandRequest) {
        const requestMsg: ChatMessageRequest = {
          ...getCommonFields() as any,
          content: requestCommand,
          messageType: MessageType.COMMAND_REQUEST,
          extra: {
            commandRequest: {
              command: requestCommand,
              allowAll: true,
            },
          },
        };

        await sendMessageWithInsert(requestMsg);

        // 消耗掉 firstMessage 状态，并防止后续再次作为文本发送
        isFirstMessage = false;
        textContent = "";
      }
      else if (webgalVarPayload) {
        const varMsg: ChatMessageRequest = {
          ...getCommonFields() as any,
          content: "",
          messageType: MessageType.WEBGAL_VAR,
          extra: {
            webgalVar: webgalVarPayload,
          },
        };

        await sendMessageWithInsert(varMsg);

        // 空间级持久化：写入 space.extra 的 webgalVars（后端以 key/value 存储）
        try {
          const rawExtra = space?.extra || "{}";
          let parsedExtra: Record<string, any> = {};
          try {
            parsedExtra = JSON.parse(rawExtra) as Record<string, any>;
          }
          catch {
            parsedExtra = {};
          }

          let currentVars: SpaceWebgalVarsRecord = {};
          const stored = parsedExtra.webgalVars;
          if (typeof stored === "string") {
            try {
              currentVars = JSON.parse(stored) as SpaceWebgalVarsRecord;
            }
            catch {
              currentVars = {};
            }
          }
          else if (stored && typeof stored === "object") {
            currentVars = stored as SpaceWebgalVarsRecord;
          }

          const now = Date.now();
          const nextVars: SpaceWebgalVarsRecord = {
            ...currentVars,
            [webgalVarPayload.key]: {
              expr: webgalVarPayload.expr,
              updatedAt: now,
            },
          };

          await setSpaceExtraMutation.mutateAsync({
            spaceId,
            key: "webgalVars",
            value: JSON.stringify(nextVars),
          });
        }
        catch (error) {
          console.error("写入 space.extra.webgalVars 失败:", error);
          toast.error("变量已发送，但写入空间持久化失败");
        }

        // 消耗掉 firstMessage 状态，并防止后续再次作为文本发送
        isFirstMessage = false;
        textContent = "";
      }
      else if (textContent && isCommand(textContent)) {
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
        // WebGAL 指令消息：输入以 % 开头时，转为显式的 WEBGAL_COMMAND 类型。
        // 注意：这里是“发送侧协议转换”，渲染侧不再依赖 % 前缀。
        const isPureTextSend = uploadedImages.length === 0 && !soundMessageData;
        const isWebgalCommandInput = isPureTextSend && textContent.startsWith("%");
        const normalizedContent = isWebgalCommandInput ? textContent.slice(1).trim() : textContent;

        if (isWebgalCommandInput && !normalizedContent) {
          toast.error("WebGAL 指令不能为空");
        }
        else {
          const textMsg: ChatMessageRequest = {
            ...getCommonFields() as any,
            content: normalizedContent,
            messageType: isWebgalCommandInput ? MessageType.WEBGAL_COMMAND : MessageType.TEXT,
            extra: {},
          };
          await sendMessageWithInsert(textMsg);
        }
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

  const handleImportChatText = useCallback(async (
    messages: Array<{ roleId: number; content: string; figurePosition?: "left" | "center" | "right" }>,
    onProgress?: (sent: number, total: number) => void,
  ) => {
    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isSubmitting) {
      toast.error("正在发送中，请稍等");
      return;
    }
    if (!messages.length) {
      toast.error("没有可导入的有效消息");
      return;
    }

    const ui = useRoomUiStore.getState();
    const prevInsertAfter = ui.insertAfterMessageId;
    const prevReply = ui.replyMessage;

    ui.setInsertAfterMessageId(undefined);
    ui.setReplyMessage(undefined);

    setIsSubmitting(true);
    try {
      const { threadRootMessageId, composerTarget } = useRoomUiStore.getState();
      const draftCustomRoleNameMap = useRoomPreferenceStore.getState().draftCustomRoleNameMap;
      const avatarMap = useRoomRoleSelectionStore.getState().curAvatarIdMap;

      let dicerRoleId: number | null = null;
      let dicerAvatarId: number | null = null;

      const ensureDicerSender = async () => {
        if (dicerRoleId != null && dicerAvatarId != null) {
          return;
        }
        dicerRoleId = await UTILS.getDicerRoleId(roomContext);

        const cachedAvatarId = avatarMap[dicerRoleId] ?? null;
        if (cachedAvatarId != null && cachedAvatarId > 0) {
          dicerAvatarId = cachedAvatarId;
          return;
        }

        const avatars = (await tuanchat.avatarController.getRoleAvatars(dicerRoleId))?.data ?? [];
        const defaultLabelAvatar = avatars.find(a => (a.avatarTitle?.label || "") === "默认") ?? null;
        dicerAvatarId = defaultLabelAvatar?.avatarId ?? (avatars[0]?.avatarId ?? 0);
      };

      const total = messages.length;
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        let roleId = msg.roleId;
        let avatarId = roleId <= 0 ? -1 : (avatarMap[roleId] ?? -1);
        let messageType = MessageType.TEXT;
        let extra: any = {};
        const figurePosition = msg.figurePosition;

        // 文本导入：若发言人映射为“骰娘”，则使用骰娘角色发送，并按 DICE(6) 类型构造消息 extra。
        if (roleId === IMPORT_SPECIAL_ROLE_ID.DICER) {
          await ensureDicerSender();
          roleId = dicerRoleId ?? roleId;
          avatarId = dicerAvatarId ?? 0;
          messageType = MessageType.DICE;
          extra = { result: msg.content };
        }

        const request: ChatMessageRequest = {
          roomId,
          roleId,
          avatarId,
          content: msg.content,
          messageType,
          extra,
        };

        if (composerTarget === "thread" && threadRootMessageId) {
          request.threadId = threadRootMessageId;
        }

        const draftCustomRoleName = draftCustomRoleNameMap[roleId];
        if (draftCustomRoleName?.trim()) {
          request.webgal = {
            ...(request.webgal as any),
            customRoleName: draftCustomRoleName.trim(),
          } as any;
        }

        if (messageType === MessageType.TEXT && roleId > 0 && figurePosition) {
          request.webgal = {
            ...(request.webgal as any),
            voiceRenderSettings: {
              ...((request.webgal as any)?.voiceRenderSettings ?? {}),
              figurePosition,
            },
          } as any;
        }

        await sendMessageWithInsert(request);
        onProgress?.(i + 1, total);

        if (total >= 30) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
    }
    finally {
      useRoomUiStore.getState().setInsertAfterMessageId(prevInsertAfter);
      useRoomUiStore.getState().setReplyMessage(prevReply);
      setIsSubmitting(false);
    }
  }, [isSubmitting, notMember, roomContext, roomId, sendMessageWithInsert]);

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
    else if (e.key === "Tab") {
      e.preventDefault();
      // 1) 若已有 AI 虚影结果，Tab 直接接受
      if (llmMessageRef.current) {
        insertLLMMessageIntoText();
        return;
      }

      // 2) 否则 Tab 触发 AI 重写（使用本地保存的提示词）
      const prompt = localStorage.getItem("ai-rewrite-prompt") || "请优化这段文字的表达，使其更加清晰流畅";
      handleQuickRewrite(prompt);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // 总是通知 @ 控制器关于 keyup 事件
    atMentionRef.current?.onKeyUp(e);

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
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const placeholderText = (() => {
    const isKP = spaceContext.isSpaceOwner;
    if (notMember) {
      return "你是观战成员，不能发送消息";
    }
    if (noRole && !isKP) {
      return "请先拉入你的角色，之后才能发送消息。";
    }
    if (noRole && isKP) {
      return "旁白模式：在此输入消息...(shift+enter 换行，tab触发AI重写，上方✨按钮可修改重写提示词)";
    }
    if (curAvatarId <= 0) {
      return "请为你的角色添加至少一个表情差分（头像）。";
    }
    if (threadRootMessageId && composerTarget === "thread") {
      return "在 Thread 中回复...(shift+enter 换行，tab触发AI重写，上方✨按钮可修改重写提示词)";
    }
    return "在此输入消息...(shift+enter 换行，tab触发AI重写，上方✨按钮可修改重写提示词)";
  })();

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

  // KP：停止全员BGM（广播系统消息）
  const handleStopBgmForAll = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[停止BGM]",
      messageType: MessageType.SYSTEM,
      extra: {},
    });
    toast.success("已发送停止BGM");
  }, [roomId, send]);

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [displayedBgUrl, setDisplayedBgUrl] = useState<string | null>(null);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);

  useEffect(() => {
    if (backgroundUrl) {
      const id = setTimeout(() => setDisplayedBgUrl(backgroundUrl), 0);
      return () => clearTimeout(id);
    }
  }, [backgroundUrl]);

  return (
    <RoomContext value={roomContext}>
      <RoomSideDrawerGuards spaceId={spaceId} />
      <RealtimeRenderOrchestrator
        spaceId={spaceId}
        roomId={roomId}
        room={room}
        roomRoles={roomRoles}
        historyMessages={mainHistoryMessages}
        chatHistoryLoading={!!chatHistory?.loading}
        onApiChange={handleRealtimeRenderApiChange}
      />
      <div className="flex flex-col h-full w-full shadow-sm min-h-0 relative bg-base-300">
        {/* 背景图片层：覆盖 header + 主聊天区 + 输入区 */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 z-0"
          style={{
            backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
            opacity: backgroundUrl ? 1 : 0,
          }}
        />
        <div
          className="absolute inset-0 bg-white/30 dark:bg-slate-950/40 backdrop-blur-xs transition-opacity duration-500 z-0"
          style={{
            opacity: backgroundUrl ? 1 : 0,
          }}
        />

        {/* Pixi 特效层：覆盖 header + 主聊天区 + 输入区（在 UI 内容之下） */}
        <PixiOverlay effectName={currentEffect} />

        <div className="relative z-10 flex h-full min-h-0">
          {/* 左侧列：Header + 主体（主体内承载 RoomSideDrawers，因此抽屉在 Header 下方） */}
          <div className="flex-1 min-w-0 flex flex-col h-full min-h-0">
            <RoomHeaderBar
              roomName={roomHeaderOverride?.title ?? room?.name}
              toggleLeftDrawer={spaceContext.toggleLeftDrawer}
            />
            <div className="flex-1 w-full flex bg-transparent relative min-h-0">
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                {/* 主聊天区（可点击切换输入目标） */}
                <div
                  className={`bg-transparent flex-1 min-w-0 min-h-0 ${composerTarget === "main" ? "" : ""}`}
                  onMouseDown={() => setComposerTarget("main")}
                >
                  <ChatFrame
                    key={roomId}
                    virtuosoRef={virtuosoRef}
                    onBackgroundUrlChange={setBackgroundUrl}
                    onEffectChange={setCurrentEffect}
                    onExecuteCommandRequest={handleExecuteCommandRequest}
                  >
                  </ChatFrame>
                </div>

                {/* 共享输入区域（主区 + Thread 共用） */}
                <RoomComposerPanel
                  roomId={roomId}
                  userId={Number(userId)}
                  webSocketUtils={webSocketUtils}
                  handleSelectCommand={handleSelectCommand}
                  ruleId={space?.ruleId ?? -1}
                  handleMessageSubmit={handleMessageSubmit}
                  onAIRewrite={handleQuickRewrite}
                  currentChatStatus={myStatue as any}
                  onChangeChatStatus={handleManualStatusChange}
                  isSpectator={isSpectator}
                  onToggleRealtimeRender={handleToggleRealtimeRender}
                  onSendEffect={handleSendEffect}
                  onClearBackground={handleClearBackground}
                  onClearFigure={handleClearFigure}
                  onSetWebgalVar={handleSetWebgalVar}
                  isKP={spaceContext.isSpaceOwner}
                  onStopBgmForAll={handleStopBgmForAll}
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

                {/* BGM 悬浮球：仅在本房间有BGM且用户未主动关闭时显示 */}
                <BgmFloatingBall roomId={roomId} />
              </div>

              {/* 右侧轻量抽屉：仅影响 Header 下方的主体区域 */}
              <RoomSideDrawers onClueSend={handleClueSend} />
            </div>
          </div>

          {/* 右侧列：SubRoomWindow（重内容面板）与 Header 顶部对齐，并可拖拽宽度 */}
          <SubRoomWindow onClueSend={handleClueSend} />
        </div>
      </div>

      <PopWindow
        isOpen={isImportChatTextOpen}
        onClose={() => setIsImportChatTextOpen(false)}
      >
        <ImportChatMessagesWindow
          isKP={Boolean(spaceContext.isSpaceOwner)}
          availableRoles={roomRolesThatUserOwn}
          onImport={async (items, onProgress) => {
            await handleImportChatText(items.map(i => ({ roleId: i.roleId, content: i.content, figurePosition: i.figurePosition })), onProgress);
          }}
          onClose={() => setIsImportChatTextOpen(false)}
          onOpenRoleAddWindow={() => setIsRoleAddWindowOpen(true)}
        />
      </PopWindow>

      <RoomPopWindows
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
