import type { ChatInputAreaHandle } from "@/components/chat/chatInputArea";
import type { RoomContextType } from "@/components/chat/roomContext";

import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, Message, RoomMember, UserRole } from "../../../api";
import type { ChatStatusEvent } from "../../../api/wsModels";
import AvatarSwitch from "@/components/chat/avatarSwitch";
import ChatFrame from "@/components/chat/chatFrame";
import ChatInputArea from "@/components/chat/chatInputArea";
import ChatToolbar from "@/components/chat/chatToolbar";
import CommandPanel from "@/components/chat/commandPanel";
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
import ItemWindow from "@/components/chat/window/itemWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import BetterImg from "@/components/common/betterImg";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor, { isCommand } from "@/components/common/dicer/cmdPre";
import { Mounter } from "@/components/common/mounter";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
  BaselineArrowBackIosNew,
  Setting,
} from "@/icons";
import { getImageSize } from "@/utils/getImgSize";
import { getScreenSize } from "@/utils/getScreenSize";
import { getEditorRange, getSelectionCoords } from "@/utils/getSelectionCoords";
import { UploadUtils } from "@/utils/UploadUtils";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
// *** 导入新组件及其 Handle 类型 ***

import { useImmer } from "use-immer";
import {
  useAddRoomRoleMutation,
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomRoleQuery,
  useGetSpaceInfoQuery,
} from "../../../api/hooks/chatQueryHooks";
import { useGetRoleAvatarsQuery, useGetUserRolesQuery } from "../../../api/queryHooks";
import ItemDetail from "./itemsDetail";

