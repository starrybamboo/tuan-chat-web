import type { ChatMessageResponse } from "../../../../../api";
import { use, useMemo } from "react";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import BetterImg from "@/components/common/betterImg";

function ClueMessage({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  const { message } = messageResponse;

  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext?.spaceId;

  const clueMessage = useMemo(() => {
    // 同时兼容 extra.clueMessage 与旧的扁平 extra
    const cm = (message.extra as any)?.clueMessage ?? null;
    if (cm)
      return cm;
    const extra = (message.extra as any) ?? {};
    return { name: extra.name ?? "未知线索", description: extra.description ?? "", img: extra.img ?? "", clueId: extra.clueId };
  }, [message.extra]);

  const hasImage = Boolean(clueMessage.img && String(clueMessage.img).trim() !== "");
  const clueId = Number((clueMessage as any)?.clueId ?? 0);
  const canUseBlocksuite = Boolean(spaceId && clueId > 0);

  return (
    <div className="flex gap-3 p-3 w-full max-w-3xl mx-auto">
      <div className="flex-1 bg-base-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-info">{clueMessage.name}</h4>

          <div className="relative">
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

            <div className={`text-base text-base-content/90 ${hasImage ? "min-h-[128px]" : ""}`}>
              <div className="h-full min-h-[128px]">
                {canUseBlocksuite
                  ? (
                      <BlocksuiteDescriptionEditor
                        workspaceId={`space:${spaceId}`}
                        spaceId={spaceId}
                        docId={buildSpaceDocId({ kind: "clue_description", clueId })}
                        mode="page"
                        variant="full"
                        className="h-full"
                        tcHeader={{ enabled: false }}
                      />
                    )
                  : (
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {String(clueMessage.description || "无描述信息")}
                      </div>
                    )}
              </div>
              <div className="clear-both"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClueMessage;
