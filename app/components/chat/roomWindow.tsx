import type { commandModeType } from "@/components/chat/commandPanel";
import type { RoomContextType } from "@/components/chat/roomContext";

import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";

import type {
  ApiResultCursorPageBaseResponseChatMessageResponse,
  ChatMessagePageRequest,
  ChatMessageRequest,
  ChatMessageResponse,
  Message,
  RoomMember,
} from "../../../api";
import ChatFrame from "@/components/chat/chatFrame";
import CommandPanel from "@/components/chat/commandPanel";
import { ExpressionChooser } from "@/components/chat/expressionChooser";
import RepliedMessage from "@/components/chat/repliedMessage";
import RoleChooser from "@/components/chat/roleChooser";
import { RoomContext } from "@/components/chat/roomContext";
import RoomRightSidePanel from "@/components/chat/roomRightSidePanel";
import BetterImg from "@/components/common/betterImg";
import useCommandExecutor, { isCommand } from "@/components/common/commandExecutor";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { SideDrawer } from "@/components/common/sideDrawer";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useGlobalContext } from "@/components/globalContextProvider";
import { Bubble2, CommandSolid, DiceTwentyFacesTwenty, GalleryBroken, GirlIcon, SendIcon } from "@/icons";
import { UploadUtils } from "@/utils/UploadUtils";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { useGetMemberListQuery, useGetRoomRoleQuery, useGetSpaceInfoQuery } from "../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../api/instance";
import {
  useGetRoleAvatarsQuery,
  useGetUserRolesQuery,
} from "../../../api/queryHooks";

