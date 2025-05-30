import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import { CommunityContext } from "@/components/community/communityContext";
import {
  BaselineCode,
  BaselineFormatBold,
  BaselineFormatItalic,
  BilibiliFill,
  DeleteLine,
  FileCodeOne,
  Image2Fill,
  LinkFilled,
  ListOrdered,
  ListUnordered,
  QuoteAltRight,
  YoutubeSolid,
} from "@/icons";
import { UploadUtils } from "@/utils/UploadUtils";
import { useDebounce } from "ahooks";
import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { usePublishPostMutation } from "../../../api/hooks/communityQueryHooks";

type MarkdownFormatType =
  | "strong" | "em" | "code" | "blockquote" | "codeBlock"
  | "ul" | "ol" | "li"
  | "a" | "img"
  | "p" | "pre" | "hr" | "br" | "del"
  | "table" | "thead" | "tbody" | "tr" | "th" | "td"
  | "bilibili" | "youtube";

// save editing post
interface StoredPost {
  title?: string;
  content?: string;
}

export default function PostWriter({ onClose }: { onClose?: () => void }) {
  const communityContext = use(CommunityContext);
  const communityId = communityContext.communityId ?? -1;
  const publishPostMutation = usePublishPostMutation();
  const isPublishing = publishPostMutation.isPending;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const uploadUtils = new UploadUtils(2);

  const [storedPost, setStoredPost] = useLocalStorage<StoredPost>("saveWritingPost", {});

  const [title, setTitle] = useState(storedPost.title ?? "");
  const [content, setContent] = useState(storedPost.content ?? "");
  // 性能优化，防抖
  const debouncedContent = useDebounce(content, { wait: 200 });
  // 性能优化，储存渲染结果
  const renderedMarkdown = useMemo(() => {
    return (<MarkDownViewer content={debouncedContent} />);
  }, [debouncedContent]);

  useEffect(() => {
    setStoredPost({
      title,
      content: debouncedContent,
    });
  }, [title, debouncedContent, setStoredPost]);

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim())
      return;

    publishPostMutation.mutate(
      {
        communityId,
        title: title.trim(),
        content: content.trim(),
      },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          if (onClose) {
            onClose();
          }
        },
      },
    );
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body ">
        <h2 className="card-title">
          创建帖子
          <span className="text-xs opacity-70">（所有改动都会实时保存到浏览器本地）</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 ">
          <div>
            <label className="label">
              <span className="label-text">标题</span>
            </label>
            <input
              type="text"
              placeholder="标题"
              className="input input-bordered w-full"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col lg:flex-row md:flex-row gap-4 flex-1  ">
            {/* 编辑器 */}
            <div className="space-y-2 flex flex-col min-w-[50%]">
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

                <div
                  className="tooltip hover:bg-base-200 rounded cursor-pointer"
                  data-tip="插入图片(可以直接粘贴图片）"
                  onClick={() => insertFormat("img")}
                >
                  <Image2Fill className="size-6" />
                </div>

                <div
                  className="tooltip hover:bg-base-200 rounded cursor-pointer"
                  data-tip="插入代码块"
                  onClick={() => insertFormat("codeBlock")}
                >
                  <FileCodeOne className="size-6" />
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
                className="textarea textarea-bordered w-full min-h-[255px] overflow-auto"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight + 20}px`;
                }}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                required
              />
            </div>
            {/* 预览 */}
            <div className="flex-1 space-y-2 lg:w-[50%]">
              <label className="label">
                <span className="label-text">预览</span>
              </label>
              <div className="border border-base-300 rounded-box pl-4 min-h-[255px] pr-4 overflow-auto">
                {renderedMarkdown}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-info"
              disabled={isPublishing}
            >
              {isPublishing
                ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      发布中...
                    </>
                  )
                : (
                    "发布帖子"
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
