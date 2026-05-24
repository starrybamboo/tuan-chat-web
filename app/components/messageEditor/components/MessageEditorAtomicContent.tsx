import type { ReactNode } from "react";
import type { MessageEditorMessage } from "../messageEditorTypes";
import type { WebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { extractDocCardReferencePayload, resolveDocCardDisplayCoverUrl } from "@/components/chat/message/docCard/docCardMedia";
import CachedVideoMessage from "@/components/chat/message/media/CachedVideoMessage";
import { createWebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";
import { extractRoomJumpPayload } from "@/components/chat/utils/roomJump";
import BetterImg from "@/components/common/betterImg";
import { DiceFiveIcon, FileTextIcon, ImageIcon, Link, MusicNote, PlayIcon, PlusIcon, TrashIcon } from "@/icons";
import { getFileMessageExtra, getImageMessageExtra, getSoundMessageExtra, getVideoMessageExtra } from "@/types/messageExtra";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { formatWebgalChooseSummary } from "@/types/webgalChoose";
import { imageMediumUrl, mediaFileUrl, normalizeMediaType } from "@/utils/mediaUrl";
import { resolveMessageEditorGenericBlockText } from "../model/messageEditorAtomicDisplay";
import { normalizeMessageEditorContent, setMessageEditorWebgalChooseOptions, updateMessageEditorTextContent } from "../model/messageEditorTransforms";

interface MessageEditorAtomicContentProps {
  blockId: string;
  message: MessageEditorMessage;
  onUpdate: (blockId: string, updater: (message: MessageEditorMessage) => MessageEditorMessage) => void;
  readOnly?: boolean;
  typeLabel?: string;
}

type WebgalChooseOptionValue = Pick<WebgalChooseOptionDraft, "code" | "text">;

const ATOMIC_SURFACE_CLASS_NAME = "min-w-0 text-base leading-7";
const ATOMIC_CAPTION_CLASS_NAME = "whitespace-pre-wrap break-words text-sm leading-6 text-base-content/70";
const ATOMIC_CAPTION_EDITOR_CLASS_NAME = [
  ATOMIC_CAPTION_CLASS_NAME,
  "min-h-6 rounded-sm outline-none select-text",
  "selection:bg-sky-200/25 selection:text-base-content",
  "focus:text-base-content/85",
].join(" ");
const ATOMIC_CAPTION_BLOCK_TAG_NAMES = new Set(["DIV", "LI", "P"]);

function AtomicSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${ATOMIC_SURFACE_CLASS_NAME} ${className}`}>
      {children}
    </div>
  );
}

function AtomicCaption({ content }: { content?: string }) {
  if (!content) {
    return null;
  }

  return (
    <div className={ATOMIC_CAPTION_CLASS_NAME}>
      {content}
    </div>
  );
}

function normalizeAtomicCaptionText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function readAtomicCaptionNodeText(node: Node | null, root?: Node): string {
  if (!node) {
    return "";
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node instanceof HTMLBRElement) {
    return "\n";
  }

  const childNodes = Array.from(node.childNodes);
  let text = "";
  childNodes.forEach((child, index) => {
    text += readAtomicCaptionNodeText(child, root ?? node);
    if (
      child instanceof HTMLElement
      && child !== (root ?? node)
      && ATOMIC_CAPTION_BLOCK_TAG_NAMES.has(child.tagName)
      && index < childNodes.length - 1
      && text
      && !text.endsWith("\n")
    ) {
      text += "\n";
    }
  });
  return text;
}

function getAtomicCaptionElementText(node: HTMLElement) {
  return normalizeAtomicCaptionText(readAtomicCaptionNodeText(node, node));
}

function replaceAtomicCaptionElementText(node: HTMLElement, content: string) {
  node.replaceChildren();
  if (content) {
    node.appendChild(document.createTextNode(content));
  }
}

function insertPlainTextAtAtomicCaptionSelection(root: HTMLElement, text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return false;
  }

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function AtomicEditableCaption({
  blockId,
  hiddenWhenEmpty = false,
  message,
  onUpdate,
  placeholder = "添加说明",
  readOnly = false,
}: MessageEditorAtomicContentProps & {
  hiddenWhenEmpty?: boolean;
  placeholder?: string;
}) {
  const content = normalizeMessageEditorContent(message.content);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);

  useLayoutEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }

    if (getAtomicCaptionElementText(node) === content) {
      return;
    }

    replaceAtomicCaptionElementText(node, content);
  }, [content]);

  const commitContent = useCallback((node: HTMLElement) => {
    const nextContent = getAtomicCaptionElementText(node);
    onUpdate(blockId, current => updateMessageEditorTextContent(current, nextContent));
  }, [blockId, onUpdate]);

  if (readOnly) {
    return content ? <AtomicCaption content={content} /> : null;
  }

  if (hiddenWhenEmpty && !content && !focused) {
    return null;
  }

  return (
    <div className="relative min-w-0">
      <div
        ref={editorRef}
        aria-label="消息说明"
        contentEditable
        data-me-atomic-caption="true"
        role="textbox"
        suppressContentEditableWarning
        className={ATOMIC_CAPTION_EDITOR_CLASS_NAME}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          setFocused(false);
          commitContent(event.currentTarget);
        }}
        onInput={event => commitContent(event.currentTarget)}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain");
          if (!text) {
            return;
          }
          event.preventDefault();
          if (insertPlainTextAtAtomicCaptionSelection(event.currentTarget, normalizeAtomicCaptionText(text))) {
            commitContent(event.currentTarget);
          }
        }}
      />
      {!content && !focused && (
        <div className="pointer-events-none absolute inset-0 text-sm leading-6 text-base-content/30">
          {placeholder}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes?: number) {
  if (!bytes || Number.isNaN(bytes)) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)}${units[unitIndex]}`;
}

function resolveMediaPayloadUrl(
  payload: { fileId?: number; mediaType?: string } | undefined,
  expectedMediaType?: "image" | "audio" | "video",
) {
  if (typeof payload?.fileId === "number" && payload.fileId <= 0) {
    return "";
  }
  const resolvedMediaType = payload?.mediaType ? normalizeMediaType(payload.mediaType) : expectedMediaType;
  return mediaFileUrl(payload?.fileId, resolvedMediaType, "low");
}

function readChooseOptionValues(message: MessageEditorMessage): WebgalChooseOptionValue[] {
  const rawOptions = (message.extra as any)?.webgalChoose?.options;
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    return [{ code: "", text: "" }];
  }

  const options = rawOptions.map((option) => {
    const text = typeof option?.text === "string" ? option.text : "";
    const code = typeof option?.code === "string" ? option.code : "";
    return { code, text };
  });
  return options.length > 0 ? options : [{ code: "", text: "" }];
}

