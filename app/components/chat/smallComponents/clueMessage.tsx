import type { ChatMessageResponse } from "api";
import BetterImg from "@/components/common/betterImg";
import MarkdownMentionViewer from "@/components/common/quillEditor/MarkdownMentionViewer";
import { useMemo } from "react";

function ClueMessage({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  const { message } = messageResponse;
  const clueMessage = useMemo(() => {
    if (message.extra?.clueMessage) {
      return message.extra.clueMessage;
    }
    return { name: "未知线索", description: "", img: "" };
  }, [message.extra]);

  return (
    <div className="flex gap-3 p-3 w-full max-w-3xl mx-auto">
      <div className="flex-1 bg-base-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-3">
          {/* 线索名称 */}
          <h4 className="text-lg font-semibold text-info">{clueMessage.name}</h4>

          {/* 线索图片 + 描述 */}
          <div className="relative">

            {/* 线索图片 */}
            {clueMessage.img && (
              <div className="float-left mr-3 mb-3 w-32 rounded overflow-hidden border border-base-300">
                <BetterImg
                  src={clueMessage.img}
                  className="w-full h-full object-cover cursor-pointer aspect-square relative z-10"
                  key={`${clueMessage.name}-img`}
                />
              </div>
            )}

            {/* 线索描述 */}
            <div className="text-base text-base-content/90 min-h-[128px]">
              <MarkdownMentionViewer
                markdown={clueMessage.description || "无描述信息"}
                enableHoverPreview={true}
              />
              <div className="clear-both"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClueMessage;
