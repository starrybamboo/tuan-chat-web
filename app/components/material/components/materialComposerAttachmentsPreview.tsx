import { FilmSlateIcon } from "@phosphor-icons/react";
import React from "react";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import { setRoomMediaAnnotationPreference } from "@/components/chat/utils/mediaAnnotationPreference";
import BetterImg from "@/components/common/betterImg";
import { ArticleIcon, MusicNote } from "@/icons";
import { normalizeAnnotations, toggleAnnotation } from "@/types/messageAnnotations";
import { useMaterialComposerContext } from "./materialComposerContext";

interface MaterialComposerAttachmentsPreviewProps {
  roomId: number;
}

export default function MaterialComposerAttachmentsPreview({ roomId }: MaterialComposerAttachmentsPreviewProps) {
  const {
    imgFiles,
    emojiUrls,
    fileAttachments,
    audioFile,
    tempAnnotations,
    tempAnnotationPreferenceSource,
    updateImgFiles,
    updateEmojiUrls,
    removeEmojiMetaByUrl,
    updateFileAttachments,
    setAudioFile,
    setTempAnnotations,
    setTempAnnotationPreferenceSource,
    applyMediaAnnotationPreference,
  } = useMaterialComposerContext();

  const hasAttachments = imgFiles.length > 0 || emojiUrls.length > 0 || fileAttachments.length > 0 || !!audioFile;
  const hasImagePreferenceSource = imgFiles.length > 0;
  const hasAudioPreferenceSource = Boolean(audioFile);

  React.useEffect(() => {
    if (!hasAttachments) {
      if (tempAnnotations.length > 0) {
        setTempAnnotations([]);
      }
      if (tempAnnotationPreferenceSource !== null) {
        setTempAnnotationPreferenceSource(null);
      }
      return;
    }
    if (tempAnnotationPreferenceSource === "image" && !hasImagePreferenceSource && hasAudioPreferenceSource) {
      applyMediaAnnotationPreference("audio");
      return;
    }
    if (tempAnnotationPreferenceSource === "audio" && !hasAudioPreferenceSource && hasImagePreferenceSource) {
      applyMediaAnnotationPreference("image");
      return;
    }
    if (tempAnnotationPreferenceSource == null) {
      if (hasImagePreferenceSource && !hasAudioPreferenceSource) {
        applyMediaAnnotationPreference("image");
      }
      else if (hasAudioPreferenceSource && !hasImagePreferenceSource) {
        applyMediaAnnotationPreference("audio");
      }
    }
  }, [
    applyMediaAnnotationPreference,
    hasAttachments,
    hasAudioPreferenceSource,
    hasImagePreferenceSource,
    setTempAnnotationPreferenceSource,
    setTempAnnotations,
    tempAnnotationPreferenceSource,
    tempAnnotations,
  ]);

  React.useEffect(() => {
    if (!(roomId > 0)) {
      return;
    }
    const normalized = normalizeAnnotations(tempAnnotations);
    if (tempAnnotationPreferenceSource === "image" && hasImagePreferenceSource) {
      setRoomMediaAnnotationPreference(roomId, "image", normalized);
    }
    if (tempAnnotationPreferenceSource === "audio" && hasAudioPreferenceSource) {
      setRoomMediaAnnotationPreference(roomId, "audio", normalized);
    }
  }, [hasAudioPreferenceSource, hasImagePreferenceSource, roomId, tempAnnotationPreferenceSource, tempAnnotations]);

  if (!hasAttachments) {
    return null;
  }

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
    <div className="flex flex-col gap-1 border-b border-base-200/50 p-2 pb-1">
      <div className="flex flex-row items-center gap-x-3 overflow-x-auto">
        {imgFiles.map((file, index) => (
          <BetterImg
            key={file.name}
            src={file}
            className="h-12 w-max rounded"
            onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
          />
        ))}
        {emojiUrls.map((url, index) => (
          <BetterImg
            key={url}
            src={url}
            className="h-12 w-max rounded"
            onClose={() => {
              updateEmojiUrls(draft => void draft.splice(index, 1));
              removeEmojiMetaByUrl(url);
            }}
          />
        ))}
        {fileAttachments.map((file, index) => {
          const fileKey = `${file.name}-${file.size}-${file.lastModified}-${index}`;
          const isVideo = file.type.startsWith("video/");
          return (
            <div className="relative max-w-48 flex-shrink-0 group" key={fileKey}>
              <div
                className="flex h-12 min-w-28 max-w-48 items-center gap-1.5 rounded border border-base-300 bg-base-200 px-2 pr-6"
                title={file.name}
              >
                {isVideo
                  ? <FilmSlateIcon className="size-4 shrink-0 opacity-70" />
                  : <ArticleIcon className="size-4 shrink-0 opacity-70" />}
                <span className="truncate text-xs">{file.name}</span>
              </div>
              <div
                className="absolute -right-1 -top-1 z-10 cursor-pointer rounded-full bg-base-100 shadow transition-colors hover:bg-error hover:text-white"
                onClick={() => updateFileAttachments(draft => void draft.splice(index, 1))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 p-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 right-0 rounded-b bg-black/50 px-1 text-[10px] text-white">
                {isVideo ? "视频" : "文件"}
              </div>
            </div>
          );
        })}
        {audioFile && (
          <div className="relative flex-shrink-0 group">
            <div className="flex h-12 w-12 items-center justify-center rounded border border-base-300 bg-base-200" title={audioFile.name}>
              <MusicNote className="size-6 opacity-70" />
            </div>
            <div
              className="absolute -right-1 -top-1 z-10 cursor-pointer rounded-full bg-base-100 shadow transition-colors hover:bg-error hover:text-white"
              onClick={() => setAudioFile(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 p-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 right-0 rounded-b bg-black/50 px-1 text-[10px] text-white">
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
          compact={true}
          className="mt-0"
        />
      </div>
    </div>
  );
}