function readChooseDraftOptions(message: MessageEditorMessage): WebgalChooseOptionDraft[] {
  return readChooseOptionValues(message).map(option => createWebgalChooseOptionDraft(option));
}

function getChooseSignature(options: WebgalChooseOptionValue[]) {
  return JSON.stringify(options.map(option => ({
    code: option.code,
    text: option.text,
  })));
}

function MessageEditorChoosePreview({ message }: { message: MessageEditorMessage }) {
  const options = readChooseOptionValues(message);
  const summary = formatWebgalChooseSummary({
    options: options
      .filter(option => option.text.trim().length > 0)
      .map(option => ({
        code: option.code.trim() ? option.code : undefined,
        text: option.text.trim(),
      })),
  });
  const hasCode = options.some(option => option.code.trim().length > 0);

  return (
    <AtomicSurface className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs leading-5 text-base-content/50">
        <span>选择</span>
        <span>
          {options.length}
          {" "}
          个选项
        </span>
        {hasCode && <span>含代码</span>}
        {summary && <span className="truncate">{summary}</span>}
      </div>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={`${index}:${option.text}:${option.code}`} className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-base-content/45">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="break-words text-base leading-7 text-base-content/85">
                {option.text.trim() || "未命名选项"}
              </div>
              {option.code.trim() && (
                <div className="mt-1 whitespace-pre-wrap break-words text-xs font-mono text-base-content/65">
                  {option.code}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AtomicSurface>
  );
}

function MessageEditorChooseEditor({
  blockId,
  message,
  onUpdate,
}: MessageEditorAtomicContentProps) {
  const [draftOptions, setDraftOptions] = useState<WebgalChooseOptionDraft[]>(() => readChooseDraftOptions(message));
  const externalSignature = useMemo(() => getChooseSignature(readChooseOptionValues(message)), [message]);
  const localSignature = useMemo(() => getChooseSignature(draftOptions), [draftOptions]);

  useEffect(() => {
    if (externalSignature === localSignature) {
      return;
    }
    setDraftOptions(readChooseDraftOptions(message));
  }, [externalSignature, localSignature, message]);

  const commitDraftOptions = useCallback((nextDraftOptions: WebgalChooseOptionDraft[]) => {
    setDraftOptions(nextDraftOptions);
    onUpdate(blockId, current => setMessageEditorWebgalChooseOptions(current, nextDraftOptions.map(option => ({
      code: option.code,
      text: option.text,
    }))));
  }, [blockId, onUpdate]);

  const handleChangeOption = useCallback((index: number, key: keyof WebgalChooseOptionDraft, value: string) => {
    const nextDraftOptions = draftOptions.map((option, optionIndex) => {
      if (optionIndex !== index) {
        return option;
      }
      return {
        ...option,
        [key]: value,
      };
    });
    commitDraftOptions(nextDraftOptions);
  }, [commitDraftOptions, draftOptions]);

  const handleAddOption = useCallback(() => {
    commitDraftOptions([...draftOptions, createWebgalChooseOptionDraft()]);
  }, [commitDraftOptions, draftOptions]);

  const handleRemoveOption = useCallback((index: number) => {
    if (draftOptions.length <= 1) {
      return;
    }
    const nextDraftOptions = draftOptions.filter((_, optionIndex) => optionIndex !== index);
    commitDraftOptions(nextDraftOptions.length > 0 ? nextDraftOptions : [createWebgalChooseOptionDraft()]);
  }, [commitDraftOptions, draftOptions]);

  const chooseInputClassName = "w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <AtomicSurface className="space-y-3 py-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/55">
        <span>选择</span>
        <span>
          {draftOptions.length}
          {" "}
          个选项
        </span>
      </div>

      <div>
        {draftOptions.map((option, index) => (
          <div key={option.id} className="border-b border-base-300/40 py-2 first:pt-0 last:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-base-content/55">
                选项
                {index + 1}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs h-7 min-h-0 w-7 px-0 text-base-content/55 hover:text-error"
                onMouseDown={event => event.preventDefault()}
                onClick={() => handleRemoveOption(index)}
                disabled={draftOptions.length <= 1}
                aria-label={`删除选项 ${index + 1}`}
                title={`删除选项 ${index + 1}`}
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
            <div className="mt-2 space-y-2">
              <input
                className={chooseInputClassName}
                placeholder="选项文本"
                value={option.text}
                onChange={(event) => {
                  handleChangeOption(index, "text", event.target.value);
                }}
              />
              <textarea
                className={`${chooseInputClassName} min-h-24 font-mono`}
                placeholder="自定义代码（可选）"
                value={option.code}
                onChange={(event) => {
                  handleChangeOption(index, "code", event.target.value);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-sm gap-2 text-base-content/70"
        onMouseDown={event => event.preventDefault()}
        onClick={handleAddOption}
      >
        <PlusIcon className="size-4" />
        添加选项
      </button>
    </AtomicSurface>
  );
}

function MessageEditorImagePreview(props: MessageEditorAtomicContentProps) {
  const { message } = props;
  const imagePayload = getImageMessageExtra(message.extra);
  const imgUrl = (typeof imagePayload?.fileId === "number" && imagePayload.fileId > 0
    ? imageMediumUrl(imagePayload.fileId)
    : "") || resolveMediaPayloadUrl(imagePayload, "image");
  const imgWidth = typeof imagePayload?.width === "number" ? imagePayload.width : undefined;
  const imgHeight = typeof imagePayload?.height === "number" ? imagePayload.height : undefined;

  return (
    <AtomicSurface className="space-y-1">
      {imgUrl
        ? (
            <div className="min-w-0">
              <BetterImg
                src={imgUrl}
                size={{ width: imgWidth, height: imgHeight }}
                className="block h-auto max-h-[420px] max-w-full rounded-sm object-contain"
              />
            </div>
          )
        : (
            <div className="flex min-h-32 items-center justify-center border border-dashed border-base-300/60 bg-base-200/25 text-sm text-base-content/55">
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="size-4" />
                [图片]
              </span>
            </div>
          )}
      <AtomicEditableCaption {...props} />
    </AtomicSurface>
  );
}

function MessageEditorFilePreview(props: MessageEditorAtomicContentProps) {
  const { message } = props;
  const fileMessage = getFileMessageExtra(message.extra);
  const fileUrl = resolveMediaPayloadUrl(fileMessage, undefined);
  const fileName = fileMessage?.fileName || "文件";
  const sizeLabel = formatFileSize(fileMessage?.size);

  const body = (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center text-base-content/45">
        <FileTextIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base leading-7 text-base-content/85">{fileName}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-base-content/55">
          {sizeLabel && <span>{sizeLabel}</span>}
          {fileUrl && <span>可打开</span>}
        </div>
      </div>
    </div>
  );

  return (
    <AtomicSurface className="space-y-1">
      {fileUrl
        ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-sm transition hover:bg-base-200/35"
              onClick={event => event.stopPropagation()}
            >
              {body}
            </a>
          )
        : body}
      <AtomicEditableCaption {...props} />
    </AtomicSurface>
  );
}

function MessageEditorAudioPreview(props: MessageEditorAtomicContentProps) {
  const { message } = props;
  const soundMessage = getSoundMessageExtra(message.extra);
  const audioUrl = resolveMediaPayloadUrl(soundMessage, "audio");
  const fileName = soundMessage?.fileName || "音频";
  const sizeLabel = formatFileSize(soundMessage?.size);

  return (
    <AtomicSurface className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center text-base-content/45">
          <MusicNote className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base leading-7 text-base-content/85">{fileName}</div>
          {sizeLabel && <div className="text-xs text-base-content/55">{sizeLabel}</div>}
        </div>
      </div>
      {audioUrl
        ? (
            <audio controls className="w-full">
              <source src={audioUrl} />
            </audio>
          )
        : (
            <div className="rounded-md border border-dashed border-base-300 bg-base-200/30 px-3 py-4 text-sm text-base-content/55">
              [语音资源不可用]
            </div>
          )}
      <AtomicEditableCaption {...props} />
    </AtomicSurface>
  );
}

function MessageEditorVideoPreview(props: MessageEditorAtomicContentProps) {
  const { message } = props;
  const videoMessage = getVideoMessageExtra(message.extra);
  const videoUrl = resolveMediaPayloadUrl(videoMessage, "video");

  return (
    <AtomicSurface className="space-y-1">
      {videoUrl
        ? (
            <div className="overflow-hidden rounded-sm bg-black">
              <CachedVideoMessage
                cacheKey={`message-editor:${message.messageId ?? "temp"}:video`}
                url={videoUrl}
                className="block max-h-[360px] w-full bg-black object-contain"
              />
            </div>
          )
        : (
            <div className="flex min-h-40 items-center justify-center border border-dashed border-base-300/60 bg-base-200/25 text-sm text-base-content/55">
              <span className="inline-flex items-center gap-2">
                <PlayIcon className="size-4" />
                [视频资源不可用]
              </span>
            </div>
          )}
      <AtomicEditableCaption {...props} />
    </AtomicSurface>
  );
}

function MessageEditorDicePreview({ message }: { message: MessageEditorMessage }) {
  const diceResult = message.extra?.diceResult;
  const result = diceResult?.result || message.content || "";

  return (
    <AtomicSurface className="flex items-start gap-2">
      <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center text-base-content/45">
        <DiceFiveIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-base-content/55">骰子结果</div>
        <div className="whitespace-pre-wrap break-words text-base leading-7 text-base-content/85">
          {result || "[骰子结果]"}
        </div>
      </div>
    </AtomicSurface>
  );
}

function MessageEditorDocCardPreview({ message }: { message: MessageEditorMessage }) {
  const payload = extractDocCardReferencePayload(message.extra);
  const docId = payload?.docId ?? "";
  const excerpt = payload?.excerpt ?? "";
  const displayCoverUrl = resolveDocCardDisplayCoverUrl(payload, "medium");
  const title = payload?.title ?? "";
  const resolvedTitle = title || (docId ? `文档：${docId}` : "文档");

  return (
    <AtomicSurface className="flex items-start gap-3">
      <div className="relative mt-1 h-14 w-20 shrink-0 overflow-hidden rounded-sm bg-base-200">
        {displayCoverUrl
          ? (
              <img src={displayCoverUrl} alt={resolvedTitle} draggable={false} className="h-full w-full object-cover" />
            )
          : (
              <div className="flex h-full w-full items-center justify-center">
                <FileTextIcon className="size-5 opacity-60" />
              </div>
            )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/55">
          <span className="inline-flex items-center gap-1">
            <FileTextIcon className="size-3.5" />
            文档引用
          </span>
          {docId && <span className="font-mono">{docId}</span>}
        </div>
        <div className="line-clamp-2 text-base leading-7 text-base-content/85">
          {resolvedTitle}
        </div>
        <div className="line-clamp-3 text-sm leading-6 text-base-content/65">
          {excerpt || "暂无摘要"}
        </div>
      </div>
    </AtomicSurface>
  );
}

function MessageEditorRoomJumpPreview({ message }: { message: MessageEditorMessage }) {
  const payload = extractRoomJumpPayload(message.extra);

  if (!payload) {
    return (
      <AtomicSurface className="flex items-center gap-2 text-base text-base-content/55">
        <Link className="size-4" />
        [群聊跳转]
      </AtomicSurface>
    );
  }

  const title = payload.label || payload.roomName || `群聊 #${payload.roomId}`;
  const spaceLabel = payload.spaceName || (payload.spaceId ? `空间 #${payload.spaceId}` : "");
  const roomLabel = payload.roomName || `群聊 #${payload.roomId}`;

  return (
    <AtomicSurface className="flex items-start gap-2">
      <div className="mt-1 inline-flex size-5 shrink-0 items-center justify-center text-base-content/45">
        <Link className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/55">
          <span>群聊跳转</span>
          {spaceLabel && <span>{spaceLabel}</span>}
        </div>
        <div className="line-clamp-1 text-base leading-7 text-base-content/85">
          {title}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/65">
          <span>{roomLabel}</span>
          {payload.categoryName && (
            <span>
              ·
              {payload.categoryName}
            </span>
          )}
        </div>
      </div>
    </AtomicSurface>
  );
}

function MessageEditorGenericPreview({
  message,
  typeLabel,
}: {
  message: MessageEditorMessage;
  typeLabel: string;
}) {
  const content = resolveMessageEditorGenericBlockText({
    content: message.content,
    typeLabel,
  });

  return (
    <AtomicSurface>
      <div className="whitespace-pre-wrap break-words text-base leading-7 text-base-content/75">
        {content}
      </div>
    </AtomicSurface>
  );
}

export function MessageEditorAtomicContent({
  blockId,
  message,
  onUpdate,
  readOnly = false,
  typeLabel = "消息",
}: MessageEditorAtomicContentProps) {
  switch (message.messageType) {
    case MESSAGE_TYPE.IMG:
      return <MessageEditorImagePreview blockId={blockId} message={message} onUpdate={onUpdate} readOnly={readOnly} typeLabel={typeLabel} />;
    case MESSAGE_TYPE.FILE:
      return <MessageEditorFilePreview blockId={blockId} message={message} onUpdate={onUpdate} readOnly={readOnly} typeLabel={typeLabel} />;
    case MESSAGE_TYPE.SOUND:
      return <MessageEditorAudioPreview blockId={blockId} message={message} onUpdate={onUpdate} readOnly={readOnly} typeLabel={typeLabel} />;
    case MESSAGE_TYPE.VIDEO:
      return <MessageEditorVideoPreview blockId={blockId} message={message} onUpdate={onUpdate} readOnly={readOnly} typeLabel={typeLabel} />;
    case MESSAGE_TYPE.DICE:
      return <MessageEditorDicePreview message={message} />;
    case MESSAGE_TYPE.DOC_CARD:
      return <MessageEditorDocCardPreview message={message} />;
    case MESSAGE_TYPE.ROOM_JUMP:
      return <MessageEditorRoomJumpPreview message={message} />;
    case MESSAGE_TYPE.SYSTEM:
    case MESSAGE_TYPE.FORWARD:
    case MESSAGE_TYPE.EFFECT:
    case MESSAGE_TYPE.COMMAND_REQUEST:
    case MESSAGE_TYPE.STATE_EVENT:
    case MESSAGE_TYPE.CLUE_CARD:
    case MESSAGE_TYPE.READ_LINE:
      return <MessageEditorGenericPreview message={message} typeLabel={typeLabel} />;
    case MESSAGE_TYPE.WEBGAL_CHOOSE:
      return readOnly
        ? <MessageEditorChoosePreview message={message} />
        : <MessageEditorChooseEditor blockId={blockId} message={message} onUpdate={onUpdate} />;
    default:
      return <MessageEditorGenericPreview message={message} typeLabel={typeLabel} />;
  }
}
