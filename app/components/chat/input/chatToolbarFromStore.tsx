import React from "react";
import ChatToolbar from "@/components/chat/input/chatToolbar";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { ANNOTATION_IDS, hasAudioPurposeAnnotation, normalizeAnnotations } from "@/types/messageAnnotations";

type ChatToolbarProps = React.ComponentProps<typeof ChatToolbar>;

export default function ChatToolbarFromStore({
  roomId,
  isKP,
  onStopBgmForAll,
  noRole,
  notMember,
  isSubmitting,
  ...rest
}: Omit<ChatToolbarProps, "disableSendMessage" | "disableImportChatText" | "isRealtimeRenderActive" | "updateEmojiUrls" | "updateImgFiles" | "updateFileAttachments" | "setAudioFile" | "roomId" | "isKP" | "onStopBgmForAll"> & {
  roomId: number;
  isKP?: boolean;
  onStopBgmForAll?: () => void;
  noRole: boolean;
  notMember: boolean;
  isSubmitting: boolean;
}) {
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const updateEmojiUrls = useChatComposerStore(state => state.updateEmojiUrls);
  const updateImgFiles = useChatComposerStore(state => state.updateImgFiles);
  const updateFileAttachments = useChatComposerStore(state => state.updateFileAttachments);
  const setAudioFile = useChatComposerStore(state => state.setAudioFile);
  const setTempAnnotations = useChatComposerStore(state => state.setTempAnnotations);

  const addTempAnnotations = React.useCallback((ids: string[]) => {
    const state = useChatComposerStore.getState();
    const current = normalizeAnnotations(state.tempAnnotations);
    const hasAudioAnnotation = hasAudioPurposeAnnotation(current) || hasAudioPurposeAnnotation(state.annotations);
    const next = [...current];
    ids.forEach((id) => {
      // 音频文件默认补 BGM 时，若当前已存在音频用途（常驻或临时）则不再覆盖。
      if (id === ANNOTATION_IDS.BGM && hasAudioAnnotation) {
        return;
      }
      if (!next.includes(id)) {
        next.push(id);
      }
    });
    setTempAnnotations(normalizeAnnotations(next));
  }, [setTempAnnotations]);

  const disableSendMessage = React.useMemo(() => {
    // 与 useChatMessageSubmit 的实际可发送条件保持一致：
    // KP 在旁白模式（noRole=true）下仍可发送，不应显示为置灰。
    return notMember || isSubmitting || (noRole && !isKP);
  }, [isKP, noRole, notMember, isSubmitting]);

  const disableImportChatText = React.useMemo(() => {
    return notMember || isSubmitting;
  }, [isSubmitting, notMember]);

  return (
    <ChatToolbar
      {...rest}
      roomId={roomId}
      isKP={isKP}
      onStopBgmForAll={onStopBgmForAll}
      webgalLinkMode={webgalLinkMode}
      updateEmojiUrls={updateEmojiUrls}
      updateImgFiles={updateImgFiles}
      updateFileAttachments={updateFileAttachments}
      setAudioFile={setAudioFile}
      onAddTempAnnotations={addTempAnnotations}
      disableSendMessage={disableSendMessage}
      disableImportChatText={disableImportChatText}
      isRealtimeRenderActive={isRealtimeRenderActive}
    />
  );
}
