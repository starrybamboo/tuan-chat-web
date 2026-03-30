import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

import type { MessageDraft } from "@/types/messageDraft";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { buildMessageDraftsFromComposerSnapshot } from "@/components/chat/utils/messageDraftBuilder";
import { UploadUtils } from "@/utils/UploadUtils";

type UseMaterialMessageComposerSubmitParams = {
  baseMessage?: Partial<MessageDraft>;
  onAppendMessages: (messages: MessageDraft[]) => void;
  setInputText: (text: string) => void;
  textMessageType?: MessageDraft["messageType"];
};

type UseMaterialMessageComposerSubmitResult = {
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
};

export default function useMaterialMessageComposerSubmit({
  baseMessage,
  onAppendMessages,
  setInputText,
  textMessageType,
}: UseMaterialMessageComposerSubmitParams): UseMaterialMessageComposerSubmitResult {
  const uploadUtilsRef = useRef(new UploadUtils());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const { plainText: inputText } = useChatInputUiStore.getState();
    const {
      imgFiles,
      emojiUrls,
      emojiMetaByUrl,
      fileAttachments,
      audioFile,
      annotations: composerAnnotations,
      tempAnnotations,
      reset: resetComposer,
    } = useChatComposerStore.getState();

    setIsSubmitting(true);
    const toastId = `material-composer-submit-${Date.now()}`;
    toast.loading("正在添加素材...", { id: toastId });

    try {
      const nextMessages = await buildMessageDraftsFromComposerSnapshot({
        baseMessage,
        inputText,
        imgFiles,
        emojiUrls,
        emojiMetaByUrl,
        fileAttachments,
        audioFile,
        composerAnnotations,
        tempAnnotations,
        uploadUtils: uploadUtilsRef.current,
        textMessageType,
      });

      if (nextMessages.length === 0) {
        toast.dismiss(toastId);
        return;
      }

      onAppendMessages(nextMessages);
      resetComposer();
      useChatInputUiStore.getState().reset();
      setInputText("");
      toast.success(`已添加 ${nextMessages.length} 条素材`, { id: toastId });
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`添加素材失败：${message}`, { id: toastId });
    }
    finally {
      setIsSubmitting(false);
    }
  }, [baseMessage, isSubmitting, onAppendMessages, setInputText, textMessageType]);

  return {
    isSubmitting,
    handleSubmit,
  };
}
