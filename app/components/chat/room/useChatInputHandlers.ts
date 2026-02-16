import type { KeyboardEvent, MouseEvent, RefObject } from "react";

import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { AtMentionHandle } from "@/components/atMentionController";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { ANNOTATION_IDS, normalizeAnnotations } from "@/types/messageAnnotations";

type UseChatInputHandlersParams = {
  atMentionRef: RefObject<AtMentionHandle | null>;
  handleMessageSubmit: () => void;
  handleQuickRewrite: (prompt: string) => void;
  insertLLMMessageIntoText: () => void;
  llmMessageRef: RefObject<string>;
  originalTextBeforeRewriteRef: RefObject<string>;
  setInputText: (text: string) => void;
  setLLMMessage: (text: string) => void;
};

type UseChatInputHandlersResult = {
  handlePasteFiles: (files: File[]) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleKeyUp: (e: KeyboardEvent) => void;
  handleMouseDown: (e: MouseEvent) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
};

export default function useChatInputHandlers({
  atMentionRef,
  handleMessageSubmit,
  handleQuickRewrite,
  insertLLMMessageIntoText,
  llmMessageRef,
  originalTextBeforeRewriteRef,
  setInputText,
  setLLMMessage,
}: UseChatInputHandlersParams): UseChatInputHandlersResult {
  const isComposingRef = useRef(false);

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

    const store = useChatComposerStore.getState();

    if (imageFiles.length > 0) {
      store.updateImgFiles((draft) => {
        draft.push(...imageFiles);
      });
    }

    if (videoFiles.length > 0 || otherFiles.length > 0) {
      store.updateFileAttachments((draft) => {
        draft.push(...videoFiles, ...otherFiles);
      });
    }

    if (audioFiles.length > 0) {
      store.setAudioFile(audioFiles[0]);
      const current = store.tempAnnotations;
      const hasAudioAnnotation = current.includes(ANNOTATION_IDS.BGM) || current.includes(ANNOTATION_IDS.SE);
      if (!hasAudioAnnotation) {
        store.setTempAnnotations(normalizeAnnotations([...current, ANNOTATION_IDS.BGM]));
      }
      if (audioFiles.length > 1) {
        toast.error("仅支持粘贴 1 个音频，已取第一个");
      }
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isAtOpen = atMentionRef.current?.isDialogOpen() ?? false;
    if (isAtOpen) {
      const handled = atMentionRef.current?.onKeyDown(e) ?? false;
      if (handled) {
        return;
      }
    }

    if (e.key === "Escape" && originalTextBeforeRewriteRef.current) {
      e.preventDefault();
      setInputText(originalTextBeforeRewriteRef.current);
      originalTextBeforeRewriteRef.current = "";
      setLLMMessage("");
      toast("已取消重写", { icon: "ℹ️" });
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      handleMessageSubmit();
    }
    else if (e.key === "Tab") {
      e.preventDefault();
      if (llmMessageRef.current) {
        insertLLMMessageIntoText();
        return;
      }
      const prompt = localStorage.getItem("ai-rewrite-prompt") || "请优化这段文字的表达，使其更加清晰流畅";
      handleQuickRewrite(prompt);
    }
  }, [
    atMentionRef,
    handleMessageSubmit,
    handleQuickRewrite,
    insertLLMMessageIntoText,
    llmMessageRef,
    originalTextBeforeRewriteRef,
    setInputText,
    setLLMMessage,
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
  }, []);

  return {
    handlePasteFiles,
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    onCompositionStart,
    onCompositionEnd,
  };
}
