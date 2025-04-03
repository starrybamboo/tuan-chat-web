import type { Message } from "@/view/chat/components/message";

import type { RoleVO } from "@/view/chat/components/role";
import type { FormEvent } from "react";

import type { UserRole } from "../../../../api";
import { ChatBox } from "@/view/chat/components/chatBox";

import { ChatBubble } from "@/view/chat/components/chatBubble";
import { mockMessages } from "@/view/chat/components/message";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useImmer } from "use-immer";
import { tuanchat } from "../../../../api/instance";

// Here are two different chat styles.

export function DialogueWindow({ groupId }: { groupId: number }) {
  const [inputText, setInputText] = useState("");
  const [curRoleIndex, setCurRoleIndex] = useState(0);
  const [roleVOs, updateRoleVOs] = useImmer<RoleVO[]>([]); // 先初始化空数组
  const [useChatBoxStyle, setUseChatBoxStyle] = useState(true);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  // 数据请求
  const curAvatarRolesQuery = useQuery({
    queryKey: ["groupRoleController.groupRole", groupId],
    queryFn: () => tuanchat.groupRoleController.groupRole(groupId),
  });
  const roleAvatarsQueries = useQueries({
    queries: (curAvatarRolesQuery.data?.data || []).map((role: UserRole) => ({
      queryKey: ["roleController.getRoleAvatars", role.roleId],
      queryFn: () => tuanchat.roleController.getRoleAvatars(role.roleId),
      enabled: !!curAvatarRolesQuery.data,
    })),
  });

  // 数据加载完成后更新 roleVOs
  useEffect(() => {
    if (
      curAvatarRolesQuery.data?.data
      && roleAvatarsQueries.every(q => q.isSuccess)
    ) {
      // 先准备新数据
      const newRoles = curAvatarRolesQuery.data.data.map((role, index) => ({
        userRole: role,
        roleAvatars: roleAvatarsQueries[index].data?.data || [],
        currentAvatarIndex: 0,
      }));
      if (JSON.stringify(newRoles) !== JSON.stringify(roleVOs)) {
        updateRoleVOs(() => newRoles);
      }
    }
  }, [curAvatarRolesQuery.data?.data, curAvatarRolesQuery.dataUpdatedAt, roleAvatarsQueries, roleVOs, updateRoleVOs]);

  // 条件渲染放在最后
  if (curAvatarRolesQuery.isLoading || roleAvatarsQueries.some(q => q.isLoading)) {
    return <div>Loading roles...</div>;
  }
  if (curAvatarRolesQuery.isError || roleAvatarsQueries.some(q => q.isError)) {
    return <div>Error loading data</div>;
  }
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      const userMessage: Message = {
        avatar: roleVOs[curRoleIndex].roleAvatars[roleVOs[curRoleIndex].currentAvatarIndex],
        userRole: roleVOs[curRoleIndex].userRole,
        messageId: Date.now(),
        content: inputText.trim(),
        type: 0,
        createTime: new Date(Date.now()),
        userId: 0,
        roleId: 0,
        updateTime: new Date(Date.now()),
      };
      setMessages([...messages, userMessage]);
      setInputText("");
    }
  };

  const handleAvatarChange = (avatarIndex: number) => {
    updateRoleVOs((draft) => {
      draft[curRoleIndex].currentAvatarIndex = avatarIndex;
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
    <div className="flex-1 overflow-hidden p-6">
      <div className="h-full flex flex-col">
        {/* chat messages area */}
        <div className="card bg-base-100 shadow-sm flex-1 overflow-auto">
          <div className="card-body overflow-y-auto">
            {messages.map(message => (
              useChatBoxStyle
                ? (
                    <ChatBox message={message} key={message.messageId} />
                  )
                : (
                    <ChatBubble
                      key={message.messageId}
                      message={message}
                    />
                  )
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
              <div className="avatar flex justify-center">
                <div className="w-32 h-32 rounded-full">
                  <img
                    src={roleVOs[curRoleIndex]?.roleAvatars[roleVOs[curRoleIndex].currentAvatarIndex]?.avatarUrl || ""}
                    alt="Avatar"
                    className="object-cover w-full h-full" // 确保图片填充容器
                    tabIndex={0}
                    role="button"
                  />
                </div>
              </div>

              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-92 p-2 shadow-sm">
                {
                  roleVOs
                  && roleVOs.length >= 0
                  && roleVOs[curRoleIndex]
                  && roleVOs[curRoleIndex].roleAvatars
                  && roleVOs[curRoleIndex].roleAvatars.length > 0
                    ? (
                        <div className="grid grid-cols-5 gap-2">
                          {roleVOs[curRoleIndex].roleAvatars.map((avatar, index) => (
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
                      roleVOs.map((role, index) => (
                        <li key={role.userRole.roleId} onClick={() => handleRoleChange(index)}>
                          <div className="avatar">
                            <div className="w-8 rounded">
                              <img
                                src={role.roleAvatars[0].avatarUrl}
                                alt="Avatar"
                              />
                            </div>
                            {`  ${role.userRole?.roleName ?? ""}`}
                          </div>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              </div>
              <div className="float-right">
                <label className="swap w-30 btn right-2">
                  <input type="checkbox" />
                  <div className="swap-on" onClick={() => setUseChatBoxStyle(true)}>Use Chat Bubble Style</div>
                  <div className="swap-off" onClick={() => setUseChatBoxStyle(false)}>Use Chat Box Style</div>
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
    </div>
  );
}

export default DialogueWindow;
