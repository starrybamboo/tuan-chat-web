import type { ClipboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { UploadUtils } from "@/utils/UploadUtils";

interface TextImageEditorProps {
  defaultContent?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  minHeightClassName?: string;
}

function normalizeContent(value?: string) {
  return value ?? "";
}

export default function TextImageEditor({
  defaultContent,
  onChange,
  className,
  placeholder = "写下你的想法...",
  minHeightClassName = "min-h-[320px]",
}: TextImageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(() => normalizeContent(defaultContent));
  const uploadUtils = useRef(new UploadUtils()).current;

  useEffect(() => {
    onChange?.(content);
  }, [content, onChange]);

  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(current => current + text);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent = `${content.slice(0, start)}${text}${content.slice(end)}`;
    const nextCursorPosition = start + text.length;

    setContent(nextContent);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = nextCursorPosition;
      textarea.selectionEnd = nextCursorPosition;
    });
  };

  const handleImageUpload = async (file: File) => {
    const url = await uploadUtils.uploadImg(file);
    const altText = file.name || "image";
    const prefix = content && !content.endsWith("\n") ? "\n" : "";
    insertTextAtCursor(`${prefix}![${altText}](${url})\n`);
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

  return (
    <div className={`overflow-hidden rounded-md border border-base-300 bg-base-100 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 bg-base-200/25 px-3 py-2">
        <div className="text-sm font-medium text-base-content">正文</div>

        <div className="flex items-center gap-2 text-xs text-base-content/55">
          <ImgUploader setImg={(file) => { void handleImageUpload(file); }}>
            <button type="button" className="btn btn-ghost btn-xs">
              上传图片
            </button>
          </ImgUploader>
          <span>支持粘贴图片，会自动插入图片链接</span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={event => setContent(event.target.value)}
        onPaste={(event) => {
          void handlePaste(event);
        }}
        placeholder={placeholder}
        className={`textarea w-full resize-y border-0 bg-transparent p-4 text-sm leading-6 outline-none ${minHeightClassName}`}
      />
    </div>
  );
}
