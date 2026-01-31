import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { sendLlmStreamMessage } from "@/components/chat/utils/llmUtils";

type UseAiRewriteParams = {
  chatInputRef: React.RefObject<ChatInputAreaHandle>;
  setInputText: (text: string) => void;
};

type UseAiRewriteResult = {
  llmMessageRef: React.MutableRefObject<string>;
  originalTextBeforeRewriteRef: React.MutableRefObject<string>;
  setLLMMessage: (value: string) => void;
  insertLLMMessageIntoText: () => void;
  handleQuickRewrite: (prompt: string) => Promise<void>;
};

export default function useAiRewrite({ chatInputRef, setInputText }: UseAiRewriteParams): UseAiRewriteResult {
  const llmMessageRef = useRef("");
  const isAutoCompletingRef = useRef(false);
  const hintNodeRef = useRef<HTMLSpanElement | null>(null);
  const originalTextBeforeRewriteRef = useRef("");

  const setLLMMessage = useCallback((newLLMMessage: string) => {
    if (hintNodeRef.current) {
      hintNodeRef.current.remove();
    }
    llmMessageRef.current = newLLMMessage;

    const containerNode = document.createElement("span");
    containerNode.contentEditable = "false";
    containerNode.style.pointerEvents = "none";

    const hintNode = document.createElement("span");
    hintNode.textContent = newLLMMessage;
    hintNode.className = "opacity-60";

    const tipsNode = document.createElement("span");
    tipsNode.textContent = newLLMMessage ? " [Tab 接受]" : "";
    tipsNode.className = "opacity-40 text-xs";
    tipsNode.style.marginLeft = "4px";

    containerNode.appendChild(hintNode);
    if (newLLMMessage) {
      containerNode.appendChild(tipsNode);
    }

    chatInputRef.current?.insertNodeAtCursor(containerNode);
    hintNodeRef.current = containerNode;

    const handleInput = () => {
      containerNode.remove();
      chatInputRef.current?.getRawElement()?.removeEventListener("input", handleInput);
      isAutoCompletingRef.current = false;
      hintNodeRef.current = null;
    };
    chatInputRef.current?.getRawElement()?.addEventListener("input", handleInput);
  }, [chatInputRef]);

  const insertLLMMessageIntoText = useCallback(() => {
    if (!chatInputRef.current) {
      return;
    }

    if (hintNodeRef.current) {
      hintNodeRef.current.remove();
      hintNodeRef.current = null;
    }

    if (originalTextBeforeRewriteRef.current) {
      const rewriteText = llmMessageRef.current.replace(/\u200B/g, "");
      setInputText(rewriteText);
      if (chatInputRef.current?.getRawElement()) {
        chatInputRef.current.getRawElement()!.textContent = rewriteText;
      }
      originalTextBeforeRewriteRef.current = "";
      toast.success("已应用改写");
    }
    else {
      chatInputRef.current.insertNodeAtCursor(llmMessageRef.current, { moveCursorToEnd: true });
    }

    setLLMMessage("");
    chatInputRef.current.triggerSync();
  }, [chatInputRef, setInputText, setLLMMessage]);

  const handleQuickRewrite = useCallback(async (prompt: string) => {
    const currentPlainText = useChatInputUiStore.getState().plainText;
    if (!currentPlainText.trim()) {
      toast.error("请输入要改写的内容");
      return;
    }

    if (isAutoCompletingRef.current) {
      return;
    }

    isAutoCompletingRef.current = true;

    if (llmMessageRef.current) {
      setLLMMessage("");
    }

    originalTextBeforeRewriteRef.current = currentPlainText;

    try {
      const fullPrompt = `${prompt}\n\n请对以下内容进行改写，保持原意与风格：\n${currentPlainText}`;

      const rawElement = chatInputRef.current?.getRawElement();
      if (rawElement) {
        rawElement.textContent = "\u200B";
        rawElement.focus();
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(rawElement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setInputText("\u200B");

      await sendLlmStreamMessage(fullPrompt, (newContent) => {
        if (rawElement && rawElement.textContent === "\u200B") {
          rawElement.textContent = "";
        }
        setLLMMessage(newContent);
        return true;
      });

      toast.success("改写完成，按 Tab 接受，Esc 取消");
    }
    catch (error) {
      toast.error(`AI 改写失败: ${error}`);
      setInputText(originalTextBeforeRewriteRef.current);
      originalTextBeforeRewriteRef.current = "";
    }
    finally {
      isAutoCompletingRef.current = false;
    }
  }, [chatInputRef, setInputText, setLLMMessage]);

  return {
    llmMessageRef,
    originalTextBeforeRewriteRef,
    setLLMMessage,
    insertLLMMessageIntoText,
    handleQuickRewrite,
  };
}
