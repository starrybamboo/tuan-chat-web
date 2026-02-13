import { produce } from "immer";
import { create } from "zustand";

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
  /** 聊天框中包含的通用文件 */
  fileAttachments: File[];
  /** 聊天框中包含的语音 */
  audioFile: File | null;
  /** 即将发送消息的标注 */
  annotations: string[];
  /** 临时标注：仅本次消息有效 */
  tempAnnotations: string[];

  updateImgFiles: (updater: (draft: File[]) => void) => void;
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;
  updateFileAttachments: (updater: (draft: File[]) => void) => void;

  setImgFiles: (files: File[]) => void;
  setEmojiUrls: (urls: string[]) => void;
  setFileAttachments: (files: File[]) => void;
  setAudioFile: (file: File | null) => void;
  setAnnotations: (annotations: string[]) => void;
  setTempAnnotations: (annotations: string[]) => void;

  /** 切换房间或发送完成后重置 */
  reset: () => void;
};

export const useChatComposerStore = create<ChatComposerState>(set => ({
  imgFiles: [],
  emojiUrls: [],
  fileAttachments: [],
  audioFile: null,
  annotations: [],
  tempAnnotations: [],

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

  updateFileAttachments: updater => set((state) => {
    const next = produce(state.fileAttachments, (draft) => {
      updater(draft);
    });
    if (next === state.fileAttachments)
      return state;
    return { fileAttachments: next };
  }),

  setImgFiles: files => set(state => (isSameFileList(state.imgFiles, files) ? state : { imgFiles: files })),
  setEmojiUrls: urls => set(state => (isSameStringList(state.emojiUrls, urls) ? state : { emojiUrls: urls })),
  setFileAttachments: files => set(state => (isSameFileList(state.fileAttachments, files) ? state : { fileAttachments: files })),
  setAudioFile: file => set(state => (state.audioFile === file ? state : { audioFile: file })),
  setAnnotations: annotations => set(state => (isSameStringList(state.annotations, annotations) ? state : { annotations })),
  setTempAnnotations: annotations => set(state => (isSameStringList(state.tempAnnotations, annotations) ? state : { tempAnnotations: annotations })),

  reset: () => set(state => (
    state.imgFiles.length === 0
    && state.emojiUrls.length === 0
    && state.fileAttachments.length === 0
    && state.audioFile == null
    && state.annotations.length === 0
    && state.tempAnnotations.length === 0
      ? state
      : {
          imgFiles: [],
          emojiUrls: [],
          fileAttachments: [],
          audioFile: null,
          annotations: [],
          tempAnnotations: [],
        }
  )),
}));
