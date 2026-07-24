import { pinyin } from "pinyin-pro";

import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";

import type { UserRole } from "../../../../api";
import type { MessageEditorMessage } from "../messageEditorTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * 文本中的 speaker 命令前缀。
 */
export type MessageEditorSpeakerCommandPrefix = "/" | "@";

/**
 * 文本块中识别出的 speaker 命令。
 */
export type MessageEditorSpeakerCommand = {
  prefix: MessageEditorSpeakerCommandPrefix;
  query: string;
};

/**
 * 正文里识别到的 speaker 命令与剩余内容。
 */
export type MessageEditorSpeakerCommandMatch = {
  command: MessageEditorSpeakerCommand;
  remainder: string;
};

/**
 * speaker 命令里用于角色和头像的两段查询。
 */
export type MessageEditorSpeakerCommandQueryParts = {
  avatarQuery: string;
  roleQuery: string;
};

export type MessageEditorSpeakerMenuClearItem = {
  description?: string;
  kind: "clear";
  label: "无";
  selected?: boolean;
};

export type MessageEditorSpeakerMenuRoleItem = {
  avatarId?: number;
  description?: string;
  kind: "role";
  label: string;
  roleId: number;
  selected?: boolean;
};

export type MessageEditorSpeakerMenuItem = MessageEditorSpeakerMenuClearItem | MessageEditorSpeakerMenuRoleItem;

const MESSAGE_EDITOR_SPEAKER_ALIAS_KEYS = new Set([
  "alias",
  "aliases",
  "aliasname",
  "aliasnames",
  "keyword",
  "keywords",
  "nickname",
  "nicknames",
  "pinyin",
  "py",
  "roman",
  "romanization",
  "search",
  "searchkey",
  "searchkeys",
  "speakername",
]);

const MESSAGE_EDITOR_SPEAKER_SPLIT_PATTERN = /[,\n，、;；/|]+/g;

function hasHanCharacters(value: string): boolean {
  return /\p{Script=Han}/u.test(value);
}

function normalizeMessageEditorSpeakerSearchValue(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^[@/]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[“”"'`，。！？、,.;；:：()[\]{}<>【】]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactMessageEditorSpeakerSearchValue(value: string): string {
  return normalizeMessageEditorSpeakerSearchValue(value).replace(/[\s._-]+/g, "");
}

function collectMessageEditorSpeakerSearchVariants(value: string): string[] {
  const normalized = normalizeMessageEditorSpeakerSearchValue(value);
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>();
  const addVariant = (candidate: string) => {
    const next = normalizeMessageEditorSpeakerSearchValue(candidate);
    if (!next) {
      return;
    }
    variants.add(next);
    const compact = next.replace(/[\s._-]+/g, "");
    if (compact) {
      variants.add(compact);
    }
  };

  addVariant(normalized);

  if (hasHanCharacters(normalized)) {
    const syllables = pinyin(normalized, { toneType: "none", type: "array" }) as string[];
    const pinyinSpaced = syllables.join(" ").trim();
    const pinyinCompact = syllables.join("").trim();
    const initials = syllables.map(item => item[0] ?? "").join("").trim();
    addVariant(pinyinSpaced);
    addVariant(pinyinCompact);
    addVariant(initials);
  }

  return [...variants];
}

function addSpeakerSearchFragments(target: Set<string>, value: unknown) {
  if (typeof value !== "string") {
    return;
  }

  for (const fragment of value.split(MESSAGE_EDITOR_SPEAKER_SPLIT_PATTERN)) {
    const normalized = fragment.trim();
    if (!normalized) {
      continue;
    }
    for (const variant of collectMessageEditorSpeakerSearchVariants(normalized)) {
      target.add(variant);
    }
  }
}

/**
 * 规范化 speaker 搜索词，支持 `/` 和 `@` 前缀。
 */
export function normalizeMessageEditorSpeakerSearchQuery(value: string): string {
  return compactMessageEditorSpeakerSearchValue(value);
}

/**
 * 解析正文里的 speaker 命令。
 */
export function parseMessageEditorSpeakerCommand(value: string): MessageEditorSpeakerCommand | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const prefix = normalized[0];
  if (prefix !== "/" && prefix !== "@") {
    return null;
  }

  const query = normalized.slice(1).trim();
  return {
    prefix,
    query,
  };
}

/**
 * 从正文中提取 speaker 命令，并返回去掉命令后的剩余内容。
 *
 * 这里会扫描每一行，方便在同一个块里任意一行输入 `/` 或 `@` 都能弹出候选。
 */
export function extractMessageEditorSpeakerCommandMatch(value: string): MessageEditorSpeakerCommandMatch | null {
  const normalized = value.replace(/\r\n?/g, "\n");
  let lineStart = 0;

  while (lineStart <= normalized.length) {
    const lineEnd = normalized.indexOf("\n", lineStart);
    const rawLine = lineEnd >= 0 ? normalized.slice(lineStart, lineEnd) : normalized.slice(lineStart);
    const trimmedLine = rawLine.trimStart();
    if (trimmedLine.startsWith("/") || trimmedLine.startsWith("@")) {
      const command = parseMessageEditorSpeakerCommand(trimmedLine);
      if (command) {
        const remainder = normalized.slice(0, lineStart) + (lineEnd >= 0 ? normalized.slice(lineEnd + 1) : "");
        return {
          command,
          remainder,
        };
      }
    }

    if (lineEnd < 0) {
      break;
    }
    lineStart = lineEnd + 1;
  }

  return null;
}

