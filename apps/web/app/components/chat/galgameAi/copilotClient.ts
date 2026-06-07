import type {
  GalAuthoringContext,
  GalCopilotIntentResponse,
  GalCopilotPatchResponse,
  GalCopilotPatchStreamEvent,
  GalPatchValidationError,
  GalStoryPatch,
} from "@tuanchat/galgame-ai-contract";

import {
  galCopilotIntentResponseSchema,
  galCopilotPatchResponseSchema,
  galCopilotPatchStreamEventSchema,
  GALGAME_AUTHORING_SCENE,
  galStoryPatchSchema,
} from "@tuanchat/galgame-ai-contract";

import { resolveApiBaseUrl } from "../../../../api/instance";
import { fetchWithUnifiedAuth } from "../../../../api/unifiedAuthFetch";
import { compileGalCopilotIntentResponseToPatch } from "./copilotIntentCompiler";
import { buildGalCopilotJsonRepairPrompt, buildGalCopilotPrompt, buildGalCopilotRepairPrompt, GAL_COPILOT_SYSTEM_PROMPT } from "./copilotPrompts";

const DEFAULT_MODEL = "gpt-5.4-mini";
const CHAT_COMPLETIONS_PATH = "/ai/gateway/v1/chat/completions";
const CHAT_STREAM_PATH = "/ai/gateway/v1/chat/stream";

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenAiChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: OpenAiUsage;
};

