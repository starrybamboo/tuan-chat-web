import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import BetterImg from "@/components/common/betterImg";
import { MusicNote } from "@/icons";

import React from "react";

export default function ChatAttachmentsPreviewFromStore() {
  const imgFiles = useChatComposerStore(state => state.imgFiles);
  const emojiUrls = useChatComposerStore(state => state.emojiUrls);
  const audioFile = useChatComposerStore(state => state.audioFile);
  const sendAsBackground = useChatComposerStore(state => state.sendAsBackground);
  const audioPurpose = useChatComposerStore(state => state.audioPurpose);

  const updateImgFiles = useChatComposerStore(state => state.updateImgFiles);
  const updateEmojiUrls = useChatComposerStore(state => state.updateEmojiUrls);
  const setAudioFile = useChatComposerStore(state => state.setAudioFile);
  const setSendAsBackground = useChatComposerStore(state => state.setSendAsBackground);
  const setAudioPurpose = useChatComposerStore(state => state.setAudioPurpose);

  const hasAttachments = imgFiles.length > 0 || emojiUrls.length > 0 || !!audioFile;
  if (!hasAttachments)
    return null;

  return (
    <div className="flex flex-col gap-1 p-2 pb-1 border-b border-base-200/50">
      <div className="flex flex-row gap-x-3 overflow-x-auto">
        {imgFiles.map((file, index) => (
          <BetterImg
            src={file}
            className="h-12 w-max rounded"
            onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
            key={file.name}
          />
        ))}
        {imgFiles.length > 0 && (
          <label className="flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary"
              checked={sendAsBackground}
              onChange={e => setSendAsBackground(e.target.checked)}
            />
            <span>设为背景</span>
          </label>
        )}
        {emojiUrls.map((url, index) => (
          <BetterImg
            src={url}
            className="h-12 w-max rounded"
            onClose={() => updateEmojiUrls(draft => void draft.splice(index, 1))}
            key={url}
          />
        ))}
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
        {audioFile && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/60">用途:</span>
            <select
              title="选择音频用途"
              className="select select-xs select-bordered"
              value={audioPurpose || ""}
              onChange={e => setAudioPurpose(e.target.value as "bgm" | "se" | undefined || undefined)}
            >
              <option value="">普通语音</option>
              <option value="bgm">BGM</option>
              <option value="se">音效</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
