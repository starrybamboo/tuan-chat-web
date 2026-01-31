// 鎴块棿鑱婂ぉ涓荤獥鍙ｏ細璐熻矗娑堟伅娴佹覆鏌撱€佸鍏ュ彂閫佷笌闈㈡澘鍗忚皟銆?
import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, SpaceMember, UserRole } from "../../../../api";

import type { ClueMessage } from "../../../../api/models/ClueMessage";
import type { AtMentionHandle } from "@/components/atMentionController";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import type { SpaceWebgalVarsRecord, WebgalVarMessagePayload } from "@/types/webgalVar";
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
import useRealtimeRenderControls from "@/components/chat/room/useRealtimeRenderControls";
import useRoomRoleState from "@/components/chat/room/useRoomRoleState";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";
import { sendLlmStreamMessage } from "@/components/chat/utils/llmUtils";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor, { isCommand } from "@/components/common/dicer/cmdPre";

import UTILS from "@/components/common/dicer/utils/utils";
import { useGlobalContext } from "@/components/globalContextProvider";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { parseWebgalVarCommand } from "@/types/webgalVar";
import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";
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

// const PAGE_SIZE = 50; // 姣忛〉娑堟伅鏁伴噺
function RoomWindow({ roomId, spaceId, targetMessageId }: { roomId: number; spaceId: number; targetMessageId?: number | null }) {
  const spaceContext = use(SpaceContext);

  // BGM锛氬垏鎹?鍗歌浇鎴块棿鏃惰涓衡€滄墦鏂€濓紝鍋滄鎾斁浣嗕笉褰卞搷鐢ㄦ埛鏄惁宸蹭富鍔ㄥ叧闂紙dismiss锛?
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
    webSocketUtils.send({ type: 3, data: message }); // 鍙戦€佺兢鑱婃秷鎭?
  }, [webSocketUtils]);

  // 鐢ㄤ簬鎻掑叆娑堟伅鍔熻兘鐨?mutations
  const sendMessageMutation = useSendMessageMutation(roomId);
  const updateMessageMutation = useUpdateMessageMutation();
  const setSpaceExtraMutation = useSetSpaceExtraMutation(); // 璁剧疆绌洪棿 extra 瀛楁 (key/value)

  const chatInputRef = useRef<ChatInputAreaHandle>(null);
  const atMentionRef = useRef<AtMentionHandle>(null);

  // 杈撳叆鍖虹紪杈戞€侊細鏀惧叆 zustand store锛岄伩鍏?RoomWindow 姣忔鏁插瓧閲嶆覆鏌?
  const resetChatInputUi = useChatInputUiStore(state => state.reset);
  // 闄勪欢/鍙戦€侀€夐」锛氭斁鍏?zustand store锛岄伩鍏?RoomWindow 鍥犻檮浠跺彉鍖栨暣浣撻噸娓叉煋
  const resetChatComposer = useChatComposerStore(state => state.reset);

  const delayTimer = useRef<NodeJS.Timeout | null>(null);

  // *** ChatInputArea 鐨勫洖璋冨鐞嗗櫒 ***
  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    useChatInputUiStore.getState().setSnapshot({
      plainText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: roles,
    });
    // 妫€鏌?@ 鎻愬強瑙﹀彂
    atMentionRef.current?.onInput();
  }, []); // 绌轰緷璧栵紝鍥犱负 setter 鍑芥暟鏄ǔ瀹氱殑

  /**
   * *** setInputText 鐜板湪璋冪敤 ref API ***
   * 濡傛灉鎯充粠澶栭儴鎺у埗杈撳叆妗嗙殑鍐呭锛屼娇鐢ㄨ繖涓嚱鏁般€?
   * @param text 鎯宠閲嶇疆鐨刬nputText (娉ㄦ剰锛氳繖閲岀幇鍦ㄥ彧鎺ュ彈绾枃鏈紝濡傛灉闇€瑕?HTML 璇蜂慨鏀?
   */
  const setInputText = (text: string) => {
    chatInputRef.current?.setContent(text); // 鍛戒护瀛愮粍浠舵洿鏂板叾 DOM
    chatInputRef.current?.triggerSync(); // 鍚屾鍒?store
  };

  // 鍒囨崲鎴块棿鏃舵竻绌鸿緭鍏ュ尯缂栬緫鎬侊紝閬垮厤璺ㄦ埧闂翠覆杈撳叆
  useEffect(() => {
    resetChatInputUi();
    resetChatComposer();
    return () => {
      resetChatInputUi();
      resetChatComposer();
    };
  }, [resetChatInputUi, resetChatComposer, roomId]);

  const uploadUtils = new UploadUtils();

  // 鍒囨崲鎴块棿鏃舵竻绌哄紩鐢ㄦ秷鎭?/ 鎻掑叆浣嶇疆 / Thread 寮圭獥寮€鍏?
  useLayoutEffect(() => {
    useRoomUiStore.getState().reset();
  }, [roomId]);

  // 鑾峰彇鐢ㄦ埛鐨勬墍鏈夎鑹?
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

  // 鍏ㄥ眬鐧诲綍鐢ㄦ埛瀵瑰簲鐨刴ember
  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);

  // 涓?sideDrawer 鐩稿叧鐨勫壇浣滅敤杩佺Щ鍒扮嫭绔嬬粍浠?RoomSideDrawerGuards锛岄伩鍏?RoomWindow 璁㈤槄 sideDrawerState

  /**
   * 鑾峰彇鍘嗗彶娑堟伅
   */
  const chatHistory = useChatHistory(roomId);
  const historyMessages: ChatMessageResponse[] = chatHistory?.messages;

  // Discord 椋庢牸锛氫富娑堟伅娴佷笉鍖呭惈 thread 鍥炲
  const mainHistoryMessages = useMemo(() => {
    return (historyMessages ?? []).filter((m) => {
      // Thread Root锛?0001锛変笉鍦ㄤ富娑堟伅娴佷腑鍗曠嫭鏄剧ず锛氭敼涓烘寕鍦ㄢ€滃師娑堟伅鈥濅笅鏂圭殑鎻愮ず鏉?
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

  // 濡傛灉 URL 涓湁 targetMessageId锛岃嚜鍔ㄨ烦杞埌璇ユ秷鎭?
  const hasScrolledToTargetRef = useRef(false);
  useEffect(() => {
    if (targetMessageId && historyMessages.length > 0 && !chatHistory?.loading && !hasScrolledToTargetRef.current) {
      const messageExists = historyMessages.some(m => m.message.messageId === targetMessageId);
      if (messageExists) {
        // 寤惰繜涓€鐐圭‘淇?Virtuoso 宸茬粡娓叉煋瀹屾垚锛屽悓鏃堕伩鍏嶉噸澶嶅畾鏃跺櫒
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

  // WebGAL 璺宠浆鍒版寚瀹氭秷鎭紙鍏蜂綋鏄惁鍙敤浠嶇敱 isRealtimeRenderActive 鎺у埗锛?
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
      // WebGAL 璺宠浆鍔熻兘 - 鍙湁鍦ㄥ疄鏃舵覆鏌撴縺娲绘椂鎵嶅惎鐢?
      jumpToMessageInWebGAL: isRealtimeRenderActive ? jumpToMessageInWebGAL : undefined,
      // WebGAL 鏇存柊娓叉煋骞惰烦杞?- 鍙湁鍦ㄥ疄鏃舵覆鏌撴縺娲绘椂鎵嶅惎鐢?
      updateAndRerenderMessageInWebGAL: isRealtimeRenderActive ? updateAndRerenderMessageInWebGAL : undefined,
      // WebGAL 鎸夐『搴忛噸寤哄巻鍙?- 鍙湁鍦ㄥ疄鏃舵覆鏌撴縺娲绘椂鎵嶅惎鐢?
      rerenderHistoryInWebGAL: isRealtimeRenderActive ? rerenderHistoryInWebGAL : undefined,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, spaceId, chatHistory, scrollToGivenMessage, isRealtimeRenderActive, jumpToMessageInWebGAL, updateAndRerenderMessageInWebGAL, rerenderHistoryInWebGAL]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  // 鍒ゆ柇鏄惁鏄鎴樻垚鍛?(memberType >= 3)
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
    isSpectator, // 瑙傛垬鎴愬憳涓嶅彂閫佺姸鎬?
  });

  /**
   * AI閲嶅啓锛堣櫄褰遍瑙堬級
   */
  const llmMessageRef = useRef("");
  const isAutoCompletingRef = useRef(false);
  const hintNodeRef = useRef<HTMLSpanElement | null>(null); // Ref for the hint span itself

  // AI閲嶅啓鐩稿叧鐘舵€?
  const originalTextBeforeRewriteRef = useRef(""); // 淇濆瓨閲嶅啓鍓嶇殑鍘熸枃

  const setLLMMessage = (newLLMMessage: string) => {
    if (hintNodeRef.current) {
      hintNodeRef.current.remove(); // 绉婚櫎鏃х殑鎻愮ず鑺傜偣
    }
    llmMessageRef.current = newLLMMessage;

    // 鍒涘缓瀹瑰櫒鐢ㄤ簬鍖呭惈 AI 铏氬奖缁撴灉鍜屾彁绀鸿瘝
    const containerNode = document.createElement("span");
    containerNode.contentEditable = "false";
    containerNode.style.pointerEvents = "none";

    // 鍒涘缓铏氬奖鏂囨湰鑺傜偣
    const hintNode = document.createElement("span");
    hintNode.textContent = newLLMMessage;
    hintNode.className = "opacity-60";

    // 鍒涘缓鎻愮ず璇嶈妭鐐?(鍙湪鏈夊唴瀹规椂鏄剧ず)
    const tipsNode = document.createElement("span");
    tipsNode.textContent = newLLMMessage ? " [Tab 鎺ュ彈]" : "";
    tipsNode.className = "opacity-40 text-xs";
    tipsNode.style.marginLeft = "4px";

    // 灏嗚櫄褰辨枃鏈拰鎻愮ず璇嶆坊鍔犲埌瀹瑰櫒
    containerNode.appendChild(hintNode);
    if (newLLMMessage) {
      containerNode.appendChild(tipsNode);
    }

    // *** 璋冪敤 ref API 鎻掑叆鑺傜偣 ***
    chatInputRef.current?.insertNodeAtCursor(containerNode);
    hintNodeRef.current = containerNode; // 淇濆瓨瀵规柊鑺傜偣鐨勫紩鐢?

    const handleInput = () => {
      containerNode.remove();
      chatInputRef.current?.getRawElement()?.removeEventListener("input", handleInput);
      isAutoCompletingRef.current = false;
      hintNodeRef.current = null;
    };
    // *** 鐩戝惉瀛愮粍浠剁殑鍘熷鍏冪礌 ***
    chatInputRef.current?.getRawElement()?.addEventListener("input", handleInput);
  };

  const insertLLMMessageIntoText = () => {
    if (!chatInputRef.current)
      return;

    // 绉婚櫎鎻愮ず span
    if (hintNodeRef.current) {
      hintNodeRef.current.remove();
      hintNodeRef.current = null;
    }

    // 妫€鏌ユ槸鍚︽槸閲嶅啓妯″紡锛堟湁鍘熸枃淇濆瓨锛?
    if (originalTextBeforeRewriteRef.current) {
      // 閲嶅啓妯″紡锛氱洿鎺ヨ缃负閲嶅啓鍚庣殑鏂囨湰
      const rewriteText = llmMessageRef.current.replace(/\u200B/g, ""); // 绉婚櫎闆跺瀛楃
      setInputText(rewriteText);
      // 鍚屾鏇存柊 DOM
      if (chatInputRef.current?.getRawElement()) {
        chatInputRef.current.getRawElement()!.textContent = rewriteText;
      }
      originalTextBeforeRewriteRef.current = ""; // 娓呯┖鍘熸枃璁板綍
      toast.success("已接受重写");
    }
    else {
      // 鐞嗚涓婁笉浼氳繘鍏ワ細褰撳墠浠呬繚鐣欓噸鍐欒櫄褰憋紝浣嗕负瀹夊叏璧疯浠嶆敮鎸佹彃鍏?
      chatInputRef.current.insertNodeAtCursor(llmMessageRef.current, { moveCursorToEnd: true });
    }

    setLLMMessage(""); // 娓呯┖铏氬奖鐘舵€?
    chatInputRef.current.triggerSync(); // 鎵嬪姩瑙﹀彂鍚屾锛屾洿鏂?store
  };

  // AI閲嶅啓锛氭樉绀轰负铏氬奖棰勮
  const handleQuickRewrite = async (prompt: string) => {
    const currentPlainText = useChatInputUiStore.getState().plainText;
    if (!currentPlainText.trim()) {
      toast.error("璇峰厛杈撳叆鍐呭");
      return;
    }

    if (isAutoCompletingRef.current) {
      return;
    }

    isAutoCompletingRef.current = true;

    // 濡傛灉宸叉湁铏氬奖锛屽厛娓呴櫎
    if (llmMessageRef.current) {
      setLLMMessage("");
    }

    originalTextBeforeRewriteRef.current = currentPlainText; // 淇濆瓨鍘熸枃

    try {
      const fullPrompt = `${prompt}\n\n璇锋牴鎹笂杩拌姹傞噸鍐欎互涓嬫枃鏈細\n${currentPlainText}`;

      // 娓呯┖杈撳叆妗嗭紝鎻掑叆闆跺瀛楃浣滀负閿氱偣
      const rawElement = chatInputRef.current?.getRawElement();
      if (rawElement) {
        rawElement.textContent = "\u200B"; // 闆跺绌烘牸
        rawElement.focus();
        // 鍏夋爣绉诲埌鏈熬
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(rawElement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setInputText("\u200B");

      await sendLlmStreamMessage(fullPrompt, (newContent) => {
        // 鍏堟竻闄ら浂瀹藉瓧绗?
        if (rawElement && rawElement.textContent === "\u200B") {
          rawElement.textContent = "";
        }
        // 鏄剧ず涓鸿櫄褰?
        setLLMMessage(newContent);
        return true;
      });

      toast.success("閲嶅啓瀹屾垚锛屾寜 Tab 鎺ュ彈鎴?Esc 鍙栨秷");
    }
    catch (error) {
      toast.error(`AI閲嶅啓澶辫触: ${error}`);
      // 鎭㈠鍘熸枃
      setInputText(originalTextBeforeRewriteRef.current);
      originalTextBeforeRewriteRef.current = "";
    }
    finally {
      isAutoCompletingRef.current = false;
    }
  };

  /**
   *澶勭悊涓庣粍浠剁殑鍚勭浜や簰
   */
  const handleSelectCommand = (cmdName: string) => {
    const prefixChar = useChatInputUiStore.getState().plainText[0] || "."; // 榛樿涓?.
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const notMember = ((members.find(member => member.userId === userId)?.memberType ?? 3) >= 3); // 娌℃湁鏉冮檺
  const noRole = curRoleId <= 0;

  const containsCommandRequestAllToken = useCallback((text: string) => {
    const raw = String(text ?? "");
    return /@all\b/i.test(raw) || raw.includes("@全员") || raw.includes("@指定请求");
  }, []);

  const stripCommandRequestAllToken = useCallback((text: string) => {
    return String(text ?? "")
      .replace(/@all\b/gi, " ")
      .replace(/@全员/g, " ")
      .replace(/@指定请求/g, " ")
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
    const match = trimmed.match(/[.銆?][A-Z][^\n]*/i);
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
      toast.error("鎸囦护涓虹┖");
      return;
    }

    const isKP = spaceContext.isSpaceOwner;
    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (noRole && !isKP) {
      toast.error("鏃佺櫧浠匥P鍙敤锛岃鍏堥€夋嫨/鎷夊叆浣犵殑瑙掕壊");
      return;
    }
    if (isSubmitting) {
      toast.error("姝ｅ湪鍙戦€佷腑锛岃绋嶇瓑");
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
   * 鍙戦€佹秷鎭殑杈呭姪鍑芥暟
   * 濡傛灉璁剧疆浜?insertAfterMessageId锛屽垯浣跨敤 HTTP API 鍙戦€佸苟鏇存柊 position
   * 鍚﹀垯浣跨敤 WebSocket 鍙戦€?
   */
  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
    const insertAfterMessageId = useRoomUiStore.getState().insertAfterMessageId;

    if (insertAfterMessageId && mainHistoryMessages) {
      // 鎵惧埌鐩爣娑堟伅鐨勭储寮?
      const targetIndex = mainHistoryMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
      if (targetIndex === -1) {
        // 濡傛灉鎵句笉鍒扮洰鏍囨秷鎭紝闄嶇骇涓烘櫘閫氬彂閫?
        send(message);
        return;
      }

      try {
        // 浣跨敤 HTTP API 鍙戦€佹秷鎭?
        const result = await sendMessageMutation.mutateAsync(message);
        if (!result.success || !result.data) {
          toast.error("发送消息失败");
          return;
        }

        const newMessage = result.data;

        // 璁＄畻鏂版秷鎭殑 position
        const targetMessage = mainHistoryMessages[targetIndex];
        const nextMessage = mainHistoryMessages[targetIndex + 1];
        const targetPosition = targetMessage.message.position;
        const nextPosition = nextMessage?.message.position ?? targetPosition + 1;
        const newPosition = (targetPosition + nextPosition) / 2;

        // 鏇存柊娑堟伅鐨?position
        await updateMessageMutation.mutateAsync({
          ...newMessage,
          position: newPosition,
        });

        // 鎵嬪姩鏇存柊鏈湴缂撳瓨锛堟瀯寤?ChatMessageResponse 鏍煎紡锛?
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
        console.error("鎻掑叆娑堟伅澶辫触:", error);
        toast.error("鎻掑叆娑堟伅澶辫触");
      }
    }
    else {
      // 鏅€氬彂閫?
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
      toast.error("鏃佺櫧浠匥P鍙敤锛岃鍏堥€夋嫨/鎷夊叆浣犵殑瑙掕壊");
      return;
    }
    if (isSubmitting || webgalVarSendingRef.current) {
      toast.error("姝ｅ湪璁剧疆鍙橀噺锛岃绋嶇瓑");
      return;
    }

    if (!rawKey || !rawExpr) {
      toast.error("变量名或表达式不能为空");
      return;
    }
    if (!/^[A-Z_]\w*$/i.test(rawKey)) {
      toast.error("鍙橀噺鍚嶆牸寮忎笉姝ｇ‘");
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
      const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);
      const varMsg: ChatMessageRequest = {
        roomId,
        roleId: curRoleId,
        avatarId: resolvedAvatarId,
        content: "",
        messageType: MessageType.WEBGAL_VAR,
        extra: {
          webgalVar: payload,
        },
      };

      // 鍙戦€佸尯鑷畾涔夎鑹插悕锛堜笌鑱斿姩妯″紡鏃犲叧锛?
      const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
      if (draftCustomRoleName?.trim()) {
        varMsg.webgal = {
          ...(varMsg.webgal as any),
          customRoleName: draftCustomRoleName.trim(),
        } as any;
      }

      await sendMessageWithInsert(varMsg);

      // 绌洪棿绾ф寔涔呭寲锛氬啓鍏?space.extra 鐨?webgalVars锛堝悗绔互 key/value 瀛樺偍锛?
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
        console.error("鍐欏叆 space.extra.webgalVars 澶辫触:", error);
        toast.error("鍙橀噺宸插彂閫侊紝浣嗗啓鍏ョ┖闂存寔涔呭寲澶辫触");
      }
    }
    finally {
      webgalVarSendingRef.current = false;
    }
  }, [curRoleId, ensureRuntimeAvatarIdForRole, isSubmitting, notMember, roomId, sendMessageWithInsert, setSpaceExtraMutation, space?.extra, spaceContext.isSpaceOwner, spaceId]);

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

    // 鏃佺櫧涓嶅啀渚濊禆鑱斿姩妯″紡锛屼絾浠匥P鍙敤
    const disableSendMessage = (notMember || noInput || isSubmitting)
      || (isNarrator && !isKP);

    if (disableSendMessage) {
      if (notMember)
        toast.error("您是观战，不能发送消息");
      else if (isNarrator && !isKP)
        toast.error("鏃佺櫧浠匥P鍙敤锛岃鍏堥€夋嫨/鎷夊叆浣犵殑瑙掕壊");
      else if (noInput)
        toast.error("请输入内容");
      else if (isSubmitting)
        toast.error("姝ｅ湪鍙戦€佷腑锛岃绋嶇瓑");
      return;
    }
    if (inputText.length > 1024) {
      toast.error("输入内容过长，最长不超过 1024 个字符");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedImages: any[] = [];
      const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);

      // 1. 涓婁紶鍥剧墖
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        const { width, height, size } = await getImageSize(imgFiles[i]);
        uploadedImages.push({ url: imgDownLoadUrl, width, height, size, fileName: imgFiles[i].name });
      }
      setImgFiles([]);

      // 2. 涓婁紶琛ㄦ儏 (瑙嗕负鍥剧墖)
      for (let i = 0; i < emojiUrls.length; i++) {
        const { width, height, size } = await getImageSize(emojiUrls[i]);
        uploadedImages.push({ url: emojiUrls[i], width, height, size, fileName: "emoji" });
      }
      setEmojiUrls([]);

      // 3. 涓婁紶璇煶
      let soundMessageData: any = null;
      if (audioFile) {
        // 0 琛ㄧず涓嶆埅鏂紙涓嶅啀寮哄埗 60s 闄愬埗锛?
        const maxAudioDurationSec = 0;
        const objectUrl = URL.createObjectURL(audioFile);
        const debugEnabled = isAudioUploadDebugEnabled();
        const debugPrefix = "[tc-audio-upload]";
        const audioToastId = toast.loading("音频处理中（转码/上传中）...");

        if (debugEnabled) {
          console.warn(`${debugPrefix} roomWindow send audio`, {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size,
            lastModified: audioFile.lastModified,
            truncateToSec: maxAudioDurationSec > 0 ? maxAudioDurationSec : null,
          });
        }

        try {
          const durationSec = await (async () => {
            try {
              const audio = new Audio();
              audio.preload = "metadata";
              audio.src = objectUrl;
              audio.load();

              return await new Promise<number | undefined>((resolve) => {
                const timeout = window.setTimeout(() => resolve(undefined), 5000);
                const cleanup = () => {
                  window.clearTimeout(timeout);
                  audio.onloadedmetadata = null;
                  audio.onerror = null;
                  audio.onabort = null;
                };

                audio.onloadedmetadata = () => {
                  const d = audio.duration;
                  cleanup();
                  resolve(Number.isFinite(d) && d > 0 ? d : undefined);
                };
                audio.onerror = () => {
                  cleanup();
                  resolve(undefined);
                };
                audio.onabort = () => {
                  cleanup();
                  resolve(undefined);
                };
              });
            }
            finally {
              URL.revokeObjectURL(objectUrl);
            }
          })();

          const second = (typeof durationSec === "number" && Number.isFinite(durationSec))
            ? Math.max(1, Math.round(durationSec))
            : 1;

          if (debugEnabled)
            console.warn(`${debugPrefix} duration`, { durationSec, second });

          const url = await uploadUtils.uploadAudio(audioFile, 1, maxAudioDurationSec);

          soundMessageData = {
            url,
            second,
            fileName: audioFile.name,
            size: audioFile.size,
          };
          setAudioFile(null);
        }
        catch (error) {
          console.error(`${debugPrefix} uploadAudio failed`, error);
          throw error;
        }
        finally {
          toast.dismiss(audioToastId);
        }
      }

      // 4. 鏋勫缓骞跺彂閫佹秷鎭?
      const finalReplyId = useRoomUiStore.getState().replyMessage?.messageId || undefined;
      let isFirstMessage = true;

      const getCommonFields = () => {
        const fields: Partial<ChatMessageRequest> = {
          roomId,
          roleId: curRoleId,
          avatarId: resolvedAvatarId,
        };

        // Thread 妯″紡锛氱粰鏈鍙戦€佺殑娑堟伅鎸備笂 threadId锛坮oot messageId锛?
        const { threadRootMessageId: activeThreadRootId, composerTarget } = useRoomUiStore.getState();
        if (composerTarget === "thread" && activeThreadRootId) {
          fields.threadId = activeThreadRootId;
        }

        // 鍙戦€佸尯鑷畾涔夎鑹插悕锛堜笌鑱斿姩妯″紡鏃犲叧锛?
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

      // WebGAL 绌洪棿鍙橀噺鎸囦护锛?var set a=1
      const trimmedWithoutMentions = inputTextWithoutMentions.trim();
      const isWebgalVarCommandPrefix = /^\/var\b/i.test(trimmedWithoutMentions);
      const webgalVarPayload = parseWebgalVarCommand(trimmedWithoutMentions);

      // 濡傛灉鐢ㄦ埛杈撳叆浜?/var 鍓嶇紑浣嗘牸寮忎笉姝ｇ‘锛氫笉浜ょ粰楠板鍛戒护绯荤粺澶勭悊锛岀洿鎺ユ彁绀?
      if (isWebgalVarCommandPrefix && !webgalVarPayload) {
        toast.error("鍙橀噺鎸囦护鏍煎紡锛?var set a=1");
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

        // 娑堣€楁帀 firstMessage 鐘舵€侊紝骞堕槻姝㈠悗缁啀娆′綔涓烘枃鏈彂閫?
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

        // 绌洪棿绾ф寔涔呭寲锛氬啓鍏?space.extra 鐨?webgalVars锛堝悗绔互 key/value 瀛樺偍锛?
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
          console.error("鍐欏叆 space.extra.webgalVars 澶辫触:", error);
          toast.error("鍙橀噺宸插彂閫侊紝浣嗗啓鍏ョ┖闂存寔涔呭寲澶辫触");
        }

        // 娑堣€楁帀 firstMessage 鐘舵€侊紝骞堕槻姝㈠悗缁啀娆′綔涓烘枃鏈彂閫?
        isFirstMessage = false;
        textContent = "";
      }
      else if (textContent && isCommand(textContent)) {
        commandExecutor({ command: inputTextWithoutMentions, mentionedRoles: mentionedRolesInInput, originMessage: inputText });
        // 鎸囦护鎵ц涔熻瑙嗕负涓€娆?鍙戦€?锛屾秷鑰楁帀 firstMessage 鐘舵€?
        isFirstMessage = false;
        textContent = "";
      }

      // B. 鍙戦€佸浘鐗?
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

      // C. 鍙戦€侀煶棰?
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

      // A. 鍙戦€佹枃鏈?(濡傛灉鍓嶉潰娌℃湁琚浘鐗囨垨璇煶娑堣€楁帀)
      if (textContent) {
        // WebGAL 鎸囦护娑堟伅锛氳緭鍏ヤ互 % 寮€澶存椂锛岃浆涓烘樉寮忕殑 WEBGAL_COMMAND 绫诲瀷銆?
        // 娉ㄦ剰锛氳繖閲屾槸鈥滃彂閫佷晶鍗忚杞崲鈥濓紝娓叉煋渚т笉鍐嶄緷璧?% 鍓嶇紑銆?
        const isPureTextSend = uploadedImages.length === 0 && !soundMessageData;
        const isWebgalCommandInput = isPureTextSend && textContent.startsWith("%");
        const normalizedContent = isWebgalCommandInput ? textContent.slice(1).trim() : textContent;

        if (isWebgalCommandInput && !normalizedContent) {
          toast.error("WebGAL 鎸囦护涓嶈兘涓虹┖");
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

      setInputText(""); // 璋冪敤閲嶆瀯鐨?setInputText 鏉ユ竻绌?
      useRoomUiStore.getState().setReplyMessage(undefined);
      setSendAsBackground(false);
      setAudioPurpose(undefined);
      useRoomUiStore.getState().setInsertAfterMessageId(undefined); // 娓呴櫎鎻掑叆浣嶇疆
    }
    catch (e: any) {
      toast.error(e.message + e.stack, { duration: 3000 });
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const handleImportChatText = useCallback(async (
    messages: Array<{ roleId: number; content: string; speakerName?: string; figurePosition?: "left" | "center" | "right" }>,
    onProgress?: (sent: number, total: number) => void,
  ) => {
    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isSubmitting) {
      toast.error("姝ｅ湪鍙戦€佷腑锛岃绋嶇瓑");
      return;
    }
    if (!messages.length) {
      toast.error("娌℃湁鍙鍏ョ殑鏈夋晥娑堟伅");
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

        // 鏂囨湰瀵煎叆锛氳嫢鍙戣█浜烘槧灏勪负鈥滈濞樷€濓紝鍒欎娇鐢ㄩ濞樿鑹插彂閫侊紝骞舵寜 DICE(6) 绫诲瀷鏋勯€犳秷鎭?extra銆?
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

  // 绾跨储娑堟伅鍙戦€?
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
      toast.error("鏈娴嬪埌鍙敤鏂囨。");
      return;
    }

    if (!parseDescriptionDocId(docId)) {
      toast.error("仅支持发送空间文档（我的文档/描述文档）");
      return;
    }

    if (!spaceId || spaceId <= 0) {
      toast.error("当前不在空间中，无法发送文档");
      return;
    }

    if (payload?.spaceId && payload.spaceId !== spaceId) {
      toast.error("浠呮敮鎸佸湪鍚屼竴绌洪棿鍒嗕韩鏂囨。");
      return;
    }

    const isKP = spaceContext.isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isNarrator && !isKP) {
      toast.error("鏃佺櫧浠匥P鍙敤锛岃鍏堥€夋嫨/鎷夊叆浣犵殑瑙掕壊");
      return;
    }
    if (isSubmitting) {
      toast.error("姝ｅ湪鍙戦€佷腑锛岃绋嶇瓑");
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

  // *** 鏂板: onPasteFiles 鐨勫洖璋冨鐞嗗櫒 ***
  const handlePasteFiles = (files: File[]) => {
    useChatComposerStore.getState().updateImgFiles((draft) => {
      draft.push(...files);
    });
  };

  const isComposingRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 妫€鏌?@ 鎺у埗鍣ㄦ槸鍚︽墦寮€骞朵笖鏄惁澶勭悊浜嗚繖涓簨浠?
    const isAtOpen = atMentionRef.current?.isDialogOpen() ?? false;
    if (isAtOpen) {
      const handled = atMentionRef.current?.onKeyDown(e) ?? false;
      if (handled) {
        return; // 浜嬩欢宸茶 @ 鎺у埗鍣ㄦ秷鑰楋紙渚嬪绠ご瀵艰埅锛?
      }
    }

    // Esc 閿細鍙栨秷閲嶅啓锛屾仮澶嶅師鏂?
    if (e.key === "Escape" && originalTextBeforeRewriteRef.current) {
      e.preventDefault();
      setInputText(originalTextBeforeRewriteRef.current);
      originalTextBeforeRewriteRef.current = "";
      setLLMMessage("");
      toast("已取消重写");
      return;
    }

    // 濡傛灉 @ 鎺у埗鍣ㄦ湭澶勭悊锛屽垯缁х画鎵ц鍘熷閫昏緫
    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      handleMessageSubmit();
    }
    else if (e.key === "Tab") {
      e.preventDefault();
      // 1) 鑻ュ凡鏈?AI 铏氬奖缁撴灉锛孴ab 鐩存帴鎺ュ彈
      if (llmMessageRef.current) {
        insertLLMMessageIntoText();
        return;
      }

      // 2) 鍚﹀垯 Tab 瑙﹀彂 AI 閲嶅啓锛堜娇鐢ㄦ湰鍦颁繚瀛樼殑鎻愮ず璇嶏級
      const prompt = localStorage.getItem("ai-rewrite-prompt") || "请优化这段文字的表达，使其更加清晰流畅";
      handleQuickRewrite(prompt);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // 鎬绘槸閫氱煡 @ 鎺у埗鍣ㄥ叧浜?keyup 浜嬩欢
    atMentionRef.current?.onKeyUp(e);

    // 蹇嵎閿樆姝?(鐖剁粍浠堕€昏緫)
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b": case "i": case "u":
          e.preventDefault();
          break;
      }
    }
  };

  function handleMouseDown(e: React.MouseEvent) {
    // 妫€鏌?@ 鎺у埗鍣ㄦ槸鍚﹀鐞嗕簡 mousedown锛堜互闃叉澶辩劍锛?
    atMentionRef.current?.onMouseDown(e);
  }

  const [isRoleHandleOpen, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { toast("娣诲姞瑙掕壊鎴愬姛"); },
    });
  };

  // *** 鍑嗗 props ***
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const placeholderText = (() => {
    const isKP = spaceContext.isSpaceOwner;
    if (notMember) {
      return "你是观战成员，不能发送消息";
    }
    if (noRole && !isKP) {
      return "请先拉入你的角色，之后才能发送消息";
    }
    if (noRole && isKP) {
      return "旁白模式：在此输入消息...(shift+enter 换行，tab 触发 AI 重写，上方按钮可修改重写提示词)";
    }
    if (curAvatarId <= 0) {
      return "请为你的角色添加至少一个表情差分（头像）";
    }
    if (threadRootMessageId && composerTarget === "thread") {
      return "在 Thread 中回复...(shift+enter 换行，tab 触发 AI 重写，上方按钮可修改重写提示词)";
    }
    return "输入消息...(shift+enter 换行，tab 触发 AI 重写，上方按钮可修改重写提示词)";
  })();

  const handleSendEffect = useCallback((effectName: string) => {
    // 鐗规晥娑堟伅涓嶉渶瑕佽鑹蹭俊鎭紝绫讳技鏃佺櫧
    // 娉ㄦ剰锛歟xtra 搴旇鐩存帴鏄?EffectMessage 瀵硅薄锛屽悗绔細鑷姩鍖呰鍒?MessageExtra 涓?
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: `[鐗规晥: ${effectName}]`,
      messageType: MessageType.EFFECT,
      extra: {
        effectName,
      },
    });
  }, [roomId, send]);

  const handleClearBackground = useCallback(() => {
    // 娓呴櫎鑳屾櫙涓嶉渶瑕佽鑹蹭俊鎭紝绫讳技鏃佺櫧
    // 娉ㄦ剰锛歟xtra 搴旇鐩存帴鏄?EffectMessage 瀵硅薄锛屽悗绔細鑷姩鍖呰鍒?MessageExtra 涓?
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[娓呴櫎鑳屾櫙]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearBackground",
      },
    });
    toast.success("已清除背景");
  }, [roomId, send]);

  const handleClearFigure = useCallback(() => {
    // 娓呴櫎瑙掕壊绔嬬粯涓嶉渶瑕佽鑹蹭俊鎭紝绫讳技鏃佺櫧
    // 娉ㄦ剰锛歟xtra 搴旇鐩存帴鏄?EffectMessage 瀵硅薄锛屽悗绔細鑷姩鍖呰鍒?MessageExtra 涓?
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[娓呴櫎绔嬬粯]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearFigure",
      },
    });
    // 濡傛灉瀹炴椂娓叉煋寮€鍚紝绔嬪嵆娓呴櫎绔嬬粯
    if (isRealtimeRenderActive) {
      clearRealtimeFigure();
    }
    toast.success("已清除立绘");
  }, [clearRealtimeFigure, isRealtimeRenderActive, roomId, send]);

  // KP锛氬仠姝㈠叏鍛楤GM锛堝箍鎾郴缁熸秷鎭級
  const handleStopBgmForAll = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[鍋滄BGM]",
      messageType: MessageType.SYSTEM,
      extra: {},
    });
    toast.success("宸插彂閫佸仠姝GM");
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
    onCompositionStart: () => isComposingRef.current = true,
    onCompositionEnd: () => isComposingRef.current = false,
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
