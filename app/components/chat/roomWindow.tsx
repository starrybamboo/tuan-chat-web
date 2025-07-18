import type { commandModeType } from "@/components/chat/commandPanel";
import type { RoomContextType } from "@/components/chat/roomContext";

import type { LLMProperty } from "@/components/settings/settingsPage";
import type { VirtuosoHandle } from "react-virtuoso";
import type {
  ChatMessagePageRequest,
  ChatMessageRequest,
  ChatMessageResponse,
  Message,
  RoomMember,
  UserRole,
} from "../../../api";
import type { ChatStatusEvent } from "../../../api/wsModels";
import ChatFrame from "@/components/chat/chatFrame";
import CommandPanel from "@/components/chat/commandPanel";
import { ExpressionChooser } from "@/components/chat/expressionChooser";
import RoleChooser from "@/components/chat/roleChooser";
import { RoomContext } from "@/components/chat/roomContext";
import InitiativeList from "@/components/chat/sideDrawer/initiativeList";
import RoomRoleList from "@/components/chat/sideDrawer/roomRoleList";
import RoomUserList from "@/components/chat/sideDrawer/roomUserList";
import RepliedMessage from "@/components/chat/smallComponents/repliedMessage";
import UserIdToName from "@/components/chat/smallComponents/userIdToName";
import { SpaceContext } from "@/components/chat/spaceContext";
import EmojiWindow from "@/components/chat/window/EmojiWindow";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import BetterImg from "@/components/common/betterImg";
import useCommandExecutor, { isCommand } from "@/components/common/commandExecutor";
import { getLocalStorageValue, useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { Mounter } from "@/components/common/mounter";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
  BaselineArrowBackIosNew,
  Bubble2,
  CommandLine,
  EmojiIconWhite,
  GalleryBroken,
  GirlIcon,
  HexagonDice,
  MemberIcon,
  SendIcon,
  Setting,
  SwordSwing,
  UserSyncOnlineInPerson,
} from "@/icons";
import { getImageSize } from "@/utils/getImgSize";
import { getScreenSize } from "@/utils/getScreenSize";
import { getEditorRange, getSelectionCoords } from "@/utils/getSelectionCoords";
import { UploadUtils } from "@/utils/UploadUtils";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useImmer } from "use-immer";
import {
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomRoleQuery,
  useGetSpaceInfoQuery,
} from "../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../api/instance";
import {
  useGetRoleAvatarsQuery,
  useGetUserRolesQuery,
} from "../../../api/queryHooks";

