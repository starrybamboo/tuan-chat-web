import React from "react";
import ChatToolbar from "@/components/chat/input/chatToolbar";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { applyRoomMediaAnnotationPreferenceToComposer } from "@/components/chat/utils/mediaAnnotationPreference";

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

  const applyImageTempAnnotations = React.useCallback(() => {
    applyRoomMediaAnnotationPreferenceToComposer(roomId, "image");
  }, [roomId]);

  const applyAudioTempAnnotations = React.useCallback(() => {
    applyRoomMediaAnnotationPreferenceToComposer(roomId, "audio");
  }, [roomId]);

  const disableSendMessage = React.useMemo(() => {
    // 与 useChatMessageSubmit 的实际可发送条件保持一致：
    // KP 在旁白模式（noRole=true）下仍可发送；观战文本则不再强制转成场外。
    return isSubmitting || (noRole && !isKP && !notMember);
  }, [isKP, noRole, notMember, isSubmitting]);

  const disableImportChatText = React.useMemo(() => {
    return isSubmitting;
  }, [isSubmitting]);

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
      onApplyImageTempAnnotations={applyImageTempAnnotations}
      onApplyAudioTempAnnotations={applyAudioTempAnnotations}
      disableSendMessage={disableSendMessage}
      disableImportChatText={disableImportChatText}
      isRealtimeRenderActive={isRealtimeRenderActive}
    />
  );
}
