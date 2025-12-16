import ChatToolbar from "@/components/chat/chatToolbar";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import React from "react";

type ChatToolbarProps = React.ComponentProps<typeof ChatToolbar>;

export default function ChatToolbarFromStore({
  noRole,
  notMember,
  isSubmitting,
  ...rest
}: Omit<ChatToolbarProps, "disableSendMessage" | "isRealtimeRenderActive" | "updateEmojiUrls" | "updateImgFiles" | "setAudioFile"> & {
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
    return (noRole && !webgalLinkMode) || notMember || noInput || isSubmitting;
  }, [plainText, hasAttachments, noRole, webgalLinkMode, notMember, isSubmitting]);

  return (
    <ChatToolbar
      {...rest}
      webgalLinkMode={webgalLinkMode}
      updateEmojiUrls={updateEmojiUrls}
      updateImgFiles={updateImgFiles}
      setAudioFile={setAudioFile}
      disableSendMessage={disableSendMessage}
      isRealtimeRenderActive={isRealtimeRenderActive}
    />
  );
}
