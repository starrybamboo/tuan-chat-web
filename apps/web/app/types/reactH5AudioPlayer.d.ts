declare module "react-h5-audio-player" {
  import type * as React from "react";

  export type RHAP_UI_KEY
    = "CURRENT_TIME"
      | "CURRENT_LEFT_TIME"
      | "PROGRESS_BAR"
      | "DURATION"
      | "ADDITIONAL_CONTROLS"
      | "MAIN_CONTROLS"
      | "VOLUME_CONTROLS"
      | "LOOP"
      | "LOOP_OFF"
      | "VOLUME"
      | "VOLUME_OFF";

  export const RHAP_UI: Record<RHAP_UI_KEY, string> & Record<string, string>;

  export type PlayerProps = {
    src?: string;
    autoPlayAfterSrcChange?: boolean;
    showJumpControls?: boolean;
    customAdditionalControls?: React.ReactNode[];
    customVolumeControls?: React.ReactNode[];
    customProgressBarSection?: React.ReactNode[];
    customControlsSection?: React.ReactNode[];
    onPlay?: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
    onPause?: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
    onEnded?: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
    onListen?: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
    listenInterval?: number;
    style?: React.CSSProperties;
    className?: string;
    audioProps?: React.AudioHTMLAttributes<HTMLAudioElement>;
    [key: string]: unknown;
  };

  const H5AudioPlayer: React.ComponentType<PlayerProps & React.RefAttributes<unknown>>;
  export default H5AudioPlayer;
}
