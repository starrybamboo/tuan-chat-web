import type { FormEvent } from "react";
import { useState } from "react";

interface Avatar {
  name: string;
  id: number;
  img: string;
}

interface Message {
  avatar: Avatar;
  id: string;
  content: string;
  type: "user" | "system" | "error";
  timestamp: Date;
}

function ChatBubble({ message }: { message: Message }) {
  return (
  // <div className={message.type !== "user" ? "chat chat-start" : "chat chat-end"} key={message.id}>
    <div className="chat chat-start" key={message.id}>
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img
            alt="Tailwind CSS chat bubble component"
            src={message.avatar.img}
          />
        </div>

      </div>
      <div
        className={message.type !== "user" ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}
      >
        <div style={{ whiteSpace: "pre-wrap" }}>
          {message.content}
        </div>
      </div>
      <div className="chat-footer">
        {message.avatar.name}
        <time className="text-xs opacity-50">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </time>
      </div>
      {/* <div className="chat-footer opacity-50">Seen</div> */}
    </div>
  );
}

export function DialogueWindow() {
  const [inputText, setInputText] = useState("");
  const [curAvatarId, setCurAvatarId] = useState(1);
  const [avatars] = useState<Avatar[]>([
    {
      name: "系统",
      id: 0,
      img: "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp",
    },
    {
      name: "用户",
      id: 1,
      img: "https://entropy622.github.io/img/avatar_hud9e0e7c4951e871acf83365066e399f1_1041756_300x0_resize_box_3.png",
    },
    {
      name: "兴爷",
      id: 2,
      img: "https://avatars.githubusercontent.com/u/107794984?v=4",
    },
  ]);
  const [messages, setMessages] = useState<Message[]>([
    {
      avatar: avatars[0],
      id: "1",
      content: "团聚共创聊天室demo",
      type: "system",
      timestamp: new Date(Date.now() - 60000),
    },
    {
      avatar: avatars[1],
      id: "2",
      content: "乐",
      type: "user",
      timestamp: new Date(Date.now() - 40000),
    },
    {
      avatar: avatars[2],
      id: "2",
      content: "典",
      type: "user",
      timestamp: new Date(Date.now() - 40000),
    },
    {
      avatar: avatars[1],
      id: "3",
      content: "你说的对但是\n你说的对\n",
      type: "user",
      timestamp: new Date(Date.now() - 40000),
    },
  ]);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      const userMessage: Message = {
        avatar: avatars[curAvatarId], // TODO: replace it with true name
        id: Date.now().toString(),
        content: inputText,
        type: "user",
        timestamp: new Date(),
      };
      setMessages([...messages, userMessage]);
      setInputText("");
    }
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
              <ChatBubble
                key={message.id}
                message={message}
              />
            ))}
          </div>
        </div>
        {/* input area */}
        <form
          onSubmit={handleSubmit}
          className="mt-4 bg-base-100 p-4 rounded-lg shadow-sm"
        >
          <div className="flex gap-2">
            {/* avatar selector */}
            <div className="flex items-center">
              <div className="dropdown dropdown-top">
                <div tabIndex={0} role="button" className="btn m-1">Choose Avatar ⬆️</div>
                <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-30 p-2 shadow-sm">
                  {
                    avatars.filter(avatar => avatar.id !== 0).map(avatar => (
                      <li key={avatar.id} onClick={() => setCurAvatarId(avatar.id)}>
                        <div className="avatar">
                          <div className="w-8 rounded">
                            <img
                              src={avatar.img}
                              alt={`id:${avatar.id}`}
                            />
                          </div>
                          {`  ${avatar.name}`}
                        </div>
                      </li>
                    ))
                  }
                </ul>
              </div>
              <div className="avatar flex justify-center">
                <div className="w-8 rounded-full">
                  <img
                    src={avatars[curAvatarId].img}
                    alt={`id:${avatars[curAvatarId].id}`}
                  />
                </div>
              </div>
            </div>

            {/* show the avatar img before the text input */}

            {/* text input */}
            <textarea
              className="textarea textarea-bordered w-full h-20 md:h-32 lg:h-40 resize-none"
              rows={3}
              placeholder="Enter your message here...(shift+enter to change line)"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {/* send button */}
            <button
              type="submit"
              className="btn btn-primary"
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
        </form>
      </div>
    </div>
  );
}

export default DialogueWindow;
