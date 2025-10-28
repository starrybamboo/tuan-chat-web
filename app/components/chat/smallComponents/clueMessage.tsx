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

  const hasImage = clueMessage.img && clueMessage.img.trim() !== "";

  return (
    <div className="flex gap-3 p-3 w-full max-w-3xl mx-auto">
      <div className="flex-1 bg-base-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-3">
          {/* 线索名称 */}
          <h4 className="text-lg font-semibold text-info">{clueMessage.name}</h4>

          {/* 线索图片 + 描述 */}
          <div className="relative">
            {/* 线索图片 */}
            {hasImage
              ? (
                  <div className="float-left mr-3 mb-3 w-32 rounded overflow-hidden border border-base-300">
                    <BetterImg
                      src={clueMessage.img}
                      className="w-full h-full object-cover cursor-pointer aspect-square relative z-10"
                      key={`${clueMessage.name}-img`}
                    />
                  </div>
                )
              : (
                  <div className="float-left mr-3 mb-3 w-32 h-32 rounded border-2 border-dashed border-base-300 flex items-center justify-center bg-base-100">
                    <div className="text-center text-base-content/60">
                      <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">暂无图片</span>
                    </div>
                  </div>
                )}

            {/* 线索描述 */}
            <div className={`text-base text-base-content/90 ${hasImage ? "min-h-[128px]" : ""}`}>
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
