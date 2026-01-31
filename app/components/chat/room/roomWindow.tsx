import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, SpaceMember, UserRole } from "../../../../api";

import type { ClueMessage } from "../../../../api/models/ClueMessage";
import type { AtMentionHandle } from "@/components/atMentionController";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import React, { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
// hooks (local)
import RealtimeRenderOrchestrator from "@/components/chat/core/realtimeRenderOrchestrator";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatInputStatus from "@/components/chat/hooks/useChatInputStatus";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { extractDocExcerptFromStore } from "@/components/chat/infra/blocksuite/docExcerpt";
import { useChatHistory } from "@/components/chat/infra/indexedDB/useChatHistory";
import RoomSideDrawerGuards from "@/components/chat/room/roomSideDrawerGuards";
import RoomWindowLayout from "@/components/chat/room/roomWindowLayout";
import RoomWindowOverlays from "@/components/chat/room/roomWindowOverlays";
import useAiRewrite from "@/components/chat/room/useAiRewrite";
import useChatInputHandlers from "@/components/chat/room/useChatInputHandlers";
import useChatMessageSubmit from "@/components/chat/room/useChatMessageSubmit";
import useRealtimeRenderControls from "@/components/chat/room/useRealtimeRenderControls";
import useRoomMessageActions from "@/components/chat/room/useRoomMessageActions";
import useRoomRoleState from "@/components/chat/room/useRoomRoleState";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor, { isCommand } from "@/components/common/dicer/cmdPre";

import UTILS from "@/components/common/dicer/utils/utils";
import { useGlobalContext } from "@/components/globalContextProvider";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  useAddRoomRoleMutation,
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetSpaceInfoQuery,
  useSendMessageMutation,
  useSetSpaceExtraMutation,
  useUpdateMessageMutation,
} from "../../../../api/hooks/chatQueryHooks";
import { MessageType } from "../../../../api/wsModels";

