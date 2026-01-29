import { useEffect, useMemo } from "react";

import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { useAudioPlaybackStore } from "@/components/common/audioPlaybackStore";

export default function BgmPlaybackRegistry() {
  const isPlaying = useBgmStore(state => state.isPlaying);
  const playingRoomId = useBgmStore(state => state.playingRoomId);
  const trackByRoomId = useBgmStore(state => state.trackByRoomId);

  const playingTrack = useMemo(() => {
    if (!playingRoomId)
      return undefined;
    return trackByRoomId[playingRoomId];
  }, [playingRoomId, trackByRoomId]);

  useEffect(() => {
    const id = playingRoomId ? `bgm:${playingRoomId}` : undefined;

    if (id && isPlaying && playingTrack?.url) {
      useAudioPlaybackStore.getState().register({
        id,
        kind: "bgm",
        title: playingTrack.fileName || "BGM",
        url: playingTrack.url,
        pause: () => {
          if (playingRoomId == null)
            return;
          void useBgmStore.getState().userToggle(playingRoomId!);
        },
        stop: () => {
          useBgmStore.getState().onBgmStopFromWs(playingRoomId!);
        },
        isPlaying: true,
      });
      return;
    }

    if (id) {
      useAudioPlaybackStore.getState().unregister(id);
    }
  }, [isPlaying, playingRoomId, playingTrack?.fileName, playingTrack?.url]);

  return null;
}
