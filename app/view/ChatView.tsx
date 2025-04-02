export function ChatView() {
  return (
    <div className="flex flex-col h-screen bg-base-100">
      {/* 标题栏 */}
      <div className="navbar bg-base-100 border-b">
        <div className="flex-1">
          <h1 className="text-xl font-semibold px-4">Messaging</h1>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 其他消息 */}
        <div className="chat chat-start">
          <div className="chat-image avatar">
            <div className="w-10 rounded-full bg-base-300">
              <span className="text-base-content text-lg flex items-center justify-center w-full h-full">S</span>
            </div>
          </div>
          <div className="chat-bubble">Hello! How can I help you today?</div>
          <div className="chat-footer opacity-50 text-xs">6:10 PM</div>
        </div>

        {/* 用户消息 */}
        <div className="chat chat-end">
          <div className="chat-image avatar">
            <div className="w-10 rounded-full bg-neutral">
              <span className="text-neutral-content text-lg flex items-center justify-center w-full h-full">U</span>
            </div>
          </div>
          <div className="chat-bubble chat-bubble-neutral">I'm having trouble with my account. Can you help me reset my password?</div>
          <div className="chat-footer opacity-50 text-xs">6:11 PM</div>
        </div>

        {/* 其他消息 */}
        <div className="chat chat-start">
          <div className="chat-image avatar">
            <div className="w-10 h-10 rounded-full bg-base-300">
              <span className="text-base-content text-lg flex items-center justify-center w-full h-full">S</span>
            </div>
          </div>
          <div className="chat-bubble">Of course! I'll need to verify your identity first. Can you confirm your email address?</div>
          <div className="chat-footer opacity-50 text-xs">6:12 PM</div>
        </div>

        {/* 系统消息 */}
        <div className="bg-warning/20 rounded-lg">
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center">
                <span className="text-warning-content flex items-center justify-center w-full h-full">A</span>
              </div>
            </div>
            <div className="chat-bubble bg-warning">This conversation has been flagged for review.</div>
            <div className="chat-footer text-xs opacity-50">6:13 PM</div>
          </div>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t p-4 bg-base-100">
        <div className="flex gap-2">
          <div className="dropdown dropdown-top">
            <div tabIndex={0} role="button" className="btn m-1">User</div>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
          <input
            type="text"
            placeholder="Type your message..."
            className="input input-bordered flex-1"
          />
          <button
            type="submit"
            className="btn btn-circle btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
