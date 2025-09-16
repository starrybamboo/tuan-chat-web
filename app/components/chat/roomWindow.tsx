import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/chatInputArea";

import type { RoomContextType } from "@/components/chat/roomContext";
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
import ItemWindow from "@/components/chat/window/itemWindow";
import RenderWindow from "@/components/chat/window/renderWindow";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import BetterImg from "@/components/common/betterImg";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor, { isCommand } from "@/components/common/dicer/cmdPre";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
  BaselineArrowBackIosNew,
  Setting,
} from "@/icons";
import { getImageSize } from "@/utils/getImgSize";
import { getScreenSize } from "@/utils/getScreenSize";
import { UploadUtils } from "@/utils/UploadUtils";
// *** 导入新组件及其 Handle 类型 ***

import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useImmer } from "use-immer";
import {
  useAddRoomRoleMutation,
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetRoomRoleQuery,
  useGetSpaceInfoQuery,
} from "../../../api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "../../../api/queryHooks";
import DisplayOfItemDetail from "./displayOfItemsDetail";
import ClueList from "./sideDrawer/clueList";

// const PAGE_SIZE = 50; // 每页消息数量
export function RoomWindow({ roomId, spaceId }: { roomId: number; spaceId: number }) {
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

  // *** ChatInputArea 的回调处理器 ***
  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    setInputTextWithoutUpdateTextArea(plainText);
    setinputTextWithoutMentions(inputTextWithoutMentions);
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

  // 切换房间时清空引用消息（使用微任务异步规避直接 set 触发的 lint 规则）
  useEffect(() => {
    if (replyMessage) {
      const id = setTimeout(() => setReplyMessage(undefined), 0);
      return () => clearTimeout(id);
    }
  }, [roomId, replyMessage]);

  // 获取用户的所有角色
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  // 获取当前群聊中的所有角色
  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  const roomRolesThatUserOwn = useMemo(() => {
    if (spaceContext.isSpaceOwner)
      return roomRoles;
    return roomRoles.filter(role => userRoles.some(userRole => userRole.roleId === role.roleId));
  }, [roomRoles, spaceContext.isSpaceOwner, userRoles]);

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

  const [isSettingWindowOpen, setIsSettingWindowOpen] = useSearchParamsState<boolean>("roomSettingPop", false);
  // 渲染对话
  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);

  const [isItemsWindowOpen, setIsItemsWindowOpen] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<number>(-1);

  const [sideDrawerState, setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map" | "clue">("rightSideDrawer", "none");

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
  useEffect(() => {
    if (sideDrawerState === "clue") {
      setSideDrawerState("none");
    }
  }, [spaceId, sideDrawerState, setSideDrawerState]);

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
      curAvatarId,
      useChatBubbleStyle,
      spaceId,
      setReplyMessage,
      chatHistory,
      scrollToGivenMessage,
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, useChatBubbleStyle, spaceId, chatHistory, scrollToGivenMessage]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  const { myStatus: myStatue, handleManualStatusChange } = useChatInputStatus({
    roomId,
    userId,
    webSocketUtils,
    inputText,
  });
  // 移除旧的输入状态即时 effect 和单独 idle 定时器（统一由 snapshot 驱动）

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
        <div className="flex-1 w-full flex bg-base-100 relative min-h-0">
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
                {/* 状态显示条 */}
                <ChatStatusBar roomId={roomId} userId={userId} webSocketUtils={webSocketUtils} excludeSelf={false} />
                <ChatToolbar
                  sideDrawerState={sideDrawerState}
                  setSideDrawerState={setSideDrawerState}
                  updateEmojiUrls={updateEmojiUrls}
                  updateImgFiles={updateImgFiles}
                  setIsItemsWindowOpen={setIsItemsWindowOpen}
                  disableSendMessage={disableSendMessage}
                  handleMessageSubmit={handleMessageSubmit}
                  autoComplete={autoComplete}
                  currentChatStatus={myStatue as any}
                  onChangeChatStatus={handleManualStatusChange}
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
          <OpenAbleDrawer isOpen={sideDrawerState === "user"} className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0">
            <div className="w-px bg-base-300"></div>
            <RoomUserList></RoomUserList>
          </OpenAbleDrawer>
          <OpenAbleDrawer isOpen={sideDrawerState === "role"} className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0">
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
          <OpenAbleDrawer isOpen={sideDrawerState === "clue"} className="h-full bg-base-100 overflow-auto z-20">
            <div className="w-px bg-base-300"></div>
            <ClueList></ClueList>
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
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </PopWindow>
      <PopWindow
        isOpen={selectedItemId > 0}
        onClose={() => setSelectedItemId(-1)}
      >
        {selectedItemId && (
          <DisplayOfItemDetail itemId={selectedItemId} />
        )}
      </PopWindow>
      <PopWindow isOpen={isRenderWindowOpen} onClose={() => setIsRenderWindowOpen(false)}>
        <RenderWindow></RenderWindow>
      </PopWindow>
    </RoomContext>
  );
}

export default RoomWindow;
