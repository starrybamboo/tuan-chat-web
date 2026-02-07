import React from "react";
import ChatToolbar from "@/components/chat/input/chatToolbar";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { ANNOTATION_IDS, normalizeAnnotations } from "@/types/messageAnnotations";

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
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const updateEmojiUrls = useChatComposerStore(state => state.updateEmojiUrls);
  const updateImgFiles = useChatComposerStore(state => state.updateImgFiles);
  const setAudioFile = useChatComposerStore(state => state.setAudioFile);
  const setTempAnnotations = useChatComposerStore(state => state.setTempAnnotations);

  const addTempAnnotations = React.useCallback((ids: string[]) => {
    const current = useChatComposerStore.getState().tempAnnotations;
    const next = [...current];
    let hasAudioAnnotation = next.includes(ANNOTATION_IDS.BGM) || next.includes(ANNOTATION_IDS.SE);
    ids.forEach((id) => {
      if ((id === ANNOTATION_IDS.BGM || id === ANNOTATION_IDS.SE) && hasAudioAnnotation) {
        return;
      }
      if (!next.includes(id)) {
        next.push(id);
        if (id === ANNOTATION_IDS.BGM || id === ANNOTATION_IDS.SE) {
          hasAudioAnnotation = true;
        }
      }
    });
    setTempAnnotations(normalizeAnnotations(next));
  }, [setTempAnnotations]);

  const disableSendMessage = React.useMemo(() => {
    return noRole || notMember || isSubmitting;
  }, [noRole, notMember, isSubmitting]);

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
      onAddTempAnnotations={addTempAnnotations}
      disableSendMessage={disableSendMessage}
      disableImportChatText={disableImportChatText}
      isRealtimeRenderActive={isRealtimeRenderActive}
    />
  );
}
