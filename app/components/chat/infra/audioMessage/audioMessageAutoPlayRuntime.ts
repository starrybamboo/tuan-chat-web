import type { AudioAutoPlayPurpose } from "@/components/chat/infra/audioMessage/audioMessageAutoPlayPolicy";

import { requestPlayBgmMessageWithUrl } from "@/components/chat/infra/audioMessage/audioMessageBgmCoordinator";
import { useAudioMessageAutoPlayStore } from "@/components/chat/stores/audioMessageAutoPlayStore";

type AutoPlayTriggerSource = "ws" | "localSend";

type TriggerAudioAutoPlayParams = {
  source: AutoPlayTriggerSource;
  roomId: number;
  messageId: number;
  purpose: AudioAutoPlayPurpose;
  url?: string;
};

export function triggerAudioAutoPlay(params: TriggerAudioAutoPlayParams) {
  const store = useAudioMessageAutoPlayStore.getState();
  const event = params.source === "ws"
    ? store.enqueueFromWs({
        roomId: params.roomId,
        messageId: params.messageId,
        purpose: params.purpose,
      })
    : store.enqueueFromLocalSend({
        roomId: params.roomId,
        messageId: params.messageId,
        purpose: params.purpose,
      });

  if (!event) {
    return undefined;
  }

  const url = typeof params.url === "string" ? params.url.trim() : "";
  if (params.purpose === "bgm" && url) {
    void requestPlayBgmMessageWithUrl(params.roomId, params.messageId, url);
  }

  return event;
}
