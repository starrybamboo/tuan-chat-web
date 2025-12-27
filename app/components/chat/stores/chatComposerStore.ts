import { produce } from "immer";
import { create } from "zustand";

type AudioPurpose = "bgm" | "se" | undefined;

type ChatComposerState = {
  /** 聊天框中包含的图片 */
  imgFiles: File[];
  /** 聊天框中包含的表情图片 URL */
  emojiUrls: string[];
  /** 聊天框中包含的语音 */
  audioFile: File | null;

  /** 发送选项：将图片设为背景 */
  sendAsBackground: boolean;

  /** 音频用途：undefined=普通语音, "bgm"=背景音乐, "se"=音效 */
  audioPurpose: AudioPurpose;

  updateImgFiles: (updater: (draft: File[]) => void) => void;
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;

  setImgFiles: (files: File[]) => void;
  setEmojiUrls: (urls: string[]) => void;
  setAudioFile: (file: File | null) => void;

  setSendAsBackground: (value: boolean) => void;
  setAudioPurpose: (purpose: AudioPurpose) => void;

  /** 切换房间或发送完成后重置 */
  reset: () => void;
};

export const useChatComposerStore = create<ChatComposerState>(set => ({
  imgFiles: [],
  emojiUrls: [],
  audioFile: null,
  sendAsBackground: false,
  audioPurpose: undefined,

  updateImgFiles: updater => set(state => ({
    imgFiles: produce(state.imgFiles, (draft) => {
      updater(draft);
    }),
  })),

  updateEmojiUrls: updater => set(state => ({
    emojiUrls: produce(state.emojiUrls, (draft) => {
      updater(draft);
    }),
  })),

  setImgFiles: files => set({ imgFiles: files }),
  setEmojiUrls: urls => set({ emojiUrls: urls }),
  setAudioFile: file => set({ audioFile: file }),

  setSendAsBackground: value => set({ sendAsBackground: value }),
  setAudioPurpose: purpose => set({ audioPurpose: purpose }),

  reset: () => set({
    imgFiles: [],
    emojiUrls: [],
    audioFile: null,
    sendAsBackground: false,
    audioPurpose: undefined,
  }),
}));