function RoomWindow({ roomId, spaceId, targetMessageId }: { roomId: number; spaceId: number; targetMessageId?: number | null }) {
  const spaceContext = use(SpaceContext);

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
    webSocketUtils.send({ type: 3, data: message });
  }, [webSocketUtils]);

  const sendMessageMutation = useSendMessageMutation(roomId);
  const updateMessageMutation = useUpdateMessageMutation();
  const setSpaceExtraMutation = useSetSpaceExtraMutation();

  const chatInputRef = useRef<ChatInputAreaHandle>(null);
  const atMentionRef = useRef<AtMentionHandle>(null);

  const resetChatInputUi = useChatInputUiStore(state => state.reset);
  const resetChatComposer = useChatComposerStore(state => state.reset);

  const delayTimer = useRef<NodeJS.Timeout | null>(null);

  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    useChatInputUiStore.getState().setSnapshot({
      plainText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: roles,
    });
    atMentionRef.current?.onInput();
  }, []);

  /**
   */
  const setInputText = (text: string) => {
    chatInputRef.current?.setContent(text);
    chatInputRef.current?.triggerSync();
  };

  const {
    llmMessageRef,
    originalTextBeforeRewriteRef,
    setLLMMessage,
    insertLLMMessageIntoText,
    handleQuickRewrite,
  } = useAiRewrite({ chatInputRef, setInputText });

  useEffect(() => {
    resetChatInputUi();
    resetChatComposer();
    return () => {
      resetChatInputUi();
      resetChatComposer();
    };
  }, [resetChatInputUi, resetChatComposer, roomId]);

  useLayoutEffect(() => {
    useRoomUiStore.getState().reset();
  }, [roomId]);

  const {
    roomAllRoles,
    roomRolesThatUserOwn,
    curRoleId,
    setCurRoleId,
    curAvatarId,
    setCurAvatarId,
    ensureRuntimeAvatarIdForRole,
  } = useRoomRoleState({
    roomId,
    userId,
    isSpaceOwner: spaceContext.isSpaceOwner,
  });

  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);
  const [isImportChatTextOpen, setIsImportChatTextOpen] = useSearchParamsState<boolean>("importChatTextPop", false);

  // RealtimeRender controls
  const {
    isRealtimeRenderActive,
    handleRealtimeRenderApiChange,
    handleToggleRealtimeRender,
    jumpToMessageInWebGAL,
    updateAndRerenderMessageInWebGAL,
    rerenderHistoryInWebGAL,
    clearFigure: clearRealtimeFigure,
  } = useRealtimeRenderControls();
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

  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);
  const chatHistory = useChatHistory(roomId);
  const historyMessages: ChatMessageResponse[] = chatHistory?.messages;

  const mainHistoryMessages = useMemo(() => {
    return (historyMessages ?? []).filter((m) => {
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

  const hasScrolledToTargetRef = useRef(false);
  useEffect(() => {
    if (targetMessageId && historyMessages.length > 0 && !chatHistory?.loading && !hasScrolledToTargetRef.current) {
      const messageExists = historyMessages.some(m => m.message.messageId === targetMessageId);
      if (messageExists) {
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
      jumpToMessageInWebGAL: isRealtimeRenderActive ? jumpToMessageInWebGAL : undefined,
      updateAndRerenderMessageInWebGAL: isRealtimeRenderActive ? updateAndRerenderMessageInWebGAL : undefined,
      rerenderHistoryInWebGAL: isRealtimeRenderActive ? rerenderHistoryInWebGAL : undefined,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, spaceId, chatHistory, scrollToGivenMessage, isRealtimeRenderActive, jumpToMessageInWebGAL, updateAndRerenderMessageInWebGAL, rerenderHistoryInWebGAL]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

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
    isSpectator,
  });

  /**
   * AI闂佹彃绉撮崯鎾绘晬閸絾鐝撶憸浼翠憾椤ｂ晝鎲撮崼顒傜
   */
  const handleSelectCommand = (cmdName: string) => {
    const prefixChar = useChatInputUiStore.getState().plainText[0] || "."; // 濮掓稒顭堥缁樼▔?.
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const notMember = ((members.find(member => member.userId === userId)?.memberType ?? 3) >= 3);
  const noRole = curRoleId <= 0;

  const containsCommandRequestAllToken = useCallback((text: string) => {
    const raw = String(text ?? "");
    return /@all\b/i.test(raw)
      || raw.includes("@全员")
      || raw.includes("@所有人")
      || raw.includes("@检定请求");
  }, []);

  const stripCommandRequestAllToken = useCallback((text: string) => {
    return String(text ?? "")
      .replace(/@all\b/gi, " ")
      .replace(/@全员/g, " ")
      .replace(/@所有人/g, " ")
      .replace(/@检定请求/g, " ")
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
      toast.error("请输入指令");
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
      toast.error("正在提交中，请稍后");
      return;
    }

    commandExecutor({
      command: rawCommand,
      originMessage: rawCommand,
      threadId,
      replyMessageId: requestMessageId,
    });
  }, [commandExecutor, isSubmitting, noRole, notMember, spaceContext.isSpaceOwner]);

  const { sendMessageWithInsert, handleSetWebgalVar } = useRoomMessageActions({
    roomId,
    spaceId,
    spaceExtra: space?.extra,
    isSpaceOwner: spaceContext.isSpaceOwner,
    curRoleId,
    isSubmitting,
    notMember,
    mainHistoryMessages,
    send,
    sendMessage: sendMessageMutation.mutateAsync,
    updateMessage: updateMessageMutation.mutateAsync,
    addOrUpdateMessage: chatHistory?.addOrUpdateMessage,
    ensureRuntimeAvatarIdForRole,
    setSpaceExtra: setSpaceExtraMutation.mutateAsync,
  });
  const { handleMessageSubmit } = useChatMessageSubmit({
    roomId,
    spaceId,
    spaceExtra: space?.extra,
    isSpaceOwner: spaceContext.isSpaceOwner,
    curRoleId,
    notMember,
    noRole,
    isSubmitting,
    setIsSubmitting,
    sendMessageWithInsert,
    ensureRuntimeAvatarIdForRole,
    commandExecutor,
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    setInputText,
    setSpaceExtra: setSpaceExtraMutation.mutateAsync,
  });
  const handleImportChatText = useCallback(async (
    messages: Array<{ roleId: number; content: string; speakerName?: string; figurePosition?: "left" | "center" | "right" }>,
    onProgress?: (sent: number, total: number) => void,
  ) => {
    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }
    if (!messages.length) {
      toast.error("没有可导入的消息");
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

      const resolvedAvatarIdByRole = new Map<number, number>();
      const ensureAvatarIdForRole = async (roleId: number): Promise<number> => {
        if (roleId <= 0) {
          return -1;
        }
        const cached = resolvedAvatarIdByRole.get(roleId);
        if (cached != null) {
          return cached;
        }

        const ensured = await ensureRuntimeAvatarIdForRole(roleId);
        resolvedAvatarIdByRole.set(roleId, ensured);
        return ensured;
      };

      let dicerRoleId: number | null = null;
      let dicerAvatarId: number | null = null;

      const ensureDicerSender = async () => {
        if (dicerRoleId != null && dicerAvatarId != null) {
          return;
        }
        const resolvedDicerRoleId = await UTILS.getDicerRoleId(roomContext);
        dicerRoleId = resolvedDicerRoleId;
        const ensured = await ensureAvatarIdForRole(resolvedDicerRoleId);
        dicerAvatarId = ensured > 0 ? ensured : 0;
      };

      const uniqueRoleIds = Array.from(new Set(
        messages
          .map(m => m.roleId)
          .filter(roleId => roleId > 0),
      ));
      for (const roleId of uniqueRoleIds) {
        await ensureAvatarIdForRole(roleId);
      }

      if (messages.some(m => m.roleId === IMPORT_SPECIAL_ROLE_ID.DICER)) {
        await ensureDicerSender();
      }

      const total = messages.length;
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        let roleId = msg.roleId;
        let avatarId = -1;
        let messageType = MessageType.TEXT;
        let extra: any = {};
        const figurePosition = msg.figurePosition;

        if (roleId === IMPORT_SPECIAL_ROLE_ID.DICER) {
          await ensureDicerSender();
          roleId = dicerRoleId ?? roleId;
          avatarId = dicerAvatarId ?? 0;
          messageType = MessageType.DICE;
          extra = { result: msg.content };
        }
        else {
          avatarId = roleId <= 0 ? -1 : await ensureAvatarIdForRole(roleId);
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

        const importedSpeakerName = (msg.speakerName ?? "").trim();
        if (importedSpeakerName) {
          request.webgal = {
            ...(request.webgal as any),
            customRoleName: importedSpeakerName,
          } as any;
        }
        else {
          const draftCustomRoleName = draftCustomRoleNameMap[roleId];
          if (draftCustomRoleName?.trim()) {
            request.webgal = {
              ...(request.webgal as any),
              customRoleName: draftCustomRoleName.trim(),
            } as any;
          }
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
  }, [ensureRuntimeAvatarIdForRole, isSubmitting, notMember, roomContext, roomId, sendMessageWithInsert]);

  const handleClueSend = async (clue: ClueMessage) => {
    const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);
    const clueMessage: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      messageType: 1000,
      content: "",
      avatarId: resolvedAvatarId,
      extra: {
        img: clue.img,
        name: clue.name,
        description: clue.description,
      },
    };
    send(clueMessage);
  };

  const handleSendDocCard = useCallback(async (payload: DocRefDragPayload) => {
    const docId = String(payload?.docId ?? "").trim();
    if (!docId) {
      toast.error("未检测到可用文档");
      return;
    }

    if (!parseDescriptionDocId(docId)) {
      toast.error("仅支持发送空间文档（我的文档/描述文档）");
      return;
    }

    if (!spaceId || spaceId <= 0) {
      toast.error("未找到当前空间，无法发送文档");
      return;
    }

    if (payload?.spaceId && payload.spaceId !== spaceId) {
      toast.error("仅支持在同一空间分享文档");
      return;
    }

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
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }

    let excerpt = typeof payload?.excerpt === "string" ? payload.excerpt.trim() : "";
    if (!excerpt) {
      try {
        const { getOrCreateSpaceDoc } = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");

        const store = getOrCreateSpaceDoc({ spaceId, docId }) as any;
        try {
          store?.load?.();
        }
        catch {
          // ignore
        }

        excerpt = extractDocExcerptFromStore(store, { maxChars: 220 });
      }
      catch {
        // ignore
      }
    }

    const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);

    const request: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      avatarId: resolvedAvatarId,
      content: "",
      messageType: MESSAGE_TYPE.DOC_CARD,
      extra: {
        docCard: {
          docId,
          spaceId,
          ...(payload?.title ? { title: payload.title } : {}),
          ...(payload?.imageUrl ? { imageUrl: payload.imageUrl } : {}),
          ...(excerpt ? { excerpt } : {}),
        },
      } as any,
    };

    const { threadRootMessageId, composerTarget } = useRoomUiStore.getState();
    if (composerTarget === "thread" && threadRootMessageId) {
      request.threadId = threadRootMessageId;
    }

    await sendMessageWithInsert(request);
  }, [curRoleId, ensureRuntimeAvatarIdForRole, isSubmitting, notMember, roomId, sendMessageWithInsert, spaceContext.isSpaceOwner, spaceId]);

  const {
    handlePasteFiles,
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    onCompositionStart,
    onCompositionEnd,
  } = useChatInputHandlers({
    atMentionRef,
    handleMessageSubmit,
    handleQuickRewrite,
    insertLLMMessageIntoText,
    llmMessageRef,
    originalTextBeforeRewriteRef,
    setInputText,
    setLLMMessage,
  });
  const [isRoleHandleOpen, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { toast("添加角色成功"); },
    });
  };

  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const placeholderText = (() => {
    const isKP = spaceContext.isSpaceOwner;
    if (notMember) {
      return "观战模式下无法发送消息";
    }
    if (noRole && !isKP) {
      return "请选择/拉入你的角色后再发送";
    }
    if (noRole && isKP) {
      return "旁白模式：输入内容…（Shift+Enter 换行，Tab 触发 AI）";
    }
    if (curAvatarId <= 0) {
      return "请选择角色立绘后发送…（Shift+Enter 换行，Tab 触发 AI）";
    }
    if (threadRootMessageId && composerTarget === "thread") {
      return "线程回复中…（Shift+Enter 换行，Tab 触发 AI）";
    }
    return "输入消息…（Shift+Enter 换行，Tab 触发 AI）";
  })();

  const handleSendEffect = useCallback((effectName: string) => {
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
    if (isRealtimeRenderActive) {
      clearRealtimeFigure();
    }
    toast.success("已清除立绘");
  }, [clearRealtimeFigure, isRealtimeRenderActive, roomId, send]);

  const handleStopBgmForAll = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[停止全员BGM]",
      messageType: MessageType.SYSTEM,
      extra: {},
    });
    toast.success("已发送停止全员BGM");
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

  const roomName = roomHeaderOverride?.title ?? room?.name;

  const chatFrameProps = {
    virtuosoRef,
    onBackgroundUrlChange: setBackgroundUrl,
    onEffectChange: setCurrentEffect,
    onExecuteCommandRequest: handleExecuteCommandRequest,
    onSendDocCard: handleSendDocCard,
  };

  const composerPanelProps = {
    roomId,
    userId: Number(userId),
    webSocketUtils,
    handleSelectCommand,
    ruleId: space?.ruleId ?? -1,
    handleMessageSubmit,
    onAIRewrite: handleQuickRewrite,
    currentChatStatus: myStatue as any,
    onChangeChatStatus: handleManualStatusChange,
    isSpectator,
    onToggleRealtimeRender: handleToggleRealtimeRender,
    onSendEffect: handleSendEffect,
    onClearBackground: handleClearBackground,
    onClearFigure: handleClearFigure,
    onSetWebgalVar: handleSetWebgalVar,
    isKP: spaceContext.isSpaceOwner,
    onStopBgmForAll: handleStopBgmForAll,
    noRole,
    notMember,
    isSubmitting,
    placeholderText,
    onSendDocCard: handleSendDocCard,
    curRoleId,
    curAvatarId,
    setCurRoleId,
    setCurAvatarId,
    mentionRoles: roomAllRoles,
    selectableRoles: roomRolesThatUserOwn,
    chatInputRef: chatInputRef as any,
    atMentionRef: atMentionRef as any,
    onInputSync: handleInputAreaChange,
    onPasteFiles: handlePasteFiles,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onMouseDown: handleMouseDown,
    onCompositionStart,
    onCompositionEnd,
    inputDisabled: notMember && noRole,
  };

  const handleImportChatItems = useCallback(async (items: Array<{
    roleId: number;
    content: string;
    speakerName?: string;
    figurePosition?: string;
  }>, onProgress: (progress: number) => void) => {
    await handleImportChatText(items.map(i => ({
      roleId: i.roleId,
      content: i.content,
      speakerName: i.speakerName,
      figurePosition: i.figurePosition,
    })), onProgress);
  }, [handleImportChatText]);

  return (
    <RoomContext value={roomContext}>
      <RoomSideDrawerGuards spaceId={spaceId} />
      <RealtimeRenderOrchestrator
        spaceId={spaceId}
        roomId={roomId}
        room={room}
        roles={roomAllRoles}
        historyMessages={mainHistoryMessages}
        chatHistoryLoading={!!chatHistory?.loading}
        onApiChange={handleRealtimeRenderApiChange}
      />
      <RoomWindowLayout
        roomId={roomId}
        roomName={roomName}
        toggleLeftDrawer={spaceContext.toggleLeftDrawer}
        backgroundUrl={backgroundUrl}
        displayedBgUrl={displayedBgUrl}
        currentEffect={currentEffect}
        composerTarget={composerTarget}
        setComposerTarget={setComposerTarget}
        chatFrameProps={chatFrameProps}
        composerPanelProps={composerPanelProps}
        onClueSend={handleClueSend}
      />
      <RoomWindowOverlays
        isImportChatTextOpen={isImportChatTextOpen}
        setIsImportChatTextOpen={setIsImportChatTextOpen}
        isKP={Boolean(spaceContext.isSpaceOwner)}
        availableRoles={roomRolesThatUserOwn}
        onImportChatText={handleImportChatItems}
        onOpenRoleAddWindow={() => setIsRoleAddWindowOpen(true)}
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
