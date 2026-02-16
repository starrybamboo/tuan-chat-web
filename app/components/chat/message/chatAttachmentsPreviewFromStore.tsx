import React from "react";
import { FilmSlateIcon } from "@phosphor-icons/react";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import BetterImg from "@/components/common/betterImg";
import { ArticleIcon, MusicNote } from "@/icons";

import { normalizeAnnotations, toggleAnnotation } from "@/types/messageAnnotations";

export default function ChatAttachmentsPreviewFromStore() {
  const imgFiles = useChatComposerStore(state => state.imgFiles);
  const emojiUrls = useChatComposerStore(state => state.emojiUrls);
  const fileAttachments = useChatComposerStore(state => state.fileAttachments);
  const audioFile = useChatComposerStore(state => state.audioFile);
  const tempAnnotations = useChatComposerStore(state => state.tempAnnotations);
  const updateImgFiles = useChatComposerStore(state => state.updateImgFiles);
  const updateEmojiUrls = useChatComposerStore(state => state.updateEmojiUrls);
  const removeEmojiMetaByUrl = useChatComposerStore(state => state.removeEmojiMetaByUrl);
  const updateFileAttachments = useChatComposerStore(state => state.updateFileAttachments);
  const setAudioFile = useChatComposerStore(state => state.setAudioFile);
  const setTempAnnotations = useChatComposerStore(state => state.setTempAnnotations);

  const hasAttachments = imgFiles.length > 0 || emojiUrls.length > 0 || fileAttachments.length > 0 || !!audioFile;

  React.useEffect(() => {
    if (!hasAttachments && tempAnnotations.length > 0) {
      setTempAnnotations([]);
    }
  }, [hasAttachments, setTempAnnotations, tempAnnotations]);

  if (!hasAttachments)
    return null;

  const handleToggleTempAnnotation = (id: string) => {
    setTempAnnotations(toggleAnnotation(tempAnnotations, id));
  };

  const handleOpenTempAnnotations = () => {
    openMessageAnnotationPicker({
      initialSelected: tempAnnotations,
      onChange: (next) => {
        setTempAnnotations(normalizeAnnotations(next));
      },
    });
  };

  return (
    <div className="flex flex-col gap-1 p-2 pb-1 border-b border-base-200/50">
      <div className="flex flex-row items-center gap-x-3 overflow-x-auto">
        {imgFiles.map((file, index) => (
          <BetterImg
            src={file}
            className="h-12 w-max rounded"
            onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
            key={file.name}
          />
        ))}
        {emojiUrls.map((url, index) => (
          <BetterImg
            src={url}
            className="h-12 w-max rounded"
            onClose={() => {
              updateEmojiUrls(draft => void draft.splice(index, 1));
              removeEmojiMetaByUrl(url);
            }}
            key={url}
          />
        ))}
        {fileAttachments.map((file, index) => {
          const fileKey = `${file.name}-${file.size}-${file.lastModified}-${index}`;
          const isVideo = file.type.startsWith("video/");
          return (
            <div className="relative group flex-shrink-0 max-w-48" key={fileKey}>
              <div
                className="h-12 rounded bg-base-200 border border-base-300 px-2 pr-6 min-w-28 max-w-48 flex items-center gap-1.5"
                title={file.name}
              >
                {isVideo
                  ? <FilmSlateIcon className="size-4 opacity-70 shrink-0" />
                  : <ArticleIcon className="size-4 opacity-70 shrink-0" />}
                <span className="text-xs truncate">{file.name}</span>
              </div>
              <div
                className="absolute -top-1 -right-1 bg-base-100 rounded-full shadow cursor-pointer hover:bg-error hover:text-white transition-colors z-10"
                onClick={() => updateFileAttachments(draft => void draft.splice(index, 1))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 p-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 truncate rounded-b">
                {isVideo ? "视频" : "文件"}
              </div>
            </div>
          );
        })}
        {audioFile && (
          <div className="relative group flex-shrink-0">
            <div className="h-12 w-12 rounded bg-base-200 flex items-center justify-center border border-base-300" title={audioFile.name}>
              <MusicNote className="size-6 opacity-70" />
            </div>
            <div
              className="absolute -top-1 -right-1 bg-base-100 rounded-full shadow cursor-pointer hover:bg-error hover:text-white transition-colors z-10"
              onClick={() => setAudioFile(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 p-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 truncate rounded-b">
              语音
            </div>
          </div>
        )}
        <MessageAnnotationsBar
          annotations={tempAnnotations}
          canEdit={true}
          onToggle={handleToggleTempAnnotation}
          onOpenPicker={handleOpenTempAnnotations}
          showWhenEmpty={true}
          alwaysShowAddButton={true}
          className="mt-0"
        />
      </div>
    </div>
  );
}
