import type { ChangeEvent, ClipboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  buildImageMarkdown,
  buildVideoToken,
} from "@/components/common/content/mediaContent";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { UploadUtils } from "@/utils/UploadUtils";

interface TextMediaEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
  variant?: "card" | "bare";
  title?: string;
  helperText?: string;
  onFocusChange?: (focused: boolean) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function TextMediaEditor({
  value,
  onChange,
  placeholder = "写下你的想法...",
  minHeightClassName = "min-h-[240px]",
  className,
  variant = "card",
  title = "正文",
  helperText = "支持粘贴图片与上传视频",
  onFocusChange,
  onKeyDown,
}: TextMediaEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const latestValueRef = useRef(value);
  const uploadUtils = useRef(new UploadUtils()).current;
  const [uploadingCount, setUploadingCount] = useState(0);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    const currentValue = latestValueRef.current;
    if (!textarea) {
      onChange(`${currentValue}${text}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${currentValue.slice(0, start)}${text}${currentValue.slice(end)}`;
    const nextCursorPosition = start + text.length;

    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = nextCursorPosition;
      textarea.selectionEnd = nextCursorPosition;
    });
  };

  const appendBlockAtCursor = (block: string) => {
    const currentValue = latestValueRef.current;
    const prefix = currentValue && !currentValue.endsWith("\n") ? "\n\n" : "";
    const suffix = currentValue.trim() ? "\n" : "";
    insertTextAtCursor(`${prefix}${block}${suffix}`);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    setUploadingCount(current => current + 1);
    try {
      const url = await uploadUtils.uploadImg(file);
      appendBlockAtCursor(buildImageMarkdown(url, file.name || "image"));
    }
    finally {
      setUploadingCount(current => Math.max(0, current - 1));
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      return;
    }

    setUploadingCount(current => current + 1);
    try {
      const uploadedVideo = await uploadUtils.uploadVideo(file);
      appendBlockAtCursor(buildVideoToken(uploadedVideo.url));
    }
    finally {
      setUploadingCount(current => Math.max(0, current - 1));
    }
  };

  const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    for (const item of items) {
      if (!item.type.startsWith("image/")) {
        continue;
      }

      const file = item.getAsFile();
      if (!file) {
        continue;
      }

      event.preventDefault();
      await handleImageUpload(file);
      break;
    }
  };

  const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    void handleVideoUpload(file);
    event.target.value = "";
  };

  const shellClassName = variant === "card"
    ? `overflow-hidden rounded-md border border-base-300 bg-base-100 ${className ?? ""}`.trim()
    : `${className ?? ""}`.trim();
  const headerClassName = variant === "card"
    ? "flex flex-wrap items-center justify-between gap-3 border-b border-base-300 bg-base-200/25 px-3 py-2"
    : "flex flex-wrap items-center justify-between gap-3 border-b border-base-300/70 pb-3";
  const bodyClassName = variant === "card" ? "p-0" : "pt-3";

  return (
    <div className={shellClassName}>
      <div className={headerClassName}>
        <div className="text-sm font-medium text-base-content">{title}</div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/55">
          <ImgUploader setImg={(file) => { void handleImageUpload(file); }}>
            <button type="button" className="btn btn-ghost btn-xs">
              上传图片
            </button>
          </ImgUploader>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoFileChange}
          />
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => videoInputRef.current?.click()}
          >
            上传视频
          </button>
          <span>{helperText}</span>
        </div>
      </div>

      <div className={bodyClassName}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={event => onChange(event.target.value)}
          onPaste={(event) => {
            void handlePaste(event);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder={placeholder}
          className={`textarea w-full resize-y border-0 bg-transparent p-0 text-sm leading-6 outline-none ${minHeightClassName} ${variant === "card" ? "px-4 py-4" : ""}`}
        />

        {uploadingCount > 0 && (
          <div className={`flex items-center gap-2 text-xs text-base-content/55 ${variant === "card" ? "border-t border-base-300 px-4 py-3" : "pt-2"}`}>
            <span className="loading loading-spinner loading-xs" />
            上传中...
          </div>
        )}
      </div>
    </div>
  );
}