// const PAGE_SIZE = 50; // 每页消息数量
export function RoomWindow({ roomId, spaceId }: { roomId: number; spaceId: number }) {
  const spaceContext = use(SpaceContext);

  const space = useGetSpaceInfoQuery(spaceId).data?.data;
  const room = useGetRoomInfoQuery(roomId).data?.data;

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const webSocketUtils = globalContext.websocketUtils;
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message }); // 发送群聊消息

  // *** 创建指向 ChatInputArea 句柄的 ref ***
  const chatInputRef = useRef<ChatInputAreaHandle>(null);

  // 纯文本状态，由 ChatInputArea 通过 onInputSync 回调更新
  const [inputText, setInputTextWithoutUpdateTextArea] = useState("");
  // 提及列表状态，同样由 ChatInputArea 回调更新
  const [mentionedRolesInInput, setMentionedRolesInInput] = useState<UserRole[]>([]);

  // *** ChatInputArea 的回调处理器 ***
  const handleInputAreaChange = useCallback((plainText: string, roles: UserRole[]) => {
    setInputTextWithoutUpdateTextArea(plainText);
    setMentionedRolesInInput(roles);
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
  // 获取当前用户选择角色的所有头像(表情差分)
  const roleAvatarQuery = useGetRoleAvatarsQuery(curRoleId ?? -1);
  const roleAvatars = useMemo(() => roleAvatarQuery.data?.data ?? [], [roleAvatarQuery.data?.data]);
  const [curAvatarId, setCurAvatarId] = useState(0);

  const [isSettingWindowOpen, setIsSettingWindowOpen] = useSearchParamsState<boolean>("roomSettingPop", false);
  // 渲染对话
  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);

  const [isItemsWindowOpen, setIsItemsWindowOpen] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<number>(-1);

  const [sideDrawerState, setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

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

  const roomContext: RoomContextType = useMemo((): RoomContextType => {
    return {
      roomId,
      roomMembers: members,
      curMember,
      roomRolesThatUserOwn,
      curRoleId,
      curAvatarId: roleAvatars[curAvatarId]?.avatarId ?? -1,
      useChatBubbleStyle,
      spaceId,
      setReplyMessage,
      chatHistory,
      scrollToGivenMessage,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, roleAvatars, curAvatarId, useChatBubbleStyle, spaceId, chatHistory, scrollToGivenMessage]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  useEffect(() => {
    setCurRoleId(roomRolesThatUserOwn[0]?.roleId ?? -1);
  }, [roomRolesThatUserOwn]);

  // (输入状态 websocket 逻辑... 保持不变)
  const roomChatStatues = webSocketUtils.chatStatus[roomId] ?? [];
  const myStatue = roomChatStatues.find(s => s.userId === userId)?.status ?? "idle";
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!userId || roomId <= 0)
      return;
    const chatStatusEvent: ChatStatusEvent = { roomId, status: "input", userId };
    if (typingTimeoutRef.current)
      clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      webSocketUtils.updateChatStatus({ ...chatStatusEvent, status: "idle" } as ChatStatusEvent);
      webSocketUtils.send({ type: 4, data: { ...chatStatusEvent, status: "idle" } as ChatStatusEvent });
    }, 10000);
    if (myStatue === "input" || myStatue === "wait" || !userId || roomId <= 0 || inputText.length === 0)
      return;
    webSocketUtils.updateChatStatus(chatStatusEvent);
    webSocketUtils.send({ type: 4, data: chatStatusEvent });
    return () => {
      if (typingTimeoutRef.current)
        clearTimeout(typingTimeoutRef.current);
    };
  }, [inputText]);

  /**
   * At 功能
   */
  const [showAtDialog, setShowAtDialog] = useState(false);
  const [atDialogPosition, setAtDialogPosition] = useState({ x: 0, y: 0 });
  const [atSearchKey, setAtSearchKey] = useState("");
  const [atSelectIndex, setAtSelectIndex] = useState(0);
  const searchedRoles = showAtDialog ? roomRoles.filter(r => (r.roleName ?? "").includes(atSearchKey)) : [];
  useEffect(() => {
    setAtSelectIndex(0);
  }, [showAtDialog]);
  useEffect(() => {
    if (showAtDialog) {
      const { x: cursorX, y: cursorY } = getSelectionCoords();
      setAtDialogPosition({ x: Math.min(cursorX, screen.width - 100), y: cursorY });
    }
  }, [showAtDialog, atSearchKey]);

  const checkIsShowSelectDialog = () => {
    // *** getEditorRange 依赖的 DOM 节点现在从 ref 获取 ***
    const editorEl = chatInputRef.current?.getRawElement();
    const rangeInfo = getEditorRange(editorEl); // 假设 getEditorRange 可以接受元素或独立工作

    if (!rangeInfo || !rangeInfo.range || !rangeInfo.selection)
      return;

    const curNode = rangeInfo.range.endContainer;
    if (!curNode.textContent?.includes("@")) {
      setShowAtDialog(false);
      setAtSearchKey("");
      return;
    }
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
  const [LLMMessage, setLLMMessageRaw] = useState("");
  const isAutoCompletingRef = useRef(false);
  const hintNodeRef = useRef<HTMLSpanElement | null>(null); // Ref for the hint span itself

  const setLLMMessage = (newLLMMessage: string) => {
    if (hintNodeRef.current) {
      hintNodeRef.current.remove(); // 移除旧的提示节点
    }
    setLLMMessageRaw(newLLMMessage);
    const hintNode = document.createElement("span");
    hintNode.textContent = newLLMMessage;
    hintNode.className = "opacity-60";
    hintNode.contentEditable = "false";
    hintNode.style.pointerEvents = "none";

    // *** 调用 ref API 插入节点 ***
    chatInputRef.current?.insertNodeAtCursor(hintNode);
    hintNodeRef.current = hintNode; // 保存对新节点的引用

    const handleInput = () => {
      hintNode.remove();
      chatInputRef.current?.getRawElement()?.removeEventListener("input", handleInput);
      isAutoCompletingRef.current = false;
      hintNodeRef.current = null;
    };
    // *** 监听子组件的原始元素 ***
    chatInputRef.current?.getRawElement()?.addEventListener("input", handleInput);
  };

  const getRoleSmartly = useGetRoleSmartly();

  /**
   * *** autoComplete 现在调用 ref API ***
   */
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

  /**
   * *** insertLLMMessageIntoText 现在调用 ref API ***
   */
  const insertLLMMessageIntoText = () => {
    if (!chatInputRef.current)
      return;

    // 移除提示 span
    if (hintNodeRef.current) {
      hintNodeRef.current.remove();
      hintNodeRef.current = null;
    }

    // 插入纯文本
    chatInputRef.current.insertNodeAtCursor(LLMMessage, { moveCursorToEnd: true });
    setLLMMessage(""); // 清空补全状态
    chatInputRef.current.triggerSync(); // 手动触发同步，更新父组件的 inputText 状态
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

  /**
   * *** handleMessageSubmit 现在使用 state 中的 inputText 和 mentionedRolesInInput ***
   */
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
          commandExecutor({ command: inputText, mentionedRoles: mentionedRolesInInput, originMessage: inputText });
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

  // *** 新增: onPasteFiles 的回调处理器 ***
  const handlePasteFiles = (files: File[]) => {
    updateImgFiles((draft) => {
      draft.push(...files);
    });
  };

  const isComposingRef = useRef(false);
  /**
   * *** handleKeyDown 现在只处理父组件逻辑 ***
   * (子组件的 IME 逻辑已内部封装)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAtDialog) {
      // @ 弹窗导航逻辑 (父组件状态)
      switch (e.key) {
        case "Enter": {
          e.preventDefault();
          handleSelectAt(searchedRoles[atSelectIndex]);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setAtSelectIndex(Math.max(atSelectIndex - 1, 0));
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          setAtSelectIndex(Math.min(atSelectIndex + 1, searchedRoles.length - 1));
          break;
        }
      }
    }
    else {
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
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // @ 弹窗触发器 (父组件状态)
    if (e.key === "@") {
      setShowAtDialog(true);
    }
    checkIsShowSelectDialog();

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
    if (showAtDialog) {
      e.preventDefault(); // @ 弹窗状态 (父组件)
    }
  }

  /**
   * *** handleSelectAt 现在调用 ref API ***
   * 处理@选人
   * @param role 要@的对象
   */
  function handleSelectAt(role: UserRole) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !chatInputRef.current)
      return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE)
      return;

    const text = textNode.textContent || "";
    const offset = range.startOffset;
    const atIndex = Math.max(text.lastIndexOf("@", offset - 1), 0);

    // 1. 删除 @keyword
    range.setStart(textNode, atIndex); // 从 @ 开始
    range.setEnd(textNode, offset); // 到光标位置
    range.deleteContents(); // 删除 "@keyword"

    // 2. 创建并插入 @ 提及 span
    const span = document.createElement("span");
    span.textContent = `@${role.roleName}` + "\u00A0"; // 添加非断行空格
    span.className = "inline text-blue-500 bg-transparent px-0 py-0 border-none";
    span.contentEditable = "false";
    span.style.display = "inline-block";
    span.dataset.role = JSON.stringify(role);

    // ***  调用 ref API 插入 span ***
    chatInputRef.current.insertNodeAtCursor(span, { moveCursorToEnd: true });

    // 插入一个空格以便继续输入 (可选，但体验好)
    // chatInputRef.current.insertNodeAtCursor("\u00A0", { moveCursorToEnd: true });

    setShowAtDialog(false);

    // 告诉子组件重新解析其内容并更新父组件的 state
    chatInputRef.current.triggerSync();
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
        : (curAvatarId <= 0 ? "请为你的角色添加至少一个表情差分（头像）。" : "在此输入消息...(shift+enter 换行)"));

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
            <Setting
              className="size-7 cursor-pointer hover:text-info"
              onClick={() => setIsSettingWindowOpen(true)}
            >
            </Setting>
          </div>
        </div>
        <div className="h-px bg-base-300"></div>
        <div className="flex-1 w-full flex bg-base-100 relative">
          <div className="flex flex-col flex-1 h-full">
            {/* 聊天框 */}
            <div className="bg-base-100 flex-1 flex-shrink-0">
              <ChatFrame useChatBubbleStyle={useChatBubbleStyle} setUseChatBubbleStyle={setUseChatBubbleStyle} key={roomId} virtuosoRef={virtuosoRef}></ChatFrame>
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
                <ChatToolbar
                  sideDrawerState={sideDrawerState}
                  setSideDrawerState={setSideDrawerState}
                  updateEmojiUrls={updateEmojiUrls}
                  updateImgFiles={updateImgFiles}
                  setIsItemsWindowOpen={setIsItemsWindowOpen}
                  disableSendMessage={disableSendMessage}
                  handleMessageSubmit={handleMessageSubmit}
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
                  {showAtDialog && atDialogPosition.x > 0 && searchedRoles.length > 0 && (
                    <Mounter targetId="modal-root">
                      <div
                        className="absolute flex flex-col card shadow-md bg-base-100 p-2 gap-2 z-20 max-h-[30vh] overflow-auto"
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
                </div>
              </div>
            </form>
          </div>
          <OpenAbleDrawer isOpen={sideDrawerState === "user"} className="h-full bg-base-100 overflow-auto z-20">
            <div className="w-px bg-base-300"></div>
            <RoomUserList></RoomUserList>
          </OpenAbleDrawer>
          <OpenAbleDrawer isOpen={sideDrawerState === "role"} className="h-full bg-base-100 overflow-auto z-20">
            <div className="w-px bg-base-300"></div>
            <RoomRoleList></RoomRoleList>
          </OpenAbleDrawer>
          <OpenAbleDrawer isOpen={sideDrawerState === "initiative"} className="max-h-full overflow-auto z-20">
            <div className="w-px bg-base-300"></div>
            <InitiativeList></InitiativeList>
          </OpenAbleDrawer>
          <OpenAbleDrawer isOpen={sideDrawerState === "map"} className="h-full overflow-auto z-20" overWrite>
            <div className="w-px bg-base-300"></div>
            <DNDMap></DNDMap>
          </OpenAbleDrawer>
        </div>
      </div>
      <PopWindow isOpen={isItemsWindowOpen} onClose={() => setIsItemsWindowOpen(false)}>
        <ItemWindow setSelectedItemId={setSelectedItemId}></ItemWindow>
      </PopWindow>
      <PopWindow isOpen={isSettingWindowOpen} onClose={() => setIsSettingWindowOpen(false)}>
        <RoomSettingWindow
          onClose={() => setIsSettingWindowOpen(false)}
          onShowMembers={() => setSideDrawerState("user")}
          onRenderDialog={() => setIsRenderWindowOpen(true)}
        />
      </PopWindow>
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleAddWindowOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole} addModuleRole={false}></AddRoleWindow>
      </PopWindow>
      <PopWindow
        isOpen={selectedItemId > 0}
        onClose={() => setSelectedItemId(-1)}
      >
        {selectedItemId && (
          <ItemDetail itemId={selectedItemId} />
        )}
      </PopWindow>
      <PopWindow isOpen={isRenderWindowOpen} onClose={() => setIsRenderWindowOpen(false)}>
        <RenderWindow></RenderWindow>
      </PopWindow>
    </RoomContext>
  );
}

export default RoomWindow;