/**
 * 将 speaker 查询拆成“角色搜索”和“头像搜索”两段。
 *
 * 这里用首个空白分隔做启发式拆分，方便 `/ 绯月 开心` 这类输入直接把
 * 后半段带进头像候选弹窗。
 */
export function splitMessageEditorSpeakerCommandQuery(value: string): MessageEditorSpeakerCommandQueryParts {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return {
      avatarQuery: "",
      roleQuery: "",
    };
  }

  const [roleQuery = "", ...avatarQueryParts] = normalized.split(" ");
  return {
    avatarQuery: avatarQueryParts.join(" ").trim(),
    roleQuery: roleQuery.trim(),
  };
}

/**
 * 判断正文是否正在输入 speaker 命令。
 */
export function isMessageEditorSpeakerCommandText(value: string): boolean {
  return extractMessageEditorSpeakerCommandMatch(value) !== null;
}

/**
 * 收集某个角色的可搜索关键字。
 */
export function collectMessageEditorSpeakerSearchKeys(source: {
  description?: string;
  extra?: Record<string, string>;
  roleName?: string | null;
}): string[] {
  const keys = new Set<string>();
  addSpeakerSearchFragments(keys, source.roleName);
  addSpeakerSearchFragments(keys, source.description);

  for (const [key, value] of Object.entries(source.extra ?? {})) {
    if (!MESSAGE_EDITOR_SPEAKER_ALIAS_KEYS.has(key.toLowerCase())) {
      continue;
    }
    addSpeakerSearchFragments(keys, value);
  }

  return [...keys];
}

/**
 * 为 speaker 候选计算搜索分数。
 */
export function scoreMessageEditorSpeakerSearchCandidate(
  source: {
    description?: string;
    extra?: Record<string, string>;
    roleName?: string | null;
  },
  query: string,
): number {
  const normalizedQuery = normalizeMessageEditorSpeakerSearchQuery(query);
  if (!normalizedQuery) {
    return 0;
  }

  const queryVariants = collectMessageEditorSpeakerSearchVariants(normalizedQuery);
  if (queryVariants.length === 0) {
    return 0;
  }

  let bestScore = 0;
  const terms = collectMessageEditorSpeakerSearchKeys(source);
  for (const term of terms) {
    const normalizedTerm = normalizeMessageEditorSpeakerSearchQuery(term);
    if (!normalizedTerm) {
      continue;
    }

    for (const variant of queryVariants) {
      if (!variant) {
        continue;
      }
      if (normalizedTerm === variant) {
        bestScore = Math.max(bestScore, 10000 - normalizedTerm.length);
        continue;
      }
      if (normalizedTerm.startsWith(variant)) {
        bestScore = Math.max(bestScore, 8000 - (normalizedTerm.length - variant.length));
        continue;
      }
      if (normalizedTerm.includes(variant)) {
        bestScore = Math.max(bestScore, 4000 - normalizedTerm.indexOf(variant));
      }
    }
  }

  return bestScore;
}

/**
 * 判断当前按键是否应确认 speaker 候选。
 */
export function isMessageEditorSpeakerMenuCommitKey(event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }

  return event.key === "Enter" || event.key === " " || event.key === "Spacebar";
}

/**
 * 判断角色是否可作为 speaker 候选。
 */
export function isMessageEditorSpeakerRoleCandidate(role: UserRole | null | undefined): role is UserRole {
  return typeof role?.roleId === "number" && Number.isFinite(role.roleId) && role.roleId > 0;
}

/**
 * 解析 MessageEditor 可用的角色列表。
 *
 * 优先使用 `roomAllRoles`，否则回退到 `roomRolesThatUserOwn`；同时按 `roleId`
 * 去重，避免命令菜单在多来源合流时出现重复项。
 */
export function resolveMessageEditorSpeakerRoles(params: {
  roomAllRoles?: UserRole[] | null;
  roomRolesThatUserOwn?: UserRole[] | null;
}): UserRole[] {
  const roleMap = new Map<number, UserRole>();
  const roomRoles = params.roomAllRoles && params.roomAllRoles.length > 0
    ? params.roomAllRoles
    : params.roomRolesThatUserOwn;

  for (const role of roomRoles ?? []) {
    if (isMessageEditorSpeakerRoleCandidate(role)) {
      roleMap.set(role.roleId, role);
    }
  }

  return [...roleMap.values()];
}

/**
 * 读取角色标题。
 */
export function getMessageEditorSpeakerRoleLabel(role: Pick<UserRole, "roleId" | "roleName">): string {
  return role.roleName?.trim() || `角色 #${role.roleId}`;
}

/**
 * 读取角色简介。
 */
