import type { VirtuosoHandle } from "react-virtuoso";
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  ImageMessage,
  Message,
} from "../../../api";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import React, { memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ChatFrameList from "@/components/chat/chatFrameList";
import ChatFrameOverlays from "@/components/chat/chatFrameOverlays";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatFrameContextMenu from "@/components/chat/hooks/useChatFrameContextMenu";
import useChatFrameDragAndDrop from "@/components/chat/hooks/useChatFrameDragAndDrop";
import RoleChooser from "@/components/chat/input/roleChooser";
import { ChatBubble } from "@/components/chat/message/chatBubble";
import ChatFrameContextMenu from "@/components/chat/room/contextMenu/chatFrameContextMenu";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { DraggableIcon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getImageSize } from "@/utils/getImgSize";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { useCreateEmojiMutation, useGetUserEmojisQuery } from "../../../api/hooks/emojiQueryHooks";
import { tuanchat } from "../../../api/instance";

const CHAT_VIRTUOSO_INDEX_SHIFTER = 100000;

/**
 * 鑱婂ぉ妗嗭紙涓嶅甫杈撳叆閮ㄥ垎锛?
 * @param props 缁勪欢鍙傛暟
 * @param props.virtuosoRef 铏氭嫙鍒楄〃鐨?ref
 */
interface ChatFrameProps {
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  messagesOverride?: ChatMessageResponse[];
  enableWsSync?: boolean;
  enableEffects?: boolean;
  enableUnreadIndicator?: boolean;
  isMessageMovable?: (message: Message) => boolean;
  onBackgroundUrlChange?: (url: string | null) => void;
  onEffectChange?: (effectName: string | null) => void;
  onSendDocCard?: (payload: DocRefDragPayload) => Promise<void> | void;
  onExecuteCommandRequest?: (payload: {
    command: string;
    threadId?: number;
    requestMessageId: number;
  }) => void;
}

interface ThreadHintMeta {
  rootId: number;
  title: string;
  replyCount: number;
}

function ChatFrame(props: ChatFrameProps) {
  const {
    virtuosoRef,
    messagesOverride,
    enableWsSync = true,
    enableEffects = true,
    enableUnreadIndicator = true,
    isMessageMovable,
    onBackgroundUrlChange,
    onEffectChange,
    onSendDocCard,
    onExecuteCommandRequest,
  } = props;
  const globalContext = useGlobalContext();
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const toggleUseChatBubbleStyle = useRoomPreferenceStore(state => state.toggleUseChatBubbleStyle);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;

  // const hasNewMessages = websocketUtils.messagesNumber[roomId];
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);
  const [isExportImageWindowOpen, setIsExportImageWindowOpen] = useState(false);

  const sendMessageMutation = useSendMessageMutation(roomId);

  // Mutations
  // const moveMessageMutation = useMoveMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const updateMessageMutation = useUpdateMessageMutation();

  const handleToggleNarrator = useCallback((messageId: number) => {
    if (!spaceContext.isSpaceOwner) {
      toast.error("鍙湁KP鍙互鍒囨崲鏃佺櫧");
      return;
    }
    const message = roomContext.chatHistory?.messages.find(m => m.message.messageId === messageId)?.message;
    if (!message)
      return;

    const isNarrator = !message.roleId || message.roleId <= 0;

    if (isNarrator) {
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col items-center gap-4">
              <div>閫夋嫨瑙掕壊</div>
              <RoleChooser
                handleRoleChange={(role) => {
                  const newMessage = {
                    ...message,
                    roleId: role.roleId,
                    avatarId: roomContext.roomRolesThatUserOwn.find(r => r.roleId === role.roleId)?.avatarId ?? -1,
                  };
                  updateMessageMutation.mutate(newMessage, {
                    onSuccess: (response) => {
                      if (response?.data && roomContext.chatHistory) {
                        const updatedChatMessageResponse = {
                          ...roomContext.chatHistory.messages.find(m => m.message.messageId === messageId)!,
                          message: response.data,
                        };
                        roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);
                      }
                    },
                  });
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
      const newMessage = {
        ...message,
        roleId: -1,
      };
      updateMessageMutation.mutate(newMessage, {
        onSuccess: (response) => {
          if (response?.data && roomContext.chatHistory) {
            const updatedChatMessageResponse = {
              ...roomContext.chatHistory.messages.find(m => m.message.messageId === messageId)!,
              message: response.data,
            };
            roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);
          }
        },
      });
    }
  }, [roomContext, spaceContext.isSpaceOwner, updateMessageMutation]);

  // 鑾峰彇鐢ㄦ埛鑷畾涔夎〃鎯呭垪琛?
  const { data: emojisData } = useGetUserEmojisQuery();
  const emojiList = Array.isArray(emojisData?.data) ? emojisData.data : [];

  // 鏂板琛ㄦ儏
  const createEmojiMutation = useCreateEmojiMutation();

  /**
   * 鑾峰彇鍘嗗彶娑堟伅
   * 鍒嗛〉鑾峰彇娑堟伅
   * cursor鐢ㄤ簬鑾峰彇褰撳墠鐨勬秷鎭垪琛? 鍦ㄥ線鍚庣鐨勮姹備腑, 绗竴娆″彂閫乶ull, 鐒跺悗鎺ュ彈鍚庣杩斿洖鐨刢ursor浣滀负鏂扮殑鍊?
   */
  const chatHistory = roomContext.chatHistory;
  const webSocketUtils = globalContext.websocketUtils;
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message });

  // 鐩戝惉 WebSocket 鎺ユ敹鍒扮殑娑堟伅
  const receivedMessages = useMemo(() => webSocketUtils.receivedMessages[roomId] ?? [], [roomId, webSocketUtils.receivedMessages]);
  // roomId ==> 涓婁竴娆″瓨鍌ㄦ秷鎭殑鏃跺€欑殑receivedMessages[roomId].length
  const lastLengthMapRef = useRef<Record<number, number>>({});
  useEffect(() => {
    if (!enableWsSync) {
      return;
    }
    // 灏唚sUtils涓紦瀛樼殑娑堟伅瀛樺埌indexDB涓紝杩欓噷闇€瑕佽疆璇㈢瓑寰卛ndexDB鍒濆鍖栧畬鎴愩€?
    // 濡傛灉鍦ㄥ垵濮嬪寲涔嬪墠灏辫皟鐢ㄤ簡杩欎釜鍑芥暟锛屼細鍑虹幇鍒濆娑堟伅鏃犳硶鍔犺浇鐨勯敊璇€?
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function syncMessages() {
      const checkLoading = async (): Promise<void> => {
        if (isCancelled)
          return;

        if (chatHistory?.loading) {
          await new Promise<void>((resolve) => {
            timeoutId = setTimeout(() => {
              if (!isCancelled) {
                resolve();
              }
            }, 30);
          });
          // 閫掑綊妫€鏌ワ紝鐩村埌loading瀹屾垚鎴栬鍙栨秷
          await checkLoading();
        }
      };
      await checkLoading();

      // 濡傛灉宸插彇娑堟垨chatHistory涓嶅瓨鍦紝鐩存帴杩斿洖
      if (isCancelled || !chatHistory)
        return;
      const lastLength = lastLengthMapRef.current[roomId] ?? 0;
      if (lastLength < receivedMessages.length) {
        const newMessages = receivedMessages.slice(lastLength);

        // 琛ユ礊閫昏緫锛氭鏌ユ柊娑堟伅鐨勭涓€鏉℃槸鍚︿笌鍘嗗彶娑堟伅鐨勬渶鍚庝竴鏉¤繛缁?
        const historyMsgs = chatHistory.messages;
        if (historyMsgs.length > 0 && newMessages.length > 0) {
          const lastHistoryMsg = historyMsgs[historyMsgs.length - 1];
          const firstNewMsg = newMessages[0];

          if (firstNewMsg.message.syncId > lastHistoryMsg.message.syncId + 1) {
            console.warn(`[ChatFrame] Detected gap between history (${lastHistoryMsg.message.syncId}) and new messages (${firstNewMsg.message.syncId}). Fetching missing messages...`);
            try {
              const missingMessagesRes = await tuanchat.chatController.getHistoryMessages({
                roomId,
                syncId: lastHistoryMsg.message.syncId + 1,
              });
              if (missingMessagesRes.data && missingMessagesRes.data.length > 0) {
                await chatHistory.addOrUpdateMessages(missingMessagesRes.data);
              }
            }
            catch (e) {
              console.error("[ChatFrame] Failed to fetch missing messages:", e);
            }
          }
        }

        await chatHistory.addOrUpdateMessages(newMessages);
        lastLengthMapRef.current[roomId] = receivedMessages.length;
      }
    }

    syncMessages();

    // 娓呯悊鍑芥暟锛氬彇娑堝紓姝ユ搷浣滃拰瀹氭椂鍣?
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [chatHistory, enableWsSync, receivedMessages, roomId]);

  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    if (messagesOverride) {
      return messagesOverride;
    }
    // Discord 椋庢牸锛歍hread 鍥炲涓嶅嚭鐜板湪涓绘秷鎭祦涓紝鍙湪 Thread 闈㈡澘涓煡鐪?
    // - root锛歵hreadId === messageId锛堟樉绀猴級
    // - reply锛歵hreadId !== messageId锛堥殣钘忥級
    return (roomContext.chatHistory?.messages ?? []).filter((m) => {
      // Thread Root锛?0001锛変笉鍦ㄤ富娑堟伅娴佷腑鍗曠嫭鏄剧ず锛氭敼涓烘寕鍦ㄢ€滃師娑堟伅鈥濅笅鏂圭殑鎻愮ず鏉?
      if (m.message.messageType === MESSAGE_TYPE.THREAD_ROOT) {
        return false;
      }
      const { threadId, messageId } = m.message;
      if (!threadId) {
        return true;
      }
      return threadId === messageId;
    });
  }, [messagesOverride, roomContext.chatHistory?.messages]);

  const threadHintMetaByMessageId = useMemo(() => {
    // key: parentMessageId锛堣鍒涘缓瀛愬尯鐨勯偅鏉″師娑堟伅锛?
    const metaMap = new Map<number, ThreadHintMeta>();
    const all = roomContext.chatHistory?.messages ?? [];
    if (all.length === 0) {
      return metaMap;
    }

    // rootId -> replyCount
    const replyCountByRootId = new Map<number, number>();
    for (const item of all) {
      const { threadId, messageId } = item.message;
      if (threadId && threadId !== messageId) {
        replyCountByRootId.set(threadId, (replyCountByRootId.get(threadId) ?? 0) + 1);
      }
    }

    // parentMessageId -> latest root
    for (const item of all) {
      const mm = item.message;
      const isRoot = mm.messageType === MESSAGE_TYPE.THREAD_ROOT && mm.threadId === mm.messageId;
      const parentId = mm.replyMessageId;
      if (!isRoot || !parentId) {
        continue;
      }

      const title = (mm.extra as any)?.title || mm.content;
      const next: ThreadHintMeta = {
        rootId: mm.messageId,
        title,
        replyCount: replyCountByRootId.get(mm.messageId) ?? 0,
      };

      const prev = metaMap.get(parentId);
      // 鏋佺鎯呭喌涓嬪彲鑳藉瓨鍦ㄥ涓?root锛氬彇 messageId 鏇存柊鐨勯偅涓?
      if (!prev || next.rootId > prev.rootId) {
        metaMap.set(parentId, next);
      }
    }

    return metaMap;
  }, [roomContext.chatHistory?.messages]);

  // 鍒犻櫎娑堟伅锛堥€昏緫鍒犻櫎锛氭洿鏂版湰鍦版秷鎭姸鎬佷负宸插垹闄わ級
  const deleteMessage = useCallback((messageId: number) => {
    deleteMessageMutation.mutate(messageId, {
      onSuccess: () => {
        // 鎵惧埌瑕佸垹闄ょ殑娑堟伅锛屾洿鏂板叾 status 涓?1锛堝凡鍒犻櫎锛?
        const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
        if (targetMessage && roomContext.chatHistory) {
          const updatedMessage = {
            ...targetMessage,
            message: {
              ...targetMessage.message,
              status: 1, // 閫昏緫鍒犻櫎鐘舵€?
            },
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedMessage);
        }
      },
    });
  }, [deleteMessageMutation, historyMessages, roomContext.chatHistory]);

  /**
   * 铏氭嫙鍒楄〃
   */
  // 铏氭嫙鍒楄〃鐨刬ndex鍒癶istoryMessage涓殑index鐨勮浆鎹?
  const isAtBottomRef = useRef(true);
  const lastAutoSyncUnreadRef = useRef<number | null>(null);
  const isAtTopRef = useRef(false);
  const virtuosoIndexToMessageIndex = useCallback((virtuosoIndex: number) => {
    // return historyMessages.length + virtuosoIndex - CHAT_VIRTUOSO_INDEX_SHIFTER;
    return virtuosoIndex;
  }, []);
  const messageIndexToVirtuosoIndex = useCallback((messageIndex: number) => {
    return messageIndex - historyMessages.length + CHAT_VIRTUOSO_INDEX_SHIFTER;
  }, [historyMessages.length]);
  /**
   * 鏂版秷鎭彁閱?
   */
  const unreadMessageNumber = enableUnreadIndicator
    ? (webSocketUtils.unreadMessagesNumber[roomId] ?? 0)
    : 0;
  const updateLastReadSyncId = webSocketUtils.updateLastReadSyncId;
  // 鐩戝惉鏂版秷鎭紝濡傛灉鍦ㄥ簳閮紝鍒欒缃兢鑱婃秷鎭负宸茶锛?
  useEffect(() => {
    if (!enableUnreadIndicator) {
      return;
    }
    if (isAtBottomRef.current) {
      updateLastReadSyncId(roomId);
    }
  }, [enableUnreadIndicator, historyMessages, roomId, updateLastReadSyncId]);
  useEffect(() => {
    if (!enableUnreadIndicator) {
      lastAutoSyncUnreadRef.current = null;
      return;
    }
    if (unreadMessageNumber <= 0) {
      lastAutoSyncUnreadRef.current = null;
      return;
    }
    if (!isAtBottomRef.current) {
      return;
    }
    if (lastAutoSyncUnreadRef.current === unreadMessageNumber) {
      return;
    }
    lastAutoSyncUnreadRef.current = unreadMessageNumber;
    updateLastReadSyncId(roomId);
  }, [enableUnreadIndicator, roomId, unreadMessageNumber, updateLastReadSyncId]);
  /**
   * scroll鐩稿叧
   */
  const scrollToBottom = useCallback(() => {
    virtuosoRef?.current?.scrollToIndex(messageIndexToVirtuosoIndex(historyMessages.length - 1));
    if (enableUnreadIndicator) {
      updateLastReadSyncId(roomId);
    }
  }, [enableUnreadIndicator, historyMessages.length, messageIndexToVirtuosoIndex, roomId, updateLastReadSyncId, virtuosoRef]);
  useEffect(() => {
    let timer = null;
    if (chatHistory?.loading) {
      timer = setTimeout(() => {
        scrollToBottom();
      }, 1000);
    }
    return () => {
      if (timer)
        clearTimeout(timer);
    };
  }, [chatHistory?.loading, scrollToBottom]);

  /**
   * 鑳屾櫙鍥剧墖闅忚亰澶╄褰曡€屾敼鍙?
   * 娉ㄦ剰锛氬凡鍒犻櫎鐨勬秷鎭紙status === 1锛変笉搴旇鏄剧ず鑳屾櫙鍥剧墖
   */
  const imgNode = useMemo(() => {
    if (!enableEffects) {
      return [];
    }
    return historyMessages
      .map((msg, index) => {
        return { index, imageMessage: msg.message.extra?.imageMessage, status: msg.message.status };
      })
      .filter(item => item.imageMessage && item.imageMessage.background && item.status !== 1);
  }, [enableEffects, historyMessages]);

  /**
   * 鐗规晥闅忚亰澶╄褰曡€屾敼鍙?
   * 娉ㄦ剰锛氬凡鍒犻櫎鐨勬秷鎭紙status === 1锛変笉搴旇鏄剧ず鐗规晥
   */
  const effectNode = useMemo(() => {
    if (!enableEffects) {
      return [];
    }
    return historyMessages
      .map((msg, index) => {
        return { index, effectMessage: msg.message.extra?.effectMessage, status: msg.message.status };
      })
      .filter(item => item.effectMessage && item.effectMessage.effectName && item.status !== 1);
  }, [enableEffects, historyMessages]);

  const [currentVirtuosoIndex, setCurrentVirtuosoIndex] = useState(0);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    onBackgroundUrlChange?.(enableEffects ? currentBackgroundUrl : null);
  }, [currentBackgroundUrl, enableEffects, onBackgroundUrlChange]);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);

  useEffect(() => {
    onEffectChange?.(enableEffects ? currentEffect : null);
  }, [currentEffect, enableEffects, onEffectChange]);

  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);

    // Update Background URL
    let newBgUrl: string | null = null;

    // 鎵惧埌鏈€鍚庝竴涓竻闄よ儗鏅殑浣嶇疆
    let lastClearIndex = -1;
    for (const effect of effectNode) {
      if (effect.index <= currentMessageIndex && effect.effectMessage?.effectName === "clearBackground") {
        lastClearIndex = effect.index;
      }
    }

    // 浠庢竻闄よ儗鏅箣鍚庯紙鎴栦粠澶达級寮€濮嬫壘鏈€鏂扮殑鑳屾櫙鍥剧墖
    for (const bg of imgNode) {
      if (bg.index <= currentMessageIndex && bg.index > lastClearIndex) {
        newBgUrl = bg.imageMessage?.url ?? null;
      }
      else if (bg.index > currentMessageIndex) {
        break;
      }
    }

    if (newBgUrl !== currentBackgroundUrl) {
      const id = setTimeout(() => setCurrentBackgroundUrl(newBgUrl), 0);
      return () => clearTimeout(id);
    }
  }, [enableEffects, currentVirtuosoIndex, imgNode, effectNode, virtuosoIndexToMessageIndex, currentBackgroundUrl]);

  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);

    // Update Effect
    let newEffect: string | null = null;
    for (const effect of effectNode) {
      if (effect.index <= currentMessageIndex) {
        newEffect = effect.effectMessage?.effectName ?? null;
      }
      else {
        break;
      }
    }
    if (newEffect !== currentEffect) {
      setCurrentEffect(newEffect);
    }
  }, [enableEffects, currentVirtuosoIndex, effectNode, virtuosoIndexToMessageIndex, currentEffect]);

  const updateMessage = useCallback((message: Message) => {
    updateMessageMutation.mutate(message);
    // 浠?historyMessages 涓壘鍒板畬鏁寸殑 ChatMessageResponse锛屼繚鐣?messageMark 绛夊瓧娈?
    const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
    const newResponse = {
      ...existingResponse,
      message,
    };
    roomContext.chatHistory?.addOrUpdateMessage(newResponse as ChatMessageResponse);
  }, [updateMessageMutation, roomContext.chatHistory, historyMessages]);

  /**
   * 涓轰粈涔堣鍦ㄨ繖閲屽姞涓婁竴涓繖涔堜竴涓帿鍚嶅叾濡欑殑澶氫綑鍙橀噺鍛紵
   * 鐩殑鏄负浜嗚鑳屾櫙鍥剧墖浠巙rl鍒皀ull鐨勫垏鎹㈡椂涔熻兘瑙﹀彂transition鐨勫姩鐢伙紝濡傛灉涓嶅姞锛岄偅涔堬紝鍔ㄧ敾閮ㄥ垎鐨刢ss灏变細鍙樻垚杩欐牱锛?
   *         style={{
   *           backgroundImage: currentBackgroundUrl ? `url('${currentBackgroundUrl}')` : "none",
   *           opacity: currentBackgroundUrl ? 1 : 0,
   *         }}    // 閿欒浠ｇ爜锛?
   * 褰揷urrentBackgroundUrl浠巙rl鍙樹负null鏃讹紝娴忚鍣ㄤ細鍥犱负backgroundImage宸茬粡鍙樻垚浜唍ull锛屽鑷村姩鐢绘潵涓嶅強鎾斁锛岃儗鏅洿鎺ュ氨娑堝け浜?
   * 鑰屽姞涓婅繖涔堜竴缁檚tate鍚?
   *         style={{
   *           backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
   *           opacity: currentBackgroundUrl ? 1 : 0,
   *         }}   // 姝ｇ‘鐨?
   * 褰揷urrentBackgroundUrl 浠?url_A 鍙樹负 null鏃?
   * 姝ゆ椂锛宱pacity 鍥犱负 currentBackgroundUrl 鏄?null 鑰屽彉涓?0锛屾贰鍑哄姩鐢诲紑濮嬨€?
   * 浣嗘垜浠晠鎰忎笉鏇存柊 displayedBgUrl锛佸畠渚濈劧淇濇寔鐫€ url_A 鐨勫€笺€?
   * 缁撴灉灏辨槸锛氳儗鏅浘灞傝櫧鐒惰鍙橀€忔槑浜嗭紝浣嗗畠鐨?backgroundImage 鏍峰紡閲屼緷鐒舵槸涓婁竴寮犲浘鐗囥€傝繖鏍凤紝鍔ㄧ敾灏辨湁浜嗗彲浠モ€滄搷浣溾€濈殑瑙嗚鍐呭锛岃兘澶熷钩婊戝湴灏嗚繖寮犲浘鐗囨贰鍑猴紝鐩村埌瀹屽叏閫忔槑銆?
   */
  // 鑳屾櫙鍥炬覆鏌撳凡鎻愬崌鍒?RoomWindow锛屾澶勪粎璐熻矗璁＄畻骞堕€氳繃 onBackgroundUrlChange 涓婃姤銆?

  /**
   * 娑堟伅閫夋嫨
   */
  const [selectedMessageIds, updateSelectedMessageIds] = useState<Set<number>>(() => new Set());
  const isSelecting = selectedMessageIds.size > 0;

  const toggleMessageSelection = useCallback((messageId: number) => {
    updateSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      }
      else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  const constructForwardRequest = (forwardRoomId: number) => {
    const forwardMessages = Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined);
    const forwardMessageRequest: ChatMessageRequest = {
      roomId: forwardRoomId,
      roleId: curRoleId,
      content: "",
      avatarId: curAvatarId,
      messageType: 5,
      extra: {
        messageList: forwardMessages,
      },
    };
    return forwardMessageRequest;
  };

  function handleForward(forwardRoomId: number) {
    send(constructForwardRequest(forwardRoomId));
    setIsForwardWindowOpen(false);
    updateSelectedMessageIds(new Set());
    toast("已转发消息");
  }

  function toggleBackground(messageId: number) {
    const message = historyMessages.find(m => m.message.messageId === messageId)?.message;
    if (!message || !message.extra?.imageMessage)
      return;
    updateMessage({
      ...message,
      extra: {
        ...message.extra,
        imageMessage: {
          ...message.extra.imageMessage,
          background: !message.extra.imageMessage.background,
        },
      },
    });
  }

  function toggleUnlockCg(messageId: number) {
    const message = historyMessages.find(m => m.message.messageId === messageId)?.message;
    if (!message || message.messageType !== 2)
      return;

    const currentWebgal = message.webgal || {};
    const isUnlocked = !!currentWebgal.unlockCg;

    updateMessage({
      ...message,
      webgal: {
        ...currentWebgal,
        unlockCg: !isUnlocked,
      },
    });
  }

  // 鏂板锛氱敓鎴愯浆鍙戞秷鎭苟杩斿洖娑堟伅ID
  async function generateForwardMessage(): Promise<number | null> {
    // 鍙戦€佹彁绀轰俊鎭?
    const firstMessageResult = await sendMessageMutation.mutateAsync({
      roomId,
      messageType: 1,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: "杞彂浜嗕互涓嬫秷鎭埌绀惧尯",
      extra: {},
    });
    if (!firstMessageResult.success)
      return null;

    // 鍙戦€佽浆鍙戣姹?
    const forwardResult = await sendMessageMutation.mutateAsync(
      constructForwardRequest(roomId),
    );
    if (!forwardResult.success || !forwardResult.data)
      return null;

    // 娓呯悊鐘舵€?
    setIsForwardWindowOpen(false);
    updateSelectedMessageIds(new Set());

    return forwardResult.data.messageId;
  }

  async function handleAddEmoji(imgMessage: ImageMessage) {
    if (emojiList.find(emoji => emoji.imageUrl === imgMessage.url)) {
      toast.error("璇ヨ〃鎯呭凡瀛樺湪");
      return;
    }
    const fileSize = imgMessage.size > 0
      ? imgMessage.size
      : (await getImageSize(imgMessage.url)).size;
    createEmojiMutation.mutate({
      name: imgMessage.fileName,
      imageUrl: imgMessage.url,
      fileSize,
      format: imgMessage.url.split(".").pop() || "webp",
    }, {
      onSuccess: () => {
        toast.success("琛ㄦ儏娣诲姞鎴愬姛");
      },
    });
  }

  /**
   * 鑱婂ぉ姘旀场鎷栨嫿鎺掑簭
   */
  const {
    isDragging,
    scrollerRef,
    isDocRefDragOver,
    updateDocRefDragOver,
    handleMoveMessages,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    sendDocCardFromDrop,
  } = useChatFrameDragAndDrop({
    historyMessages,
    isMessageMovable,
    updateMessage,
    roomId,
    spaceId: roomContext.spaceId ?? -1,
    curRoleId: roomContext.curRoleId ?? -1,
    curAvatarId: roomContext.curAvatarId ?? -1,
    curMemberType: roomContext.curMember?.memberType,
    isSpaceOwner: spaceContext.isSpaceOwner,
    onSendDocCard,
    send,
    virtuosoRef,
    isSelecting,
    selectedMessageIds,
  });

  /**
   * 鍙抽敭鑿滃崟
   */
  const { contextMenu, closeContextMenu, handleContextMenu } = useChatFrameContextMenu();

  function handleDelete() {
    deleteMessage(contextMenu?.messageId ?? -1);
  }

  function handleBatchDelete() {
    for (const messageId of selectedMessageIds) {
      deleteMessage(messageId);
    }
    updateSelectedMessageIds(new Set());
  }

  function handleEditMessage(messageId: number) {
    const target = document.querySelector(
      `[data-message-id="${messageId}"] .editable-field`,
    ) as HTMLElement;
    target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: target.offsetLeft + target.offsetWidth / 2,
      clientY: target.offsetTop + target.offsetHeight / 2,
    }));
  }

  // 鍏抽棴鍙抽敭鑿滃崟

  function toggleChatBubbleStyle() {
    toggleUseChatBubbleStyle();
    closeContextMenu();
  }

  // 澶勭悊鍥炲娑堟伅
  function handleReply(message: Message) {
    setReplyMessage(message);
  }

  /**
   * @param index 铏氭嫙鍒楄〃涓殑index锛屼负浜嗗疄鐜板弽鍚戞粴鍔紝杩涜浜嗗亸绉?
   * @param chatMessageResponse
   */
  const renderMessage = useCallback((index: number, chatMessageResponse: ChatMessageResponse) => {
    const isSelected = selectedMessageIds.has(chatMessageResponse.message.messageId);
    const baseDraggable = (roomContext.curMember?.memberType ?? 3) < 3;
    const movable = baseDraggable && (!isMessageMovable || isMessageMovable(chatMessageResponse.message));
    const indexInHistoryMessages = virtuosoIndexToMessageIndex(index);
    const canJumpToWebGAL = !!roomContext.jumpToMessageInWebGAL;
    const threadHintMeta = threadHintMetaByMessageId.get(chatMessageResponse.message.messageId);
    return ((
      <div
        key={chatMessageResponse.message.messageId}
        className={`
        pl-6 relative group transition-opacity ${isSelected ? "bg-info-content/40" : ""} ${isDragging ? "pointer-events-auto" : ""} ${canJumpToWebGAL ? "cursor-pointer hover:bg-base-200/50" : ""}`}
        data-message-id={chatMessageResponse.message.messageId}
        onClick={(e) => {
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const container = e.currentTarget;
            let hasRangeInContainer = false;
            for (let i = 0; i < selection.rangeCount; i += 1) {
              const range = selection.getRangeAt(i);
              if (range.intersectsNode(container)) {
                hasRangeInContainer = true;
                break;
              }
            }
            if (hasRangeInContainer) {
              return;
            }
          }
          // 妫€鏌ョ偣鍑荤洰鏍囨槸鍚︽槸鎸夐挳鎴栧叾瀛愬厓绱狅紝濡傛灉鏄垯涓嶈Е鍙戣烦杞?
          const target = e.target as HTMLElement;
          const isButtonClick = target.closest("button") || target.closest("[role=\"button\"]") || target.closest(".btn");

          if (isSelecting || e.ctrlKey) {
            toggleMessageSelection(chatMessageResponse.message.messageId);
          }
          else if (roomContext.jumpToMessageInWebGAL && !isButtonClick) {
            // 濡傛灉瀹炴椂娓叉煋宸叉縺娲讳笖涓嶆槸鐐瑰嚮鎸夐挳锛屽崟鍑绘秷鎭烦杞埌 WebGAL 瀵瑰簲浣嶇疆
            roomContext.jumpToMessageInWebGAL(chatMessageResponse.message.messageId);
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, indexInHistoryMessages)}
        draggable={isSelecting && movable}
        onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
        onDragEnd={handleDragEnd}
      >
        {
          movable
          && (
            <div
              className={`absolute left-0 ${useChatBubbleStyle ? "top-[12px]" : "top-[30px]"}
                      opacity-0 transition-opacity flex items-center pr-2 cursor-move
                      group-hover:opacity-100 z-100`}
              draggable={movable}
              onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
              onDragEnd={handleDragEnd}
            >
              <DraggableIcon className="size-6 "></DraggableIcon>
            </div>
          )
        }
        <ChatBubble
          chatMessageResponse={chatMessageResponse}
          useChatBubbleStyle={useChatBubbleStyle}
          threadHintMeta={threadHintMeta}
          onExecuteCommandRequest={onExecuteCommandRequest}
        />
      </div>
    )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMessageIds,
    roomContext.curMember?.memberType,
    roomContext.jumpToMessageInWebGAL,
    virtuosoIndexToMessageIndex,
    isDragging,
    isSelecting,
    useChatBubbleStyle,
    toggleMessageSelection,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragStart,
    handleDragEnd,
    isMessageMovable,
    threadHintMetaByMessageId,
  ]);

  if (chatHistory?.loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-base-200">
        <div className="flex flex-col items-center gap-2">
          {/* 鍔犺浇鍔ㄧ敾 */}
          <span className="loading loading-spinner loading-lg text-info"></span>
          {/* 鎻愮ず鏂囧瓧 */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-medium text-base-content">姝ｅ湪鑾峰彇鍘嗗彶娑堟伅</h3>
            <p className="text-sm text-base-content/70">璇风◢鍊?..</p>
          </div>
        </div>
      </div>
    );
  }
  /**
   * 娓叉煋
   */
  return (
    <div className="h-full relative">
      <ChatFrameList
        historyMessages={historyMessages}
        virtuosoRef={virtuosoRef}
        scrollerRef={scrollerRef}
        isAtBottomRef={isAtBottomRef}
        isAtTopRef={isAtTopRef}
        setCurrentVirtuosoIndex={setCurrentVirtuosoIndex}
        enableUnreadIndicator={enableUnreadIndicator}
        unreadMessageNumber={unreadMessageNumber}
        scrollToBottom={scrollToBottom}
        updateLastReadSyncId={updateLastReadSyncId}
        roomId={roomId}
        renderMessage={renderMessage}
        onContextMenu={handleContextMenu}
        selectedMessageIds={selectedMessageIds}
        updateSelectedMessageIds={updateSelectedMessageIds}
        setIsExportImageWindowOpen={setIsExportImageWindowOpen}
        setIsForwardWindowOpen={setIsForwardWindowOpen}
        handleBatchDelete={handleBatchDelete}
        isSpaceOwner={spaceContext.isSpaceOwner}
        isDocRefDragOver={isDocRefDragOver}
        updateDocRefDragOver={updateDocRefDragOver}
        onSendDocCardFromDrop={sendDocCardFromDrop}
      />
      <ChatFrameOverlays
        isForwardWindowOpen={isForwardWindowOpen}
        setIsForwardWindowOpen={setIsForwardWindowOpen}
        isExportImageWindowOpen={isExportImageWindowOpen}
        setIsExportImageWindowOpen={setIsExportImageWindowOpen}
        historyMessages={historyMessages}
        selectedMessageIds={selectedMessageIds}
        updateSelectedMessageIds={updateSelectedMessageIds}
        onForward={handleForward}
        generateForwardMessage={generateForwardMessage}
      />
      {/* 鍙抽敭鑿滃崟 */}
      <ChatFrameContextMenu
        contextMenu={contextMenu}
        historyMessages={historyMessages}
        isSelecting={isSelecting}
        selectedMessageIds={selectedMessageIds}
        useChatBubbleStyle={useChatBubbleStyle}
        onClose={closeContextMenu}
        onDelete={handleDelete}
        onToggleSelection={toggleMessageSelection}
        onReply={handleReply}
        onMoveMessages={handleMoveMessages}
        onToggleChatBubbleStyle={toggleChatBubbleStyle}
        onEditMessage={handleEditMessage}
        onToggleBackground={toggleBackground}
        onUnlockCg={toggleUnlockCg}
        onAddEmoji={handleAddEmoji}
        onInsertAfter={(messageId) => {
          setInsertAfterMessageId(messageId);
        }}
        onToggleNarrator={handleToggleNarrator}
      />
    </div>
  );
}

export default memo(ChatFrame);