type OpenAiStreamPayload = {
  error?: {
    message?: string;
  };
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveAiGatewayBaseUrl(envBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL): string {
  return trimTrailingSlash(resolveApiBaseUrl(envBaseUrl?.trim()) ?? "");
}

function buildGatewayUrl(path: string, baseUrl?: string): string {
  return `${resolveAiGatewayBaseUrl(baseUrl)}${path}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { message?: string; error?: string | { message?: string } };
    if (typeof payload.error === "object" && payload.error?.message) {
      return payload.error.message;
    }
    return payload.message || (typeof payload.error === "string" ? payload.error : "") || response.statusText;
  }
  catch {
    return response.statusText;
  }
}

function normalizeUsage(usage: OpenAiUsage | undefined): GalCopilotPatchResponse["usage"] {
  if (!usage) {
    return undefined;
  }
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

function getStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeRoleName(roleName: string | undefined, context: GalAuthoringContext | undefined) {
  if (!roleName) {
    return {};
  }
  const trimmed = roleName.trim();
  if (!trimmed) {
    return {};
  }
  if (trimmed === context?.roles.narrator.roleName || trimmed === "旁白" || trimmed.toLowerCase() === "narrator") {
    return {
      roleId: context?.roles.narrator.roleId ?? "narrator",
      purpose: "narration",
    };
  }
  const role = context?.roles.roomRoles.find(item => item.roleName === trimmed);
  if (role) {
    return {
      roleId: role.roleId,
    };
  }
  return {
    customRoleName: trimmed,
  };
}

function normalizePatchMessageInput(value: unknown, context: GalAuthoringContext | undefined): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const message = { ...(value as Record<string, unknown>) };
  const roleName = getStringField(message, "roleName");
  if (roleName) {
    const rolePatch = normalizeRoleName(roleName, context);
    if (!getStringField(message, "roleId") && "roleId" in rolePatch) {
      message.roleId = rolePatch.roleId;
    }
    if (!getStringField(message, "customRoleName") && "customRoleName" in rolePatch) {
      message.customRoleName = rolePatch.customRoleName;
    }
    if (!getStringField(message, "purpose") && "purpose" in rolePatch) {
      message.purpose = rolePatch.purpose;
    }
  }
  if (message.messageType == null) {
    message.messageType = 1;
  }
  delete message.roleName;
  delete message.messageId;
  return message;
}

export function normalizeGalStoryPatchInput(value: unknown, context?: GalAuthoringContext): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const patch = { ...(value as Record<string, unknown>) };
  if (!Array.isArray(patch.operations)) {
    return patch;
  }
  patch.operations = patch.operations.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }
    const operation = { ...(item as Record<string, unknown>) };
    const op = getStringField(operation, "op");
    const messageId = getStringField(operation, "messageId");
    if (op === "insert_after" && !getStringField(operation, "afterMessageId") && messageId) {
      operation.afterMessageId = messageId;
      delete operation.messageId;
    }
    if (op === "insert_before" && !getStringField(operation, "beforeMessageId") && messageId) {
      operation.beforeMessageId = messageId;
      delete operation.messageId;
    }
    if ((op === "update_role" || op === "replace_message") && getStringField(operation, "roleName")) {
      const rolePatch = normalizeRoleName(getStringField(operation, "roleName"), context);
      if (!getStringField(operation, "roleId") && "roleId" in rolePatch) {
        operation.roleId = rolePatch.roleId;
      }
      if (!getStringField(operation, "customRoleName") && "customRoleName" in rolePatch) {
        operation.customRoleName = rolePatch.customRoleName;
      }
      delete operation.roleName;
    }
    if ("message" in operation) {
      operation.message = normalizePatchMessageInput(operation.message, context);
    }
    return operation;
  });
  return patch;
}

function buildOpenAiBody(params: {
  prompt: string;
  model?: string;
  stream: boolean;
}) {
  return {
    scene: GALGAME_AUTHORING_SCENE,
    model: params.model || DEFAULT_MODEL,
    stream: params.stream,
    messages: [
      {
        role: "system",
        content: GAL_COPILOT_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: params.prompt,
      },
    ],
    temperature: 0.2,
    response_format: {
      type: "json_object",
    },
  };
}

export function extractJsonObjectText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  if (trimmed.startsWith("```")) {
    const firstLineEnd = trimmed.indexOf("\n");
    const lastFenceStart = trimmed.lastIndexOf("```");
    if (firstLineEnd >= 0 && lastFenceStart > firstLineEnd) {
      const fencedBody = trimmed.slice(firstLineEnd + 1, lastFenceStart).trim();
      if (fencedBody.startsWith("{")) {
        return fencedBody;
      }
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return null;
}

function parseLegacyPatchInput(value: unknown, context?: GalAuthoringContext): GalStoryPatch {
  return galStoryPatchSchema.parse(normalizeGalStoryPatchInput(value, context));
}

function parseIntentResponseInput(value: unknown): GalCopilotIntentResponse {
  return galCopilotIntentResponseSchema.parse(value);
}

function parseModelEditText(text: string, context: GalAuthoringContext): GalStoryPatch {
  const jsonText = extractJsonObjectText(text);
  if (!jsonText) {
    throw new Error("模型未返回可识别的编辑 JSON");
  }
  const parsed = JSON.parse(jsonText) as unknown;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray((parsed as { intents?: unknown }).intents)) {
    return compileGalCopilotIntentResponseToPatch(parseIntentResponseInput(parsed), context);
  }
  return parseLegacyPatchInput(parsed, context);
}

function buildCopilotResponse(params: {
  patch: GalStoryPatch;
  model?: string;
  usage?: OpenAiUsage;
  assistantMessage?: string;
}): GalCopilotPatchResponse {
  return galCopilotPatchResponseSchema.parse({
    patch: params.patch,
    assistantMessage: params.assistantMessage ?? "已生成一份 Galgame 修改草稿，请在聊天室预览后确认应用。",
    model: params.model,
    usage: normalizeUsage(params.usage),
  });
}

async function requestOpenAiCompletion(params: {
  prompt: string;
  model?: string;
  baseUrl?: string;
}): Promise<OpenAiChatCompletionResponse> {
  const response = await fetchWithUnifiedAuth(buildGatewayUrl(CHAT_COMPLETIONS_PATH, params.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenAiBody({
      prompt: params.prompt,
      model: params.model,
      stream: false,
    })),
  }, {
    recoveryBaseUrl: params.baseUrl,
  });

  if (!response.ok) {
    throw new Error(`Copilot 请求失败：${await readErrorMessage(response)}`);
  }
  return await response.json() as OpenAiChatCompletionResponse;
}

async function requestPatchFromPrompt(params: {
  prompt: string;
  context: GalAuthoringContext;
  model?: string;
  baseUrl?: string;
  assistantMessage?: string;
  allowJsonRepair?: boolean;
}): Promise<GalCopilotPatchResponse> {
  const payload = await requestOpenAiCompletion(params);
  const content = payload.choices?.[0]?.message?.content ?? "";
  let patch: GalStoryPatch;
  try {
    patch = parseModelEditText(content, params.context);
  }
  catch (error) {
    if (params.allowJsonRepair === false) {
      throw error;
    }
    patch = await repairMalformedPatchText({
      rawText: content,
      error,
      context: params.context,
      model: params.model,
      baseUrl: params.baseUrl,
    });
  }
  return buildCopilotResponse({
    patch,
    model: payload.model || params.model || DEFAULT_MODEL,
    usage: payload.usage,
    assistantMessage: params.assistantMessage,
  });
}

