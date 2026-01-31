import React from "react";
import ChatToolbar from "@/components/chat/input/chatToolbar";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";

type ChatToolbarProps = React.ComponentProps<typeof ChatToolbar>;

export default function ChatToolbarFromStore({
  roomId,
  isKP,
  onStopBgmForAll,
  noRole,
  notMember,
  isSubmitting,
  ...rest
}: Omit<ChatToolbarProps, "disableSendMessage" | "disableImportChatText" | "isRealtimeRenderActive" | "updateEmojiUrls" | "updateImgFiles" | "setAudioFile" | "roomId" | "isKP" | "onStopBgmForAll"> & {
  roomId: number;
  isKP?: boolean;
  onStopBgmForAll?: () => void;
  noRole: boolean;
  notMember: boolean;
  isSubmitting: boolean;
}) {
  const plainText = useChatInputUiStore(state => state.plainText);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const hasAttachments = useChatComposerStore(state => state.imgFiles.length > 0 || state.emojiUrls.length > 0 || !!state.audioFile);
  const updateEmojiUrls = useChatComposerStore(state => state.updateEmojiUrls);
  const updateImgFiles = useChatComposerStore(state => state.updateImgFiles);
  const setAudioFile = useChatComposerStore(state => state.setAudioFile);

  const disableSendMessage = React.useMemo(() => {
    const noInput = !(plainText.trim() || hasAttachments);
    return noRole || notMember || noInput || isSubmitting;
  }, [plainText, hasAttachments, noRole, notMember, isSubmitting]);

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
      setAudioFile={setAudioFile}
      disableSendMessage={disableSendMessage}
      disableImportChatText={disableImportChatText}
      isRealtimeRenderActive={isRealtimeRenderActive}
    />
  );
}
