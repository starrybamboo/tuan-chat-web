import type { FormEvent } from "react";
import type { RoleAvatar, UserRole } from "../../api";

import { useState } from "react";
import { useImmer } from "use-immer";

interface Role {
  userRole: UserRole;
  roleAvatars: RoleAvatar[];
  currentAvatarIndex: number;
}

interface Message {
  avatar: RoleAvatar;
  userRole: UserRole;
  messageId: number;
  userId: number;
  roleId: number;
  content: string;
  type: number; // 0: system, 1: user, 2: group
  createTime: Date;
  updateTime: Date;
}

// Here are two different chat styles.

/**
 * 聊天风格的对话框组件
 * @param message
 * @constructor
 */
function ChatBubble({ message }: { message: Message }) {
  return (
  // <div className={message.type !== "user" ? "chat chat-start" : "chat chat-end"} key={message.id}>
    <div className="chat chat-start" key={message.messageId}>
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img
            alt="Tailwind CSS chat bubble component"
            src={message.avatar.avatarUrl}
          />
        </div>

      </div>
      <div
        className={message.type !== 1 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}
      >
        <div style={{ whiteSpace: "pre-wrap" }}>
          {message.content}
        </div>
      </div>
      <div className="chat-footer">
        {message.userRole.roleName}
        <time className="text-xs opacity-50">
          {message.createTime.toLocaleString()}
        </time>
      </div>
      {/* <div className="chat-footer opacity-50">Seen</div> */}
    </div>
  );
}

/**
 * Gal风格的对话框组件
 * @param message
 * @constructor
 */
function ChatBox({ message }: { message: Message }) {
  return (
    <div className="flex w-full mb-4" key={message.messageId}>
      {/* 圆角矩形头像（始终显示） */}
      <div className="flex-shrink-0 mr-3">
        <div className="w-20 h-20 rounded-md overflow-hidden">
          <img
            alt={message.userRole.roleName}
            src={message.avatar.avatarUrl}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 消息内容 */}
      <div className="flex-1">
        {/* 角色名（始终显示） */}
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {message.userRole.roleName}
        </div>

        {/* 消息文本（纯文字，无边框） */}
        <div
          className="text-base text-gray-700 dark:text-gray-300 mt-1"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {message.content}
        </div>

        {/* 时间（小字，低调） */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {message.createTime.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export function DialogueWindow() {
  const [inputText, setInputText] = useState("");
  const [curRoleId, setCurRoleId] = useState(1);
  const [roles, updateRoles] = useImmer<Role[]>([
    {
      userRole: {
        userId: 0,
        roleId: 0,
        roleName: "系统",
        description: "系统",
        avatarId: 0,
        createTime: (new Date(Date.now() - 40000)).toString(),
        updateTime: (new Date(Date.now() - 40000)).toString(),
      },
      roleAvatars: [
        {
          avatarId: 0,
          avatarUrl: "https://avatars.githubusercontent.com/u/47094597?v=4",
          roleId: 0,
        },
      ],
      currentAvatarIndex: 0,
    },
    {
      userRole: {
        userId: 0,
        roleId: 1,
        roleName: "用户",
        description: "旧都",
        avatarId: 0,
        createTime: (new Date(Date.now() - 40000)).toString(),
        updateTime: (new Date(Date.now() - 40000)).toString(),
      },
      roleAvatars: [
        {
          avatarId: 3,
          avatarUrl: "https://entropy622.github.io/img/avatar_hud9e0e7c4951e871acf83365066e399f1_1041756_300x0_resize_box_3.png",
          roleId: 1,
        },
        {
          avatarId: 4,
          avatarUrl: "https://avatars.githubusercontent.com/u/176760093?v=4",
          roleId: 1,
        },
      ],
      currentAvatarIndex: 0,
    },
    {
      userRole: {
        userId: 0,
        roleId: 2,
        roleName: "兴爷",
        description: "兴爷",
        avatarId: 5,
        createTime: (new Date(Date.now() - 40000)).toString(),
        updateTime: (new Date(Date.now() - 40000)).toString(),
      },
      roleAvatars: [
        {
          avatarId: 6,
          avatarUrl: "https://avatars.githubusercontent.com/u/107794984?v=4",
          roleId: 2,
        },
        {
          avatarId: 7,
          avatarUrl: "https://entropy622.github.io/img/avatar_hud9e0e7c4951e871acf83365066e399f1_1041756_300x0_resize_box_3.png",
          roleId: 2,
        },
      ],
      currentAvatarIndex: 0,
    },
  ]);
  const [useChatBoxStyle, setUseChatBoxStyle] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      avatar: roles[0].roleAvatars[0],
      userRole: roles[0].userRole,
      messageId: 1,
      content: "团聚共创聊天室demo",
      type: 0,
      createTime: new Date(Date.now() - 40000),
      userId: 0,
      roleId: 0,
      updateTime: new Date(Date.now() - 40000),
    },
    {
      avatar: roles[1].roleAvatars[0],
      userRole: roles[1].userRole,
      messageId: 2,
      content: "gugugaga\ngugugaga!",
      type: 1,
      createTime: new Date(Date.now() - 40000),
      userId: 0,
      roleId: 0,
      updateTime: new Date(Date.now() - 40000),
    },
    {
      avatar: roles[2].roleAvatars[0],
      userRole: roles[2].userRole,
      messageId: 3,
      content: "喵喵喵喵喵喵",
      type: 1,
      createTime: new Date(Date.now() - 40000),
      userId: 0,
      roleId: 0,
      updateTime: new Date(Date.now() - 40000),
    },
  ]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      const userMessage: Message = {
        avatar: roles[curRoleId].roleAvatars[roles[curRoleId].currentAvatarIndex],
        userRole: roles[curRoleId].userRole,
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
    updateRoles((draft) => {
      draft[curRoleId].currentAvatarIndex = avatarIndex;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
                    src={roles[curRoleId].roleAvatars[roles[curRoleId].currentAvatarIndex].avatarUrl}
                    alt="Avatar"
                    tabIndex={0}
                    role="button"
                  />
                </div>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
                {
                  roles[curRoleId].roleAvatars.map((avatar, index) => (
                    <img
                      src={avatar.avatarUrl}
                      alt="Avatar"
                      tabIndex={0}
                      key={avatar.avatarId}
                      onClick={() => handleAvatarChange(index)}
                    />
                  ))
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
                      roles.map(role => (
                        <li key={role.userRole.roleId} onClick={() => setCurRoleId(role.userRole.roleId)}>
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
