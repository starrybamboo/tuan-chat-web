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
} from "@/icons";
import { getImageSize } from "@/utils/getImgSize";
import { getScreenSize } from "@/utils/getScreenSize";
import { isElectronEnv } from "@/utils/isElectronEnv";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { UploadUtils } from "@/utils/UploadUtils";
import useRealtimeRender from "@/webGAL/useRealtimeRender";
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
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message }); // 发送群聊消息

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
  // 引用的聊天记录id
  const [replyMessage, setReplyMessage] = useState<Message | undefined>(undefined);

  // 切换房间时清空引用消息
  useLayoutEffect(() => {
    setReplyMessage(undefined);
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
  const realtimeRender = useRealtimeRender({
    spaceId,
    enabled: isRealtimeRenderEnabled,
    roles: roomRoles,
    rooms: room ? [room] : [], // 当前只传入当前房间，后续可以扩展为多房间
  });
  const realtimeStatus = realtimeRender.status;
  const stopRealtimeRender = realtimeRender.stop;
  const lastRenderedMessageIdRef = useRef<number | null>(null);
  const hasRenderedHistoryRef = useRef<boolean>(false);
  const realtimeStatusRef = useRef(realtimeRender.status);
  const isRealtimeActiveRef = useRef(realtimeRender.isActive); // 用于同步检查 isActive
  const prevRoomIdRef = useRef<number | null>(null);
  // 跟踪最后一个背景消息的 ID，用于检测背景更新
  const lastBackgroundMessageIdRef = useRef<number | null>(null);
  // 跟踪消息内容的哈希值，用于检测消息更新/删除/移动
  const lastMessagesHashRef = useRef<string | null>(null);

  useEffect(() => {
    realtimeStatusRef.current = realtimeRender.status;
  }, [realtimeRender.status]);

  // 保持 isRealtimeActiveRef 与 isActive 同步
  useEffect(() => {
    isRealtimeActiveRef.current = realtimeRender.isActive;
  }, [realtimeRender.isActive]);

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

      // 使用批量渲染接口
      await realtimeRender.renderHistory(historyMessages, roomId);

      // 记录最后一条消息的ID
      const lastMessage = historyMessages[historyMessages.length - 1];
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
  }, [historyMessages, realtimeRender, roomId]);

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
    // 双重检查：检查用户意图 (isRealtimeRenderEnabled) 和实际状态 (isActive)
    // 这可以防止在状态转换期间意外触发渲染
    if (!isRealtimeRenderEnabled || !realtimeRender.isActive) {
      hasRenderedHistoryRef.current = false;
      lastRenderedMessageIdRef.current = null;
      isRenderingHistoryRef.current = false;
      lastMessagesHashRef.current = null;
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

    // 再次检查确保仍然处于活跃状态（避免异步执行期间状态变化）
    if (!isRealtimeActiveRef.current)
      return;

    // 渲染新消息（传入当前房间 ID）
    realtimeRender.renderMessage(latestMessage, roomId);
    lastRenderedMessageIdRef.current = messageId;
  }, [historyMessages, realtimeRender, roomId, isRealtimeRenderEnabled]);

  // 监听背景消息变化，当用户设置图片为背景时实时渲染更新
  useEffect(() => {
    // 双重检查：用户意图和实际状态
    if (!isRealtimeRenderEnabled || !realtimeRender.isActive || !hasRenderedHistoryRef.current) {
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

    // 再次检查确保仍然处于活跃状态
    if (!isRealtimeActiveRef.current)
      return;

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
  }, [historyMessages, realtimeRender, roomId, isRealtimeRenderEnabled]);

  // 监听消息更新/删除/移动，当检测到变化时重新渲染整个场景
  useEffect(() => {
    // 双重检查：用户意图和实际状态
    if (!isRealtimeRenderEnabled || !realtimeRender.isActive || !hasRenderedHistoryRef.current) {
      return;
    }

    if (!historyMessages || historyMessages.length === 0) {
      return;
    }

    // 如果正在渲染历史消息，跳过
    if (isRenderingHistoryRef.current) {
      return;
    }

    // 计算消息列表的特征哈希（包含 ID、内容、状态、位置）
    // 只取关键字段，避免因为无关字段变化触发重渲染
    const messagesHash = historyMessages.map((msg) => {
      const m = msg.message;
      return `${m.messageId}:${m.content}:${m.status}:${m.position}:${m.avatarId}`;
    }).join("|");

    // 首次设置哈希值
    if (lastMessagesHashRef.current === null) {
      lastMessagesHashRef.current = messagesHash;
      return;
    }

    // 如果哈希值没变，跳过
    if (lastMessagesHashRef.current === messagesHash) {
      return;
    }

    // 检测变化类型
    const oldHash = lastMessagesHashRef.current;
    const oldCount = oldHash.split("|").length;
    const newCount = messagesHash.split("|").length;

    // 更新哈希值
    lastMessagesHashRef.current = messagesHash;

    // 如果只是新增消息（数量增加且最后一条消息ID变了），由新消息监听器处理
    if (newCount > oldCount) {
      // 新增消息的情况，不需要重渲染，由上面的 useEffect 处理
      return;
    }

    // 再次检查确保仍然处于活跃状态
    if (!isRealtimeActiveRef.current)
      return;

    // 消息被更新、删除或移动，需要重新渲染整个场景
    console.warn("[RealtimeRender] 检测到消息更新/删除/移动，重新渲染场景");
    toast.loading("正在重新渲染场景...", { id: "webgal-rerender" });

    // 重置场景并重新渲染所有历史消息
    (async () => {
      try {
        // 异步执行前再次检查
        if (!isRealtimeActiveRef.current)
          return;

        await realtimeRender.resetScene(roomId);
        await realtimeRender.renderHistory(historyMessages, roomId);

        // 更新背景消息 ID（因为重渲染后需要同步）
        const backgroundMessages = historyMessages
          .filter(msg => msg.message.messageType === 2 && msg.message.extra?.imageMessage?.background);
        lastBackgroundMessageIdRef.current = backgroundMessages[backgroundMessages.length - 1]?.message.messageId ?? null;

        toast.success("场景重新渲染完成", { id: "webgal-rerender" });
      }
      catch (error) {
        console.error("[RealtimeRender] 重新渲染场景失败:", error);
        toast.error("重新渲染场景失败", { id: "webgal-rerender" });
      }
    })();
  }, [historyMessages, realtimeRender, roomId, isRealtimeRenderEnabled]);

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

  // 在 WebGAL 中跳转到指定消息
  const jumpToMessageInWebGAL = useCallback((messageId: number): boolean => {
    if (!realtimeRender.isActive) {
      return false;
    }
    return realtimeRender.jumpToMessage(messageId, roomId);
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
      jumpToMessageInWebGAL: realtimeRender.isActive ? jumpToMessageInWebGAL : undefined,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, useChatBubbleStyle, spaceId, chatHistory, scrollToGivenMessage, realtimeRender.isActive, jumpToMessageInWebGAL]);
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
  // 移除旧的输入状态即时 effect 和单独 idle 定时器（统一由 snapshot 驱动）

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
  const noInput = !(inputText.trim() || imgFiles.length > 0 || emojiUrls.length > 0); // 没有内容
  const disableSendMessage = noRole || notMember || noInput || isSubmitting;

  const handleMessageSubmit = async () => {
    if (disableSendMessage) {
      if (notMember)
        toast.error("您是观战，不能发送消息");
      else if (noRole)
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
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        const { width, height, size } = await getImageSize(imgFiles[i]);
        sendImg(imgDownLoadUrl, width, height, size);
      }
      updateImgFiles([]);
      for (let i = 0; i < emojiUrls.length; i++) {
        const { width, height, size } = await getImageSize(emojiUrls[i]);
        sendImg(emojiUrls[i], width, height, size);
      }
      updateEmojiUrls([]);

      // 发送文本消息
      if (inputText.trim() !== "") {
        const messageRequest: ChatMessageRequest = {
          roomId,
          roleId: curRoleId,
          content: inputText.trim(), // 直接使用 state
          avatarId: curAvatarId,
          messageType: 1,
          replayMessageId: replyMessage?.messageId || undefined,
          extra: {},
        };

        if (isCommand(inputText)) {
          // *** 使用 state 中的提及列表 ***
          commandExecutor({ command: inputTextWithoutMentions, mentionedRoles: mentionedRolesInInput, originMessage: inputText });
        }
        else {
          send(messageRequest);
        }
        setInputText(""); // 调用重构的 setInputText 来清空
      }
      setReplyMessage(undefined);
    }
    catch (e: any) {
      toast.error(e.message + e.stack, { duration: 3000 });
    }
    finally {
      setIsSubmitting(false);
    }
  };

  function sendImg(img: string, width: number, height: number, size: number) {
    // ... (sendImg logic as-is) ...
    const messageRequest: ChatMessageRequest = {
      content: "",
      roomId,
      roleId: curRoleId,
      avatarId: curAvatarId,
      messageType: 2,
      extra: { size, url: img, fileName: img.split("/").pop() || "error", width, height },
    };
    send(messageRequest);
  }

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
            <form className="bg-base-100 px-3 py-2 rounded-lg flex flex-col">
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
                    {(imgFiles.length > 0 || emojiUrls.length > 0) && (
                      <div className="flex flex-row gap-x-3 overflow-x-auto p-2 pb-1">
                        {imgFiles.map((file, index) => (
                          <BetterImg
                            src={file}
                            className="h-12 w-max rounded"
                            onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                            key={file.name}
                          />
                        ))}
                        {emojiUrls.map((url, index) => (
                          <BetterImg
                            src={url}
                            className="h-12 w-max rounded"
                            onClose={() => updateEmojiUrls(draft => void draft.splice(index, 1))}
                            key={url}
                          />
                        ))}
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

                  </div>
                  <AtMentionController
                    ref={atMentionRef}
                    chatInputRef={chatInputRef}
                    allRoles={roomRoles}
                  >
                  </AtMentionController>
                </div>
              </div>
            </form>
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
              autoJump={realtimeRender.autoJump}
              onAutoJumpChange={realtimeRender.setAutoJump}
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
