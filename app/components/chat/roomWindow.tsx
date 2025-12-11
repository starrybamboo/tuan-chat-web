import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/chatInputArea";

import type { RoomContextType } from "@/components/chat/roomContext";
import type { ClueMessage } from "api/models/ClueMessage";
import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, Message, SpaceMember, UserRole } from "../../../api";
// hooks (local)
import AtMentionController from "@/components/atMentionController";
import AvatarSwitch from "@/components/chat/avatarSwitch";
import ChatFrame from "@/components/chat/chatFrame";
import ChatInputArea from "@/components/chat/chatInputArea";
import ChatStatusBar from "@/components/chat/chatStatusBar";
import ChatToolbar from "@/components/chat/chatToolbar";
import CommandPanel from "@/components/chat/commandPanel";
import useChatInputStatus from "@/components/chat/hooks/useChatInputStatus";
import { useChatHistory } from "@/components/chat/indexedDB/useChatHistory";
import SearchBar from "@/components/chat/inlineSearch";
import DNDMap from "@/components/chat/map/DNDMap";
import { RoomContext } from "@/components/chat/roomContext";
import InitiativeList from "@/components/chat/sideDrawer/initiativeList";
import RoomRoleList from "@/components/chat/sideDrawer/roomRoleList";
import RoomUserList from "@/components/chat/sideDrawer/roomUserList";
import RepliedMessage from "@/components/chat/smallComponents/repliedMessage";
import useGetRoleSmartly from "@/components/chat/smallComponents/useGetRoleName";
import { SpaceContext } from "@/components/chat/spaceContext";
import TextStyleToolbar from "@/components/chat/textStyleToolbar";
import { sendLlmStreamMessage } from "@/components/chat/utils/llmUtils";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import BetterImg from "@/components/common/betterImg";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor, { isCommand } from "@/components/common/dicer/cmdPre";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
  BaselineArrowBackIosNew,
  MusicNote,
  SharpDownload,
} from "@/icons";
import { getImageSize } from "@/utils/getImgSize";
import { getScreenSize } from "@/utils/getScreenSize";
import { isElectronEnv } from "@/utils/isElectronEnv";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { UploadUtils } from "@/utils/UploadUtils";
import useRealtimeRender from "@/webGAL/useRealtimeRender";
import { MessageType } from "api/wsModels";
// *** 导入新组件及其 Handle 类型 ***

import React, { use, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useImmer } from "use-immer";
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
import ClueListForPL from "./sideDrawer/clueListForPL";
import ExportChatDrawer from "./sideDrawer/exportChatDrawer";
import WebGALPreview from "./sideDrawer/webGALPreview";

