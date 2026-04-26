import React from "react";
import { createRoot } from "react-dom/client";

import { useAudioMessageAutoPlayStore } from "../../stores/audioMessageAutoPlayStore";
import { triggerAudioAutoPlay } from "./audioMessageAutoPlayRuntime";
import {
  createBgmControllerId,
  registerBgmMessageController,
  requestPlayBgmMessage,
  unregisterBgmMessageController,
} from "./audioMessageBgmCoordinator";

const ACTIVE_ROOM_ID = 1001;
const OTHER_ROOM_ID = 1002;
const MESSAGE_ID = 2001;
const AUDIO_URL = "https://static.example.com/audio-autoplay-e2e.mp3";

function VisualBgmProbe(props: {
  blockNextVisualStart: boolean;
  clearBlockedVisualStart: () => void;
}) {
  const { blockNextVisualStart, clearBlockedVisualStart } = props;
  const pendingAutoPlay = useAudioMessageAutoPlayStore(state => state.pendingByMessageId[MESSAGE_ID]);
  const [playCount, setPlayCount] = React.useState(0);
  const [playFromStartCount, setPlayFromStartCount] = React.useState(0);
  const [stopCount, setStopCount] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTimeSec, setCurrentTimeSecState] = React.useState(0);
  const [volumeRatio, setVolumeRatioState] = React.useState(1);
  const [autoPlayStatus, setAutoPlayStatus] = React.useState<"idle" | "inflight" | "started" | "failed">("idle");
  const isPlayingRef = React.useRef(false);
  const currentTimeRef = React.useRef(0);
  const volumeRatioRef = React.useRef(1);
  const pendingAttemptRef = React.useRef<Promise<boolean> | null>(null);
  const blockNextVisualStartRef = React.useRef(blockNextVisualStart);
  const controllerId = React.useMemo(() => createBgmControllerId(ACTIVE_ROOM_ID, MESSAGE_ID), []);

  React.useEffect(() => {
    blockNextVisualStartRef.current = blockNextVisualStart;
  }, [blockNextVisualStart]);

  const startVisualPlayback = React.useCallback(() => {
    if (blockNextVisualStartRef.current) {
      blockNextVisualStartRef.current = false;
      clearBlockedVisualStart();
      return true;
    }
    queueMicrotask(() => {
      isPlayingRef.current = true;
      setIsPlaying(true);
    });
    return true;
  }, [clearBlockedVisualStart]);

  React.useEffect(() => {
    registerBgmMessageController({
      id: controllerId,
      roomId: ACTIVE_ROOM_ID,
      messageId: MESSAGE_ID,
      play: async () => {
        setPlayCount(value => value + 1);
        return startVisualPlayback();
      },
      playFromStart: async () => {
        currentTimeRef.current = 0;
        setCurrentTimeSecState(0);
        setPlayCount(value => value + 1);
        setPlayFromStartCount(value => value + 1);
        return startVisualPlayback();
      },
      stop: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setStopCount(value => value + 1);
      },
      isPlaying: () => isPlayingRef.current,
      getVolumeRatio: () => volumeRatioRef.current,
      setVolumeRatio: (value) => {
        volumeRatioRef.current = value;
        setVolumeRatioState(value);
      },
      getCurrentTimeSec: () => currentTimeRef.current,
      setCurrentTimeSec: (value) => {
        currentTimeRef.current = value;
        setCurrentTimeSecState(value);
      },
    });

    return () => {
      unregisterBgmMessageController({
        roomId: ACTIVE_ROOM_ID,
        messageId: MESSAGE_ID,
      });
    };
  }, [controllerId, startVisualPlayback]);

  const attemptPendingAutoPlay = React.useCallback(() => {
    if (!pendingAutoPlay) {
      return undefined;
    }
    if (pendingAutoPlay.roomId !== ACTIVE_ROOM_ID || pendingAutoPlay.messageId !== MESSAGE_ID || pendingAutoPlay.purpose !== "bgm") {
      return undefined;
    }
    if (pendingAttemptRef.current) {
      return pendingAttemptRef.current;
    }

    setAutoPlayStatus("inflight");
    const attempt = (async () => {
      const started = await requestPlayBgmMessage(ACTIVE_ROOM_ID, MESSAGE_ID);
      if (started) {
        useAudioMessageAutoPlayStore.getState().consumePending({
          roomId: ACTIVE_ROOM_ID,
          messageId: MESSAGE_ID,
          purpose: "bgm",
        });
      }
      setAutoPlayStatus(started ? "started" : "failed");
      return started;
    })();

    pendingAttemptRef.current = attempt;
    void attempt.finally(() => {
      if (pendingAttemptRef.current === attempt) {
        pendingAttemptRef.current = null;
      }
    });
    return attempt;
  }, [pendingAutoPlay]);

  React.useEffect(() => {
    if (!pendingAutoPlay) {
      return;
    }
    void attemptPendingAutoPlay();
  }, [attemptPendingAutoPlay, pendingAutoPlay]);

  React.useEffect(() => {
    if (!pendingAutoPlay) {
      return;
    }
    const retryPendingAutoPlay = () => {
      void attemptPendingAutoPlay();
    };
    window.addEventListener("pointerdown", retryPendingAutoPlay, { passive: true });
    window.addEventListener("keydown", retryPendingAutoPlay);
    return () => {
      window.removeEventListener("pointerdown", retryPendingAutoPlay);
      window.removeEventListener("keydown", retryPendingAutoPlay);
    };
  }, [attemptPendingAutoPlay, pendingAutoPlay]);

  return (
    <section>
      <h2>Visual Probe</h2>
      <dl>
        <dt>playCount</dt>
        <dd data-testid="visual-play-count">{playCount}</dd>
        <dt>playFromStartCount</dt>
        <dd data-testid="visual-play-from-start-count">{playFromStartCount}</dd>
        <dt>stopCount</dt>
        <dd data-testid="visual-stop-count">{stopCount}</dd>
        <dt>isPlaying</dt>
        <dd data-testid="visual-is-playing">{isPlaying ? "yes" : "no"}</dd>
        <dt>currentTimeSec</dt>
        <dd data-testid="visual-current-time">{currentTimeSec}</dd>
        <dt>volumeRatio</dt>
        <dd data-testid="visual-volume-ratio">{volumeRatio}</dd>
        <dt>autoPlayStatus</dt>
        <dd data-testid="visual-auto-play-status">{autoPlayStatus}</dd>
      </dl>
    </section>
  );
}

