import { produce } from "immer";
import { create } from "zustand";

type AudioPurpose = "bgm" | "se" | undefined;

function isSameFileList(a: File[], b: File[]): boolean {
  if (a === b)
    return true;
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}

function isSameStringList(a: string[], b: string[]): boolean {
  if (a === b)
    return true;
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}

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

  updateImgFiles: updater => set((state) => {
    const next = produce(state.imgFiles, (draft) => {
      updater(draft);
    });
    if (next === state.imgFiles)
      return state;
    return { imgFiles: next };
  }),

  updateEmojiUrls: updater => set((state) => {
    const next = produce(state.emojiUrls, (draft) => {
      updater(draft);
    });
    if (next === state.emojiUrls)
      return state;
    return { emojiUrls: next };
  }),

  setImgFiles: files => set(state => (isSameFileList(state.imgFiles, files) ? state : { imgFiles: files })),
  setEmojiUrls: urls => set(state => (isSameStringList(state.emojiUrls, urls) ? state : { emojiUrls: urls })),
  setAudioFile: file => set(state => (state.audioFile === file ? state : { audioFile: file })),

  setSendAsBackground: value => set(state => (state.sendAsBackground === value ? state : { sendAsBackground: value })),
  setAudioPurpose: purpose => set(state => (state.audioPurpose === purpose ? state : { audioPurpose: purpose })),

  reset: () => set(state => (
    state.imgFiles.length === 0
    && state.emojiUrls.length === 0
    && state.audioFile == null
    && state.sendAsBackground === false
    && state.audioPurpose == null
      ? state
      : {
          imgFiles: [],
          emojiUrls: [],
          audioFile: null,
          sendAsBackground: false,
          audioPurpose: undefined,
        }
  )),
}));
