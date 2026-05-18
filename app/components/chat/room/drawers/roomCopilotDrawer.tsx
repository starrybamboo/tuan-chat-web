import type { CopilotContextRef, GalAuthoringContext, GalAuthoringLocalSnapshot, GalPatchProposal, GalStoryPatch, PersistedRoomCopilotMessage } from "@/components/chat/galgameAi";
import { ChatCircleText, CheckCircle, CircleNotch, FileText, House, PaperPlaneTilt, Robot, Sparkle, UserCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { toast } from "react-hot-toast";

import {
  addCopilotContextRef,
  createGalPatchProposal,
  galPatchProposalStore,
  getCopilotContextRefKey,
  getGalAuthoringContext,
  getReferenceRoomIdsFromCopilotContextRefs,
  removeCopilotContextRef,
  requestGalCopilotPatchRepair,
  requestGalCopilotPatchStream,
  roomCopilotConversationStore,
  toGalReferencesFromCopilotContextRefs,
} from "@/components/chat/galgameAi";
import { getChatMessageDragData, isChatMessageDrag } from "@/components/chat/utils/chatMessageDrag";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";
import { getRoleRefDragData, isRoleRefDrag } from "@/components/chat/utils/roleRef";
import { getRoomRefDragData, isRoomRefDrag } from "@/components/chat/utils/roomRef";

interface RoomCopilotDrawerProps {
  spaceId: number;
  roomId: number;
  localSnapshot?: GalAuthoringLocalSnapshot;
  onGalPatchProposalGenerated?: (proposal: GalPatchProposal) => void;
}

interface CopilotChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  status?: "pending" | "success" | "error";
  progressMessage?: string | null;
  repairMessage?: string | null;
  proposal?: GalPatchProposal | null;
  proposalId?: string | null;
  error?: string | null;
  contextRefs?: CopilotContextRef[];
}

function createProposalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `gal-ai:${crypto.randomUUID()}`;
  }
  return `gal-ai:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function createMessageId(prefix: CopilotChatMessage["role"]) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function createIntroMessage(): CopilotChatMessage {
  return {
    id: "assistant:intro",
    role: "assistant",
    content: "我可以直接帮你改当前房间的 Galgame 剧本。你像聊天一样说要改哪里，我会生成一份可预览、可应用的草稿。",
    status: "success",
  };
}

function formatSummary(proposal: GalPatchProposal | null) {
  if (!proposal) {
    return null;
  }
  return [
    { label: "新增", value: proposal.summary.added },
    { label: "修改", value: proposal.summary.modified },
    { label: "删除", value: proposal.summary.deleted },
    { label: "移动", value: proposal.summary.moved },
  ];
}

async function hydratePersistedCopilotMessage(message: PersistedRoomCopilotMessage): Promise<CopilotChatMessage> {
  if (!message.proposalId) {
    return {
      ...message,
      progressMessage: null,
      proposal: null,
    };
  }
  try {
    return {
      ...message,
      progressMessage: null,
      proposal: await galPatchProposalStore.get(message.proposalId),
    };
  }
  catch {
    return {
      ...message,
      progressMessage: null,
      proposal: null,
    };
  }
}

async function hydratePersistedCopilotMessages(
  messages: PersistedRoomCopilotMessage[],
): Promise<CopilotChatMessage[]> {
  return Promise.all(messages.map(hydratePersistedCopilotMessage));
}

function buildConversationalInstruction(params: {
  history: CopilotChatMessage[];
  currentInstruction: string;
  currentContextRefs: CopilotContextRef[];
}) {
  const turns = params.history
    .filter(message => message.role === "user" || message.proposal)
    .slice(-8)
    .map((message) => {
      if (message.role === "user") {
        const refs = formatContextRefsForInstruction(message.contextRefs ?? []);
        return refs ? `用户：${message.content}\n本轮引用：${refs}` : `用户：${message.content}`;
      }
      const summary = message.proposal?.summary;
      if (!summary) {
        return `Copilot：${message.content}`;
      }
      return [
        `Copilot：${message.content}`,
        `草稿统计：新增 ${summary.added}，修改 ${summary.modified}，删除 ${summary.deleted}，移动 ${summary.moved}。`,
      ].join("\n");
    });

  if (turns.length === 0) {
    return params.currentInstruction;
  }

  return [
    "下面是用户与 Copilot 在当前房间中的最近对话，用于理解追问和微调意图。",
    turns.join("\n"),
    "",
    ...(params.currentContextRefs.length > 0
      ? [
          "当前用户显式拖入的上下文：",
          formatContextRefsForInstruction(params.currentContextRefs),
          "",
        ]
      : []),
    "当前用户输入：",
    params.currentInstruction,
  ].join("\n");
}

function updateAssistantMessage(
  messages: CopilotChatMessage[],
  messageId: string,
  updater: (message: CopilotChatMessage) => CopilotChatMessage,
) {
  return messages.map(message => (message.id === messageId ? updater(message) : message));
}

function buildProposal(params: {
  spaceId: number;
  roomId: number;
  context: GalAuthoringContext;
  patch: GalStoryPatch;
}) {
  return createGalPatchProposal({
    proposalId: createProposalId(),
    spaceId: String(params.spaceId),
    roomId: String(params.roomId),
    baseSnapshot: params.context.messages,
    patch: params.patch,
    context: {
      roomId: params.context.room.roomId,
      roles: params.context.roles.roomRoles,
      narrator: params.context.roles.narrator,
      annotations: params.context.annotations,
    },
  });
}

function formatContextRefsForInstruction(refs: readonly CopilotContextRef[]) {
  return refs.map((ref) => {
    if (ref.kind === "room") {
      return `参考房间「${ref.label}」`;
    }
    if (ref.kind === "message") {
      return `${ref.mode === "target" ? "修改范围" : "参考片段"}「${ref.label}」`;
    }
    if (ref.kind === "role") {
      return `角色约束「${ref.label}」`;
    }
    return `设定文档「${ref.label}」`;
  }).join("；");
}

function formatCopilotErrorMessage(caught: unknown) {
  const message = caught instanceof Error ? caught.message : String(caught);
  const normalized = message.trim();
  const looksLikeSchemaError = normalized.includes("\"code\"")
    && (normalized.includes("\"path\"") || normalized.includes("invalid_type") || normalized.includes("unrecognized_keys"));
  if (looksLikeSchemaError) {
    return "模型返回的修改草稿格式不完整，已停止本轮生成。可以直接说“继续”，或换个说法再试一次。";
  }
  return message;
}

function getDropHint(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer) {
    return null;
  }
  if (isChatMessageDrag(dataTransfer)) {
    return "松开添加为修改范围";
  }
  if (isRoomRefDrag(dataTransfer)) {
    return "松开添加参考房间";
  }
  if (isDocRefDrag(dataTransfer)) {
    return "松开添加设定文档";
  }
  if (isRoleRefDrag(dataTransfer)) {
    return "松开添加角色约束";
  }
  return null;
}

function RoomCopilotDrawerImpl({
  spaceId,
  roomId,
  localSnapshot,
  onGalPatchProposalGenerated,
}: RoomCopilotDrawerProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = React.useState<CopilotChatMessage[]>(() => [createIntroMessage()]);
  const [contextRefs, setContextRefs] = React.useState<CopilotContextRef[]>([]);
  const [draftInput, setDraftInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isConversationLoaded, setIsConversationLoaded] = React.useState(false);
  const [dropHint, setDropHint] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const canSend = isConversationLoaded && draftInput.trim().length > 0 && !isGenerating;

  React.useEffect(() => {
    let cancelled = false;
    setIsConversationLoaded(false);
    setMessages([createIntroMessage()]);
    setContextRefs([]);

    void Promise.all([
      roomCopilotConversationStore.get(String(roomId)),
      roomCopilotConversationStore.getContextRefs(String(roomId)),
    ])
      .then(async ([persistedMessages, persistedContextRefs]) => ({
        messages: await hydratePersistedCopilotMessages(persistedMessages),
        contextRefs: persistedContextRefs,
      }))
      .then((persisted) => {
        if (cancelled) {
          return;
        }
        setMessages(persisted.messages.length > 0 ? persisted.messages : [createIntroMessage()]);
        setContextRefs(persisted.contextRefs);
        setIsConversationLoaded(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setMessages([createIntroMessage()]);
        setIsConversationLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  React.useEffect(() => {
    if (!isConversationLoaded) {
      return;
    }
    void roomCopilotConversationStore.save(String(roomId), messages).catch(() => undefined);
  }, [isConversationLoaded, messages, roomId]);

  React.useEffect(() => {
    if (!isConversationLoaded) {
      return;
    }
    void roomCopilotConversationStore.saveContextRefs(String(roomId), contextRefs).catch(() => undefined);
  }, [contextRefs, isConversationLoaded, roomId]);

  React.useEffect(() => {
    const target = scrollRef.current;
    if (!target) {
      return;
    }
    target.scrollTop = target.scrollHeight;
  }, [messages]);

  const handleSend = React.useCallback(async () => {
    const normalizedInstruction = draftInput.trim();
    if (!normalizedInstruction || isGenerating || !isConversationLoaded) {
      return;
    }

    const history = messages;
    const contextRefsForTurn = contextRefs;
    const userMessage: CopilotChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: normalizedInstruction,
      contextRefs: contextRefsForTurn.length > 0 ? contextRefsForTurn : undefined,
    };
    const assistantMessageId = createMessageId("assistant");
    const pendingAssistantMessage: CopilotChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "我在读取当前房间，并把你的话转换成可应用的修改草稿。",
      status: "pending",
      progressMessage: "正在准备当前房间上下文",
    };
    const conversationalInstruction = buildConversationalInstruction({
      history,
      currentInstruction: normalizedInstruction,
      currentContextRefs: contextRefsForTurn,
    });
    const attachmentRefs = toGalReferencesFromCopilotContextRefs(contextRefsForTurn);
    const referenceRoomIds = getReferenceRoomIdsFromCopilotContextRefs(contextRefsForTurn, roomId);
    const turnRefKeys = new Set(
      contextRefsForTurn
        .filter(ref => ref.persistence === "turn")
        .map(getCopilotContextRefKey),
    );

    setMessages(current => [...current, userMessage, pendingAssistantMessage]);
    setDraftInput("");
    setIsGenerating(true);
    const toastId = toast.loading("正在生成 AI 修改草稿...");
    try {
      const context = await getGalAuthoringContext({
        spaceId,
        roomId,
        attachmentRefs,
        referenceRoomIds,
        queryClient,
        localSnapshot,
        proposalStore: galPatchProposalStore,
      });
      setMessages(current => updateAssistantMessage(current, assistantMessageId, message => ({
        ...message,
        progressMessage: "正在分析当前房间上下文",
      })));
      const response = await requestGalCopilotPatchStream({
        instruction: conversationalInstruction,
        context,
        onEvent: (event) => {
          if (event.type === "status") {
            setMessages(current => updateAssistantMessage(current, assistantMessageId, message => ({
              ...message,
              progressMessage: event.message,
            })));
          }
        },
      });
      let proposal = buildProposal({
        spaceId,
        roomId,
        context,
        patch: response.patch,
      });

      if (proposal.validationErrors.length > 0) {
        setMessages(current => updateAssistantMessage(current, assistantMessageId, message => ({
          ...message,
          progressMessage: "正在根据校验错误尝试修复草稿",
        })));
        const repairedResponse = await requestGalCopilotPatchRepair({
          instruction: conversationalInstruction,
          context,
          patch: response.patch,
          validationErrors: proposal.validationErrors,
        });
        const repairedProposal = buildProposal({
          spaceId,
          roomId,
          context,
          patch: repairedResponse.patch,
        });
        const repairMessage
          = repairedProposal.validationErrors.length > 0
            ? "已尝试自动修复，但仍有校验问题"
            : "已自动修复一轮校验问题";
        setMessages(current => updateAssistantMessage(current, assistantMessageId, message => ({
          ...message,
          repairMessage,
        })));
        proposal = repairedProposal;
      }

      await galPatchProposalStore.save(proposal);
      await galPatchProposalStore.setActive(String(roomId), proposal.proposalId);
      onGalPatchProposalGenerated?.(proposal);

      if (proposal.validationErrors.length > 0) {
        setMessages(current => updateAssistantMessage(current, assistantMessageId, message => ({
          ...message,
          content: "我生成了草稿，但它还有校验问题。你可以继续补充说明，我会按新的要求再试一次。",
          status: "error",
          progressMessage: null,
          proposal,
          proposalId: proposal.proposalId,
        })));
        toast.error("草稿生成完成，但存在校验问题", { id: toastId });
        return;
      }
      setMessages(current => updateAssistantMessage(current, assistantMessageId, message => ({
        ...message,
        content: "我已生成一份修改草稿，并放到主聊天里的预览条。你可以先看预览，也可以继续告诉我要怎么微调。",
        status: "success",
        progressMessage: null,
        proposal,
        proposalId: proposal.proposalId,
      })));
      toast.success("AI 修改草稿已生成", { id: toastId });
    }
    catch (caught) {
      const message = formatCopilotErrorMessage(caught);
      setMessages(current => updateAssistantMessage(current, assistantMessageId, item => ({
        ...item,
        content: "这次没有成功生成草稿。你可以换个说法，或稍后再试。",
        status: "error",
        progressMessage: null,
        error: message,
      })));
      toast.error(message, { id: toastId });
    }
    finally {
      if (turnRefKeys.size > 0) {
        setContextRefs(current => current.filter(ref => !turnRefKeys.has(getCopilotContextRefKey(ref))));
      }
      setIsGenerating(false);
    }
  }, [contextRefs, draftInput, isConversationLoaded, isGenerating, localSnapshot, messages, onGalPatchProposalGenerated, queryClient, roomId, spaceId]);

  const handleInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void handleSend();
  }, [handleSend]);

  const addContextRef = React.useCallback((nextRef: CopilotContextRef) => {
    const result = addCopilotContextRef(contextRefs, nextRef);
    setContextRefs(result.refs);
    if (result.status === "duplicate") {
      toast("这个上下文已经在 Copilot 里了");
    }
    else if (result.status === "room_limit") {
      toast.error("最多同时参考 3 个房间");
    }
    else if (result.status === "total_limit") {
      toast.error("Copilot 上下文太多了，先移除一些再添加");
    }
  }, [contextRefs]);

  const handleCopilotDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const hint = getDropHint(event.dataTransfer);
    if (!hint) {
      setDropHint(null);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setDropHint(hint);
  }, []);

  const handleCopilotDragLeave = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDropHint(null);
  }, []);

  const handleCopilotDrop = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const hint = getDropHint(event.dataTransfer);
    if (!hint) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setDropHint(null);

    const messageDrag = getChatMessageDragData(event.dataTransfer);
    if (messageDrag) {
      const messageCount = messageDrag.messageIds.length;
      addContextRef({
        kind: "message",
        sourceRoomId: String(messageDrag.sourceRoomId),
        messageIds: messageDrag.messageIds.map(String),
        label: messageCount > 1 ? `${messageCount} 条消息` : `消息 ${messageDrag.anchorMessageId}`,
        mode: messageDrag.sourceRoomId === roomId ? "target" : "reference",
        source: "drag",
        persistence: "turn",
      });
      return;
    }

    const roomRef = getRoomRefDragData(event.dataTransfer);
    if (roomRef) {
      if (roomRef.roomId === roomId) {
        toast("当前房间已经是 Copilot 的可修改上下文");
        return;
      }
      addContextRef({
        kind: "room",
        roomId: String(roomRef.roomId),
        ...(roomRef.spaceId ? { spaceId: String(roomRef.spaceId) } : {}),
        label: roomRef.roomName?.trim() || `房间 ${roomRef.roomId}`,
        source: "drag",
        persistence: "persistent",
      });
      return;
    }

    const docRef = getDocRefDragData(event.dataTransfer);
    if (docRef) {
      addContextRef({
        kind: "doc",
        docId: docRef.docId,
        ...(docRef.spaceId ? { spaceId: String(docRef.spaceId) } : {}),
        label: docRef.title?.trim() || `文档 ${docRef.docId}`,
        ...(docRef.title ? { title: docRef.title } : {}),
        ...(docRef.excerpt ? { excerpt: docRef.excerpt } : {}),
        source: "drag",
        persistence: "persistent",
      });
      return;
    }

    const roleRef = getRoleRefDragData(event.dataTransfer);
    if (roleRef) {
      addContextRef({
        kind: "role",
        roleId: String(roleRef.roleId),
        ...(roleRef.roomId ? { sourceRoomId: String(roleRef.roomId) } : {}),
        label: roleRef.roleName?.trim() || `角色 ${roleRef.roleId}`,
        source: "drag",
        persistence: "persistent",
      });
    }
  }, [addContextRef, roomId]);

  const handleRemoveContextRef = React.useCallback((ref: CopilotContextRef) => {
    setContextRefs(current => removeCopilotContextRef(current, ref));
  }, []);

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col bg-base-100 ${dropHint ? "ring-2 ring-primary/60 ring-inset" : ""}`}
      data-tc-copilot-context-drop-zone
      onDragOver={handleCopilotDragOver}
      onDragLeave={handleCopilotDragLeave}
      onDrop={handleCopilotDrop}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-base-300 px-4">
        <Robot className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">AI 对话</div>
          <div className="truncate text-xs text-base-content/55">当前房间 Copilot</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 py-4">
        {messages.map(message => (
          <CopilotMessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="shrink-0 border-t border-base-300 bg-base-100 p-3">
        {contextRefs.length > 0 && (
          <CopilotContextRefChips
            refs={contextRefs}
            onRemove={handleRemoveContextRef}
          />
        )}
        <div className="flex items-end gap-2">
          <textarea
            className="textarea textarea-bordered min-h-12 max-h-32 flex-1 resize-none text-sm leading-6"
            value={draftInput}
            placeholder={isConversationLoaded ? "直接说你想怎么改，例如：把最后两句写得更克制，再补一段雨夜环境。" : "正在载入这间房的 Copilot 对话..."}
            disabled={!isConversationLoaded}
            onChange={event => setDraftInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <button
            type="button"
            className="btn btn-primary btn-square"
            disabled={!canSend}
            aria-label="发送给 AI"
            title="发送给 AI"
            onClick={() => void handleSend()}
          >
            {isGenerating ? <CircleNotch className="size-5 animate-spin" /> : <PaperPlaneTilt className="size-5" />}
          </button>
        </div>
        <div className="mt-1 text-[11px] text-base-content/45">Enter 发送，Shift+Enter 换行</div>
      </div>
      {dropHint && (
        <div className="pointer-events-none absolute inset-x-3 bottom-24 rounded border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">
          {dropHint}
        </div>
      )}
    </div>
  );
}

const RoomCopilotDrawer = React.memo(RoomCopilotDrawerImpl);
export default RoomCopilotDrawer;

function CopilotMessageBubble({ message }: { message: CopilotChatMessage }) {
  const isUser = message.role === "user";
  const summaryItems = React.useMemo(() => formatSummary(message.proposal ?? null), [message.proposal]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
          isUser
            ? "bg-primary text-primary-content"
            : "border border-base-300 bg-base-200/70 text-base-content"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {message.contextRefs && message.contextRefs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.contextRefs.map(ref => (
              <CopilotContextRefPill key={getCopilotContextRefKey(ref)} refItem={ref} compact />
            ))}
          </div>
        )}

        {message.progressMessage && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
            <CircleNotch className="size-4 shrink-0 animate-spin" />
            <span className="min-w-0 truncate">{message.progressMessage}</span>
          </div>
        )}

        {summaryItems && (
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {summaryItems.map(item => (
              <div key={item.label} className="rounded border border-base-content/10 bg-base-100/70 px-2 py-1.5 text-center text-base-content">
                <div className="text-sm font-semibold leading-none">{item.value}</div>
                <div className="mt-1 text-[11px] text-base-content/55">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {message.proposal && message.proposal.validationErrors.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {message.proposal.validationErrors.map((item, index) => (
              <div key={`${item.code}-${index}`} className="flex gap-1.5 rounded bg-warning/10 px-2 py-1.5 text-xs text-warning-content">
                <WarningCircle className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 break-words">{item.message}</span>
              </div>
            ))}
          </div>
        )}

        {message.repairMessage && (
          <div className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
            <Sparkle className="size-4 shrink-0" />
            <span>{message.repairMessage}</span>
          </div>
        )}

        {message.status === "success" && message.proposal && message.proposal.validationErrors.length === 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
            <CheckCircle className="size-4 shrink-0" />
            <span>已放入聊天室预览条</span>
          </div>
        )}

        {message.error && (
          <div className="mt-2 flex gap-1.5 rounded bg-error/10 px-2 py-1.5 text-xs text-error">
            <WarningCircle className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{message.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CopilotContextRefChips({
  refs,
  onRemove,
}: {
  refs: CopilotContextRef[];
  onRemove: (ref: CopilotContextRef) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {refs.map(ref => (
        <CopilotContextRefPill
          key={getCopilotContextRefKey(ref)}
          refItem={ref}
          onRemove={() => onRemove(ref)}
        />
      ))}
    </div>
  );
}

function CopilotContextRefPill({
  refItem,
  compact = false,
  onRemove,
}: {
  refItem: CopilotContextRef;
  compact?: boolean;
  onRemove?: () => void;
}) {
  const icon = getContextRefIcon(refItem);
  const prefix = getContextRefPrefix(refItem);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded border border-base-300 bg-base-200/80 px-2 py-1 text-[11px] leading-none text-base-content ${compact ? "opacity-80" : ""}`}
      title={`${prefix}${refItem.label}`}
    >
      {icon}
      <span className="shrink-0 text-base-content/55">{prefix}</span>
      <span className="min-w-0 max-w-36 truncate">{refItem.label}</span>
      {refItem.persistence === "turn" && <span className="shrink-0 text-primary">本轮</span>}
      {onRemove && (
        <button
          type="button"
          className="ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded hover:bg-base-300"
          aria-label="移除上下文"
          title="移除上下文"
          onClick={onRemove}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

function getContextRefPrefix(ref: CopilotContextRef) {
  if (ref.kind === "room") {
    return "房间：";
  }
  if (ref.kind === "message") {
    return ref.mode === "target" ? "修改： " : "参考：";
  }
  if (ref.kind === "role") {
    return "角色：";
  }
  return "文档：";
}

function getContextRefIcon(ref: CopilotContextRef) {
  if (ref.kind === "room") {
    return <House className="size-3.5 shrink-0" />;
  }
  if (ref.kind === "message") {
    return <ChatCircleText className="size-3.5 shrink-0" />;
  }
  if (ref.kind === "role") {
    return <UserCircle className="size-3.5 shrink-0" />;
  }
  return <FileText className="size-3.5 shrink-0" />;
}