const PAGE_SIZE = 30; // 每页消息数量
export function RoomWindow({ roomId, spaceId }: { roomId: number; spaceId: number }) {
  // const { spaceId: urlSpaceId } = useParams();
  // const spaceId = Number(urlSpaceId);
  const space = useGetSpaceInfoQuery(spaceId).data?.data;

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const webSocketUtils = globalContext.websocketUtils;
  const send = webSocketUtils.send;

  const textareaRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState("");

  const [curAvatarIndex, setCurAvatarIndex] = useState(0);
  const uploadUtils = new UploadUtils(2);

  const [commandMode, setCommandMode] = useState<commandModeType>("none");

  // 聊天框中包含的图片
  const [imgFiles, updateImgFiles] = useImmer<File[]>([]);
  // 引用的聊天记录id
  const [replyMessage, setReplyMessage] = useState<Message | undefined>(undefined);

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

  const [useChatBubbleStyle, setUseChatBubbleStyle] = useState(localStorage.getItem("useChatBubbleStyle") === "true");
  useEffect(() => {
    localStorage.setItem("useChatBubbleStyle", useChatBubbleStyle.toString());
  }, [useChatBubbleStyle]);

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
    initialPageParam: { roomId, pageSize: PAGE_SIZE, cursor: cursorRef.current } as unknown as ChatMessagePageRequest,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const receivedMessages = webSocketUtils.getTempMessagesByRoomId(roomId, true);
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

  // Context
  const roomContext: RoomContextType = useMemo((): {
    spaceId: number;
    curRoleId: number;
    curMember: RoomMember | undefined;
    useChatBubbleStyle: boolean;
    curAvatarId: any;
    roomMembers: RoomMember[];
    setReplyMessage: React.Dispatch<React.SetStateAction<Message | undefined>>;
    roomId: number;
    roomRolesThatUserOwn: any[];
    historyMessages?: ChatMessageResponse[];
    messagesInfiniteQuery: UseInfiniteQueryResult<InfiniteData<ApiResultCursorPageBaseResponseChatMessageResponse, unknown>, Error>;
  } => {
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
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, roleAvatars, curAvatarIndex, useChatBubbleStyle, spaceId, historyMessages, messagesInfiniteQuery]);

  /**
   * 当群聊角色列表更新时, 自动设置为第一个角色
   */
  useEffect(() => {
    setCurRoleId(roomRolesThatUserOwn[0]?.roleId ?? -1);
  }, [roomRolesThatUserOwn]);

  /**
   * At 功能
   */
  // TODO

  /**
   *处理与组件的各种交互
   */
  const handleTextInputChange = (newText?: string) => {
    const newInput = newText ?? "";
    setInputText(newInput);
    if (newInput.startsWith("%")) {
      setCommandMode("webgal");
    }
    else if (newInput.startsWith(".") || newInput.startsWith("。")) {
      setCommandMode("dice");
    }
    else {
      setCommandMode("none");
    }
  };
  const handleSelectCommand = (cmdName: string) => {
    // 保持命令前缀格式（保留原输入的 . 或 。）
    const prefixChar = inputText[0];
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleMessageSubmit = async () => {
    setIsSubmitting(true);
    if (!inputText.trim() && !imgFiles.length) {
      return;
    }
    if (imgFiles.length > 0) {
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        // 获取到图片的宽高
        const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve({ width: img.naturalWidth || 114, height: img.naturalHeight || 114 });
          };
          img.onerror = () => resolve({ width: 114, height: 114 }); // 失败时使用默认值
          img.src = URL.createObjectURL(imgFiles[i]);
        });
        // 如果有图片，发送独立的图片消息
        if (imgDownLoadUrl && imgDownLoadUrl !== "") {
          const messageRequest: ChatMessageRequest = {
            content: "",
            roomId,
            roleId: curRoleId,
            avatarId: curAvatarId,
            messageType: 2,
            body: {
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
        body: {},
      };
      if (isCommand(inputText)) {
        const commandResult = commandExecutor(inputText);
        messageRequest.body = {
          result: commandResult,
        };
        tuanchat.chatController.sendMessageAiResponse(messageRequest);
      }
      else {
        send(messageRequest);
      }
      handleTextInputChange("");
    }
    setReplyMessage(undefined);
    // 滚动到底部, 设置异步是为了等待新消息接受并渲染好
    // setTimeout(() => {
    //   if (chatFrameRef.current) {
    //     chatFrameRef.current.scrollTo({ top: 0, behavior: "smooth" });
    //   }
    // }, 300);

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
    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      handleMessageSubmit();
    }
  };

  const handleRoleChange = (roleId: number) => {
    setCurRoleId(roleId);
    setCurAvatarIndex(0);
  };

  return (
    <RoomContext value={roomContext}>
      <div className="w-full flex gap-4">
        <div className="flex flex-col flex-1">
          {/* 聊天框 */}
          <div className="card bg-base-100 shadow-sm">
            <ChatFrame useChatBubbleStyle={useChatBubbleStyle} key={roomId}></ChatFrame>
          </div>
          {/* 输入区域 */}
          <form className="mt-4 bg-base-100 p-4 rounded-lg shadow-sm flex flex-col flex-1">
            <div className="flex gap-2 flex-1">
              {/* 表情差分展示与选择 */}
              <div className="dropdown dropdown-top flex-shrink-0">
                <div role="button" tabIndex={0} className="">
                  <div className="tooltip flex justify-center flex-col items-center space-y-2" data-tip="切换表情差分">
                    <RoleAvatarComponent
                      avatarId={roleAvatars[curAvatarIndex]?.avatarId || -1}
                      width={32}
                      isRounded={true}
                      withTitle={false}
                      stopPopWindow={true}
                    />
                    <div className="text-sm whitespace-nowrap">
                      {userRoles.find(r => r.roleId === curRoleId)?.roleName || ""}
                    </div>
                  </div>
                </div>
                {/* 表情差分选择器 */}
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
                  commandMode={commandMode}
                  className="absolute bottom-full w-[80%] mb-2 bg-base-200 rounded-box shadow-md overflow-hidden z-10 w-full"
                />
                <div className="flex flex-row gap-2 pl-3">
                  <div className="tooltip" data-tip="浏览所有骰子命令">
                    <DiceTwentyFacesTwenty
                      className="w-6 h-6 cursor-pointer hover:text-info"
                      onClick={() => setCommandBrowseWindow("dice")}
                    >
                    </DiceTwentyFacesTwenty>
                  </div>
                  <div className="tooltip" data-tip="浏览常用webgal命令">
                    <CommandSolid
                      className="w-6 h-6 cursor-pointer hover:text-info"
                      onClick={() => setCommandBrowseWindow("webgal")}
                    >
                    </CommandSolid>
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
                      className="flex flex-row gap-2 items-center bg-base-200 p-1 rounded-box shadow-sm text-sm pl-2 "
                    />
                  )
                }
                {/* 输入框 */}
                <div
                  className="textarea chatInputTextarea w-full flex-1 h-full overflow-auto
                     min-h-[80px] max-h-[200px] resize-none border-none focus:outline-none focus:ring-0 overflow-auto div-textarea"
                  ref={textareaRef}
                  onInput={(e) => { handleTextInputChange(e.currentTarget?.textContent ?? ""); }}
                  onKeyDown={handleKeyDown}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {/* 角色选择器 */}
                    <div className="dropdown dropdown-top">
                      <div className="tooltip" data-tip="切换角色">
                        <GirlIcon className="size-8 hover:text-info" tabIndex={0} role="button"></GirlIcon>
                      </div>
                      <ul
                        tabIndex={0}
                        className="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm overflow-y-auto"
                      >
                        <RoleChooser handleRoleChange={handleRoleChange}></RoleChooser>
                      </ul>
                    </div>
                    <ImgUploader setImg={newImg => updateImgFiles((draft) => {
                      draft.push(newImg);
                    })}
                    >
                      <div className="tooltip" data-tip="发送图片">
                        <GalleryBroken className="size-8 cursor-pointer hover:text-info"></GalleryBroken>
                      </div>
                    </ImgUploader>
                  </div>

                  <div className="flex gap-2">
                    <div className="tooltip" data-tip="切换聊天气泡风格">
                      <label className="swap">
                        <input type="checkbox" />
                        <div className="swap-on" onClick={() => setUseChatBubbleStyle(false)}>
                          <Bubble2 className="size-10 font-light"></Bubble2>
                        </div>
                        <div className="swap-off" onClick={() => setUseChatBubbleStyle(true)}>
                          <Bubble2 className="size-8"></Bubble2>
                        </div>
                      </label>
                    </div>

                    {/* send button */}
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!(inputText.trim() || imgFiles.length) || isSubmitting}
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
        <SideDrawer sideDrawerId="room-side-drawer" isAtRight={true}>
          <RoomRightSidePanel></RoomRightSidePanel>
        </SideDrawer>

        <PopWindow isOpen={commandBrowseWindow === "dice"} onClose={() => setCommandBrowseWindow("none")}>
          <span className="text-center text-lg font-semibold">浏览所有骰子命令</span>
          <CommandPanel
            prefix="."
            handleSelectCommand={(cmdName) => {
              handleTextInputChange(`.${cmdName}`);
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
              handleTextInputChange(`%${cmdName}`);
              setCommandBrowseWindow("none");
            }}
            commandMode="webgal"
            suggestionNumber={10000}
            className="overflow-x-clip max-h-[80vh] overflow-y-auto"
          >
          </CommandPanel>
        </PopWindow>
      </div>
    </RoomContext>
  );
}

export default RoomWindow;