export function getMessageEditorSpeakerRoleDescription(role: Pick<UserRole, "description" | "extra">): string {
  return role.description?.trim() || role.extra?.mentionNote?.trim() || "";
}

/**
 * 生成文档编辑器里 speaker 的角色候选菜单项。
 */
export function buildMessageEditorSpeakerMenuItems(params: {
  hasSelectedSpeaker: boolean;
  query: string;
  roles: UserRole[];
  selectedRoleId?: number | null;
}): MessageEditorSpeakerMenuItem[] {
  const normalizedQuery = normalizeMessageEditorSpeakerSearchQuery(params.query);
  const scoredRoles = params.roles
    .map((role, sourceIndex) => {
      const score = normalizedQuery
        ? scoreMessageEditorSpeakerSearchCandidate(role, params.query)
        : 1;
      if (normalizedQuery && score <= 0) {
        return null;
      }
      return {
        role,
        score: score + (role.roleId === params.selectedRoleId ? 50 : 0),
        sourceIndex,
      };
    })
    .filter((item): item is { role: UserRole; score: number; sourceIndex: number } => item !== null);

  if (normalizedQuery) {
    scoredRoles.sort((left, right) => right.score - left.score || left.sourceIndex - right.sourceIndex);
  }
  else {
    scoredRoles.sort((left, right) => {
      const leftSelected = left.role.roleId === params.selectedRoleId ? 0 : 1;
      const rightSelected = right.role.roleId === params.selectedRoleId ? 0 : 1;
      return leftSelected - rightSelected || left.sourceIndex - right.sourceIndex;
    });
  }

  const items = scoredRoles.slice(0, 8).map<MessageEditorSpeakerMenuItem>(({ role }) => ({
    avatarId: role.avatarId,
    description: getMessageEditorSpeakerRoleDescription(role),
    kind: "role",
    label: getMessageEditorSpeakerRoleLabel(role),
    roleId: role.roleId,
    selected: role.roleId === params.selectedRoleId,
  }));

  items.push({
    description: "取消角色",
    kind: "clear",
    label: "无",
    selected: !params.hasSelectedSpeaker,
  });

  return items;
}

/**
 * 判断某条块是否包含可展示的 speaker 元数据。
 */
export function hasMessageEditorSpeaker(message: Pick<MessageEditorMessage, "roleId" | "avatarId" | "customRoleName">): boolean {
  return Boolean(
    (typeof message.roleId === "number" && Number.isFinite(message.roleId) && message.roleId > 0)
    || (typeof message.avatarId === "number" && Number.isFinite(message.avatarId) && message.avatarId > 0)
    || toTrimmedString(message.customRoleName),
  );
}

/**
 * 从头像标题里提取可读标签。
 */
export function resolveMessageEditorAvatarTitleLabel(avatarTitle: unknown): string {
  if (typeof avatarTitle === "string") {
    return avatarTitle.trim();
  }
  if (!isRecord(avatarTitle)) {
    return "";
  }

  for (const key of ["label", "zh", "name", "cn"] as const) {
    const value = toTrimmedString(avatarTitle[key]);
    if (value) {
      return value;
    }
  }

  for (const value of Object.values(avatarTitle)) {
    const normalized = toTrimmedString(value);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

/**
 * 把 speaker 元数据从一个块复制到另一个块。
 */
export function copyMessageEditorSpeakerFields<T extends MessageEditorMessage>(source: unknown, target: T): T {
  if (!isRecord(source)) {
    return target;
  }

  if (typeof source.roleId === "number" && Number.isFinite(source.roleId)) {
    target.roleId = source.roleId;
  }
  if (typeof source.avatarId === "number" && Number.isFinite(source.avatarId)) {
    target.avatarId = source.avatarId;
  }

  const customRoleName = toTrimmedString(source.customRoleName);
  if (customRoleName) {
    target.customRoleName = customRoleName;
  }

  return target;
}

/**
 * 组装文档块顶部显示的角色名。
 */
export function resolveMessageEditorSpeakerLabel(params: {
  avatarTitle?: unknown;
  customRoleName?: string | null;
  fallback?: string;
  roleId?: number | null;
  roleName?: string | null;
}): string {
  const rawAvatarTitle = resolveMessageEditorAvatarTitleLabel(params.avatarTitle);
  const avatarTitle = rawAvatarTitle === "默认" ? "" : rawAvatarTitle;
  const customRoleName = toTrimmedString(params.customRoleName);
  const roleId = typeof params.roleId === "number" && Number.isFinite(params.roleId)
    ? params.roleId
    : undefined;
  const roleName = customRoleName
    || (typeof params.roleName === "string" ? params.roleName.trim() : "")
    || (typeof roleId === "number" && roleId > 0
      ? `角色 #${roleId}`
      : (avatarTitle ? "旁白" : ""));

  const resolved = getDisplayRoleName({
    roleId,
    roleName,
    customRoleName,
    fallback: params.fallback ?? "",
    zeroRoleIsNarrator: false,
  });

  if (resolved && avatarTitle) {
    return `${resolved}（${avatarTitle}）`;
  }
  return resolved || avatarTitle;
}
