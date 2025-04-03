import type { FormEvent } from "react";

import type { ChatMessageRequest, Message, UserRole } from "../../../../api";

import { ChatBubble } from "@/view/chat/components/chatBubble";

import AvatarComponent from "@/view/common/avatar";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useImmer } from "use-immer";
import { tuanchat } from "../../../../api/instance";

export function DialogueWindow({ groupId }: { groupId: number }) {
  const [inputText, setInputText] = useState("");
  const [curRoleIndex, setCurRoleIndex] = useState(0);
  // const [roleVOs, updateRoleVOs] = useImmer<RoleVO[]>([]); // 先初始化空数组
  const [curAvatarIndexes, updateCurAvatarIndexes] = useImmer<number[]>([]); // curAvatarIndexes[i] 表示role[i]的头像索引
  const [useChatBoxStyle, setUseChatBoxStyle] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);

  // 数据请求
  const userRolesQuery = useQuery({
    queryKey: ["groupRoleController.groupRole", groupId],
    queryFn: () => tuanchat.groupRoleController.groupRole(groupId),
  });
  const roleAvatarsQueries = useQueries({
    queries: (userRolesQuery.data?.data || []).map((role: UserRole) => ({
      queryKey: ["roleController.getRoleAvatars", role.roleId],
      queryFn: () => tuanchat.roleController.getRoleAvatars(role.roleId),
      enabled: !!userRolesQuery.data,
    })),
  });

  // 条件渲染放在最后
  if (userRolesQuery.isLoading || roleAvatarsQueries.some(q => q.isLoading)) {
    return <div>Loading roles...</div>;
  }
  if (userRolesQuery.isError || roleAvatarsQueries.some(q => q.isError)) {
    return <div>Error loading data</div>;
  }

  const sendMessage = (messageRequest: ChatMessageRequest) => {
    // TOD 发送消息到后端
    const message: Message = {
      messageID: Date.now(), // TOD:把他改为后端返回的值
      syncId: 1,
      roomId: groupId,
      userId: 1,
      roleId: messageRequest.roleId,
      content: messageRequest.content,
      avatarId: messageRequest.avatarId,
      status: 1,
      messageType: 1,
    };
    return message;
  };
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
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
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      body: -1, // TOD 这是什么?
    };

    // 发送消息
    const message: Message = sendMessage(messageRequest);

    // 更新消息列表
    setMessages(prev => [...prev, message]);
    setInputText("");
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
      handleSubmit(e);
    }
  };

  const handleRoleChange = (roleIndex: number) => {
    setCurRoleIndex(roleIndex);
  };

  return (
    <div className="flex space-x-2 flex-row overflow-hidden p-6 w-max">
      {/* 聊天区域主体 */}
      <div className="h-full flex flex-col">
        {/* chat messages area */}
        <div className="card bg-base-100 shadow-sm flex-1 overflow-auto">
          <div className="card-body overflow-y-auto">
            {messages.map(message => (
              <ChatBubble message={message} useChatBoxStyle={useChatBoxStyle} key={message.messageID} />
            ))}
          </div>
        </div>

        {/* input area */}

        <form
          onSubmit={handleSubmit}
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
              <div className="avatar flex justify-center">
                <div className="w-32 h-32 rounded-full">
                  <img
                    src={roleAvatarsQueries?.[curRoleIndex]?.data?.data?.[
                      curAvatarIndexes?.[curRoleIndex] ?? 0
                    ]?.avatarUrl || ""}
                    alt="Avatar"
                    className="object-cover w-full h-full" // 确保图片填充容器
                    tabIndex={0}
                    role="button"
                  />
                </div>
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
                {/* role selector */}
                <div className="dropdown dropdown-top">
                  <div tabIndex={0} role="button" className="btn m-1">Choose Role ⬆️</div>
                  <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-30 p-2 shadow-sm">
                    {
                      (userRolesQuery?.data?.data ?? []).map((role, index) => (
                        <li key={role.roleId} onClick={() => handleRoleChange(index)}>
                          <AvatarComponent avatarId={role.avatarId ?? 0} width={8} isRounded={false}>
                          </AvatarComponent>
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
      <div className="flex flex-row gap-4 overflow-auto">
        <div className="flex flex-col gap-2 p-4 bg-base-100 rounded-box shadow-sm h-max items-center">
          <p>角色列表</p>
          {(userRolesQuery?.data?.data ?? []).map(role => (
            <div key={role.roleId} className="flex flex-col gap-3 p-3 bg-base-200 rounded-lg">
              {/* role列表 */}
              <div className="flex flex-col items-center gap-2 text-sm font-medium">
                <span>{role.roleName}</span>
              </div>
              <AvatarComponent avatarId={role.avatarId ?? 0} width={18} isRounded={false}></AvatarComponent>
            </div>
          ))}
        </div>
      </div>
    </div>

  );
}

export default DialogueWindow;
