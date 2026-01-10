import React from "react";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { MusicNote } from "@/icons";

export default function BgmFloatingBall({ roomId }: { roomId: number }) {
  const track = useBgmStore(state => state.trackByRoomId[roomId]);
  const dismissed = useBgmStore(state => Boolean(state.userDismissedByRoomId[roomId]));
  const isPlaying = useBgmStore(state => state.isPlaying && state.playingRoomId === roomId);
  const userToggle = useBgmStore(state => state.userToggle);

  if (!track || dismissed)
    return null;

  return (
    <div className="fixed right-4 bottom-32 z-50 pointer-events-auto">
      <button
        type="button"
        className="btn btn-circle btn-sm bg-base-100 border border-base-300 shadow-sm"
        title={isPlaying ? "关闭BGM（仅自己）" : "开启BGM"}
        onClick={() => void userToggle(roomId)}
      >
        <div className="relative">
          <MusicNote className={`size-5 ${isPlaying ? "text-primary" : "opacity-70"}`} />
          {!isPlaying && (
            <span className="absolute -right-1 -top-1 text-[10px] leading-none opacity-70">
              ▶
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
