export default function Chat() {
  return (
    <div className="card rounded-3xl border-3 h-screen mt-2 mb-2 relative">
      {/* message部分 */}
      <div className="w-100 pt-10 pl-10 font-black text-3xl text-black">Messaging</div>
      {/* 对话部分 */}
      <div className="chat chat-start">
        <div className="chat-image avatar pl-5">
          <div className="w-10 rounded-full text-2xl text-black inset-auto pl-3.5 bg-gray-300">
            <div className="m-auto">s</div>
          </div>
        </div>

        <div className="chat-bubble bg-gray-300 text-black max-w-xl">
          Hello!how can I help you today?
          <br />
          6:10PM
        </div>
      </div>
      <div className="chat chat-end">
        <div className="chat-image avatar">
          <div className="w-10 rounded-full text-2xl text-white inset-auto pl-3 bg-gray-900">
            <div className="m-auto">u</div>
          </div>
        </div>
        <div className="chat-bubble bg-gray-900 text-white max-w-xl">
          I'm having trouble with my account.Can you help me reset my password?
          <br />
          <div className="text-gray-400">6:11PM</div>
        </div>
      </div>

      <div className="chat chat-start">
        <div className="chat-image avatar pl-5">
          <div className="w-10 rounded-full text-2xl text-black inset-auto pl-3.5 bg-gray-300">
            <div className="m-auto">s</div>
          </div>
        </div>

        <div className="chat-bubble bg-gray-400 text-black max-w-xl">
          Of course!I'll need to verify your identity first.Can you confirm your email address?
          <br />
          6:12PM
        </div>
      </div>
      <div className="chat chat-start">
        <div className="chat-image avatar pl-5">
          <div className="w-10 rounded-full text-2xl text-white inset-auto pl-3 pt-1 bg-yellow-400">
            <div className="m-auto">A</div>
          </div>
        </div>

        <div className="chat-bubble bg-yellow-100 text-orange-950 max-w-xl">
          This conversation has been flagger for review
          <br />
          6:13PM
        </div>
      </div>
      {/* 发送框部分 */}
      <div className="absolute bottom-0 border-t-2 h-2/10 w-full p-4 ">
        <div className="border-1 h-4/5 rounded-2xl relative">
          <div className="text-gray-400 p-2">Type you message...</div>
          <div className="mt-5 ml-4 w-3/10 border-1 h-1/3 p-1 rounded-xl text-black border-gray-300">
            User
            <div className="float-right rotate-90 mr-3 text-gray-500">&gt;</div>
          </div>
          <div className="bg-black absolute right-3 bottom-1 h-4/10 w-1/15 rounded-xl text-center pt-2">图</div>
        </div>
      </div>
    </div>
  );
}
