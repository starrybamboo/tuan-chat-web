import type {
  ChatMessagePageRequest,
  ChatMessageRequest,
  ChatMessageResponse,
} from "api";
import type { FormEvent } from "react";

import { commands } from "@/utils/commands";

import { ChatBubble } from "@/view/chat/components/chatBubble";
import { GroupContext } from "@/view/chat/components/GroupContext";

import { MemberTypeTag } from "@/view/chat/components/memberTypeTag";
import { PopWindow } from "@/view/common/popWindow";
import RoleAvatarComponent from "@/view/common/roleAvatar";
import { ImgUploaderWithCopper } from "@/view/common/uploader/imgUploaderWithCopper";
import UserAvatarComponent from "@/view/common/userAvatar";
import { UserDetail } from "@/view/common/userDetail";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { tuanchat } from "api/instance";
import {
  useAddMemberMutation,
  useAddRoleMutation,
  useGetGroupRoleQuery,
  useGetMemberListQuery,
  useGetRoleAvatarsQuery,
  useGetUserInfoQuery,
  useGetUserRolesQuery,
} from "api/queryHooks";
import { useWebSocket } from "api/useWebSocket";
import { useEffect, useMemo, useRef, useState } from "react";

export function DialogueWindow({ groupId }: { groupId: number }) {
  const [inputText, setInputText] = useState("");
  const [curRoleId, setCurRoleId] = useState(-1);
  const [curAvatarIndex, setCurAvatarIndex] = useState(0);
  const [useChatBoxStyle, setUseChatBoxStyle] = useState(true);
  const PAGE_SIZE = 30; // 每页消息数量

  // 承载聊天记录窗口的ref
  const chatFrameRef = useRef<HTMLDivElement>(null);
  // 滚动加载逻辑, 设置为倒数第n条消息的ref, 当这条消息进入用户窗口时, messageEntry.isIntersecting变为true, 之后启动滚动加载
  const [messageRef, messageEntry] = useIntersectionObserver();
  // 目前仅用于让首次渲染时对话框滚动到底部
  const hasInitialized = useRef(false);

  const [userId, setUserId] = useState<number | undefined>(undefined);

  const [imgDownLoadUrl, setImgDownLoadUrl] = useState<string | undefined>(undefined);
  // 角色添加框的打开状态
  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState(false);
  // 成员添加框的打开状态
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useState(false);
  // 添加成员输入框内的输入
  const [inputUserId, setInputUserId] = useState<number>(-1);
  // 检验输入的Id是否有效
  const inputUserInfo = useGetUserInfoQuery(inputUserId).data?.data;

  // 获取用户的所有角色
  const userRolesQuery = useGetUserRolesQuery(userId ?? 10001);
  const userRoles = userRolesQuery.data?.data ?? [];
  // 获取当前群聊中的所有角色
  const groupRolesQuery = useGetGroupRoleQuery(groupId);
  const groupRoles = groupRolesQuery.data?.data ?? [];
  // 获取当前用户选择角色的所有头像(表情差分)
  const roleAvatarQuery = useGetRoleAvatarsQuery(curRoleId ?? -1);
  const roleAvatars = roleAvatarQuery.data?.data ?? [];
  const membersQuery = useGetMemberListQuery(groupId);
  const members = membersQuery.data?.data ?? [];

  // Mutations
  const addMemberMutation = useAddMemberMutation();
  const addRoleMutation = useAddRoleMutation();

  /**
   * websocket
   */
  // websocket封装, 用于发送接受消息
  const { send, connect, getMessagesByRoomId } = useWebSocket();
  useEffect(() => {
    connect();
  }, [connect]);
  const receivedMessages = getMessagesByRoomId(groupId);

  /**
   * 获取历史消息
   */
  // 分页获取消息
  // cursor用于获取当前的消息列表, 在往后端的请求中, 第一次发送null, 然后接受后端返回的cursor作为新的值
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["messageHistory", groupId],
    queryFn: async ({ pageParam }) => {
      return tuanchat.chatController.getMsgPage(pageParam);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data === undefined || lastPage.data.isLast) {
        return undefined;
      }
      else {
        const params: ChatMessagePageRequest = {
          roomId: groupId,
          pageSize: PAGE_SIZE,
          cursor: lastPage.data.cursor,
        };
        return params;
      }
    },
    initialPageParam: {
      roomId: groupId,
      pageSize: PAGE_SIZE,
      cursor: null,
    } as unknown as ChatMessagePageRequest,
    refetchOnWindowFocus: false,
  });

  // 合并所有分页消息
  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    return (messagesData?.pages.reverse().flatMap(p =>
      p.data?.list ?? [],
    ) ?? []);
  }, [messagesData]);

  /**
   * 获取userId
   */
  const handleUserChange = (userId: number) => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setUserId(userId);
  };
  useEffect(() => {
    handleUserChange(Number(localStorage.getItem("token")));
  }, []);
  /**
   * messageEntry触发时候的effect, 同时让首次渲染时对话框滚动到底部
   */
  useEffect(() => {
    if (!hasInitialized.current) {
      return;
    }
    if (messageEntry?.isIntersecting && hasNextPage && !isFetchingNextPage && chatFrameRef.current) {
      // 记录之前的滚动位置并在fetch完后移动到该位置, 防止连续多次获取
      const scrollBottom = chatFrameRef.current.scrollHeight - chatFrameRef.current.scrollTop;
      fetchNextPage().then(() => {
        if (chatFrameRef.current) {
          chatFrameRef.current.scrollTo({ top: chatFrameRef.current.scrollHeight - scrollBottom, behavior: "instant" });
        }
      });
    }
  }, [messageEntry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);
  /**
   * 第一次获取消息的时候, 滚动到底部
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!hasInitialized.current) {
      timeoutId = setTimeout(() => {
        if (chatFrameRef.current) {
          chatFrameRef.current.scrollTo({ top: chatFrameRef.current.scrollHeight, behavior: "instant" });
        }
        hasInitialized.current = true;
      }, 400);
    }
    return () => { // 清理函数
      if (timeoutId) {
        clearTimeout(timeoutId); // 清除定时器
      }
    };
  }, [historyMessages]);

  /**
   * 命令补全部分
   */
  const suggestionNumber = 10;
  const isCommandMode = () => {
    return inputText.length > 0 && [".", "。"].includes(inputText[0]);
  };
  function getSuggestions() {
    if (!isCommandMode()) {
      return [];
    }
    return commands.filter(command => command.name.startsWith(inputText.slice(1)))
      .sort((a, b) => b.importance - a.importance)
      .reverse()
      .slice(0, suggestionNumber);
  }
  const selectCommand = (cmdName: string) => {
    // 保持命令前缀格式（保留原输入的 . 或 。）
    const prefixChar = inputText[0];
    setInputText(`${prefixChar}${cmdName} `);
  };

  /**
   *处理与组件的各种交互
   */
  const handleMessageSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !userId) {
      return;
    }

    // 构造消息请求对象
    const messageRequest: ChatMessageRequest = {
      roomId: groupId,
      roleId: curRoleId,
      content: inputText.trim(),
      avatarId: roleAvatars[curAvatarIndex].avatarId || -1,
      messageType: 1,
      body: {},
    };

    // 发送消息
    send(messageRequest);

    setInputText("");
    // 滚动到底部, 设置异步是为了等待新消息接受并渲染好
    setTimeout(() => {
      if (chatFrameRef.current) {
        chatFrameRef.current.scrollTo({ top: chatFrameRef.current.scrollHeight, behavior: "smooth" });
      }
    }, 300);
  };

  const handleAvatarChange = (avatarIndex: number) => {
    setCurAvatarIndex(avatarIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmit(e);
    }
  };

  const handleRoleChange = (roleId: number) => {
    setCurRoleId(roleId);
    setCurAvatarIndex(0);
  };

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({
      roomId: groupId,
      roleIdList: [roleId],
    }, {
      onSettled: () => {
        setIsRoleHandleOpen(false);
      },
    });
  };

  async function handleAddMember(userId: number) {
    addMemberMutation.mutate({
      roomId: groupId,
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsMemberHandleOpen(false);
      },
    });
  }

  return (
    <GroupContext value={{ groupId }}>
      <div className="flex flex-row p-6 gap-4 w-full min-w-0">
        {/* 聊天区域主体 */}
        <div className="flex-1 min-w-[480px] flex flex-col">
          {/* chat messages area */}
          <div className="card bg-base-100 shadow-sm flex-1">
            {/* 加载指示器 */}
            {isFetchingNextPage && (
              <div className="text-center p-2 text-gray-500">
                加载历史消息中...
              </div>
            )}
            <div className="card-body overflow-y-auto h-[60vh]" ref={chatFrameRef}>
              {historyMessages.map((chatMessageResponse, index) => (
                <div ref={index === 1 ? messageRef : null} key={chatMessageResponse.message.messageID}>
                  <ChatBubble chatMessageResponse={chatMessageResponse} useChatBoxStyle={useChatBoxStyle} />
                </div>
              ))}
              {receivedMessages.map(receivedMessage => (
                <div key={receivedMessage.message.messageID}>
                  <ChatBubble chatMessageResponse={receivedMessage} useChatBoxStyle={useChatBoxStyle} />
                </div>
              ))}
            </div>
          </div>

          {/* 输入区域 */}
          <form onSubmit={handleMessageSubmit} className="mt-4 bg-base-100 p-4 rounded-lg shadow-sm">
            <div className="flex gap-2 relative">
              {/* 表情差分展示与选择 */}
              <div className="dropdown dropdown-top">
                <div role="button" tabIndex={0} className="flex justify-center flex-col items-center space-y-2">
                  <RoleAvatarComponent
                    avatarId={roleAvatars[curAvatarIndex]?.avatarId || -1}
                    width={32}
                    isRounded={true}
                    withTitle={false}
                    stopPopWindow={true}
                  >
                  </RoleAvatarComponent>
                  <div>{userRoles.find(r => r.roleId === curRoleId)?.roleName || ""}</div>
                </div>
                {/* 表情差分选择器 */}
                <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-92 p-2 shadow-sm">
                  {
                    roleAvatars && roleAvatars.length > 0
                      ? (
                          <div className="grid grid-cols-5 gap-2 ">
                            {roleAvatars.map((avatar, index) => (
                              <div
                                onClick={() => handleAvatarChange(index)}
                                className="object-cover rounded transition-all"
                                key={avatar.avatarId}
                              >
                                <RoleAvatarComponent
                                  avatarId={avatar.avatarId || -1}
                                  width={16}
                                  isRounded={false}
                                  withTitle={true}
                                  stopPopWindow={true}
                                >
                                </RoleAvatarComponent>
                              </div>
                            ))}
                          </div>
                        )
                      : (
                          <div className="text-center p-2 text-gray-500 text-sm">暂无可用头像</div>
                        )
                  }
                </ul>
              </div>

              <div className="w-full textarea">
                {/* 命令建议列表 */}
                {isCommandMode() && getSuggestions().length > 0 && (
                  <div className="absolute bottom-full w-[80%] mb-2 bg-base-200 rounded-box shadow-md overflow-hidden">
                    {getSuggestions().map(cmd => (
                      <div
                        key={cmd.name}
                        onClick={() => selectCommand(cmd.name)}
                        className="p-2 w-full last:border-0 hover:bg-base-300 transform origin-left hover:scale-110"
                      >
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          .
                          {cmd.name}
                        </span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{cmd.description}</span>
                      </div>
                    ))}
                  </div>
                )}
                <img src={imgDownLoadUrl} alt="" />
                {/* text input */}
                <textarea
                  className="textarea w-full h-20 md:h-32 lg:h-40 resize-none border-none focus:outline-none focus:ring-0"
                  rows={3}
                  placeholder="Enter your message here...(shift+enter to change line)"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="flex items-center float-left">
                  {/* 角色选择器 */}
                  <div className="dropdown dropdown-top">
                    <div tabIndex={0} role="button" className="btn m-1">选择角色 ⬆️</div>
                    <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm overflow-y-auto">
                      {
                        // 仅显示角色列表里面有的角色
                        userRoles.filter(userRole => groupRoles.some(groupRole => groupRole.roleId === userRole.roleId))
                          .map(role => (
                            <li key={role.roleId} onClick={() => handleRoleChange(role.roleId ?? -1)} className="flex, flex-row">
                              <div className="w-full">
                                <RoleAvatarComponent avatarId={role.avatarId ?? 0} width={10} isRounded={false} withTitle={false} stopPopWindow={true}></RoleAvatarComponent>
                                <div>{role.roleName}</div>
                              </div>
                            </li>
                          ))
                      }
                    </ul>
                  </div>
                  <ImgUploaderWithCopper setCopperedDownloadUrl={setImgDownLoadUrl} setDownloadUrl={() => {}}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {/* 图片框 */}
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2-2h4l2 2h4a2 2 0 012 2v10a2 2 0 01-2 2H5z" />
                      {/* 山峰图形 */}
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l-3-3m0 0l3-3m-3 3h6" />
                    </svg>
                  </ImgUploaderWithCopper>
                </div>
                <div className="float-right">
                  <label className="swap w-30 btn right-2">
                    <input type="checkbox" />
                    <div className="swap-on" onClick={() => setUseChatBoxStyle(false)}>Use Chat Bubble Style</div>
                    <div className="swap-off" onClick={() => setUseChatBoxStyle(true)}>Use Chat Box Style</div>
                  </label>
                  {/* send button */}
                  <button type="submit" className="btn btn-primary " disabled={!inputText.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
        {/* 成员与角色展示框 */}
        <div className="flex flex-row gap-4 h-full">
          <div className="flex flex-col gap-2 p-4 bg-base-100 rounded-box shadow-sm items-center w-full space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {/* 群成员列表 */}
            <div className="space-y-2">
              <div className="flex flex-row justify-center items-center gap-2">
                <p className="text-center">
                  群成员-
                  {members.length}
                </p>
                <button className="btn btn-dash btn-info" type="button" onClick={() => setIsMemberHandleOpen(true)}>
                  添加成员
                </button>
              </div>

              {members.map(member => (
                <div key={member.userId} className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center ">
                  {/* 成员列表 */}
                  <UserAvatarComponent userId={member.userId ?? 0} width={8} isRounded={true} withName={true}>
                  </UserAvatarComponent>
                  <div className="flex flex-col items-center gap-2 text-sm font-medium">
                  </div>
                  <MemberTypeTag memberType={member.memberType}></MemberTypeTag>
                </div>
              ))}
            </div>
            {/* 角色列表 */}
            <div className="space-y-2">
              <div className="flex flex-row justify-center items-center gap-2">
                <p className="text-center">
                  角色列表-
                  <span className="text-sm">{groupRoles.length}</span>
                </p>
                <button className="btn btn-dash btn-info" type="button" onClick={() => setIsRoleHandleOpen(true)}>添加角色</button>
              </div>
              {groupRoles.map(role => (
                <div key={role.roleId} className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center ">
                  {/* role列表 */}
                  <RoleAvatarComponent avatarId={role.avatarId ?? 0} width={8} isRounded={true} withTitle={false} />
                  <div className="flex flex-col items-center gap-2 text-sm font-medium"><span>{role.roleName}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <div className="justify-center w-max">
          <p className="text-lg font-bold text-center w-full mb-4">选择要加入的角色</p>
          <div className="grid grid-cols-5 gap-2 justify-items-stretch">
            {userRoles.map(role => (
              <div className="" key={role.avatarId}>
                <div className="flex flex-col items-center">
                  <div onClick={() => handleAddRole(role.roleId ?? -1)} className="">
                    <RoleAvatarComponent
                      avatarId={role.avatarId ?? -1}
                      width={24}
                      isRounded={false}
                      withTitle={false}
                      stopPopWindow={true}
                    />
                  </div>
                  <p className="text-center block">{role.roleName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopWindow>
      <PopWindow isOpen={isMemberHandleOpen} onClose={() => setIsMemberHandleOpen(false)}>
        <div className="w-full justify-center">
          <p className="text-lg font-bold text-center w-full mb-4 ">输入要加入的用户的ID</p>
          <input type="text" placeholder="输入要加入的成员的ID" className="input mb-8" onInput={e => setInputUserId(Number(e.currentTarget.value))} />
          {
            (inputUserId > 0 && inputUserInfo)
            && (
              <div className="w-full items-center flex flex-col gap-y-4">
                <UserDetail userId={inputUserId}></UserDetail>
                <button className="btn btn-info" type="button" onClick={() => handleAddMember(Number(inputUserId))}>
                  确认
                </button>
              </div>
            )
          }
        </div>
      </PopWindow>
    </GroupContext>
  );
}

export default DialogueWindow;
