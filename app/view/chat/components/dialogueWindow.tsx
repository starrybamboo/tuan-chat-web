import type { FormEvent } from "react";
import type { ChatMessagePageRequest, ChatMessageRequest, ChatMessageResponse, UserRole } from "../../../../api";

import { ChatBubble } from "@/view/chat/components/chatBubble";

import { MemberTypeTag } from "@/view/chat/components/memberTypeTag";

import RoleAvatarComponent from "@/view/common/roleAvatar";
import UserAvatarComponent from "@/view/common/userAvatar";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { useEffect, useMemo, useRef, useState } from "react";

import { useImmer } from "use-immer";
import { tuanchat } from "../../../../api/instance";
import { useWebSocket } from "../../../../api/useWebSocket";

export function DialogueWindow({ groupId }: { groupId: number }) {
  const [inputText, setInputText] = useState("");
  const [curRoleIndex, setCurRoleIndex] = useState(0);
  const [curAvatarIndexes, updateCurAvatarIndexes] = useImmer<number[]>([]); // curAvatarIndexes[i] 表示role[i]的头像索引
  const [useChatBoxStyle, setUseChatBoxStyle] = useState(true);
  const PAGE_SIZE = 30; // 每页消息数量

  // 承载聊天记录窗口的ref
  const chatFrameRef = useRef<HTMLDivElement>(null);
  // 滚动加载逻辑, 设置为倒数第n条消息的ref, 当这条消息进入用户窗口时, messageEntry.isIntersecting变为true, 之后启动滚动加载
  const [messageRef, messageEntry] = useIntersectionObserver();
  // 目前仅用于让首次渲染时对话框滚动到底部
  const hasInitialized = useRef(false);

  const [userId, setUserId] = useState<number | undefined>(undefined);

  // 获取用户的所有角色
  const userRolesQuery = useQuery({
    queryKey: ["roleController.getUserRoles", groupId],
    queryFn: () => tuanchat.roleController.getUserRoles(userId!),
    staleTime: 10000,
    enabled: !!userId,
  });
  // 获取当前群聊中的所有角色
  const groupRolesQuery = useQuery({
    queryKey: ["groupRoleController.groupRole", groupId],
    queryFn: () => tuanchat.groupRoleController.groupRole(groupId),
    staleTime: 10000,
    enabled: !!userRolesQuery.data,
  });
  // 获取当前用户每一个角色的所有头像
  const roleAvatarsQueries = useQueries({
    queries: (userRolesQuery.data?.data || []).map((role: UserRole) => ({
      queryKey: ["roleController.getRoleAvatars", role.roleId],
      queryFn: () => tuanchat.roleController.getRoleAvatars(role.roleId),
      enabled: !!userRolesQuery.data,
      staleTime: 10000,
    })),
  });
  // 获取当前群聊中的所有成员
  const membersQuery = useQuery({
    queryKey: ["groupMemberController.groupMember", groupId],
    queryFn: () => tuanchat.groupMemberController.getMemberList(groupId),
    staleTime: 5000,
  });

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
    // 让首次渲染时对话框滚动到底部, 逻辑是: 在首次获取消息并渲染完成后, messageEntry所绑定的判定消息在屏幕内, 则触发一次messageEntry, 拦截这次加载, 并让页面滚动到底部
    if (!hasInitialized.current && chatFrameRef.current) {
      chatFrameRef.current.scrollTo({ top: chatFrameRef.current.scrollHeight });
      hasInitialized.current = true;
      return;
    }
    if (messageEntry?.isIntersecting && hasNextPage && !isFetchingNextPage && chatFrameRef.current) {
      // 记录之前的滚动位置并在fetch完后移动到该位置, 防止连续多次获取
      const scrollTop = chatFrameRef.current.scrollTop;
      fetchNextPage().then(() => {
        if (chatFrameRef.current) {
          chatFrameRef.current.scrollTo({ top: scrollTop, behavior: "instant" });
        }
      });
    }
  }, [messageEntry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   *处理与组件的各种交互
   */
  const handleMessageSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      return;
    }
    if (!userId) {
      return;
    }

    // 安全获取当前角色信息
    const currentRole = userRolesQuery?.data?.data?.[curRoleIndex];
    const roleId = currentRole?.roleId ?? 0;

    // 安全获取当前头像信息
    const currentAvatars = roleAvatarsQueries[curRoleIndex]?.data?.data || [];
    const avatarIndex = curAvatarIndexes[curRoleIndex] || 0;
    const avatarId = currentAvatars[avatarIndex]?.avatarId ?? 0;

    // 构造消息请求对象
    const messageRequest: ChatMessageRequest = {
      roomId: groupId,
      roleId,
      content: inputText.trim(),
      avatarId,
      messageType: 1,
      body: {}, // 这是什么?
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
    updateCurAvatarIndexes((draft) => {
      const neededLength = roleAvatarsQueries.length - draft.length;
      if (neededLength > 0) {
        draft.push(...Array.from<number>({ length: neededLength }).fill(0));
      }

      // 安全更新索引
      if (curRoleIndex >= 0 && curRoleIndex < draft.length) {
        draft[curRoleIndex] = avatarIndex;
      }

      return draft;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmit(e);
    }
  };

  const handleRoleChange = (roleIndex: number) => {
    setCurRoleIndex(roleIndex);
  };

  /**
   * 条件渲染
   */
  if (userRolesQuery.isLoading || roleAvatarsQueries.some(q => q.isLoading)) {
    return <div>Loading roles...</div>;
  }
  if (userRolesQuery.isError || roleAvatarsQueries.some(q => q.isError)) {
    return <div>Error loading data</div>;
  }

  return (
    <div className="flex flex-row p-6 gap-4 w-full min-w-0">
      {/* 聊天区域主体 */}
      <div className="flex-1 min-w-[480px] flex flex-col overflow-hidden">
        {/* chat messages area */}
        <div className="card bg-base-100 shadow-sm flex-1 overflow-auto">
          {/* 加载指示器 */}
          {isFetchingNextPage && (
            <div className="text-center p-2 text-gray-500">
              加载历史消息中...
            </div>
          )}
          <div className="card-body overflow-y-auto h-[60vh]" ref={chatFrameRef}>
            {historyMessages.map((chatMessageResponse, index) => (
              <div ref={index === 0 ? messageRef : null} key={chatMessageResponse.message.messageID}>
                <ChatBubble
                  chatMessageResponse={chatMessageResponse}
                  useChatBoxStyle={useChatBoxStyle}
                />
              </div>
            ))}
            {receivedMessages.map(receivedMessage => (
              <div key={receivedMessage.message.messageID}>
                <ChatBubble
                  chatMessageResponse={receivedMessage}
                  useChatBoxStyle={useChatBoxStyle}
                />
              </div>
            ))}
          </div>
        </div>

        {/* input area */}

        <form
          onSubmit={handleMessageSubmit}
          className="mt-4 bg-base-100 p-4 rounded-lg shadow-sm"
        >
          <div className="flex gap-2">
            {/* 表情差分展示与选择 */}
            <div className="dropdown dropdown-top">
              {/* 表情展示 */}
              {/* <AvatarComponent */}
              {/*  avatarId={ */}
              {/*    roleAvatarsQueries?.[curRoleIndex]?.data?.data?.[ */}
              {/*      curAvatarIndexes?.[curRoleIndex] ?? 0 */}
              {/*    ]?.avatarId ?? 0 */}
              {/*  } */}
              {/*  width={32} */}
              {/*  isRounded={false} */}
              {/* > */}
              {/* </AvatarComponent> */}
              {/* 上面这么做不能触发daisyUI的组件效果 */}
              <div className="avatar flex justify-center flex-col items-center space-y-2">
                <div className="w-32 h-32 rounded-full">
                  <img
                    src={roleAvatarsQueries[curRoleIndex]?.data?.data?.[
                      curAvatarIndexes?.[curRoleIndex] ?? 0
                    ]?.avatarUrl || undefined}
                    alt="Avatar"
                    className="object-cover w-full h-full" // 确保图片填充容器
                    tabIndex={0}
                    role="button"
                  />
                </div>
                <div>{userRolesQuery.data?.data?.[curRoleIndex]?.roleName || ""}</div>
              </div>
              {/* 表情差分选择器 */}
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-92 p-2 shadow-sm">
                {
                  roleAvatarsQueries[curRoleIndex]?.data?.data
                  && roleAvatarsQueries[curRoleIndex]?.data?.data.length >= 0
                    ? (
                        <div className="grid grid-cols-5 gap-2">
                          {roleAvatarsQueries[curRoleIndex]?.data?.data?.map((avatar, index) => (
                            <img
                              key={avatar.avatarId}
                              className="w-16 h-16 object-cover rounded cursor-pointer hover:ring-2 ring-primary transition-all"
                              src={avatar.avatarUrl}
                              alt={`Avatar ${index}`}
                              onClick={() => handleAvatarChange(index)}
                            />
                          ))}
                        </div>
                      )
                    : (
                        <div className="text-center p-2 text-gray-500 text-sm">
                          暂无可用头像
                        </div>
                      )
                }
              </ul>
            </div>

            <div className="w-full textarea">
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
                  <div tabIndex={0} role="button" className="btn m-1">Choose Role ⬆️</div>
                  <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm">
                    {
                      (userRolesQuery?.data?.data ?? []).map((role, index) => (
                        <li key={role.roleId} onClick={() => handleRoleChange(index)} className="flex, flex-row">
                          <RoleAvatarComponent avatarId={role.avatarId ?? 0} width={10} isRounded={false}>
                          </RoleAvatarComponent>
                          <div>{role.roleName}</div>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              </div>
              <div className="float-right">
                <label className="swap w-30 btn right-2">
                  <input type="checkbox" />
                  <div className="swap-on" onClick={() => setUseChatBoxStyle(false)}>Use Chat Bubble Style</div>
                  <div className="swap-off" onClick={() => setUseChatBoxStyle(true)}>Use Chat Box Style</div>
                </label>
                {/* send button */}
                <button
                  type="submit"
                  className="btn btn-primary "
                  disabled={!inputText.trim()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
      {/* 成员与角色展示框 */}
      <div className="flex flex-row gap-4 overflow-auto w-70 h-max-screen">
        <div className="flex flex-col gap-2 p-4 bg-base-100 rounded-box shadow-sm h-max items-center w-full space-y-4">
          {/* 群成员列表 */}
          <div className="space-y-2">
            <p className="text-center">
              群成员-
              {membersQuery?.data?.data?.length}
            </p>
            {(membersQuery?.data?.data ?? []).map(member => (
              <div key={member.userId} className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center ">
                {/* role列表 */}
                <UserAvatarComponent userId={member.userId ?? 0} width={8} isRounded={true} withName={true}></UserAvatarComponent>
                <div className="flex flex-col items-center gap-2 text-sm font-medium">
                </div>
                <MemberTypeTag memberType={member.memberType}></MemberTypeTag>
              </div>
            ))}
          </div>
          {/* 角色列表 */}
          <div className="space-y-2">
            <p className="text-center">
              角色列表-
              <span className="text-sm">{groupRolesQuery?.data?.data?.length}</span>
            </p>
            {(groupRolesQuery?.data?.data ?? []).map(role => (
              <div key={role.roleId} className="flex flex-row gap-3 p-3 bg-base-200 rounded-lg w-60 items-center ">
                {/* role列表 */}
                <RoleAvatarComponent avatarId={role.avatarId ?? 0} width={8} isRounded={true}></RoleAvatarComponent>
                <div className="flex flex-col items-center gap-2 text-sm font-medium">
                  <span>{role.roleName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DialogueWindow;