function AudioAutoplayHarness() {
  const activeRoomId = useAudioMessageAutoPlayStore(state => state.activeRoomId);
  const pending = useAudioMessageAutoPlayStore(state => state.pendingByMessageId[MESSAGE_ID]);
  const [visualMounted, setVisualMounted] = React.useState(false);
  const [blockNextVisualStart, setBlockNextVisualStart] = React.useState(false);
  const [lastSource, setLastSource] = React.useState<"none" | "ws" | "localSend">("none");
  const [lastRoomId, setLastRoomId] = React.useState<number | null>(null);
  const [lastResult, setLastResult] = React.useState<"idle" | "enqueued" | "ignored">("idle");

  React.useEffect(() => {
    useAudioMessageAutoPlayStore.getState().setActiveRoomId(ACTIVE_ROOM_ID);
    return () => {
      useAudioMessageAutoPlayStore.getState().setActiveRoomId(null);
    };
  }, []);

  const trigger = React.useCallback((source: "ws" | "localSend", roomId: number) => {
    const event = triggerAudioAutoPlay({
      source,
      roomId,
      messageId: MESSAGE_ID,
      purpose: "bgm",
      url: AUDIO_URL,
    });
    setLastSource(source);
    setLastRoomId(roomId);
    setLastResult(event ? "enqueued" : "ignored");
  }, []);

  return (
    <main>
      <div data-testid="harness-ready">ready</div>
      <button
        type="button"
        data-testid="trigger-local-send-bgm"
        onClick={() => trigger("localSend", ACTIVE_ROOM_ID)}
      >
        trigger localSend bgm
      </button>
      <button
        type="button"
        data-testid="trigger-ws-current-room-bgm"
        onClick={() => trigger("ws", ACTIVE_ROOM_ID)}
      >
        trigger ws current room bgm
      </button>
      <button
        type="button"
        data-testid="trigger-ws-other-room-bgm"
        onClick={() => trigger("ws", OTHER_ROOM_ID)}
      >
        trigger ws other room bgm
      </button>
      <button
        type="button"
        data-testid="mount-visual-probe"
        onClick={() => setVisualMounted(true)}
        disabled={visualMounted}
      >
        mount visual probe
      </button>
      <button
        type="button"
        data-testid="block-next-visual-start"
        onClick={() => setBlockNextVisualStart(true)}
      >
        block next visual start
      </button>
      <button
        type="button"
        data-testid="gesture-retry"
      >
        gesture retry
      </button>

      <dl>
        <dt>activeRoomId</dt>
        <dd data-testid="active-room-id">{activeRoomId ?? "null"}</dd>
        <dt>visualMounted</dt>
        <dd data-testid="visual-mounted">{visualMounted ? "yes" : "no"}</dd>
        <dt>lastSource</dt>
        <dd data-testid="last-trigger-source">{lastSource}</dd>
        <dt>lastRoomId</dt>
        <dd data-testid="last-trigger-room">{lastRoomId ?? "null"}</dd>
        <dt>lastResult</dt>
        <dd data-testid="last-trigger-result">{lastResult}</dd>
        <dt>pendingPurpose</dt>
        <dd data-testid="pending-purpose">{pending?.purpose ?? "none"}</dd>
      </dl>

      {visualMounted
        ? (
            <VisualBgmProbe
              blockNextVisualStart={blockNextVisualStart}
              clearBlockedVisualStart={() => setBlockNextVisualStart(false)}
            />
          )
        : null}
    </main>
  );
}

const container = document.getElementById("app");
if (!container) {
  throw new Error("audio autoplay e2e harness mount point not found");
}

createRoot(container).render(<AudioAutoplayHarness />);
