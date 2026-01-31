// 閹村潡妫块懕濠傘亯娑撹崵鐛ラ崣锝忕窗鐠愮喕鐭楀☉鍫熶紖濞翠焦瑕嗛弻鎾扁偓浣割嚤閸忋儱褰傞柅浣风瑢闂堛垺婢橀崡蹇氱殶閵?
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
import useChatInputHandlers from "@/components/chat/room/useChatInputHandlers";
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

// const PAGE_SIZE = 50; // 濮ｅ繘銆夊☉鍫熶紖閺佷即鍣?
function RoomWindow({ roomId, spaceId, targetMessageId }: { roomId: number; spaceId: number; targetMessageId?: number | null }) {
  const spaceContext = use(SpaceContext);

  // BGM閿涙艾鍨忛幑?閸楁瓕娴囬幋鍧楁？閺冩儼顫嬫稉琛♀偓婊勫ⅵ閺傤厸鈧繐绱濋崑婊勵剾閹绢厽鏂佹担鍡曠瑝瑜板崬鎼烽悽銊﹀煕閺勵垰鎯佸韫瘜閸斻劌鍙ч梻顓ㄧ礄dismiss閿?
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
    webSocketUtils.send({ type: 3, data: message }); // 閸欐垿鈧胶鍏㈤懕濠冪Х閹?
  }, [webSocketUtils]);

  // 閻劋绨幓鎺戝弳濞戝牊浼呴崝鐔诲厴閻?mutations
  const sendMessageMutation = useSendMessageMutation(roomId);
  const updateMessageMutation = useUpdateMessageMutation();
  const setSpaceExtraMutation = useSetSpaceExtraMutation(); // 鐠佸墽鐤嗙粚娲？ extra 鐎涙顔?(key/value)

  const chatInputRef = useRef<ChatInputAreaHandle>(null);
  const atMentionRef = useRef<AtMentionHandle>(null);

  // 鏉堟挸鍙嗛崠铏圭椽鏉堟垶鈧緤绱伴弨鎯у弳 zustand store閿涘矂浼╅崗?RoomWindow 濮ｅ繑顐奸弫鎻掔摟闁插秵瑕嗛弻?
  const resetChatInputUi = useChatInputUiStore(state => state.reset);
  // 闂勫嫪娆?閸欐垿鈧線鈧銆嶉敍姘杹閸?zustand store閿涘矂浼╅崗?RoomWindow 閸ョ娀妾禒璺哄綁閸栨牗鏆ｆ担鎾诲櫢濞撳弶鐓?
  const resetChatComposer = useChatComposerStore(state => state.reset);

  const delayTimer = useRef<NodeJS.Timeout | null>(null);

  // *** ChatInputArea 閻ㄥ嫬娲栫拫鍐槱閻炲棗娅?***
  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    useChatInputUiStore.getState().setSnapshot({
      plainText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: roles,
    });
    // 濡偓閺?@ 閹绘劕寮风憴锕€褰?
    atMentionRef.current?.onInput();
  }, []); // 缁岃桨绶风挧鏍电礉閸ョ姳璐?setter 閸戣姤鏆熼弰顖溓旂€规氨娈?

  /**
   * *** setInputText 閻滄澘婀拫鍐暏 ref API ***
   * 婵″倹鐏夐幆鍏呯矤婢舵牠鍎撮幒褍鍩楁潏鎾冲弳濡楀棛娈戦崘鍛啇閿涘奔濞囬悽銊ㄧ箹娑擃亜鍤遍弫鑸偓?
   * @param text 閹疇顩﹂柌宥囩枂閻ㄥ埇nputText (濞夈劍鍓伴敍姘崇箹闁插瞼骞囬崷銊ュ涧閹恒儱褰堢痪顖涙瀮閺堫剨绱濇俊鍌涚亯闂団偓鐟?HTML 鐠囪渹鎱ㄩ弨?
   */
  const setInputText = (text: string) => {
    chatInputRef.current?.setContent(text); // 閸涙垝鎶ょ€涙劗绮嶆禒鑸垫纯閺傛澘鍙?DOM
    chatInputRef.current?.triggerSync(); // 閸氬本顒為崚?store
  };

  // 閸掑洦宕查幋鍧楁？閺冭埖绔荤粚楦跨翻閸忋儱灏紓鏍帆閹緤绱濋柆鍨帳鐠恒劍鍩ч梻缈犺鏉堟挸鍙?
  useEffect(() => {
    resetChatInputUi();
    resetChatComposer();
    return () => {
      resetChatInputUi();
      resetChatComposer();
    };
  }, [resetChatInputUi, resetChatComposer, roomId]);

  const uploadUtils = new UploadUtils();

  // 閸掑洦宕查幋鍧楁？閺冭埖绔荤粚鍝勭穿閻劍绉烽幁?/ 閹绘帒鍙嗘担宥囩枂 / Thread 瀵湱鐛ュ鈧崗?
  useLayoutEffect(() => {
    useRoomUiStore.getState().reset();
  }, [roomId]);

  // 閼惧嘲褰囬悽銊﹀煕閻ㄥ嫭澧嶉張澶庮潡閼?
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

  // 閸忋劌鐪惂璇茬秿閻劍鍩涚€电懓绨查惃鍒磂mber
  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);

  // 娑?sideDrawer 閻╃鍙ч惃鍕娴ｆ粎鏁ゆ潻浣盒╅崚鎵缁斿绮嶆禒?RoomSideDrawerGuards閿涘矂浼╅崗?RoomWindow 鐠併垽妲?sideDrawerState

  /**
   * 閼惧嘲褰囬崢鍡楀蕉濞戝牊浼?
   */
  const chatHistory = useChatHistory(roomId);
  const historyMessages: ChatMessageResponse[] = chatHistory?.messages;

  // Discord 妞嬪孩鐗搁敍姘瘜濞戝牊浼呭ù浣风瑝閸栧懎鎯?thread 閸ョ偛顦?
  const mainHistoryMessages = useMemo(() => {
    return (historyMessages ?? []).filter((m) => {
      // Thread Root閿?0001閿涘绗夐崷銊ゅ瘜濞戝牊浼呭ù浣疯厬閸楁洜瀚弰鍓с仛閿涙碍鏁兼稉鐑樺瘯閸︺劉鈧粌甯☉鍫熶紖閳ユ繀绗呴弬鍦畱閹绘劗銇氶弶?
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

  // 婵″倹鐏?URL 娑擃厽婀?targetMessageId閿涘矁鍤滈崝銊ㄧ儲鏉烆剙鍩岀拠銉︾Х閹?
  const hasScrolledToTargetRef = useRef(false);
  useEffect(() => {
    if (targetMessageId && historyMessages.length > 0 && !chatHistory?.loading && !hasScrolledToTargetRef.current) {
      const messageExists = historyMessages.some(m => m.message.messageId === targetMessageId);
      if (messageExists) {
        // 瀵ゆ儼绻滄稉鈧悙鍦€樻穱?Virtuoso 瀹歌尙绮″〒鍙夌厠鐎瑰本鍨氶敍灞芥倱閺冨爼浼╅崗宥夊櫢婢跺秴鐣鹃弮璺烘珤
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

  // WebGAL 鐠哄疇娴嗛崚鐗堝瘹鐎规碍绉烽幁顖ょ礄閸忚渹缍嬮弰顖氭儊閸欘垳鏁ゆ禒宥囨暠 isRealtimeRenderActive 閹貉冨煑閿?
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
      // WebGAL 鐠哄疇娴嗛崝鐔诲厴 - 閸欘亝婀侀崷銊ョ杽閺冭埖瑕嗛弻鎾寸负濞茬粯妞傞幍宥呮儙閻?
      jumpToMessageInWebGAL: isRealtimeRenderActive ? jumpToMessageInWebGAL : undefined,
      // WebGAL 閺囧瓨鏌婂〒鍙夌厠楠炴儼鐑︽潪?- 閸欘亝婀侀崷銊ョ杽閺冭埖瑕嗛弻鎾寸负濞茬粯妞傞幍宥呮儙閻?
      updateAndRerenderMessageInWebGAL: isRealtimeRenderActive ? updateAndRerenderMessageInWebGAL : undefined,
      // WebGAL 閹稿銆庢惔蹇涘櫢瀵ゅ搫宸婚崣?- 閸欘亝婀侀崷銊ョ杽閺冭埖瑕嗛弻鎾寸负濞茬粯妞傞幍宥呮儙閻?
      rerenderHistoryInWebGAL: isRealtimeRenderActive ? rerenderHistoryInWebGAL : undefined,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, spaceId, chatHistory, scrollToGivenMessage, isRealtimeRenderActive, jumpToMessageInWebGAL, updateAndRerenderMessageInWebGAL, rerenderHistoryInWebGAL]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  // 閸掋倖鏌囬弰顖氭儊閺勵垵顫囬幋妯诲灇閸?(memberType >= 3)
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
    isSpectator, // 鐟欏倹鍨幋鎰喅娑撳秴褰傞柅浣哄Ц閹?
  });

  /**
   * AI闁插秴鍟撻敍鍫ｆ珓瑜伴亶顣╃憴鍫礆
   */
  const llmMessageRef = useRef("");
  const isAutoCompletingRef = useRef(false);
  const hintNodeRef = useRef<HTMLSpanElement | null>(null); // Ref for the hint span itself

  // AI闁插秴鍟撻惄绋垮彠閻樿埖鈧?
  const originalTextBeforeRewriteRef = useRef(""); // 娣囨繂鐡ㄩ柌宥呭晸閸撳秶娈戦崢鐔告瀮

  const setLLMMessage = (newLLMMessage: string) => {
    if (hintNodeRef.current) {
      hintNodeRef.current.remove(); // 缁夊娅庨弮褏娈戦幓鎰仛閼哄倻鍋?
    }
    llmMessageRef.current = newLLMMessage;

    // 閸掓稑缂撶€圭懓娅掗悽銊ょ艾閸栧懎鎯?AI 閾忔艾濂栫紒鎾寸亯閸滃本褰佺粈楦跨槤
    const containerNode = document.createElement("span");
    containerNode.contentEditable = "false";
    containerNode.style.pointerEvents = "none";

    // 閸掓稑缂撻搹姘閺傚洦婀伴懞鍌滃仯
    const hintNode = document.createElement("span");
    hintNode.textContent = newLLMMessage;
    hintNode.className = "opacity-60";

    // 閸掓稑缂撻幓鎰仛鐠囧秷濡悙?(閸欘亜婀張澶婂敶鐎硅妞傞弰鍓с仛)
    const tipsNode = document.createElement("span");
    tipsNode.textContent = newLLMMessage ? " [Tab 閹恒儱褰圿" : "";
    tipsNode.className = "opacity-40 text-xs";
    tipsNode.style.marginLeft = "4px";

    // 鐏忓棜娅勮ぐ杈ㄦ瀮閺堫剙鎷伴幓鎰仛鐠囧秵鍧婇崝鐘插煂鐎圭懓娅?
    containerNode.appendChild(hintNode);
    if (newLLMMessage) {
      containerNode.appendChild(tipsNode);
    }

    // *** 鐠嬪啰鏁?ref API 閹绘帒鍙嗛懞鍌滃仯 ***
    chatInputRef.current?.insertNodeAtCursor(containerNode);
    hintNodeRef.current = containerNode; // 娣囨繂鐡ㄧ€佃鏌婇懞鍌滃仯閻ㄥ嫬绱╅悽?

    const handleInput = () => {
      containerNode.remove();
      chatInputRef.current?.getRawElement()?.removeEventListener("input", handleInput);
      isAutoCompletingRef.current = false;
      hintNodeRef.current = null;
    };
    // *** 閻╂垵鎯夌€涙劗绮嶆禒鍓佹畱閸樼喎顫愰崗鍐 ***
    chatInputRef.current?.getRawElement()?.addEventListener("input", handleInput);
  };

  const insertLLMMessageIntoText = () => {
    if (!chatInputRef.current)
      return;

    // 缁夊娅庨幓鎰仛 span
    if (hintNodeRef.current) {
      hintNodeRef.current.remove();
      hintNodeRef.current = null;
    }

    // 濡偓閺屻儲妲搁崥锔芥Ц闁插秴鍟撳Ο鈥崇础閿涘牊婀侀崢鐔告瀮娣囨繂鐡ㄩ敍?
    if (originalTextBeforeRewriteRef.current) {
      // 闁插秴鍟撳Ο鈥崇础閿涙氨娲块幒銉啎缂冾喕璐熼柌宥呭晸閸氬海娈戦弬鍥ㄦ拱
      const rewriteText = llmMessageRef.current.replace(/\u200B/g, ""); // 缁夊娅庨梿璺侯啍鐎涙顑?
      setInputText(rewriteText);
      // 閸氬本顒為弴瀛樻煀 DOM
      if (chatInputRef.current?.getRawElement()) {
        chatInputRef.current.getRawElement()!.textContent = rewriteText;
      }
      originalTextBeforeRewriteRef.current = ""; // 濞撳懐鈹栭崢鐔告瀮鐠佹澘缍?
      toast.success("已接受重写");
    }
    else {
      // 閻炲棜顔戞稉濠佺瑝娴兼俺绻橀崗銉窗瑜版挸澧犳禒鍛箽閻ｆ瑩鍣搁崘娆掓珓瑜版唻绱濇担鍡曡礋鐎瑰鍙忕挧鐤潌娴犲秵鏁幐浣瑰絻閸?
      chatInputRef.current.insertNodeAtCursor(llmMessageRef.current, { moveCursorToEnd: true });
    }

    setLLMMessage(""); // 濞撳懐鈹栭搹姘閻樿埖鈧?
    chatInputRef.current.triggerSync(); // 閹靛濮╃憴锕€褰傞崥灞绢劄閿涘本娲块弬?store
  };

  // AI闁插秴鍟撻敍姘▔缁€杞拌礋閾忔艾濂栨０鍕潔
  const handleQuickRewrite = async (prompt: string) => {
    const currentPlainText = useChatInputUiStore.getState().plainText;
    if (!currentPlainText.trim()) {
      toast.error("?????");
      return;
    }

    if (isAutoCompletingRef.current) {
      return;
    }

    isAutoCompletingRef.current = true;

    // 婵″倹鐏夊鍙夋箒閾忔艾濂栭敍灞藉帥濞撳懘娅?
    if (llmMessageRef.current) {
      setLLMMessage("");
    }

    originalTextBeforeRewriteRef.current = currentPlainText; // 娣囨繂鐡ㄩ崢鐔告瀮

    try {
      const fullPrompt = `${prompt}\n\n鐠囬攱鐗撮幑顔荤瑐鏉╂媽顩﹀Ч鍌炲櫢閸愭瑤浜掓稉瀣瀮閺堫剨绱癨n${currentPlainText}`;

      // 濞撳懐鈹栨潏鎾冲弳濡楀棴绱濋幓鎺戝弳闂嗚泛顔旂€涙顑佹担婊€璐熼柨姘卞仯
      const rawElement = chatInputRef.current?.getRawElement();
      if (rawElement) {
        rawElement.textContent = "\u200B"; // 闂嗚泛顔旂粚鐑樼壐
        rawElement.focus();
        // 閸忓鐖ｇ粔璇插煂閺堫偄鐔?
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(rawElement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setInputText("\u200B");

      await sendLlmStreamMessage(fullPrompt, (newContent) => {
        // 閸忓牊绔婚梽銈夋祩鐎硅棄鐡х粭?
        if (rawElement && rawElement.textContent === "\u200B") {
          rawElement.textContent = "";
        }
        // 閺勫墽銇氭稉楦挎珓瑜?
        setLLMMessage(newContent);
        return true;
      });

      toast.success("??????? Tab ???Esc ??");
    }
    catch (error) {
      toast.error(`AI闁插秴鍟撴径杈Е: ${error}`);
      // 閹垹顦查崢鐔告瀮
      setInputText(originalTextBeforeRewriteRef.current);
      originalTextBeforeRewriteRef.current = "";
    }
    finally {
      isAutoCompletingRef.current = false;
    }
  };

  /**
   *婢跺嫮鎮婃稉搴ｇ矋娴犲墎娈戦崥鍕潚娴溿倓绨?
   */
  const handleSelectCommand = (cmdName: string) => {
    const prefixChar = useChatInputUiStore.getState().plainText[0] || "."; // 姒涙顓绘稉?.
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const notMember = ((members.find(member => member.userId === userId)?.memberType ?? 3) >= 3); // 濞屸剝婀侀弶鍐
  const noRole = curRoleId <= 0;

  const containsCommandRequestAllToken = useCallback((text: string) => {
    const raw = String(text ?? "");
    return /@all\b/i.test(raw) || raw.includes("@鍏ㄥ憳") || raw.includes("@鎸囧畾璇锋眰");
  }, []);

  const stripCommandRequestAllToken = useCallback((text: string) => {
    return String(text ?? "")
      .replace(/@all\b/gi, " ")
      .replace(/@鍏ㄥ憳/g, " ")
      .replace(/@鎸囧畾璇锋眰/g, " ")
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
    const match = trimmed.match(/[.閵?][A-Z][^\n]*/i);
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
      toast.error("閹稿洣鎶ゆ稉铏光敄");
      return;
    }

    const isKP = spaceContext.isSpaceOwner;
    if (notMember) {
      toast.error("???????????");
      return;
    }
    if (noRole && !isKP) {
      toast.error("??? KP ??????????????");
      return;
    }
    if (isSubmitting) {
      toast.error("濮濓絽婀崣鎴︹偓浣疯厬閿涘矁顕粙宥囩搼");
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
   * 閸欐垿鈧焦绉烽幁顖滄畱鏉堝懎濮崙鑺ユ殶
   * 婵″倹鐏夌拋鍓х枂娴?insertAfterMessageId閿涘苯鍨担璺ㄦ暏 HTTP API 閸欐垿鈧礁鑻熼弴瀛樻煀 position
   * 閸氾箑鍨担璺ㄦ暏 WebSocket 閸欐垿鈧?
   */
  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
    const insertAfterMessageId = useRoomUiStore.getState().insertAfterMessageId;

    if (insertAfterMessageId && mainHistoryMessages) {
      // 閹垫儳鍩岄惄顔界垼濞戝牊浼呴惃鍕偍瀵?
      const targetIndex = mainHistoryMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
      if (targetIndex === -1) {
        // 婵″倹鐏夐幍鍙ョ瑝閸掓壆娲伴弽鍥ㄧХ閹垽绱濋梽宥囬獓娑撶儤娅橀柅姘絺闁?
        send(message);
        return;
      }

      try {
        // 娴ｈ法鏁?HTTP API 閸欐垿鈧焦绉烽幁?
        const result = await sendMessageMutation.mutateAsync(message);
        if (!result.success || !result.data) {
          toast.error("??????");
          return;
        }

        const newMessage = result.data;

        // 鐠侊紕鐣婚弬鐗堢Х閹垳娈?position
        const targetMessage = mainHistoryMessages[targetIndex];
        const nextMessage = mainHistoryMessages[targetIndex + 1];
        const targetPosition = targetMessage.message.position;
        const nextPosition = nextMessage?.message.position ?? targetPosition + 1;
        const newPosition = (targetPosition + nextPosition) / 2;

        // 閺囧瓨鏌婂☉鍫熶紖閻?position
        await updateMessageMutation.mutateAsync({
          ...newMessage,
          position: newPosition,
        });

        // 閹靛濮╅弴瀛樻煀閺堫剙婀寸紓鎾崇摠閿涘牊鐎?ChatMessageResponse 閺嶇厧绱￠敍?
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
        console.error("閹绘帒鍙嗗☉鍫熶紖婢惰精瑙?", error);
        toast.error("??????");
      }
    }
    else {
      // 閺咁噣鈧艾褰傞柅?
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
      toast.error("???????????");
      return;
    }
    if (isNarrator && !isKP) {
      toast.error("??? KP ??????????????");
      return;
    }
    if (isSubmitting || webgalVarSendingRef.current) {
      toast.error("?????????");
      return;
    }

    if (!rawKey || !rawExpr) {
      toast.error("???????????");
      return;
    }
    if (!/^[A-Z_]\w*$/i.test(rawKey)) {
      toast.error("????????");
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

      // 閸欐垿鈧礁灏懛顏勭暰娑斿顫楅懝鎻掓倳閿涘牅绗岄懕鏂垮З濡€崇础閺冪姴鍙ч敍?
      const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
      if (draftCustomRoleName?.trim()) {
        varMsg.webgal = {
          ...(varMsg.webgal as any),
          customRoleName: draftCustomRoleName.trim(),
        } as any;
      }

      await sendMessageWithInsert(varMsg);

      // 缁屾椽妫跨痪褎瀵旀稊鍛閿涙艾鍟撻崗?space.extra 閻?webgalVars閿涘牆鎮楃粩顖欎簰 key/value 鐎涙ê鍋嶉敍?
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
        console.error("閸愭瑥鍙?space.extra.webgalVars 婢惰精瑙?", error);
        toast.error("閸欐﹢鍣哄鎻掑絺闁緤绱濇担鍡楀晸閸忋儳鈹栭梻瀛樺瘮娑斿懎瀵叉径杈Е");
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

    // 閺冧胶娅ф稉宥呭晙娓氭繆绂嗛懕鏂垮З濡€崇础閿涘奔绲炬禒鍖閸欘垳鏁?
    const disableSendMessage = (notMember || noInput || isSubmitting)
      || (isNarrator && !isKP);

    if (disableSendMessage) {
      if (notMember)
        toast.error("???????????");
      else if (isNarrator && !isKP)
        toast.error("??? KP ??????????????");
      else if (noInput)
        toast.error("?????");
      else if (isSubmitting)
        toast.error("濮濓絽婀崣鎴︹偓浣疯厬閿涘矁顕粙宥囩搼");
      return;
    }
    if (inputText.length > 1024) {
      toast.error("???????????? 1024 ???");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedImages: any[] = [];
      const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);

      // 1. 娑撳﹣绱堕崶鍓у
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        const { width, height, size } = await getImageSize(imgFiles[i]);
        uploadedImages.push({ url: imgDownLoadUrl, width, height, size, fileName: imgFiles[i].name });
      }
      setImgFiles([]);

      // 2. 娑撳﹣绱剁悰銊﹀剰 (鐟欏棔璐熼崶鍓у)
      for (let i = 0; i < emojiUrls.length; i++) {
        const { width, height, size } = await getImageSize(emojiUrls[i]);
        uploadedImages.push({ url: emojiUrls[i], width, height, size, fileName: "emoji" });
      }
      setEmojiUrls([]);

      // 3. 娑撳﹣绱剁拠顓㈢叾
      let soundMessageData: any = null;
      if (audioFile) {
        // 0 鐞涖劎銇氭稉宥嗗焻閺傤叏绱欐稉宥呭晙瀵搫鍩?60s 闂勬劕鍩楅敍?
        const maxAudioDurationSec = 0;
        const objectUrl = URL.createObjectURL(audioFile);
        const debugEnabled = isAudioUploadDebugEnabled();
        const debugPrefix = "[tc-audio-upload]";
        const audioToastId = toast.loading("闊抽澶勭悊涓紙杞爜/涓婁紶涓級...");

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

      // 4. 閺嬪嫬缂撻獮璺哄絺闁焦绉烽幁?
      const finalReplyId = useRoomUiStore.getState().replyMessage?.messageId || undefined;
      let isFirstMessage = true;

      const getCommonFields = () => {
        const fields: Partial<ChatMessageRequest> = {
          roomId,
          roleId: curRoleId,
          avatarId: resolvedAvatarId,
        };

        // Thread 濡€崇础閿涙氨绮伴張顒侇偧閸欐垿鈧胶娈戝☉鍫熶紖閹稿倷绗?threadId閿涘澁oot messageId閿?
        const { threadRootMessageId: activeThreadRootId, composerTarget } = useRoomUiStore.getState();
        if (composerTarget === "thread" && activeThreadRootId) {
          fields.threadId = activeThreadRootId;
        }

        // 閸欐垿鈧礁灏懛顏勭暰娑斿顫楅懝鎻掓倳閿涘牅绗岄懕鏂垮З濡€崇础閺冪姴鍙ч敍?
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

      // WebGAL 缁屾椽妫块崣姗€鍣洪幐鍥︽姢閿?var set a=1
      const trimmedWithoutMentions = inputTextWithoutMentions.trim();
      const isWebgalVarCommandPrefix = /^\/var\b/i.test(trimmedWithoutMentions);
      const webgalVarPayload = parseWebgalVarCommand(trimmedWithoutMentions);

      // 婵″倹鐏夐悽銊﹀煕鏉堟挸鍙嗘禍?/var 閸撳秶绱戞担鍡樼壐瀵繋绗夊锝団€橀敍姘瑝娴溿倗绮版鏉款灳閸涙垝鎶ょ化鑽ょ埠婢跺嫮鎮婇敍宀€娲块幒銉﹀絹缁€?
      if (isWebgalVarCommandPrefix && !webgalVarPayload) {
        toast.error("閸欐﹢鍣洪幐鍥︽姢閺嶇厧绱￠敍?var set a=1");
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

        // 濞戝牐鈧甯€ firstMessage 閻樿埖鈧緤绱濋獮鍫曟Щ濮濄垹鎮楃紒顓炲晙濞嗏€茬稊娑撶儤鏋冮張顒€褰傞柅?
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

        // 缁屾椽妫跨痪褎瀵旀稊鍛閿涙艾鍟撻崗?space.extra 閻?webgalVars閿涘牆鎮楃粩顖欎簰 key/value 鐎涙ê鍋嶉敍?
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
          console.error("閸愭瑥鍙?space.extra.webgalVars 婢惰精瑙?", error);
          toast.error("閸欐﹢鍣哄鎻掑絺闁緤绱濇担鍡楀晸閸忋儳鈹栭梻瀛樺瘮娑斿懎瀵叉径杈Е");
        }

        // 濞戝牐鈧甯€ firstMessage 閻樿埖鈧緤绱濋獮鍫曟Щ濮濄垹鎮楃紒顓炲晙濞嗏€茬稊娑撶儤鏋冮張顒€褰傞柅?
        isFirstMessage = false;
        textContent = "";
      }
      else if (textContent && isCommand(textContent)) {
        commandExecutor({ command: inputTextWithoutMentions, mentionedRoles: mentionedRolesInInput, originMessage: inputText });
        // 閹稿洣鎶ら幍褑顢戞稊鐔活潶鐟欏棔璐熸稉鈧▎?閸欐垿鈧?閿涘本绉烽懓妤佸竴 firstMessage 閻樿埖鈧?
        isFirstMessage = false;
        textContent = "";
      }

      // B. 閸欐垿鈧礁娴橀悧?
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

      // C. 閸欐垿鈧線鐓舵０?
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

      // A. 閸欐垿鈧焦鏋冮張?(婵″倹鐏夐崜宥夋桨濞屸剝婀佺悮顐㈡禈閻楀洦鍨ㄧ拠顓㈢叾濞戝牐鈧甯€)
      if (textContent) {
        // WebGAL 閹稿洣鎶ゅ☉鍫熶紖閿涙俺绶崗銉や簰 % 瀵偓婢跺瓨妞傞敍宀冩祮娑撶儤妯夊蹇曟畱 WEBGAL_COMMAND 缁鐎烽妴?
        // 濞夈劍鍓伴敍姘崇箹闁插本妲搁垾婊冨絺闁椒鏅堕崡蹇氼唴鏉烆剚宕查垾婵撶礉濞撳弶鐓嬫笟褌绗夐崘宥勭贩鐠?% 閸撳秶绱戦妴?
        const isPureTextSend = uploadedImages.length === 0 && !soundMessageData;
        const isWebgalCommandInput = isPureTextSend && textContent.startsWith("%");
        const normalizedContent = isWebgalCommandInput ? textContent.slice(1).trim() : textContent;

        if (isWebgalCommandInput && !normalizedContent) {
          toast.error("WebGAL ??????");
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

      setInputText(""); // 鐠嬪啰鏁ら柌宥嗙€惃?setInputText 閺夈儲绔荤粚?
      useRoomUiStore.getState().setReplyMessage(undefined);
      setSendAsBackground(false);
      setAudioPurpose(undefined);
      useRoomUiStore.getState().setInsertAfterMessageId(undefined); // 濞撳懘娅庨幓鎺戝弳娴ｅ秶鐤?
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
      toast.error("???????????");
      return;
    }
    if (isSubmitting) {
      toast.error("濮濓絽婀崣鎴︹偓浣疯厬閿涘矁顕粙宥囩搼");
      return;
    }
    if (!messages.length) {
      toast.error("????????");
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

        // 閺傚洦婀扮€电厧鍙嗛敍姘冲閸欐垼鈻堟禍鐑樻Ё鐏忓嫪璐熼垾婊堫€忔繛妯封偓婵撶礉閸掓瑤濞囬悽銊╊€忔繛妯款潡閼规彃褰傞柅渚婄礉楠炶埖瀵?DICE(6) 缁鐎烽弸鍕偓鐘崇Х閹?extra閵?
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

  // 缁捐法鍌ㄥ☉鍫熶紖閸欐垿鈧?
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
      toast.error("?????");
      return;
    }

    if (!parseDescriptionDocId(docId)) {
      toast.error("??????????????/?????");
      return;
    }

    if (!spaceId || spaceId <= 0) {
      toast.error("??????????????");
      return;
    }

    if (payload?.spaceId && payload.spaceId !== spaceId) {
      toast.error("?????????");
      return;
    }

    const isKP = spaceContext.isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (notMember) {
      toast.error("???????????");
      return;
    }
    if (isNarrator && !isKP) {
      toast.error("??? KP ??????????????");
      return;
    }
    if (isSubmitting) {
      toast.error("濮濓絽婀崣鎴︹偓浣疯厬閿涘矁顕粙宥囩搼");
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

  // *** 閺傛澘顤? onPasteFiles 閻ㄥ嫬娲栫拫鍐槱閻炲棗娅?***
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
      onSettled: () => { toast("?????????"); },
    });
  };

  // *** 閸戝棗顦?props ***
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const placeholderText = (() => {
    const isKP = spaceContext.isSpaceOwner;
    if (notMember) {
      return "?????????????";
    }
    if (noRole && !isKP) {
      return "?????????????????";
    }
    if (noRole && isKP) {
      return "鏃佺櫧妯″紡锛氬湪姝よ緭鍏ユ秷鎭?..(shift+enter 鎹㈣锛宼ab 瑙﹀彂 AI 閲嶅啓锛屼笂鏂规寜閽彲淇敼閲嶅啓鎻愮ず璇?";
    }
    if (curAvatarId <= 0) {
      return "???????????...(shift+enter ???tab ?? AI ???????????????)";
    }
    if (threadRootMessageId && composerTarget === "thread") {
      return "鍦?Thread 涓洖澶?..(shift+enter 鎹㈣锛宼ab 瑙﹀彂 AI 閲嶅啓锛屼笂鏂规寜閽彲淇敼閲嶅啓鎻愮ず璇?";
    }
    return "杈撳叆娑堟伅...(shift+enter 鎹㈣锛宼ab 瑙﹀彂 AI 閲嶅啓锛屼笂鏂规寜閽彲淇敼閲嶅啓鎻愮ず璇?";
  })();

  const handleSendEffect = useCallback((effectName: string) => {
    // 閻楄鏅ュ☉鍫熶紖娑撳秹娓剁憰浣筋潡閼硅弓淇婇幁顖ょ礉缁鎶€閺冧胶娅?
    // 濞夈劍鍓伴敍姝焫tra 鎼存棁顕氶惄瀛樺复閺?EffectMessage 鐎电钖勯敍灞芥倵缁旑垯绱伴懛顏勫З閸栧懓顥婇崚?MessageExtra 娑?
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: `[閻楄鏅? ${effectName}]`,
      messageType: MessageType.EFFECT,
      extra: {
        effectName,
      },
    });
  }, [roomId, send]);

  const handleClearBackground = useCallback(() => {
    // 濞撳懘娅庨懗灞炬珯娑撳秹娓剁憰浣筋潡閼硅弓淇婇幁顖ょ礉缁鎶€閺冧胶娅?
    // 濞夈劍鍓伴敍姝焫tra 鎼存棁顕氶惄瀛樺复閺?EffectMessage 鐎电钖勯敍灞芥倵缁旑垯绱伴懛顏勫З閸栧懓顥婇崚?MessageExtra 娑?
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[濞撳懘娅庨懗灞炬珯]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearBackground",
      },
    });
    toast.success("?????");
  }, [roomId, send]);

  const handleClearFigure = useCallback(() => {
    // 濞撳懘娅庣憴鎺曞缁斿绮稉宥夋付鐟曚浇顫楅懝韫繆閹垽绱濈猾璁虫妧閺冧胶娅?
    // 濞夈劍鍓伴敍姝焫tra 鎼存棁顕氶惄瀛樺复閺?EffectMessage 鐎电钖勯敍灞芥倵缁旑垯绱伴懛顏勫З閸栧懓顥婇崚?MessageExtra 娑?
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[濞撳懘娅庣粩瀣帛]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearFigure",
      },
    });
    // 婵″倹鐏夌€圭偞妞傚〒鍙夌厠瀵偓閸氼垽绱濈粩瀣祮濞撳懘娅庣粩瀣帛
    if (isRealtimeRenderActive) {
      clearRealtimeFigure();
    }
    toast.success("?????");
  }, [clearRealtimeFigure, isRealtimeRenderActive, roomId, send]);

  // KP閿涙艾浠犲銏犲弿閸涙イGM閿涘牆绠嶉幘顓犻兇缂佺喐绉烽幁顖ょ礆
  const handleStopBgmForAll = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[閸嬫粍顒汢GM]",
      messageType: MessageType.SYSTEM,
      extra: {},
    });
    toast.success("瀹告彃褰傞柅浣镐粻濮濐敤GM");
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
