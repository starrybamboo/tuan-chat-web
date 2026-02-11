import type { KeyboardEvent, MouseEvent, RefObject } from "react";

import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { AtMentionHandle } from "@/components/atMentionController";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";

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
    useChatComposerStore.getState().updateImgFiles((draft) => {
      draft.push(...files);
    });
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
