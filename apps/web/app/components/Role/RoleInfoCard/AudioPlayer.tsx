// 角色音频预览播放器，复用聊天室音频消息的波形播放器。
// 支持删除角色音频并同步到外部状态。
import type { MouseEvent } from "react";

import AudioMessage from "@/components/chat/message/media/AudioMessage";
import { IconButton } from "@/components/common/IconButton";

import type { Role } from "../types";

import { buildRoleVoiceClearPatch, resolveRoleVoiceUrl } from "../roleVoiceMedia";

type AudioPlayerProps = {
  role: Role;
  size?: "default" | "compact";
  onRoleUpdate?: (updatedRole: Role) => void;
  onDelete?: () => void;
}

export default function AudioPlayer({ role, size = "default", onRoleUpdate, onDelete }: AudioPlayerProps) {
  const isCompact = size === "compact";

  const handleDeleteAudio = (e: MouseEvent) => {
    e.stopPropagation();
    const updatedRole = { ...role, ...buildRoleVoiceClearPatch() };

    if (onDelete) {
      onDelete();
    }

    if (onRoleUpdate) {
      onRoleUpdate(updatedRole);
    }
  };

  const audioSrc = resolveRoleVoiceUrl(role);
  if (!audioSrc) {
    return null;
  }

  return (
    <div className={isCompact ? "mt-2 pt-2" : `
      mt-3 pt-3 border-t border-base-content/10
    `}>
      <div className={isCompact ? "space-y-2" : "space-y-3"}>
        <div className={`
          flex items-center gap-2
          ${isCompact ? "" : "gap-3"}
        `}>
          <div className={`
            flex-1 bg-base-200 rounded-lg
            ${isCompact ? "p-2" : `p-3`}
          `}>
            <AudioMessage
              url={audioSrc}
              cacheKey={`role-voice:${role.id}:${audioSrc}`}
              title="角色音频预览"
              className="max-w-none"
            />
          </div>

          <IconButton
            size={isCompact ? "xs" : "sm"}
            label="删除角色音频"
            className="text-error hover:bg-error/10"
            onClick={handleDeleteAudio}
            title="删除音频"
            icon={(
              <svg className={isCompact ? "size-3.5" : "size-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          />
        </div>
      </div>
    </div>
  );
}
