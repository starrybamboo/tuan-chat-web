import type { Message } from "@/view/chat/components/message";

import type { Role } from "@/view/chat/components/role";
import type { FormEvent } from "react";

import { ChatBox } from "@/view/chat/components/chatBox";
import { ChatBubble } from "@/view/chat/components/chatBubble";

import { mockMessages } from "@/view/chat/components/message";
import { mockRoles } from "@/view/chat/components/role";

import { useState } from "react";
import { useImmer } from "use-immer";

// Here are two different chat styles.

export function DialogueWindow() {
  const [inputText, setInputText] = useState("");
  const [curRoleId, setCurRoleId] = useState(1);
  const [roles, updateRoles] = useImmer<Role[]>(mockRoles);
  const [useChatBoxStyle, setUseChatBoxStyle] = useState(true);
  const [messages, setMessages] = useState<Message[]>(mockMessages);

  // // 修正RoleControllerService实例化，使用OpenAPI配置
  // const roleControllerService = new RoleControllerService(new FetchHttpRequest(OpenAPI));
  //
  // // 新增示例方法调用/capi/role/avatar接口
  // const fetchRoleAvatars = async (roleId: number) => {
  //   try {
  //     const result = await roleControllerService.getRoleAvatars(roleId);
  //     console.log("Role avatars:", result.data);
  //   }
  //   catch (error) {
  //     console.error("Failed to fetch role avatars:", error);
  //   }
  // };
  //
  // useEffect(() => { fetchRoleAvatars(1); });
  // // 示例调用（假设在某个按钮点击事件中）
  // const handleAvatarButton = () => {
  //   fetchRoleAvatars(1); // 传入roleId参数
  // };

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
