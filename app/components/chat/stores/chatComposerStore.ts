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

export type EmojiAttachmentMeta = {
  width?: number;
  height?: number;
  size?: number;
  fileName?: string;
};

type ChatComposerState = {
  /** 聊天框中包含的图片 */
  imgFiles: File[];
  /** 聊天框中包含的表情图片 URL */
  emojiUrls: string[];
  /** 表情图片的元数据（按 URL 缓存） */
  emojiMetaByUrl: Record<string, EmojiAttachmentMeta>;
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
  setEmojiMetaByUrl: (url: string, meta: EmojiAttachmentMeta) => void;
  removeEmojiMetaByUrl: (url: string) => void;
  clearEmojiMeta: () => void;

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
  emojiMetaByUrl: {},
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

  setEmojiMetaByUrl: (url, meta) => set((state) => {
    if (!url)
      return state;
    const prevMeta = state.emojiMetaByUrl[url];
    if (prevMeta?.width === meta.width
      && prevMeta?.height === meta.height
      && prevMeta?.size === meta.size
      && prevMeta?.fileName === meta.fileName) {
      return state;
    }
    return {
      emojiMetaByUrl: {
        ...state.emojiMetaByUrl,
        [url]: meta,
      },
    };
  }),

  removeEmojiMetaByUrl: url => set((state) => {
    if (!url || !Object.prototype.hasOwnProperty.call(state.emojiMetaByUrl, url))
      return state;
    const next = { ...state.emojiMetaByUrl };
    delete next[url];
    return { emojiMetaByUrl: next };
  }),

  clearEmojiMeta: () => set((state) => {
    if (Object.keys(state.emojiMetaByUrl).length === 0)
      return state;
    return { emojiMetaByUrl: {} };
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
    && Object.keys(state.emojiMetaByUrl).length === 0
    && state.fileAttachments.length === 0
    && state.audioFile == null
    && state.annotations.length === 0
    && state.tempAnnotations.length === 0
      ? state
      : {
          imgFiles: [],
          emojiUrls: [],
          emojiMetaByUrl: {},
          fileAttachments: [],
          audioFile: null,
          annotations: [],
          tempAnnotations: [],
        }
  )),
}));
