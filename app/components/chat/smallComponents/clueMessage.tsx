import type { ChatMessageResponse } from "api";
import BetterImg from "@/components/common/betterImg";
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
        {/* 线索核心信息 */}
        <div className="space-y-3">
          {/* 线索名称 */}
          <h4 className="text-lg font-semibold text-info">{clueMessage.name}</h4>

          {/* 线索图片 + 描述 */}
          <div className="flex gap-3 flex-wrap">
            {/* 线索图片 */}
            {clueMessage.img && (
              <div className="w-32 h-32 rounded overflow-hidden flex-shrink-0 border border-base-300">
                <BetterImg
                  src={clueMessage.img}
                  className="w-full h-full object-cover cursor-pointer"
                  key={`${clueMessage.name}的图片`}
                />
              </div>
            )}

            {/* 线索描述 */}
            <p className="text-base text-base-content/90 flex-1 min-w-[200px]">
              {clueMessage.description || "无描述信息"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClueMessage;
