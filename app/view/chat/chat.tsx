import DialogueWindow from "@/view/chat/components/dialogueWindow";

export default function Chat() {
  return (
    <div className="min-h-screen bg-base-200">
      {/* 骨架结构, 纯为了测试 */}
      <div className="flex h-screen">
        {/* 侧边栏骨架 */}
        <aside className="w-64 bg-base-100 border-r p-4 animate-pulse">
        </aside>
        <DialogueWindow groupId={1}>
        </DialogueWindow>
        {/* <aside className="w-64 bg-base-100 border-r p-4 animate-pulse"> */}
        {/* </aside> */}
      </div>
    </div>
  );
}
