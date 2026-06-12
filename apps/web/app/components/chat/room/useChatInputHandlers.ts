import type { KeyboardEvent, MouseEvent, RefObject } from "react";

import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { AtMentionHandle } from "@/components/atMentionController";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { preheatChatMediaPreprocess } from "@/components/chat/utils/attachmentPreprocess";
import { applyRoomMediaAnnotationPreferenceToComposer } from "@/components/chat/utils/mediaAnnotationPreference";

type UseChatInputHandlersParams = {
  atMentionRef: RefObject<AtMentionHandle | null>;
  handleMessageSubmit: () => void;
  roomId: number;
};

type UseChatInputHandlersResult = {
  handlePasteFiles: (files: File[]) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleKeyUp: (e: KeyboardEvent) => void;
  handleMouseDown: (e: MouseEvent) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  requestMessageSubmit: () => void;
};

export default function useChatInputHandlers({
  atMentionRef,
  handleMessageSubmit,
  roomId,
}: UseChatInputHandlersParams): UseChatInputHandlersResult {
  const isComposingRef = useRef(false);
  const pendingSubmitAfterCompositionRef = useRef(false);

  const requestMessageSubmit = useCallback(() => {
    if (isComposingRef.current) {
      // 输入法上屏结束前不要直接提交，否则会拿到旧快照并导致发送后不清空。
      pendingSubmitAfterCompositionRef.current = true;
      return;
    }
    pendingSubmitAfterCompositionRef.current = false;
    handleMessageSubmit();
  }, [handleMessageSubmit]);

  const handlePasteFiles = useCallback((files: File[]) => {
    const isImageFile = (file: File) => {
      if (file.type.startsWith("image/")) {
        return true;
      }
      return /\.(?:png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name || "");
    };
    const isVideoFile = (file: File) => {
      if (file.type.startsWith("video/")) {
        return true;
      }
      return /\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/i.test(file.name || "");
    };
    const isAudioFile = (file: File) => {
      if (file.type.startsWith("audio/")) {
        return true;
      }
      return /\.(?:mp3|wav|m4a|aac|ogg|opus|flac)$/i.test(file.name || "");
    };

    const imageFiles: File[] = [];
    const videoFiles: File[] = [];
    const audioFiles: File[] = [];
    const otherFiles: File[] = [];

    for (const file of files) {
      if (isImageFile(file)) {
        imageFiles.push(file);
      }
      else if (isVideoFile(file)) {
        videoFiles.push(file);
      }
      else if (isAudioFile(file)) {
        audioFiles.push(file);
      }
      else {
        otherFiles.push(file);
      }
    }

    const hasSupportedFiles = imageFiles.length > 0 || videoFiles.length > 0 || audioFiles.length > 0;
    if (otherFiles.length > 0) {
      toast.error(
        hasSupportedFiles
          ? `已忽略${otherFiles.length}个文件，当前仅支持图片、视频、音频`
          : "暂不支持发送文件",
      );
    }
    if (!hasSupportedFiles) {
      return;
    }

    const store = useChatComposerStore.getState();

    if (imageFiles.length > 0) {
      store.updateImgFiles((draft) => {
        draft.push(...imageFiles);
      });
      applyRoomMediaAnnotationPreferenceToComposer(roomId, "image");
    }

    if (videoFiles.length > 0) {
      store.updateFileAttachments((draft) => {
        draft.push(...videoFiles);
      });
    }

    if (audioFiles.length > 0) {
      store.setAudioFile(audioFiles[0]);
      applyRoomMediaAnnotationPreferenceToComposer(roomId, "audio");
      if (audioFiles.length > 1) {
        toast.error("仅支持粘贴 1 个音频，已取第一个");
      }
    }

    preheatChatMediaPreprocess({
      imageFiles,
      videoFiles,
      audioFiles: audioFiles.length > 0 ? [audioFiles[0]] : [],
    });
  }, [roomId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isAtOpen = atMentionRef.current?.isDialogOpen() ?? false;
    if (isAtOpen) {
      const handled = atMentionRef.current?.onKeyDown(e) ?? false;
      if (handled) {
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      requestMessageSubmit();
    }
  }, [
    atMentionRef,
    requestMessageSubmit,
  ]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    atMentionRef.current?.onKeyUp(e);

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
        case "i":
        case "u":
          e.preventDefault();
          break;
      }
    }
  }, [atMentionRef]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    atMentionRef.current?.onMouseDown(e);
  }, [atMentionRef]);

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    if (!pendingSubmitAfterCompositionRef.current) {
      return;
    }
    pendingSubmitAfterCompositionRef.current = false;
    Promise.resolve().then(() => {
      if (!isComposingRef.current) {
        handleMessageSubmit();
      }
    });
  }, [handleMessageSubmit]);

  return {
    handlePasteFiles,
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    onCompositionStart,
    onCompositionEnd,
    requestMessageSubmit,
  };
}
