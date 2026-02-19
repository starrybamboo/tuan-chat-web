// 角色音频预览播放器，采用流式播放与进度条控件。
// 支持删除角色音频并同步到外部状态。
import type { MouseEvent } from "react";
import type { Role } from "../types";

import H5AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "../../common/audioPlayer.css";

interface AudioPlayerProps {
  role: Role;
  size?: "default" | "compact";
  onRoleUpdate?: (updatedRole: Role) => void;
  onDelete?: () => void;
}

export default function AudioPlayer({ role, size = "default", onRoleUpdate, onDelete }: AudioPlayerProps) {
  const isCompact = size === "compact";
  const sizeClass = isCompact ? "tc-audio-player--sm" : "tc-audio-player--md";

  const handleDeleteAudio = (e: MouseEvent) => {
    e.stopPropagation();
    const updatedRole = { ...role, voiceUrl: undefined };

    if (onDelete) {
      onDelete();
    }

    if (onRoleUpdate) {
      onRoleUpdate(updatedRole);
    }
  };

  if (!role.voiceUrl) {
    return null;
  }

  return (
    <div className={isCompact ? "mt-2 pt-2" : "mt-3 pt-3 border-t border-base-content/10"}>
      <div className={isCompact ? "space-y-2" : "space-y-3"}>
        <div className={`flex items-center gap-2 ${isCompact ? "" : "gap-3"}`}>
          <div className={`flex-1 bg-base-200 rounded-lg ${isCompact ? "p-2" : "p-3"}`}>
            <H5AudioPlayer
              className={`tc-audio-player ${sizeClass}`}
              src={role.voiceUrl}
              autoPlayAfterSrcChange={false}
              showJumpControls={false}
              customAdditionalControls={[]}
              customVolumeControls={[]}
              customControlsSection={[RHAP_UI.MAIN_CONTROLS]}
              customProgressBarSection={[RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION]}
              audioProps={{
                preload: "metadata",
                crossOrigin: "anonymous",
              }}
            />
          </div>

          <button
            type="button"
            className={`btn ${isCompact ? "btn-xs" : "btn-sm"} btn-ghost btn-circle text-error hover:bg-error/10`}
            onClick={handleDeleteAudio}
            title="删除音频"
          >
            <svg className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
