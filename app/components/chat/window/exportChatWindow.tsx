import type { ChatMessageResponse } from "../../../../api";
import ExportChatDrawer from "@/components/chat/room/drawers/exportChatDrawer";

type ExportChatWindowProps = {
  selectedMessages: ChatMessageResponse[];
  onClose: () => void;
};

export default function ExportChatWindow({ selectedMessages, onClose }: ExportChatWindowProps) {
  return (
    <div className="flex flex-col gap-2 p-0 w-[520px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
      <ExportChatDrawer messages={selectedMessages} onClose={onClose} />
    </div>
  );
}