const PAGE_SIZE = 50; // 每页消息数量
export function RoomWindow({ roomId, spaceId }: { roomId: number; spaceId: number }) {
  const spaceContext = use(SpaceContext);

  const space = useGetSpaceInfoQuery(spaceId).data?.data;
  const room = useGetRoomInfoQuery(roomId).data?.data;

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const webSocketUtils = globalContext.websocketUtils;
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message }); // 发送群聊消息

  const textareaRef = useRef<HTMLDivElement>(null);
  // 在这里，由于采用了contentEditable的方法来实现输入框，本身并不具备数据的双向同步性，所以这里定义了两个set方法来控制inputText
  // 下面的set函数仅用于handleInputChange处，用于同步到state中；（如果使用第二个set函数，则会出现输入一个字符显示两个的bug）
  const [inputText, setInputTextWithoutUpdateTextArea] = useState("");
  // 将inputText同步到textarea中，只保留文本，并把<br>转换为换行符。
  const syncInputText = () => {
    const content = textareaRef.current?.innerHTML || "";
    const text = content
      .replace(/<br\s*\/?>/gi, "\n") // 转换所有<br>为换行符
      .replace(/&nbsp;/g, " ") // 转换&nbsp;为普通空格
      .replace(/<[^>]+(>|$)/g, ""); // 移除其他HTML标签但保留文本
    setInputTextWithoutUpdateTextArea(text);
  };
  // 如果想从外部控制输入框的内容，使用这个函数。
  const setInputText = (text: string) => {
    setInputTextWithoutUpdateTextArea(text);
    if (textareaRef.current) {
      textareaRef.current.innerHTML = text;
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(textareaRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const [curAvatarIndex, setCurAvatarIndex] = useState(0);
  const uploadUtils = new UploadUtils(2);

  // 聊天框中包含的图片
  const [imgFiles, updateImgFiles] = useImmer<File[]>([]);
  // 引用的聊天记录id
  const [replyMessage, setReplyMessage] = useState<Message | undefined>(undefined);
  useEffect(() => {
    setReplyMessage(undefined);
  }, [roomId]);

  // 获取用户的所有角色
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  // 获取当前群聊中的所有角色
  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  const roomRolesThatUserOwn = useMemo(() => {
    return roomRoles.filter(role => userRoles.some(userRole => userRole.roleId === role.roleId));
  }, [roomRoles, userRoles]);
  const [curRoleId, setCurRoleId] = useState(roomRolesThatUserOwn[0]?.roleId ?? -1);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1);
  // 获取当前用户选择角色的所有头像(表情差分)
  const roleAvatarQuery = useGetRoleAvatarsQuery(curRoleId ?? -1);
  const roleAvatars = useMemo(() => roleAvatarQuery.data?.data ?? [], [roleAvatarQuery.data?.data]);
  const curAvatarId = roleAvatars[curAvatarIndex]?.avatarId || -1;

  const [commandBrowseWindow, setCommandBrowseWindow] = useSearchParamsState<commandModeType>("commandPop", "none");
  const [isSettingWindowOpen, setIsSettingWindowOpen] = useSearchParamsState<boolean>("roomSettingPop", false);

  const [sideDrawerState, setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "initiative">("rightSideDrawer", "none");

  const [useChatBubbleStyle, setUseChatBubbleStyle] = useLocalStorage("useChatBubbleStyle", true);

  // 获取当前群聊的成员列表
  const membersQuery = useGetMemberListQuery(roomId);
  const members: RoomMember[] = useMemo(() => {
    return membersQuery.data?.data ?? [];
  }, [membersQuery.data?.data]);
  // 全局登录用户对应的member
  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);

  /**
   * 获取历史消息
   * 分页获取消息
   * cursor用于获取当前的消息列表, 在往后端的请求中, 第一次发送null, 然后接受后端返回的cursor作为新的值
   */
  // 你说的对，我什么要这里定义一个莫名奇妙的ref呢？因为该死的virtuoso不知道为什么，里面的函数指针会会指向一个旧的fetchNextPage，并不能随着重新渲染而更新。导致里面的cursor也是旧的。
  // 定义这个ref只是为了绕开virtuoso这个问题的hack。
  const cursorRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    cursorRef.current = undefined;
  }, [spaceId]);
  const messagesInfiniteQuery = useInfiniteQuery({
    queryKey: ["getMsgPage", roomId],
    queryFn: async ({ pageParam }) => {
      const result = await tuanchat.chatController.getMsgPage(pageParam);
      cursorRef.current = result.data?.cursor;
      return result;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data === undefined || lastPage.data?.isLast) {
        return undefined;
      }
      else {
        const params: ChatMessagePageRequest = { roomId, pageSize: PAGE_SIZE, cursor: cursorRef.current };
        return params;
      }
    },
    initialPageParam: { roomId, pageSize: PAGE_SIZE, cursor: undefined } as unknown as ChatMessagePageRequest,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const receivedMessages = useMemo(() => webSocketUtils.receivedMessages[roomId] ?? [], [roomId, webSocketUtils.receivedMessages]);
  // 合并所有分页消息 同时更新重复的消息
  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    const historyMessages = (messagesInfiniteQuery.data?.pages.reverse().flatMap(p => p.data?.list ?? []) ?? []);
    const messageMap = new Map<number, ChatMessageResponse>();
    // 这是为了更新历史消息(ws发过来的消息有可能是带有相同的messageId的, 代表消息的更新)
    historyMessages.forEach(msg => messageMap.set(msg.message.messageID, msg));
    receivedMessages.forEach(msg => messageMap.set(msg.message.messageID, msg));
    return Array.from(messageMap.values())
      .sort((a, b) => a.message.position - b.message.position)
    // 过滤掉删除的消息和不符合规则的消息
      .filter(msg => msg.message.status !== 1);
    // .reverse();
  }, [receivedMessages, messagesInfiniteQuery.data?.pages]);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollToGivenMessage = useCallback((messageId: number) => {
    const messageIndex = historyMessages.findIndex(m => m.message.messageID === messageId);
    if (messageIndex >= 0) {
      virtuosoRef.current?.scrollToIndex(messageIndex);
    }
  }, [historyMessages]);

  const roomContext: RoomContextType = useMemo((): RoomContextType => {
    return {
      roomId,
      roomMembers: members,
      curMember,
      roomRolesThatUserOwn,
      curRoleId,
      curAvatarId: roleAvatars[curAvatarIndex]?.avatarId ?? -1,
      useChatBubbleStyle,
      spaceId,
      setReplyMessage,
      historyMessages,
      messagesInfiniteQuery,
      scrollToGivenMessage,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, roleAvatars, curAvatarIndex, useChatBubbleStyle, spaceId, historyMessages, messagesInfiniteQuery, scrollToGivenMessage]);
  /**
   * 当群聊角色列表更新时, 自动设置为第一个角色
   */
  useEffect(() => {
    setCurRoleId(roomRolesThatUserOwn[0]?.roleId ?? -1);
  }, [roomRolesThatUserOwn]);
  /**
   * 输入状态部分
   */
  const roomChatStatues = webSocketUtils.chatStatus[roomId] ?? [];
  const myStatue = roomChatStatues.find(s => s.userId === userId)?.status ?? "idle";
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 当输入框内容发生变动的时候，将自身的状态改变为输入状态
  useEffect(() => {
    if (!userId)
      return;

    const chatStatusEvent: ChatStatusEvent = {
      roomId,
      status: "input",
      userId,
    };

    // 清除计时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // 10秒后，将自身状态改变为静止状态
    typingTimeoutRef.current = setTimeout(() => {
      webSocketUtils.updateChatStatus({ ...chatStatusEvent, status: "idle" } as ChatStatusEvent);
      webSocketUtils.send({ type: 4, data: { ...chatStatusEvent, status: "idle" } as ChatStatusEvent });
    }, 10000);
    // 如果已经是在输入状态或者在等待中，不改变状态
    if (myStatue === "input" || myStatue === "wait" || !userId || roomId <= 0 || inputText.length === 0)
      return;
    webSocketUtils.updateChatStatus(chatStatusEvent);
    webSocketUtils.send({ type: 4, data: chatStatusEvent });
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputText]);
  //

  /**
   * 输入框相关
   */

  /**
   * 在当前光标位置插入节点
   * @param node 要插入的DOM节点或字符串
   * @param options 配置项：
   *   - replaceSelection: 是否替换当前选区内容（默认false）
   *   - moveCursorToEnd: 插入后是否将光标移动到节点末尾（默认false）
   * @returns 是否插入成功
   */
  const insertNodeAtCursor = (
    node: Node | string,
    options?: {
      replaceSelection?: boolean;
      moveCursorToEnd?: boolean;
    },
  ): boolean => {
    const { replaceSelection = false, moveCursorToEnd = false } = options || {};
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0)
      return false;
    const range = selection.getRangeAt(0);
    // 替换选区内容
    if (replaceSelection) {
      range.deleteContents();
    }

    // 插入节点
    const insertedNode = typeof node === "string"
      ? document.createTextNode(node)
      : node;
    range.insertNode(insertedNode);

    // 移动光标到节点末尾
    if (moveCursorToEnd) {
      const newRange = document.createRange();
      newRange.selectNodeContents(insertedNode);
      newRange.collapse(false); // false表示移动到末尾
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    return true;
  };
  /**
   * 获取光标前后文本
   * @returns { before: string; after: string } 光标前后的文本
   */
  const getTextAroundCursor = (): { before: string; after: string } => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0)
      return { before: "", after: "" };

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // 只处理文本节点
    if (node.nodeType !== Node.TEXT_NODE)
      return { before: "", after: "" };

    const text = node.textContent || "";
    return {
      before: text.substring(0, range.startOffset),
      after: text.substring(range.startOffset),
    };
  };

  /**
   * At 功能
   */
  const [showAtDialog, setShowAtDialog] = useState(false); // 是否显示@弹窗
  const [atDialogPosition, setAtDialogPosition] = useState({ x: 0, y: 0 }); // @弹窗的位置，基于屏幕坐标
  const [atSearchKey, setAtSearchKey] = useState(""); // @弹窗的搜索关键词
  // 通过上下键来控制选中项
  const [atSelectIndex, setAtSelectIndex] = useState(0);
  // 显示atDialog的时候，初始化index
  useEffect(() => {
    setAtSelectIndex(0);
  }, [showAtDialog]);
  const searchedRoles = showAtDialog ? roomRoles.filter(r => (r.roleName ?? "").includes(atSearchKey)) : [];
  // 检测@提示框的位置
  useEffect(() => {
    if (showAtDialog) {
      const { x: cursorX, y: cursorY } = getSelectionCoords();
      setAtDialogPosition({ x: Math.min(cursorX, screen.width - 100), y: cursorY });
    }
  }, [showAtDialog, atSearchKey]);
  const checkIsShowSelectDialog = () => {
    const rangeInfo = getEditorRange();
    if (!rangeInfo || !rangeInfo.range || !rangeInfo.selection)
      return;
    const curNode = rangeInfo.range.endContainer;

    // 如果没有@符号，关闭对话框
    if (!curNode.textContent?.includes("@")) {
      setShowAtDialog(false);
      setAtSearchKey("");
      return;
    }
    // 处理文本结尾是@人员Button并且没有任何字符的情况
    // 如果光标超出编辑器，则选中最后一个子元素
    if (curNode.nodeName === "DIV") {
      const { childNodes } = curNode;
      const childNodesToArray = [].slice.call(childNodes);
      const notEmptyNodes = childNodesToArray.filter(
        (item: Node) => !(item.nodeName === "#text" && item.textContent === ""),
      );
      if (notEmptyNodes.length > 0) {
        const lastChildNode: Node = notEmptyNodes[notEmptyNodes.length - 1];
        if (lastChildNode && lastChildNode?.nodeName === "BUTTON") {
          document.execCommand("insertHTML", false, "\n");
        }
      }
    }
    if (!curNode || !curNode.textContent || curNode.nodeName !== "#text")
      return;
    const searchStr = curNode.textContent.slice(0, rangeInfo.selection.focusOffset);
    const keywords = /@([^@]*)$/.exec(searchStr);
    if (keywords) {
      const keyWord = keywords[1];
      // 搜索关键字不超过20个字符
      if (keyWord && keyWord.length > 20) {
        setShowAtDialog(false);
        setAtSearchKey("");
        return;
      }
      setAtSearchKey(keyWord);
    }
  };
  /**
   * ai自动补全
   */
  const [LLMMessage, setLLMMessage] = useState("");
  const isAutoCompletingRef = useRef(false);
  const autoComplete = async () => {
    const llmSettings = getLocalStorageValue<LLMProperty>("llmSettings", {});
    const apiKey = llmSettings.openaiApiKey;
    const apiUrl = llmSettings.openaiApiBaseUrl ?? "";
    const model = llmSettings.openaiModelName;
    if (!inputText.trim() || isAutoCompletingRef.current)
      return;
    isAutoCompletingRef.current = true;
    setLLMMessage(""); // 清空之前的消息
    const { before: beforeMessage, after: afterMessage } = getTextAroundCursor();
    const prompt = beforeMessage === ""
      ? `请根据以下文本内容，提供一段自然连贯的续写或灵感提示。重点关注上下文的逻辑和主题发展。只提供续写内容，不要额外解释。文本内容：${inputText}`
      : `请根据以下文本内容，插入一段自然连贯的文本的或灵感提示。重点关注上下文的逻辑和主题发展。只提插入的内容，不要额外解释。插入点前的文本：${beforeMessage},插入点后的文本${afterMessage}`;
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: "user",
            content: prompt,
          }],
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });
      if (!response.ok || !response.body) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullMessage = "";
      while (true) {
        if (!isAutoCompletingRef.current) {
          reader.cancel();
          setLLMMessage("");
          break;
        }
        const { done, value } = await reader.read();
        if (done)
          break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data:") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.substring(5));
              if (data.choices?.[0]?.delta?.content) {
                fullMessage += data.choices[0].delta.content;
                setLLMMessage(fullMessage); // 更新显示的内容
              }
            }
            catch (e) {
              console.error("解析流数据失败:", e);
            }
          }
        }
      }
    }
    catch (error) {
      console.error("API请求错误:", error);
      setLLMMessage("自动补全请求失败，请重试");
    }
    finally {
      isAutoCompletingRef.current = false;
    }
  };
  useEffect(() => {
    // 创建提示文本节点
    const hintNode = document.createElement("span");
    hintNode.textContent = LLMMessage;
    hintNode.className = "opacity-60";
    hintNode.contentEditable = "false";
    hintNode.style.pointerEvents = "none"; // 防止干扰用户输入
    insertNodeAtCursor(hintNode);
    // 开始输入时移除自动补全的文本
    const handleInput = () => {
      if (hintNode.parentNode) {
        hintNode.parentNode.removeChild(hintNode);
      }
      textareaRef.current?.removeEventListener("input", handleInput);
      isAutoCompletingRef.current = false;
    };
    textareaRef.current?.addEventListener("input", handleInput);
    return () => {
      if (hintNode.parentNode) {
        hintNode.parentNode.removeChild(hintNode);
      }
      textareaRef.current?.removeEventListener("input", handleInput);
    };
  }, [LLMMessage]);

  const insertLLMMessageIntoText = () => {
    insertNodeAtCursor(LLMMessage, { moveCursorToEnd: true });
    syncInputText();
    setLLMMessage(""); // 清空补全提示
  };

  /**
   *处理与组件的各种交互
   */

  const handleSelectCommand = (cmdName: string) => {
    // 保持命令前缀格式（保留原输入的 . 或 。）
    const prefixChar = inputText[0];
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const disableSendMessage = (curRoleId <= 0) // 没有选中角色
    || ((members.find(member => member.userId === userId)?.memberType ?? 3) >= 3) // 没有权限
    || (!(inputText.trim() || imgFiles.length) || isSubmitting); // 没有内容
  const handleMessageSubmit = async () => {
    if (disableSendMessage)
      return;
    setIsSubmitting(true);
    if (!inputText.trim() && !imgFiles.length) {
      return;
    }
    if (imgFiles.length > 0) {
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        // 获取到图片的宽高
        const { width, height } = await getImageSize(imgFiles[i]);
        // 如果有图片，发送独立的图片消息
        if (imgDownLoadUrl && imgDownLoadUrl !== "") {
          const messageRequest: ChatMessageRequest = {
            content: "",
            roomId,
            roleId: curRoleId,
            avatarId: curAvatarId,
            messageType: 2,
            extra: {
              size: 0,
              url: imgDownLoadUrl,
              fileName: imgDownLoadUrl.split("/").pop() || `${roomId}-${Date.now()}`,
              width,
              height,
            },
          };
          send(messageRequest);
        }
      }
    }
    updateImgFiles([]);
    // 发送文本消息
    if (inputText.trim() !== "") {
      const messageRequest: ChatMessageRequest = {
        roomId,
        roleId: curRoleId,
        content: inputText.trim(),
        avatarId: roleAvatars[curAvatarIndex].avatarId || -1,
        messageType: 1,
        replayMessageId: replyMessage?.messageID || undefined,
        extra: {},
      };
      // 如果是命令，额外发送一条消息给骰娘
      if (isCommand(inputText)) {
        const commandResult = commandExecutor(inputText);
        messageRequest.extra = {
          result: commandResult,
        };
        tuanchat.chatController.sendMessageAiResponse(messageRequest);
      }
      else {
        send(messageRequest);
      }
      setInputText("");
    }
    setReplyMessage(undefined);
    setIsSubmitting(false);
  };

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    // 获取剪贴板中的图片
    const items = e.clipboardData?.items;
    if (!items)
      return;
    // 如果是图片则放到imgFile中;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob)
          continue;
        const file = new File([blob], `pasted-image-${Date.now()}`, {
          type: blob.type,
        });
        updateImgFiles((draft) => {
          draft.push(file);
        });
      }
    }
  }

  const handleAvatarChange = (avatarIndex: number) => {
    setCurAvatarIndex(avatarIndex);
  };

  const isComposingRef = useRef(false);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAtDialog) {
      switch (e.key) {
        case "Enter": {
          e.preventDefault();
          handleSelectAt(searchedRoles[atSelectIndex]);
          break;
        }
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAtSelectIndex(Math.max(atSelectIndex - 1, 0));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAtSelectIndex(Math.min(atSelectIndex + 1, searchedRoles.length - 1));
      }
    }
    else {
      if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleMessageSubmit();
      }
      else if (e.altKey && e.key === "p") {
        autoComplete();
      }
      else if (e.key === "Tab") {
        e.preventDefault();
        insertLLMMessageIntoText();
        isAutoCompletingRef.current = false;
      }
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent) => {
    // 如果这个检验放到keyDown事件中，会与输入法冲突
    if (e.key === "@") {
      setShowAtDialog(true);
      setAtSearchKey(inputText);
    }
    checkIsShowSelectDialog();
    // 去除Crtl+b/Ctrl+i/Ctrl+u等快捷键
    // e.metaKey for mac
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b": // ctrl+B or ctrl+b
        case "i":
        case "u": {
          e.preventDefault();
          break;
        }
      }
    }
  };

  function handleMouseDown(e: React.MouseEvent) {
    // 在@选人的时候，防止失焦。
    if (showAtDialog) {
      e.preventDefault();
    }
  }

  const handleRoleChange = (roleId: number) => {
    setCurRoleId(roleId);
    setCurAvatarIndex(0);
  };

  /**
   * 处理@选人
   * @param role 要@的对象
   */
  function handleSelectAt(role: UserRole) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0)
      return;
    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    // 确保处理的是文本节点
    if (textNode.nodeType !== Node.TEXT_NODE)
      return;
    const text = textNode.textContent || "";
    const offset = range.startOffset;

    // 查找最后一个@符号
    const atIndex = Math.max(text.lastIndexOf("@", offset - 1), 0);
    // 替换文本为一个不可编辑的span，这样删除的时候可以整体的删除
    const beforeText = text.substring(0, atIndex);
    const afterText = text.substring(offset);
    const parent = textNode.parentNode;
    if (!parent)
      return;
    const span = document.createElement("span");
    span.textContent = `@${role.roleName}`;
    span.className = "inline text-blue-500 bg-transparent px-0 py-0 border-none";
    span.contentEditable = "false";
    span.style.display = "inline-block";
    span.addEventListener("click", () => {});

    // 替换内容
    const newTextNode = document.createTextNode(afterText);
    textNode.textContent = beforeText;
    parent.insertBefore(span, textNode.nextSibling);
    parent.insertBefore(newTextNode, span.nextSibling);

    // 设置光标在新文本节点开头
    const newRange = document.createRange();
    newRange.setStart(newTextNode, 0);
    newRange.collapse(true);

    sel.removeAllRanges();
    sel.addRange(newRange);

    setShowAtDialog(false);
    // 这里需要把div中的文本更新到textarea中
    if (textareaRef.current) {
      syncInputText();
    }
  }

  return (
    <RoomContext value={roomContext}>
      <div className="flex flex-col h-full w-full shadow-sm min-h-0">
        {/* 上边的信息栏 */}
        <div className="flex justify-between py-2 px-5 bg-base-100">
          <div className="flex gap-2">
            {getScreenSize() === "sm"
              && <BaselineArrowBackIosNew className="size-7" onClick={spaceContext.toggleLeftDrawer}></BaselineArrowBackIosNew>}
            <span className="text-center font-semibold text-lg line-clamp-1">{room?.name}</span>
          </div>
          <div className="line-clamp-1 flex-shrink-0">
            {
              roomChatStatues
                .filter(status => status.status === "input" && status.userId !== userId)
                .map((status, index) => (
                  <span key={status.userId}>
                    <UserIdToName userId={status.userId} className="text-info"></UserIdToName>
                    {index === roomChatStatues.length - 1 ? " 正在输入..." : ", "}
                  </span>
                ))
            }
          </div>
          <div className="flex gap-2">
            <div
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="展示先攻表"
              onClick={() => setSideDrawerState(sideDrawerState === "initiative" ? "none" : "initiative")}
            >
              <SwordSwing className="size-7"></SwordSwing>
            </div>
            <div
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="展示成员"
              onClick={() => setSideDrawerState(sideDrawerState === "user" ? "none" : "user")}
            >
              <MemberIcon className="size-7"></MemberIcon>
            </div>
            <div
              className="tooltip tooltip-bottom hover:text-info"
              data-tip="展示角色"
              onClick={() => setSideDrawerState(sideDrawerState === "role" ? "none" : "role")}
            >
              <GirlIcon className="size-7"></GirlIcon>
            </div>
            {spaceContext.isSpaceOwner && (
              <Setting
                className="size-7 cursor-pointer hover:text-info"
                onClick={() => setIsSettingWindowOpen(true)}
              >
              </Setting>
            )}
          </div>
        </div>
        <div className="h-px bg-base-300"></div>
        <div className="flex-1 w-full flex bg-base-100 overflow-y-auto overflow-x-hidden relative">
          <div className="flex flex-col flex-1 h-full overflow-y-auto overflow-x-hidden">
            {/* 聊天框 */}
            <div className="bg-base-100 h-[70%] flex-shrink-0">
              <ChatFrame useChatBubbleStyle={useChatBubbleStyle} key={roomId} virtuosoRef={virtuosoRef}></ChatFrame>
            </div>
            {/* 输入区域 */}
            <div className="h-px bg-base-300"></div>
            <form className="bg-base-100 p-4 rounded-lg flex flex-col flex-1 ">
              <div className="flex gap-2 flex-1 ">
                {/* 顶部工具栏 */}
                <div className="dropdown dropdown-top flex-shrink-0">
                  <div role="button" tabIndex={0} className="">
                    <div
                      className="tooltip flex justify-center flex-col items-center space-y-2"
                      data-tip="切换表情差分"
                    >
                      <RoleAvatarComponent
                        avatarId={roleAvatars[curAvatarIndex]?.avatarId || -1}
                        width={getScreenSize() === "sm" ? 16 : 24}
                        isRounded={true}
                        withTitle={false}
                        stopPopWindow={true}
                        alt="无可用头像"
                      />
                      <div className="text-sm whitespace-nowrap">
                        {userRoles.find(r => r.roleId === curRoleId)?.roleName || ""}
                      </div>
                    </div>
                  </div>
                  {/* 表情差分展示与选择 */}
                  <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 shadow-sm">
                    <ExpressionChooser
                      roleId={curRoleId}
                      handleExpressionChange={avatarId => handleAvatarChange(roleAvatars.findIndex(a => a.avatarId === avatarId))}
                    >
                    </ExpressionChooser>
                  </ul>
                </div>
                <div className="relative flex-1 flex flex-col min-w-0">
                  <CommandPanel
                    prefix={inputText}
                    handleSelectCommand={handleSelectCommand}
                    commandMode={
                      inputText.startsWith("%")
                        ? "webgal"
                        : (inputText.startsWith(".") || inputText.startsWith("。"))
                            ? "dice"
                            : "none"
                    }
                    className="absolute bottom-full w-[80%] mb-2 bg-base-200 rounded-box shadow-md overflow-hidden z-10 w-full"
                  />
                  <div className="flex pl-3 pr-6 justify-between ">
                    <div className="flex gap-2">
                      {/* 切换角色 */}
                      <div className="dropdown dropdown-top">
                        <div className="tooltip" data-tip="切换角色">
                          <UserSyncOnlineInPerson className="size-7 hover:text-info" tabIndex={1} role="button"></UserSyncOnlineInPerson>
                        </div>
                        <ul
                          tabIndex={1}
                          className="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm overflow-y-auto"
                        >
                          <RoleChooser handleRoleChange={role => handleRoleChange(role.roleId)}></RoleChooser>
                        </ul>
                      </div>
                      {/* 发送表情 */}
                      <div className="dropdown dropdown-top">
                        <div role="button" tabIndex={2} className="">
                          <div
                            className="tooltip"
                            data-tip="发送表情"
                          >
                            <EmojiIconWhite className="size-7 jump_icon"></EmojiIconWhite>
                          </div>
                        </div>
                        <ul
                          tabIndex={2}
                          className="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm overflow-y-auto"
                        >
                          <EmojiWindow onChoose={() => {
                          }}
                          >
                          </EmojiWindow>
                        </ul>
                      </div>
                      {/* 发送图片 */}
                      <ImgUploader setImg={newImg => updateImgFiles((draft) => {
                        draft.push(newImg);
                      })}
                      >
                        <div className="tooltip" data-tip="发送图片">
                          <GalleryBroken className="size-7 cursor-pointer jump_icon"></GalleryBroken>
                        </div>
                      </ImgUploader>
                      <div className="tooltip" data-tip="浏览所有骰子命令">
                        <HexagonDice
                          className="size-7 cursor-pointer jump_icon"
                          onClick={() => setCommandBrowseWindow("dice")}
                        >
                        </HexagonDice>
                      </div>
                      <div className="tooltip" data-tip="浏览常用webgal命令">
                        <CommandLine
                          className="size-7 cursor-pointer jump_icon"
                          onClick={() => setCommandBrowseWindow("webgal")}
                        >
                        </CommandLine>
                      </div>
                    </div>
                    <div className="tooltip " data-tip="切换聊天气泡风格">
                      <Bubble2
                        className="size-7 font-light jump_icon"
                        onClick={() => setUseChatBubbleStyle(!useChatBubbleStyle)}
                      >
                      </Bubble2>
                    </div>
                  </div>
                  {/* 预览要发送的图片 */}
                  {imgFiles.length > 0 && (
                    <div className="flex flex-row gap-x-3 overflow-x-auto pb-2">
                      {imgFiles.map((file, index) => (
                        <BetterImg
                          src={file}
                          className="h-14 w-max rounded"
                          onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                          key={file.name}
                        />
                      ))}
                    </div>
                  )}
                  {/* 引用的消息 */}
                  {
                    replyMessage && (
                      <RepliedMessage
                        replyMessage={replyMessage}
                        className="flex flex-row gap-2 items-center bg-base-200 p-1 rounded-box shadow-sm text-sm ml-2"
                      />
                    )
                  }
                  {/* 输入框 */}
                  <div
                    className="textarea chatInputTextarea w-full flex-1 overflow-auto
                     min-h-[80px] resize-none border-none focus:outline-none focus:ring-0 div-textarea"
                    ref={textareaRef}
                    onInput={syncInputText}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onMouseDown={handleMouseDown}
                    onCompositionStart={() => isComposingRef.current = true}
                    onCompositionEnd={() => isComposingRef.current = false}
                    onPaste={async e => handlePaste(e)}
                    suppressContentEditableWarning={true}
                    contentEditable={true}
                    data-placeholder={(curRoleId <= 0
                      ? "请先在群聊里拉入你的角色，之后才能发送消息。"
                      : (curAvatarId <= 0 ? "请给你的角色添加至少一个表情差分（头像）。" : "在此输入消息...(shift+enter 换行)"))}
                  >
                  </div>
                  {/* at搜索框 */}
                  {showAtDialog && atDialogPosition.x > 0 && searchedRoles.length > 0 && (
                  // 这里的坐标是全局的坐标，所以mount到根元素
                    <Mounter targetId="modal-root">
                      <div
                        className="absolute flex flex-col card shadow-md bg-base-100 p-2 gap-2  max-h-[30vh] overflow-auto"
                        style={{
                          top: atDialogPosition.y - 5,
                          left: atDialogPosition.x,
                          transform: "translateY(-100%)",
                        }}
                      >
                        {
                          searchedRoles.map((role, index) => (
                            <div
                              className={`flex flex-row items-center gap-2 hover:bg-base-300 rounded pt-1 pb-1 ${index === atSelectIndex ? "bg-base-300" : ""}`}
                              key={role.roleId}
                              onClick={() => { handleSelectAt(role); }}
                              onMouseDown={e => e.preventDefault()}
                            >
                              <RoleAvatarComponent
                                avatarId={role.avatarId ?? -1}
                                width={8}
                                isRounded={true}
                                stopPopWindow={true}
                              >
                              </RoleAvatarComponent>
                              {role.roleName}
                            </div>
                          ))
                        }
                      </div>
                    </Mounter>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                    </div>

                    <div className="flex gap-2">

                      {/* send button */}
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={disableSendMessage}
                        onClick={handleMessageSubmit}
                      >
                        <SendIcon className="size-6"></SendIcon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <OpenAbleDrawer isOpen={sideDrawerState === "user"} className="h-full bg-base-100 overflow-auto">
            <div className="w-px bg-base-300"></div>
            <RoomUserList></RoomUserList>
          </OpenAbleDrawer>
          <OpenAbleDrawer isOpen={sideDrawerState === "role"} className="h-full bg-base-100 overflow-auto">
            <div className="w-px bg-base-300"></div>
            <RoomRoleList></RoomRoleList>
          </OpenAbleDrawer>
          <OpenAbleDrawer isOpen={sideDrawerState === "initiative"} className="max-h-full overflow-auto">
            <div className="w-px bg-base-300"></div>
            <InitiativeList></InitiativeList>
          </OpenAbleDrawer>
        </div>
      </div>
      <PopWindow isOpen={commandBrowseWindow === "dice"} onClose={() => setCommandBrowseWindow("none")}>
        <span className="text-center text-lg font-semibold">浏览所有骰子命令</span>
        <CommandPanel
          prefix="."
          handleSelectCommand={(cmdName) => {
            setInputText(`.${cmdName}`);
            setCommandBrowseWindow("none");
          }}
          commandMode="dice"
          suggestionNumber={10000}
          className="overflow-x-clip max-h-[80vh] overflow-y-auto"
        >
        </CommandPanel>
      </PopWindow>
      <PopWindow isOpen={commandBrowseWindow === "webgal"} onClose={() => setCommandBrowseWindow("none")}>
        <span className="text-center text-lg font-semibold">浏览常见webgal命令</span>
        <CommandPanel
          prefix="%"
          handleSelectCommand={(cmdName) => {
            setInputText(`%${cmdName}`);
            setCommandBrowseWindow("none");
          }}
          commandMode="webgal"
          suggestionNumber={10000}
          className="overflow-x-clip max-h-[80vh] overflow-y-auto"
        >
        </CommandPanel>
      </PopWindow>
      {/* 设置窗口 */}
      <PopWindow isOpen={isSettingWindowOpen} onClose={() => setIsSettingWindowOpen(false)}>
        <RoomSettingWindow onClose={() => setIsSettingWindowOpen(false)}></RoomSettingWindow>
      </PopWindow>
    </RoomContext>
  );
}

export default RoomWindow;