// const PAGE_SIZE = 50; // 每页消息数量
export function RoomWindow({ roomId, spaceId, targetMessageId }: { roomId: number; spaceId: number; targetMessageId?: number | null }) {
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

  // 纯文本状态，由 ChatInputArea 通过 onInputSync 回调更新
  const [inputText, setInputTextWithoutUpdateTextArea] = useState("");
  // 不包含@角色的文本
  const [inputTextWithoutMentions, setinputTextWithoutMentions] = useState("");
  // 提及列表状态，同样由 ChatInputArea 回调更新
  const [mentionedRolesInInput, setMentionedRolesInInput] = useState<UserRole[]>([]);

  const delayTimer = useRef<NodeJS.Timeout | null>(null);

  // *** ChatInputArea 的回调处理器 ***
  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    setInputTextWithoutUpdateTextArea(plainText);
    setinputTextWithoutMentions(inputTextWithoutMentions);
    setMentionedRolesInInput(roles);
    // 检查 @ 提及触发
    atMentionRef.current?.onInput();
  }, []); // 空依赖，因为 setter 函数是稳定的

  /**
   * *** setInputText 现在调用 ref API ***
   * 如果想从外部控制输入框的内容，使用这个函数。
   * @param text 想要重置的inputText (注意：这里现在只接受纯文本，如果需要 HTML 请修改)
   */
  const setInputText = (text: string) => {
    setInputTextWithoutUpdateTextArea(text); // 更新 React 状态
    chatInputRef.current?.setContent(text); // 命令子组件更新其 DOM
  };

  const uploadUtils = new UploadUtils();

  // 聊天框中包含的图片
  const [imgFiles, updateImgFiles] = useImmer<File[]>([]);
  const [emojiUrls, updateEmojiUrls] = useImmer<string[]>([]);
  // 聊天框中包含的语音
  const [audioFile, setAudioFile] = useState<File | null>(null);
  // 发送选项
  const [sendAsBackground, setSendAsBackground] = useState(false);
  // 音频用途：undefined=普通语音, "bgm"=背景音乐, "se"=音效
  const [audioPurpose, setAudioPurpose] = useState<"bgm" | "se" | undefined>(undefined);
  // 引用的聊天记录id
  const [replyMessage, setReplyMessage] = useState<Message | undefined>(undefined);
  // 插入消息位置（在该消息下方插入新消息）
  const [insertAfterMessageId, setInsertAfterMessageId] = useState<number | undefined>(undefined);

  // 切换房间时清空引用消息和插入位置
  useLayoutEffect(() => {
    setReplyMessage(undefined);
    setInsertAfterMessageId(undefined);
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

  // 房间ID到角色ID的映射
  const [curRoleIdMap, setCurRoleIdMap] = useLocalStorage<Record<number, number>>(
    "curRoleIdMap",
    {},
  );
  // 角色ID到头像ID的映射
  const [curAvatarIdMap, setCurAvatarIdMap] = useLocalStorage<Record<number, number>>(
    "curAvatarIdMap",
    {},
  );
  const curRoleId = curRoleIdMap[roomId] ?? roomRolesThatUserOwn[0]?.roleId ?? -1;
  const setCurRoleId = useCallback((roleId: number) => {
    setCurRoleIdMap(prevMap => ({
      ...prevMap,
      [roomId]: roleId,
    }));
  }, [roomId, setCurRoleIdMap]);
  const curAvatarId = curAvatarIdMap[curRoleId] ?? -1;
  const setCurAvatarId = useCallback((_avatarId: number) => {
    setCurAvatarIdMap(prevMap => ({
      ...prevMap,
      [curRoleId]: _avatarId,
    }));
  }, [curRoleId, setCurAvatarIdMap]);

  // 渲染对话
  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);

  // 实时渲染相关
  const [isRealtimeRenderEnabled, setIsRealtimeRenderEnabled] = useReducer((_state: boolean, next: boolean) => next, false);
  // 实时渲染 TTS 配置（默认关闭）
  const [realtimeTTSEnabled, setRealtimeTTSEnabled] = useState(false);
  // 实时渲染小头像配置（默认关闭）
  const [realtimeMiniAvatarEnabled, setRealtimeMiniAvatarEnabled] = useState(false);
  // 实时渲染自动填充立绘配置（默认开启，与原行为一致）
  const [realtimeAutoFigureEnabled, setRealtimeAutoFigureEnabled] = useState(false);
  // TTS API URL（从 localStorage 读取，默认为空使用环境变量）
  const [ttsApiUrl, setTtsApiUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tts_api_url") || "";
    }
    return "";
  });
  // 保存 TTS API URL 到 localStorage
  const handleTtsApiUrlChange = (url: string) => {
    setTtsApiUrl(url);
    if (typeof window !== "undefined") {
      if (url) {
        localStorage.setItem("tts_api_url", url);
      }
      else {
        localStorage.removeItem("tts_api_url");
      }
    }
  };
  const realtimeTTSConfig = useMemo(() => ({
    enabled: realtimeTTSEnabled,
    engine: "index" as const,
    apiUrl: ttsApiUrl || undefined, // 空字符串转为 undefined
    emotionMode: 2, // 使用情感向量
    emotionWeight: 0.8,
    temperature: 0.8,
    topP: 0.8,
    maxTokensPerSegment: 120,
  }), [realtimeTTSEnabled, ttsApiUrl]);
  const realtimeRender = useRealtimeRender({
    spaceId,
    enabled: isRealtimeRenderEnabled,
    roles: roomRoles,
    rooms: room ? [room] : [], // 当前只传入当前房间，后续可以扩展为多房间
    ttsConfig: realtimeTTSConfig,
    miniAvatarEnabled: realtimeMiniAvatarEnabled,
    autoFigureEnabled: realtimeAutoFigureEnabled,
  });
  const realtimeStatus = realtimeRender.status;
  const stopRealtimeRender = realtimeRender.stop;
  const lastRenderedMessageIdRef = useRef<number | null>(null);
  const hasRenderedHistoryRef = useRef<boolean>(false);
  const realtimeStatusRef = useRef(realtimeRender.status);
  const prevRoomIdRef = useRef<number | null>(null);
  // 跟踪最后一个背景消息的 ID，用于检测背景更新
  const lastBackgroundMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    realtimeStatusRef.current = realtimeRender.status;
  }, [realtimeRender.status]);

  // 侧边栏宽度状态
  const [userDrawerWidth, setUserDrawerWidth] = useLocalStorage("userDrawerWidth", 300);
  const [roleDrawerWidth, setRoleDrawerWidth] = useLocalStorage("roleDrawerWidth", 300);
  const [initiativeDrawerWidth, setInitiativeDrawerWidth] = useLocalStorage("initiativeDrawerWidth", 300);
  const [clueDrawerWidth, setClueDrawerWidth] = useLocalStorage("clueDrawerWidth", 300);
  const [mapDrawerWidth, setMapDrawerWidth] = useLocalStorage("mapDrawerWidth", 600);
  const [exportDrawerWidth, setExportDrawerWidth] = useLocalStorage("exportDrawerWidth", 350);
  const [webgalDrawerWidth, setWebgalDrawerWidth] = useLocalStorage("webgalDrawerWidth", 600);

  const [sideDrawerState, setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map" | "clue" | "export" | "webgal">("rightSideDrawer", "none");
  const sideDrawerStateRef = useRef(sideDrawerState);
  useEffect(() => {
    sideDrawerStateRef.current = sideDrawerState;
  }, [sideDrawerState]);

  const [useChatBubbleStyle, setUseChatBubbleStyle] = useLocalStorage("useChatBubbleStyle", true);

  // WebGAL 联动模式相关状态
  const [webgalLinkMode, setWebgalLinkMode] = useLocalStorage<boolean>("webgalLinkMode", false);
  const [runModeEnabled, setRunModeEnabled] = useLocalStorage<boolean>("runModeEnabled", false);
  const [defaultFigurePositionMap, setDefaultFigurePositionMap] = useLocalStorage<Record<number, "left" | "center" | "right" | undefined>>(
    "defaultFigurePositionMap",
    {},
  );
  // WebGAL 对话参数：-notend（此话不停顿）和 -concat（续接上段话）
  const [dialogNotend, setDialogNotend] = useState(false);
  const [dialogConcat, setDialogConcat] = useState(false);

  // 获取当前角色的默认立绘位置（undefined 表示不显示立绘）
  const currentDefaultFigurePosition = defaultFigurePositionMap[curRoleId];
  const setCurrentDefaultFigurePosition = useCallback((position: "left" | "center" | "right" | undefined) => {
    setDefaultFigurePositionMap(prev => ({
      ...prev,
      [curRoleId]: position,
    }));
  }, [curRoleId, setDefaultFigurePositionMap]);

  // 跑团模式：折叠跑团相关侧边栏入口
  const toggleRunMode = useCallback(() => {
    setRunModeEnabled((prev) => {
      const next = !prev;
      if (!next && (["clue", "initiative", "map", "role"] as const).includes(sideDrawerStateRef.current)) {
        setSideDrawerState("none");
      }
      return next;
    });
  }, [setRunModeEnabled, setSideDrawerState]);

  useEffect(() => {
    if (!runModeEnabled && (["clue", "initiative", "map", "role"] as const).includes(sideDrawerState)) {
      setSideDrawerState("none");
    }
  }, [runModeEnabled, sideDrawerState, setSideDrawerState]);

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

  // 切换空间时关闭线索侧边栏
  useLayoutEffect(() => {
    if (sideDrawerState === "clue") {
      setSideDrawerState("none");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

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

  // 渲染历史消息的函数（需要在 useEffect 之前定义）
  const isRenderingHistoryRef = useRef(false);
  const renderHistoryMessages = useCallback(async () => {
    if (!historyMessages || historyMessages.length === 0) {
      return;
    }

    if (realtimeStatusRef.current !== "connected") {
      console.warn(`[RealtimeRender] 渲染器尚未就绪，当前状态: ${realtimeStatusRef.current}`);
      return;
    }

    isRenderingHistoryRef.current = true;
    try {
      console.warn(`[RealtimeRender] 开始渲染历史消息, 共 ${historyMessages.length} 条`);
      toast.loading(`正在渲染历史消息...`, { id: "webgal-history" });

      // 为所有消息设置默认的立绘位置
      // 创建消息的深拷贝以避免修改不可扩展的对象
      const messagesToRender = historyMessages.map((originalMsg) => {
        // 浅拷贝最外层
        const msg = { ...originalMsg };
        // 浅拷贝 message 对象
        msg.message = { ...originalMsg.message };

        if (msg.message.messageType === 1 && msg.message.roleId > 0) {
          // 只有当消息完全没有 voiceRenderSettings 时，才使用默认立绘位置
          // 如果已经存在 voiceRenderSettings（即使没有 figurePosition），说明用户已经手动配置过，不应该自动添加
          if (!msg.message.webgal?.voiceRenderSettings) {
            const defaultPosition = defaultFigurePositionMap?.[msg.message.roleId];

            // 只有当默认位置存在时才设置
            if (defaultPosition) {
              // 确保 webgal 对象存在且是新的引用
              msg.message.webgal = { ...(msg.message.webgal || {}) };

              // 创建新的 voiceRenderSettings 对象
              msg.message.webgal.voiceRenderSettings = {
                figurePosition: defaultPosition,
              };
            }
          }
        }
        return msg;
      });

      // 使用批量渲染接口
      await realtimeRender.renderHistory(messagesToRender, roomId);

      // 记录最后一条消息的ID
      const lastMessage = messagesToRender[messagesToRender.length - 1];
      if (lastMessage) {
        lastRenderedMessageIdRef.current = lastMessage.message.messageId;
      }
      hasRenderedHistoryRef.current = true;
      toast.success(`历史消息渲染完成`, { id: "webgal-history" });
      console.warn(`[RealtimeRender] 历史消息渲染完成`);
    }
    catch (error) {
      console.error(`[RealtimeRender] 渲染历史消息失败:`, error);
      toast.error(`渲染历史消息失败`, { id: "webgal-history" });
    }
    finally {
      isRenderingHistoryRef.current = false;
    }
  }, [historyMessages, realtimeRender, roomId, defaultFigurePositionMap]);

  // 切换房间时重置实时渲染状态（跳过首次挂载）
  useEffect(() => {
    // 首次挂载时记录 roomId，不执行重置
    if (prevRoomIdRef.current === null) {
      prevRoomIdRef.current = roomId;
      return;
    }
    // 只有在 roomId 真正变化时才重置
    if (prevRoomIdRef.current !== roomId) {
      prevRoomIdRef.current = roomId;
      setIsRealtimeRenderEnabled(false);
      hasRenderedHistoryRef.current = false;
      lastRenderedMessageIdRef.current = null;
      isRenderingHistoryRef.current = false;
      if (sideDrawerStateRef.current === "webgal") {
        setSideDrawerState("none");
      }
    }
  }, [roomId, setIsRealtimeRenderEnabled, setSideDrawerState]);

  // 当渲染器就绪时，自动渲染历史消息（用于页面刷新后从 localStorage 恢复状态）
  useEffect(() => {
    // 条件检查
    if (!realtimeRender.isActive || realtimeRender.status !== "connected" || hasRenderedHistoryRef.current || isRenderingHistoryRef.current) {
      return;
    }
    if (!historyMessages || historyMessages.length === 0 || chatHistory?.loading) {
      return;
    }
    // 确保房间数据已加载，否则场景名会不正确
    if (!room) {
      return;
    }

    // 调用渲染历史消息函数
    renderHistoryMessages();
  }, [realtimeRender.isActive, realtimeRender.status, historyMessages, chatHistory?.loading, room, renderHistoryMessages]);

  // 监听新消息，实时渲染到 WebGAL（只渲染历史消息之后的新消息）
  useEffect(() => {
    // 如果实时渲染关闭，重置标记
    if (!realtimeRender.isActive) {
      hasRenderedHistoryRef.current = false;
      lastRenderedMessageIdRef.current = null;
      isRenderingHistoryRef.current = false;
      return;
    }

    if (!historyMessages || historyMessages.length === 0) {
      return;
    }

    // 如果还没有渲染过历史消息，跳过（等待上面的 useEffect 来处理）
    if (!hasRenderedHistoryRef.current) {
      return;
    }

    // 找到最新的消息
    const latestMessage = historyMessages[historyMessages.length - 1];
    if (!latestMessage)
      return;

    const messageId = latestMessage.message.messageId;
    // 如果这条消息已经渲染过，跳过
    if (lastRenderedMessageIdRef.current === messageId) {
      return;
    }

    // 为消息设置默认的立绘位置（如果还没有设置）
    // 创建消息的深拷贝以避免修改不可扩展的对象
    const messageToRender = { ...latestMessage };
    messageToRender.message = { ...latestMessage.message };

    if (messageToRender.message.messageType === 1 && messageToRender.message.roleId > 0) {
      // 只有当消息完全没有 voiceRenderSettings 时，才使用默认立绘位置
      // 如果已经存在 voiceRenderSettings（即使没有 figurePosition），说明用户已经手动配置过，不应该自动添加
      if (!messageToRender.message.webgal?.voiceRenderSettings) {
        const defaultPosition = defaultFigurePositionMap?.[messageToRender.message.roleId];

        // 只有当默认位置存在时才设置
        if (defaultPosition) {
          // 确保 webgal 对象存在且是新的引用
          messageToRender.message.webgal = { ...(messageToRender.message.webgal || {}) };

          // 创建新的 voiceRenderSettings 对象
          messageToRender.message.webgal.voiceRenderSettings = {
            figurePosition: defaultPosition,
          };
        }
      }
    }

    // 渲染新消息（传入当前房间 ID）
    realtimeRender.renderMessage(messageToRender, roomId);
    lastRenderedMessageIdRef.current = messageId;
  }, [historyMessages, realtimeRender, roomId, defaultFigurePositionMap]);

  // 监听背景消息变化，当用户设置图片为背景时实时渲染更新
  useEffect(() => {
    if (!realtimeRender.isActive || !hasRenderedHistoryRef.current) {
      return;
    }

    if (!historyMessages || historyMessages.length === 0) {
      return;
    }

    // 找到最新的背景消息（background: true 的图片消息）
    const backgroundMessages = historyMessages
      .filter(msg => msg.message.messageType === 2 && msg.message.extra?.imageMessage?.background);

    const latestBackgroundMessage = backgroundMessages[backgroundMessages.length - 1];
    const latestBackgroundMessageId = latestBackgroundMessage?.message.messageId ?? null;

    // 如果背景消息没有变化，跳过
    if (lastBackgroundMessageIdRef.current === latestBackgroundMessageId) {
      return;
    }

    // 保存旧值用于判断是否是取消操作
    const previousBackgroundMessageId = lastBackgroundMessageIdRef.current;

    // 更新 ref
    lastBackgroundMessageIdRef.current = latestBackgroundMessageId;

    // 如果有新的背景消息，重新渲染它
    if (latestBackgroundMessage) {
      console.warn("[RealtimeRender] 检测到背景更新，重新渲染背景消息:", latestBackgroundMessageId);
      realtimeRender.renderMessage(latestBackgroundMessage, roomId);
    }
    else if (previousBackgroundMessageId !== null) {
      // 之前有背景，现在没有了，说明用户取消了所有背景，需要清除
      console.warn("[RealtimeRender] 检测到背景被取消，清除背景");
      realtimeRender.clearBackground(roomId);
    }
  }, [historyMessages, realtimeRender, roomId]);

  // 切换实时渲染
  const handleToggleRealtimeRender = useCallback(async () => {
    if (realtimeRender.isActive) {
      // 关闭实时渲染
      realtimeRender.stop();
      setIsRealtimeRenderEnabled(false);
      setSideDrawerState("none");
      toast.success("已关闭实时渲染");
    }
    else {
      // 启动 WebGAL
      launchWebGal();

      // 轮询检测 WebGAL 服务是否启动
      toast.loading("正在启动 WebGAL...", { id: "webgal-init" });
      try {
        await pollPort(
          Number((import.meta.env.VITE_TERRE_URL as string).split(":").pop()),
          isElectronEnv() ? 15000 : 500,
          100,
        );

        toast.loading("正在初始化实时渲染...", { id: "webgal-init" });
        const success = await realtimeRender.start();
        if (success) {
          toast.success("实时渲染已开启", { id: "webgal-init" });
          // 开启成功后再设置 enabled 状态，避免过早触发 hook 的自动启动
          setIsRealtimeRenderEnabled(true);
          // 打开预览侧边栏
          setSideDrawerState("webgal");
          // 直接渲染历史消息
          await renderHistoryMessages();
        }
        else {
          toast.error("实时渲染启动失败", { id: "webgal-init" });
          setIsRealtimeRenderEnabled(false);
        }
      }
      catch {
        toast.error("WebGAL 启动超时", { id: "webgal-init" });
        setIsRealtimeRenderEnabled(false);
      }
    }
  }, [realtimeRender, setIsRealtimeRenderEnabled, setSideDrawerState, renderHistoryMessages]);

  // 监听实时渲染初始化进度
  useEffect(() => {
    if (realtimeRender.initProgress && realtimeRender.status === "initializing") {
      const { phase, message } = realtimeRender.initProgress;
      if (phase !== "ready" && phase !== "idle") {
        toast.loading(message, { id: "webgal-init" });
      }
    }
  }, [realtimeRender.initProgress, realtimeRender.status]);

  useEffect(() => {
    if (realtimeStatus !== "error") {
      return;
    }

    toast.error("实时渲染连接失败，请确认 WebGAL 已启动", { id: "webgal-error" });
    stopRealtimeRender();
    setIsRealtimeRenderEnabled(false);
    if (sideDrawerState === "webgal") {
      setSideDrawerState("none");
    }
    hasRenderedHistoryRef.current = false;
    lastRenderedMessageIdRef.current = null;
  }, [realtimeStatus, stopRealtimeRender, setIsRealtimeRenderEnabled, sideDrawerState, setSideDrawerState]);

  // WebGAL 跳转到指定消息
  const jumpToMessageInWebGAL = useCallback((messageId: number): boolean => {
    if (!realtimeRender.isActive) {
      return false;
    }
    return realtimeRender.jumpToMessage(messageId, roomId);
  }, [realtimeRender, roomId]);

  // WebGAL 更新消息渲染设置并重新渲染跳转
  const updateAndRerenderMessageInWebGAL = useCallback(async (
    message: ChatMessageResponse,
    regenerateTTS: boolean = false,
  ): Promise<boolean> => {
    if (!realtimeRender.isActive) {
      return false;
    }
    return realtimeRender.updateAndRerenderMessage(message, roomId, regenerateTTS);
  }, [realtimeRender, roomId]);

  const roomContext: RoomContextType = useMemo((): RoomContextType => {
    return {
      roomId,
      roomMembers: members,
      curMember,
      roomRolesThatUserOwn,
      curRoleId,
      curAvatarId,
      useChatBubbleStyle,
      spaceId,
      setReplyMessage,
      chatHistory,
      scrollToGivenMessage,
      // WebGAL 联动模式相关
      webgalLinkMode,
      setWebgalLinkMode,
      defaultFigurePositionMap,
      setDefaultFigurePosition: (roleId: number, position: "left" | "center" | "right" | undefined) => {
        setDefaultFigurePositionMap(prev => ({
          ...prev,
          [roleId]: position,
        }));
      },
      // WebGAL 跳转功能 - 只有在实时渲染激活时才启用
      jumpToMessageInWebGAL: realtimeRender.isActive ? jumpToMessageInWebGAL : undefined,
      // WebGAL 更新渲染并跳转 - 只有在实时渲染激活时才启用
      updateAndRerenderMessageInWebGAL: realtimeRender.isActive ? updateAndRerenderMessageInWebGAL : undefined,
      // 插入消息位置
      insertAfterMessageId,
      setInsertAfterMessageId,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, useChatBubbleStyle, spaceId, chatHistory, scrollToGivenMessage, webgalLinkMode, setWebgalLinkMode, defaultFigurePositionMap, setDefaultFigurePositionMap, realtimeRender.isActive, jumpToMessageInWebGAL, updateAndRerenderMessageInWebGAL, insertAfterMessageId]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  // 判断是否是观战成员 (memberType >= 3)
  const isSpectator = (curMember?.memberType ?? 3) >= 3;

  const { myStatus: myStatue, handleManualStatusChange } = useChatInputStatus({
    roomId,
    userId,
    webSocketUtils,
    inputText,
    isSpectator, // 观战成员不发送状态
  });

  /**
   * ai自动补全
   */
  const [LLMMessage, setLLMMessageRaw] = useState("");
  const isAutoCompletingRef = useRef(false);
  const hintNodeRef = useRef<HTMLSpanElement | null>(null); // Ref for the hint span itself
  const justAcceptedRewriteRef = useRef(false); // 标记刚刚接受了重写，防止触发自动补全

  // AI重写相关状态
  const [originalTextBeforeRewrite, setOriginalTextBeforeRewrite] = useState(""); // 保存重写前的原文

  const setLLMMessage = (newLLMMessage: string) => {
    if (hintNodeRef.current) {
      hintNodeRef.current.remove(); // 移除旧的提示节点
    }
    setLLMMessageRaw(newLLMMessage);

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
        const role = await getRoleSmartly(m.message.roleId);
        return `${role?.roleName ?? role?.roleId}: ${m.message.content}`;
      }),
    )).join("\n");
    const insertAtMiddle = afterMessage !== "";
    const curRoleName = userRoles?.find(r => r.roleId === curRoleId)?.roleName;
    const prompt = `
      你现在在进行一个跑团对话，请根据以下文本内容，提供一段自然连贯的${insertAtMiddle ? "插入语句" : "续写"}。
      重点关注上下文的逻辑和主题发展。只提供续写内容，不要额外解释，不要输入任何多余不属于跑团内容的文本信息。
      这是已有的历史聊天信息：
      === 聊天记录开始 ===
      ${historyMessagesString}.
      === 聊天记录结束 ===
      这是你所扮演的角色的名字：${curRoleName}.
      你所输出的文本会被直接插入到已输入的文字${insertAtMiddle ? "中间" : "末尾"}，所以也不要重复已有文本的任何句子或词语。
      ${insertAtMiddle ? `插入点前的文本：${beforeMessage},插入点后的文本${afterMessage}` : `已输入的文本内容：${inputText}`}`;
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
    if (originalTextBeforeRewrite) {
      // 重写模式：直接设置为重写后的文本
      const rewriteText = LLMMessage.replace(/\u200B/g, ""); // 移除零宽字符
      setInputText(rewriteText);
      // 同步更新 DOM
      if (chatInputRef.current?.getRawElement()) {
        chatInputRef.current.getRawElement()!.textContent = rewriteText;
      }
      setOriginalTextBeforeRewrite(""); // 清空原文记录
      justAcceptedRewriteRef.current = true; // 标记刚刚接受了重写
      toast.success("已接受重写");
    }
    else {
      // 补全模式：插入到光标位置
      chatInputRef.current.insertNodeAtCursor(LLMMessage, { moveCursorToEnd: true });
    }

    setLLMMessage(""); // 清空补全状态
    chatInputRef.current.triggerSync(); // 手动触发同步，更新父组件的 inputText 状态
  };

  // AI重写：显示为虚影预览
  const handleQuickRewrite = async (prompt: string) => {
    if (!inputText.trim()) {
      toast.error("请先输入内容");
      return;
    }

    // 如果已有虚影补全，先清除
    if (LLMMessage) {
      setLLMMessage("");
    }

    setOriginalTextBeforeRewrite(inputText); // 保存原文

    try {
      const fullPrompt = `${prompt}\n\n请根据上述要求重写以下文本：\n${inputText}`;

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
      setInputText(originalTextBeforeRewrite);
      setOriginalTextBeforeRewrite("");
    }
  };

  /**
   *处理与组件的各种交互
   */
  const handleSelectCommand = (cmdName: string) => {
    const prefixChar = inputText[0] || "."; // 默认为 .
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const notMember = ((members.find(member => member.userId === userId)?.memberType ?? 3) >= 3); // 没有权限
  const noRole = curRoleId <= 0;
  const noInput = !(inputText.trim() || imgFiles.length > 0 || emojiUrls.length > 0 || audioFile); // 没有内容
  // WebGAL 联动模式下允许无角色发送（作为旁白）
  const disableSendMessage = (noRole && !webgalLinkMode) || notMember || noInput || isSubmitting;

  /**
   * 发送消息的辅助函数
   * 如果设置了 insertAfterMessageId，则使用 HTTP API 发送并更新 position
   * 否则使用 WebSocket 发送
   */
  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
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
  }, [insertAfterMessageId, historyMessages, send, sendMessageMutation, updateMessageMutation, chatHistory]);

  const handleMessageSubmit = async () => {
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
      updateImgFiles([]);

      // 2. 上传表情 (视为图片)
      for (let i = 0; i < emojiUrls.length; i++) {
        const { width, height, size } = await getImageSize(emojiUrls[i]);
        uploadedImages.push({ url: emojiUrls[i], width, height, size, fileName: "emoji" });
      }
      updateEmojiUrls([]);

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
      const finalReplyId = replyMessage?.messageId || undefined;
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
      setReplyMessage(undefined);
      setSendAsBackground(false);
      setAudioPurpose(undefined);
      setInsertAfterMessageId(undefined); // 清除插入位置
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
    updateImgFiles((draft) => {
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
    if (e.key === "Escape" && originalTextBeforeRewrite) {
      e.preventDefault();
      setInputText(originalTextBeforeRewrite);
      setOriginalTextBeforeRewrite("");
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
    const hasRealContent = inputText.trim() && inputText !== "\u200B";
    if (e.key === "Tab" && !LLMMessage && !isAutoCompletingRef.current && hasRealContent && !justAcceptedRewriteRef.current) {
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
    if (realtimeRender.isActive) {
      realtimeRender.clearFigure(roomId);
    }
    toast.success("已清除立绘");
  }, [roomId, send, realtimeRender]);

  return (
    <RoomContext value={roomContext}>
      <div className="flex flex-col h-full w-full shadow-sm min-h-0">
        <div className="flex justify-between items-center py-1 px-5 bg-base-100">
          <div className="flex gap-2">
            <BaselineArrowBackIosNew
              className="size-7"
              onClick={
                sideDrawerState === "none" ? spaceContext.toggleLeftDrawer : () => setSideDrawerState("none")
              }
            >
            </BaselineArrowBackIosNew>
            <span className="text-center font-semibold text-lg line-clamp-1">{room?.name}</span>
          </div>
          <div className="flex gap-2 items-center">
            <div
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="导出记录"
              onClick={() => setSideDrawerState(sideDrawerState === "export" ? "none" : "export")}
            >
              <SharpDownload className="size-7" />
            </div>
            <SearchBar className={getScreenSize() === "sm" ? "" : "w-64"} />
          </div>
        </div>
        <div className="h-px bg-base-300"></div>
        <div className="flex-1 w-full flex bg-base-100 relative min-h-0">
          <div className="flex flex-col flex-1 h-full">
            {/* 聊天框 */}
            <div className="bg-base-100 flex-1 flex-shrink-0">
              <ChatFrame
                useChatBubbleStyle={useChatBubbleStyle}
                setUseChatBubbleStyle={setUseChatBubbleStyle}
                key={roomId}
                virtuosoRef={virtuosoRef}
              >
              </ChatFrame>
            </div>
            <div className="h-px bg-base-300 flex-shrink-0"></div>
            {/* 输入区域 */}
            <div className="bg-base-100 px-3 py-2 rounded-lg flex flex-col">
              <div className="relative flex-1 flex flex-col min-w-0">
                <CommandPanel
                  prefix={inputText} // *** 直接使用 inputText state ***
                  handleSelectCommand={handleSelectCommand}
                  commandMode={
                    inputText.startsWith("%")
                      ? "webgal"
                      : (inputText.startsWith(".") || inputText.startsWith("。"))
                          ? "dice"
                          : "none"
                  }
                  ruleId={space?.ruleId ?? -1}
                  className="absolute bottom-full w-[100%] mb-2 bg-base-200 rounded-box shadow-md overflow-hidden z-10"
                />
                {/* 底部工具栏 */}
                {/* 状态显示条 */}
                <ChatStatusBar roomId={roomId} userId={userId} webSocketUtils={webSocketUtils} excludeSelf={false} />
                <ChatToolbar
                  sideDrawerState={sideDrawerState}
                  setSideDrawerState={setSideDrawerState}
                  updateEmojiUrls={updateEmojiUrls}
                  updateImgFiles={updateImgFiles}
                  disableSendMessage={disableSendMessage}
                  handleMessageSubmit={handleMessageSubmit}
                  onAIRewrite={handleQuickRewrite}
                  currentChatStatus={myStatue as any}
                  onChangeChatStatus={handleManualStatusChange}
                  isSpectator={isSpectator}
                  isRealtimeRenderActive={realtimeRender.isActive}
                  onToggleRealtimeRender={handleToggleRealtimeRender}
                  webgalLinkMode={webgalLinkMode}
                  onToggleWebgalLinkMode={() => setWebgalLinkMode(!webgalLinkMode)}
                  runModeEnabled={runModeEnabled}
                  onToggleRunMode={toggleRunMode}
                  defaultFigurePosition={currentDefaultFigurePosition}
                  onSetDefaultFigurePosition={setCurrentDefaultFigurePosition}
                  dialogNotend={dialogNotend}
                  onToggleDialogNotend={() => setDialogNotend(!dialogNotend)}
                  dialogConcat={dialogConcat}
                  onToggleDialogConcat={() => setDialogConcat(!dialogConcat)}
                  onSendEffect={handleSendEffect}
                  onClearBackground={handleClearBackground}
                  onClearFigure={handleClearFigure}
                  setAudioFile={setAudioFile}
                />
                <div className="flex gap-2 items-stretch">
                  <AvatarSwitch
                    curRoleId={curRoleId}
                    curAvatarId={curAvatarId}
                    setCurAvatarId={setCurAvatarId}
                    setCurRoleId={setCurRoleId}
                  >
                  </AvatarSwitch>
                  {/* 输入框容器 */}
                  <div
                    className="text-sm w-full max-h-[20dvh] border border-base-300 rounded-[8px] flex focus-within:ring-0 focus-within:ring-info focus-within:border-info flex-col"
                  >
                    {(imgFiles.length > 0 || emojiUrls.length > 0 || audioFile) && (
                      <div className="flex flex-col gap-1 p-2 pb-1 border-b border-base-200/50">
                        <div className="flex flex-row gap-x-3 overflow-x-auto">
                          {imgFiles.map((file, index) => (
                            <BetterImg
                              src={file}
                              className="h-12 w-max rounded"
                              onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                              key={file.name}
                            />
                          ))}
                          {imgFiles.length > 0 && (
                            <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-xs checkbox-primary"
                                checked={sendAsBackground}
                                onChange={e => setSendAsBackground(e.target.checked)}
                              />
                              <span>设为背景</span>
                            </label>
                          )}
                          {emojiUrls.map((url, index) => (
                            <BetterImg
                              src={url}
                              className="h-12 w-max rounded"
                              onClose={() => updateEmojiUrls(draft => void draft.splice(index, 1))}
                              key={url}
                            />
                          ))}
                          {audioFile && (
                            <div className="relative group flex-shrink-0">
                              <div className="h-12 w-12 rounded bg-base-200 flex items-center justify-center border border-base-300" title={audioFile.name}>
                                <MusicNote className="size-6 opacity-70" />
                              </div>
                              <div
                                className="absolute -top-1 -right-1 bg-base-100 rounded-full shadow cursor-pointer hover:bg-error hover:text-white transition-colors z-10"
                                onClick={() => setAudioFile(null)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 p-0.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 truncate rounded-b">
                                语音
                              </div>
                            </div>
                          )}
                          {audioFile && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-base-content/60">用途:</span>
                              <select
                                title="选择音频用途"
                                className="select select-xs select-bordered"
                                value={audioPurpose || ""}
                                onChange={e => setAudioPurpose(e.target.value as "bgm" | "se" | undefined || undefined)}
                              >
                                <option value="">普通语音</option>
                                <option value="bgm">BGM</option>
                                <option value="se">音效</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {
                      replyMessage && (
                        <div className="p-2 pb-1">
                          <RepliedMessage
                            replyMessage={replyMessage}
                            className="flex flex-row gap-2 items-center bg-base-200 rounded-box shadow-sm text-sm p-1"
                          />
                        </div>
                      )
                    }
                    {/* 插入消息模式指示器 */}
                    {
                      insertAfterMessageId && (
                        <div className="p-2 pb-1">
                          <div className="flex flex-row gap-2 items-center bg-info/20 rounded-box shadow-sm text-sm p-2 justify-between">
                            <span className="text-info-content">
                              📍 将在消息后插入
                            </span>
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost"
                              onClick={() => setInsertAfterMessageId(undefined)}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )
                    }

                    <ChatInputArea
                      ref={chatInputRef}
                      onInputSync={handleInputAreaChange}
                      onPasteFiles={handlePasteFiles}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                      onMouseDown={handleMouseDown}
                      onCompositionStart={() => isComposingRef.current = true}
                      onCompositionEnd={() => isComposingRef.current = false}
                      disabled={notMember && noRole} // 观战者被禁用
                      placeholder={placeholderText}
                    />

                    {/* WebGAL 文本样式工具栏 - 紧贴输入框底部 */}
                    <TextStyleToolbar
                      chatInputRef={chatInputRef}
                      className="px-2 pb-1"
                    />

                  </div>
                  <AtMentionController
                    ref={atMentionRef}
                    chatInputRef={chatInputRef}
                    allRoles={roomRoles}
                  >
                  </AtMentionController>
                </div>
              </div>
            </div>
          </div>
          <div className="w-px bg-base-300 flex-shrink-0"></div>
          <OpenAbleDrawer
            isOpen={sideDrawerState === "user"}
            className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0"
            initialWidth={userDrawerWidth}
            onWidthChange={setUserDrawerWidth}
          >
            <RoomUserList></RoomUserList>
          </OpenAbleDrawer>
          <OpenAbleDrawer
            isOpen={sideDrawerState === "role"}
            className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0"
            initialWidth={roleDrawerWidth}
            onWidthChange={setRoleDrawerWidth}
          >
            <RoomRoleList></RoomRoleList>
          </OpenAbleDrawer>
          <OpenAbleDrawer
            isOpen={sideDrawerState === "initiative"}
            className="max-h-full overflow-auto z-20"
            initialWidth={initiativeDrawerWidth}
            onWidthChange={setInitiativeDrawerWidth}
          >
            <InitiativeList></InitiativeList>
          </OpenAbleDrawer>
          <OpenAbleDrawer
            isOpen={sideDrawerState === "map"}
            className="h-full overflow-auto z-20"
            initialWidth={mapDrawerWidth}
            onWidthChange={setMapDrawerWidth}
            maxWidth={window.innerWidth - 700}
          >
            <DNDMap></DNDMap>
          </OpenAbleDrawer>
          <OpenAbleDrawer
            isOpen={sideDrawerState === "clue"}
            className="h-full bg-base-100 overflow-auto z-20"
            initialWidth={clueDrawerWidth}
            onWidthChange={setClueDrawerWidth}
          >
            {spaceContext.isSpaceOwner
              ? <ClueListForPL onSend={handleClueSend}></ClueListForPL>
              : <ClueListForPL onSend={handleClueSend}></ClueListForPL>}
          </OpenAbleDrawer>
          <OpenAbleDrawer
            isOpen={sideDrawerState === "export"}
            className="h-full bg-base-100 overflow-auto z-20"
            initialWidth={exportDrawerWidth}
            onWidthChange={setExportDrawerWidth}
          >
            <ExportChatDrawer></ExportChatDrawer>
          </OpenAbleDrawer>
          <OpenAbleDrawer
            isOpen={sideDrawerState === "webgal"}
            className="h-full bg-base-100 overflow-hidden z-20"
            initialWidth={webgalDrawerWidth}
            onWidthChange={setWebgalDrawerWidth}
            maxWidth={window.innerWidth - 500}
          >
            <WebGALPreview
              previewUrl={realtimeRender.previewUrl}
              isActive={realtimeRender.isActive}
              ttsEnabled={realtimeTTSEnabled}
              onTTSToggle={setRealtimeTTSEnabled}
              ttsApiUrl={ttsApiUrl}
              onTTSApiUrlChange={handleTtsApiUrlChange}
              miniAvatarEnabled={realtimeMiniAvatarEnabled}
              onMiniAvatarToggle={setRealtimeMiniAvatarEnabled}
              autoFigureEnabled={realtimeAutoFigureEnabled}
              onAutoFigureToggle={setRealtimeAutoFigureEnabled}
              onClose={() => {
                realtimeRender.stop();
                setIsRealtimeRenderEnabled(false);
                setSideDrawerState("none");
              }}
            />
          </OpenAbleDrawer>
        </div>
      </div>
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleAddWindowOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </PopWindow>
      <PopWindow isOpen={isRenderWindowOpen} onClose={() => setIsRenderWindowOpen(false)}>
        <RenderWindow></RenderWindow>
      </PopWindow>
    </RoomContext>
  );
}

export default RoomWindow;
