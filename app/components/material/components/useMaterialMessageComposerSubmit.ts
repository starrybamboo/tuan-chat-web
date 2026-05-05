import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

import type { MessageDraft } from "@/types/messageDraft";

import { buildMessageDraftsFromComposerSnapshot } from "@/components/chat/utils/messageDraftBuilder";
import { UploadUtils } from "@/utils/UploadUtils";

type UseMaterialMessageComposerSubmitParams = {
  baseMessage?: Partial<MessageDraft>;
  inputText: string;
  imgFiles: File[];
  emojiUrls: string[];
  emojiMetaByUrl: Record<string, { fileId?: number; width?: number; height?: number; mediaType?: string; size?: number; fileName?: string }>;
  fileAttachments: File[];
  audioFile: File | null;
  composerAnnotations: string[];
  tempAnnotations: string[];
  resetComposer: () => void;
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
  inputText,
  imgFiles,
  emojiUrls,
  emojiMetaByUrl,
  fileAttachments,
  audioFile,
  composerAnnotations,
  tempAnnotations,
  resetComposer,
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
  }, [
    audioFile,
    baseMessage,
    composerAnnotations,
    emojiMetaByUrl,
    emojiUrls,
    fileAttachments,
    imgFiles,
    inputText,
    isSubmitting,
    onAppendMessages,
    resetComposer,
    setInputText,
    tempAnnotations,
    textMessageType,
  ]);

  return {
    isSubmitting,
    handleSubmit,
  };
}
