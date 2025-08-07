import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import {
  BaselineCode,
  BaselineFormatBold,
  BaselineFormatItalic,
  BilibiliFill,
  DeleteLine,
  FileCodeOne,
  FoldDown,
  Image2Fill,
  LinkFilled,
  ListOrdered,
  ListUnordered,
  QuoteAltRight,
  YoutubeSolid,
} from "@/icons";
import { UploadUtils } from "@/utils/UploadUtils";
import { useDebounce } from "ahooks";
import React, { useEffect, useMemo, useRef, useState } from "react";

type MarkdownFormatType =
  | "strong" | "em" | "code" | "blockquote" | "codeBlock"
  | "ul" | "ol" | "li"
  | "a" | "img"
  | "p" | "pre" | "hr" | "br" | "del"
  | "table" | "thead" | "tbody" | "tr" | "th" | "td"
  | "bilibili" | "youtube" |
  "detail";

/**
 * markdown编辑器
 * @param onChange 输入内容改变时触发
 * @param className
 * @param defaultContent
 * @constructor
 */
export default function MarkdownEditor({ onChange, className, defaultContent }:
{
  defaultContent?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(defaultContent ?? "");
  const uploadUtils = new UploadUtils();
  // 性能优化，防抖
  const debouncedContent = useDebounce(content, { wait: 200 });
  useEffect(() => {
    onChange?.(debouncedContent);
  }, [debouncedContent, onChange]);
  // 性能优化，储存渲染结果
  const renderedMarkdown = useMemo(() => {
    try {
      return <MarkDownViewer content={debouncedContent} />;
    }
    catch (error) {
      console.error("Failed to render markdown:", error);
      return <div className="text-red-500 text-center text-lg">渲染出错</div>;
    }
  }, [debouncedContent]);

  // 向光标位置插入一段文本，或者替换选中的文本。
  const insertText = (text: string) => {
    if (!textareaRef.current)
      return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    setContent(`${beforeText}${text}${afterText}`);
  };

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    // 获取剪贴板中的图片
    const items = e.clipboardData?.items;
    if (!items)
      return;
    // 如果是图片则放到imgFile中;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob)
          continue;
        const file = new File([blob], blob.name, {
          type: blob.type,
        });
        const url = await uploadUtils.uploadImg(file);
        insertText(`![${file.name}](${url})`);
      }
    }
  }
  // 插入一段markdown支持的格式
  const insertFormat = (format: MarkdownFormatType) => {
    if (!textareaRef.current)
      return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selectedText = content.substring(start, end);
    let textToInsert: string;
    let newCursorOffset: number = 0;

    switch (format) {
      case "strong":
        textToInsert = ` **${selectedText}** `;
        newCursorOffset = 3 + selectedText.length;
        break;
      case "em":
        textToInsert = ` _${selectedText}_ `;
        newCursorOffset = 2 + selectedText.length;
        break;
      case "code":
        textToInsert = ` \`${selectedText}\` `;
        newCursorOffset = 2 + selectedText.length;
        break;
      case "a":
        textToInsert = `[${selectedText}](url)`;
        newCursorOffset = 1 + selectedText.length;
        break;
      case "img":
        textToInsert = `![${selectedText}](url)`;
        newCursorOffset = 2 + selectedText.length;
        break;
      case "ul":
        textToInsert = `\n- ${selectedText}`;
        newCursorOffset = 3;
        break;
      case "ol":
        textToInsert = `\n1. ${selectedText}`;
        newCursorOffset = 4;
        break;
      case "blockquote":
        textToInsert = `\n> ${selectedText}`;
        newCursorOffset = 2;
        break;
      case "del":
        textToInsert = ` ~~${selectedText}~~ `;
        newCursorOffset = 3 + selectedText.length;
        break;
      case "codeBlock":
        textToInsert = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
        newCursorOffset = 4;
        break;
      case "detail":
        textToInsert = `\n<details>\n<summary>${selectedText || "标题"}</summary>\n\n内容\n</details>\n`;
        newCursorOffset = 33 + selectedText.length;
        break;
      case "bilibili":
        textToInsert = `{{bilibili:${selectedText || "bv"}}}`;
        newCursorOffset = 13 + selectedText.length;
        break;
      case "youtube":
        textToInsert = `{{youtube:${selectedText || "id"}}}`;
        newCursorOffset = 12 + selectedText.length;
        break;
      default:
        textToInsert = selectedText;
    }
    insertText(textToInsert);
    // 设置光标位置
    setTimeout(() => {
      textarea.selectionStart = start + newCursorOffset;
      textarea.selectionEnd = start + newCursorOffset;
      textarea.focus();
    }, 0);
  };
  // 快捷键处理部分
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key) {
      const textarea = document.activeElement as HTMLTextAreaElement;
      if (!textarea || textarea.tagName !== "TEXTAREA")
        return;
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          insertFormat("strong");
          break;
        case "i":
          e.preventDefault();
          insertFormat("em");
          break;
        case "k":
          e.preventDefault();
          insertFormat("a");
          break;
        case "e":
          e.preventDefault();
          insertFormat("code");
          break;
        case "q":
          e.preventDefault();
          insertFormat("blockquote");
          break;
        case "d":
          if (e.altKey) {
            e.preventDefault();
            insertFormat("del");
          }
      }
    }
  };
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}>
      {/* 编辑器 */}
      <div className="space-y-2 flex flex-col">
        {/* 操作按钮栏 */}
        <div className="flex flex-wrap gap-2">
          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="加粗 (Ctrl+B)"
            onClick={() => insertFormat("strong")}
          >
            <BaselineFormatBold className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="斜体 (Ctrl+I)"
            onClick={() => insertFormat("em")}
          >
            <BaselineFormatItalic className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="链接 (Ctrl+K)"
            onClick={() => insertFormat("a")}
          >
            <LinkFilled className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="代码 (Ctrl+E)"
            onClick={() => insertFormat("code")}
          >
            <BaselineCode className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="无序列表"
            onClick={() => insertFormat("ul")}
          >
            <ListUnordered className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="有序列表"
            onClick={() => insertFormat("ol")}
          >
            <ListOrdered className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="引用 (Ctrl+Q)"
            onClick={() => insertFormat("blockquote")}
          >
            <QuoteAltRight className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="删除线 (Ctrl+Alt+D)"
            onClick={() => insertFormat("del")}
          >
            <DeleteLine className="size-6"></DeleteLine>
          </div>

          <ImgUploader setImg={async (imgFile) => {
            const url = await uploadUtils.uploadImg(imgFile);
            insertText(`![${imgFile.name}](${url})`);
          }}
          >
            <div
              className="tooltip hover:bg-base-200 rounded cursor-pointer"
              data-tip="插入图片(可以直接粘贴图片）"
              // onClick={() => insertFormat("img")}
            >
              <Image2Fill className="size-6" />
            </div>
          </ImgUploader>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="插入代码块"
            onClick={() => insertFormat("codeBlock")}
          >
            <FileCodeOne className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="插入折叠块"
            onClick={() => insertFormat("detail")}
          >
            <FoldDown className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="插入B站视频"
            onClick={() => insertFormat("bilibili")}
          >
            <BilibiliFill className="size-6" />
          </div>

          <div
            className="tooltip hover:bg-base-200 rounded cursor-pointer"
            data-tip="插入YouTube视频"
            onClick={() => insertFormat("youtube")}
          >
            <YoutubeSolid className="size-6" />
          </div>
        </div>
        <textarea
          ref={textareaRef}
          placeholder="写下你的想法..."
          className="textarea textarea-bordered w-full min-h-[255px] lg:flex-1 overflow-auto"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
          }}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          required
        />
      </div>
      {/* 预览 */}
      <div className="flex-1 space-y-2 flex flex-col">
        <label className="label">
          <span className="label-text">预览</span>
        </label>
        <div
          className="border border-base-300 rounded-box pl-4 min-h-[255px] lg:flex-1 pr-4 overflow-auto w-full"
        >
          {renderedMarkdown}
        </div>
      </div>
    </div>
  );
}