async function repairMalformedPatchText(params: {
  rawText: string;
  error: unknown;
  context: GalAuthoringContext;
  model?: string;
  baseUrl?: string;
}): Promise<GalStoryPatch> {
  const errorMessage = params.error instanceof Error ? params.error.message : String(params.error);
  const repaired = await requestPatchFromPrompt({
    prompt: buildGalCopilotJsonRepairPrompt({
      rawText: params.rawText,
      errorMessage,
    }),
    context: params.context,
    model: params.model,
    baseUrl: params.baseUrl,
    assistantMessage: "已修复模型返回的编辑意图 JSON。",
    allowJsonRepair: false,
  });
  return repaired.patch;
}

export async function requestGalCopilotPatch(params: {
  instruction: string;
  context: GalAuthoringContext;
  model?: string;
  baseUrl?: string;
}): Promise<GalCopilotPatchResponse> {
  return requestPatchFromPrompt({
    prompt: buildGalCopilotPrompt(params),
    context: params.context,
    model: params.model,
    baseUrl: params.baseUrl,
  });
}

export async function requestGalCopilotPatchRepair(params: {
  instruction: string;
  context: GalAuthoringContext;
  patch: GalStoryPatch;
  validationErrors: GalPatchValidationError[];
  model?: string;
  baseUrl?: string;
}): Promise<GalCopilotPatchResponse> {
  return requestPatchFromPrompt({
    prompt: buildGalCopilotRepairPrompt(params),
    context: params.context,
    model: params.model,
    baseUrl: params.baseUrl,
    assistantMessage: "已根据校验错误修复 Galgame 修改草稿。",
  });
}

function parseSseBlock(block: string): string[] {
  return block
    .split(/\r?\n/)
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice("data:".length).trimStart())
    .filter(Boolean);
}

function parseOpenAiStreamData(data: string): string | null {
  if (data === "[DONE]") {
    return null;
  }
  const payload = JSON.parse(data) as OpenAiStreamPayload;
  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }
  return payload.choices?.[0]?.delta?.content ?? null;
}

function emitStreamEvent(
  onEvent: ((event: GalCopilotPatchStreamEvent) => void) | undefined,
  event: GalCopilotPatchStreamEvent,
) {
  onEvent?.(galCopilotPatchStreamEventSchema.parse(event));
}

export async function requestGalCopilotPatchStream(params: {
  instruction: string;
  context: GalAuthoringContext;
  model?: string;
  baseUrl?: string;
  onEvent?: (event: GalCopilotPatchStreamEvent) => void;
}): Promise<GalCopilotPatchResponse> {
  emitStreamEvent(params.onEvent, {
    type: "status",
    status: "analyzing_context",
    message: "正在分析当前房间上下文",
  });

  const model = params.model || DEFAULT_MODEL;
  const response = await fetchWithUnifiedAuth(buildGatewayUrl(CHAT_STREAM_PATH, params.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenAiBody({
      prompt: buildGalCopilotPrompt(params),
      model,
      stream: true,
    })),
  }, {
    recoveryBaseUrl: params.baseUrl,
  });

  if (!response.ok) {
    throw new Error(`Copilot 请求失败：${await readErrorMessage(response)}`);
  }
  if (!response.body) {
    throw new Error("Copilot 流式响应为空");
  }

  emitStreamEvent(params.onEvent, {
    type: "status",
    status: "drafting_patch",
    message: "正在生成结构化修改草稿",
  });

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";
  let rawText = "";

  const consumeBlock = (block: string) => {
    for (const data of parseSseBlock(block)) {
      const text = parseOpenAiStreamData(data);
      if (!text) {
        continue;
      }
      rawText += text;
      emitStreamEvent(params.onEvent, {
        type: "text_delta",
        text,
      });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      consumeBlock(block);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    consumeBlock(buffer);
  }

  emitStreamEvent(params.onEvent, {
    type: "status",
    status: "validating_patch",
    message: "正在整理修改草稿",
  });

  let patch: GalStoryPatch;
  try {
    patch = parseModelEditText(rawText, params.context);
  }
  catch (error) {
    emitStreamEvent(params.onEvent, {
      type: "status",
      status: "repairing_patch",
      message: "正在修复模型返回的 JSON",
    });
    patch = await repairMalformedPatchText({
      rawText,
      error,
      context: params.context,
      model,
      baseUrl: params.baseUrl,
    });
  }

  const finalResponse = buildCopilotResponse({
    patch,
    model,
  });
  emitStreamEvent(params.onEvent, {
    type: "patch",
    response: finalResponse,
  });
  emitStreamEvent(params.onEvent, { type: "done" });
  return finalResponse;
}
