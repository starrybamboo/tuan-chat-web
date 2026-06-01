import type { QueryClient } from "@tanstack/react-query";

import { buildMessageExtraForRequest } from "@tuanchat/domain/message-draft";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type { StateEventAtom } from "@tuanchat/domain/state-event";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import {
  buildCommandStateEventExtra,
  formatStateEventAtomDetail,

  toApiMessageExtraWithStateEvent,
} from "@tuanchat/domain/state-event";
import { persistRoleAbilitySnapshot } from "@tuanchat/domain/state-runtime";
import {
  roleAbilityByRuleQueryKey,
  roleAbilityListQueryKey,
} from "@tuanchat/query/role-abilities";
import {
  getUserActiveSpacesQueryKey,
  getUserSpacesQueryKey,
} from "@tuanchat/query/spaces";

import type { StShowCardModel } from "../../components/common/dicer/cmdExe/stShowCard";
import type { DicerMessageVisibility } from "../../components/common/dicer/commandMessageVisibility";

import { initAliasMapOnce, RULES } from "../../components/common/dicer/aliasRegistry";
import executorPublic from "../../components/common/dicer/cmdExe/cmdExePublic";
import { buildStShowCardModel } from "../../components/common/dicer/cmdExe/stShowCard";
import { buildDicerReplyContent } from "../../components/common/dicer/dicerReplyPreparation";
import {
  buildRoleAbilityStateEventsFromDiff,
  buildRuntimeStateValues,
  cloneRoleAbility,
  mergeRuntimeRoleValuesIntoAbility,
} from "../../components/common/dicer/runtimeAbilityBridge";
import { mobileApiClient } from "../../lib/api";

initAliasMapOnce();

type QueuedDicerMessage = {
  content: string;
  visibility: DicerMessageVisibility;
};

type DiceTurnReplyPayload = QueuedDicerMessage & {
  avatarId?: number;
  customRoleName?: string;
  roleId?: number;
};

type ParsedCommand = {
  args: string[];
  name: string;
};

type MobileSendRoomMessageMutation = {
  sendRequest: (request: ChatMessageRequest) => Promise<{ data?: Message | null }>;
  sendRequests: (requests: ChatMessageRequest[]) => Promise<Array<{ data?: Message | null }>>;
};

type MobileDicerSendIdentity = {
  avatarId?: number;
  customRoleName?: string;
  roleId?: number;
};

export type ExecuteMobileDicerCommandParams = {
  command: string;
  messages: Message[];
  onShowRoleAbilityCard?: (model: StShowCardModel) => void | Promise<void>;
  queryClient: QueryClient;
  replyMessageId?: number | null;
  roomId: number;
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
  sendIdentity: MobileDicerSendIdentity;
  sendRoomMessageMutation: MobileSendRoomMessageMutation;
  space: Space | null | undefined;
};

function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const commandText = trimmed.slice(1);
  const commandMatch = commandText.match(/^([A-Z]+)/i);
  const name = commandMatch?.[0]?.toLowerCase() ?? "";
  const args = commandText
    .slice(name.length)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return { args, name };
}

function requirePositiveId(value: number | null | undefined, fallback: string): number {
  if (!Number.isFinite(value) || !value || value <= 0) {
    throw new Error(fallback);
  }
  return value;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  }
  catch {
    return {};
  }
}

function readSpaceDicerData(space: Space | null | undefined): Record<string, string> {
  const extra = readRecord(space?.extra);
  const dicerData = readRecord(extra.dicerData);
  const result: Record<string, string> = {};
  Object.entries(dicerData).forEach(([key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    }
    else if (value != null) {
      result[key] = String(value);
    }
  });
  return result;
}

function toPositiveRoleId(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.trunc(numeric);
}

function allowsCustomDicerRole(space: Space | null | undefined): boolean {
  const extra = readRecord(space?.extra);
  const rawAllowCustom = extra.allowCustomDicerRole;
  return rawAllowCustom === undefined
    ? true
    : rawAllowCustom === true
      || rawAllowCustom === "true"
      || rawAllowCustom === 1
      || rawAllowCustom === "1";
}

async function isDiceMaidenRole(roleId: number, roomRoles: readonly UserRole[]): Promise<boolean> {
  if (roleId === 2) {
    return true;
  }

  const roomRole = roomRoles.find(role => role.roleId === roleId);
  if (roomRole) {
    return Boolean(roomRole.roleName && roomRole.type === 1);
  }

  const roleResponse = await mobileApiClient.roleController.getRole(roleId);
  const role = roleResponse.data;
  return Boolean(role?.roleName && role.type === 1);
}

async function resolveDicerRoleId(params: {
  currentRole: UserRole | null | undefined;
  roomRoles: readonly UserRole[];
  space: Space | null | undefined;
}): Promise<number> {
  if (allowsCustomDicerRole(params.space)) {
    const roleExtra = readRecord(params.currentRole?.extra);
    const roleDicerRoleId = toPositiveRoleId(roleExtra.dicerRoleId);
    if (roleDicerRoleId != null) {
      return (await isDiceMaidenRole(roleDicerRoleId, params.roomRoles)) ? roleDicerRoleId : 2;
    }
  }

  const spaceExtra = readRecord(params.space?.extra);
  const spaceDicerRoleId = toPositiveRoleId(spaceExtra.dicerRoleId ?? params.space?.dicerRoleId) ?? 2;
  return (await isDiceMaidenRole(spaceDicerRoleId, params.roomRoles)) ? spaceDicerRoleId : 2;
}

function normalizeRoleAbility(
  ability: RoleAbility | null | undefined,
  roleId: number,
  ruleId: number,
): RoleAbility {
  return {
    ...(ability ?? {}),
    roleId: ability?.roleId ?? roleId,
    ruleId: ability?.ruleId ?? ruleId,
    act: { ...(ability?.act ?? {}) },
    basic: { ...(ability?.basic ?? {}) },
    ability: { ...(ability?.ability ?? {}) },
    skill: { ...(ability?.skill ?? {}) },
    extra: { ...(ability?.extra ?? {}) },
  };
}

async function getOrFetchRoleAbility(
  queryClient: QueryClient,
  roleId: number,
  ruleId: number,
): Promise<RoleAbility> {
  const cached = queryClient.getQueryData<RoleAbility>(roleAbilityByRuleQueryKey(roleId, ruleId));
  if (cached) {
    return normalizeRoleAbility(cached, roleId, ruleId);
  }

  try {
    const response = await mobileApiClient.abilityController.getRoleAbilityByRule(ruleId, roleId);
    return normalizeRoleAbility(response.data ?? {}, roleId, ruleId);
  }
  catch {
    return normalizeRoleAbility({}, roleId, ruleId);
  }
}

function cacheRoleAbility(queryClient: QueryClient, ability: RoleAbility): void {
  const roleId = ability.roleId;
  const ruleId = ability.ruleId;
  if (!roleId || !ruleId) {
    return;
  }

  queryClient.setQueryData(roleAbilityByRuleQueryKey(roleId, ruleId), ability);
  queryClient.setQueryData<RoleAbility[] | undefined>(
    roleAbilityListQueryKey(roleId),
    (current) => {
      if (!current) {
        return current;
      }
      const hasSameRule = current.some(item => item.ruleId === ruleId);
      return hasSameRule
        ? current.map(item => (item.ruleId === ruleId ? { ...item, ...ability } : item))
        : [...current, ability];
    },
  );
}

async function persistRoleAbility(
  queryClient: QueryClient,
  beforeAbility: RoleAbility | null | undefined,
  afterAbility: RoleAbility,
): Promise<void> {
  const roleId = requirePositiveId(afterAbility.roleId, "角色能力缺少角色 ID，无法保存。");
  const ruleId = requirePositiveId(afterAbility.ruleId, "角色能力缺少规则 ID，无法保存。");
  const changed = await persistRoleAbilitySnapshot({
    beforeAbility,
    afterAbility,
    roleId,
    ruleId,
    loadRoleAbility: (targetRoleId, targetRuleId) => getOrFetchRoleAbility(queryClient, targetRoleId, targetRuleId),
    createRoleAbility: async (request) => {
      const result = await mobileApiClient.abilityController.setRoleAbility(request);
      if (typeof result.data === "number" && result.data > 0) {
        afterAbility.abilityId = result.data;
      }
      return result;
    },
    updateRoleAbility: request => mobileApiClient.abilityController.updateRoleAbilityByRule(request),
  });
  if (changed) {
    cacheRoleAbility(queryClient, afterAbility);
  }
}

function buildDiceTurnMessageExtra(command: string, replies: DiceTurnReplyPayload[]) {
  return buildMessageExtraForRequest(MESSAGE_TYPE.DICE, {
    diceTurn: {
      command,
      replies: replies.map(reply => ({
        content: reply.content,
        ...(reply.visibility === "kp_and_sender" ? { hidden: true } : {}),
        ...(typeof reply.roleId === "number" && reply.roleId > 0 ? { roleId: reply.roleId } : {}),
        ...(typeof reply.avatarId === "number" && reply.avatarId > 0 ? { avatarId: reply.avatarId } : {}),
        ...(reply.customRoleName ? { customRoleName: reply.customRoleName } : {}),
      })),
    },
  });
}

function buildStateEventMessageContent(events: StateEventAtom[]): string {
  const details = events.map(event => formatStateEventAtomDetail(event));
  return details.length > 0 ? `状态更新：${details.join("；")}` : "状态更新";
}

function buildRoleAbilityCardReply(props: {
  ability: RoleAbility;
  requestedKeys: string[];
  roleName: string;
}): string {
  const model = buildStShowCardModel(props);
  if (model.sections.length === 0) {
    return `${model.roleName}没有可显示的属性。`;
  }

  const sections = model.sections.map(section => [
    `【${section.title}】`,
    ...section.rows.map(row => `${row.key}: ${row.value}`),
  ].join("\n"));
  return [`${model.roleName}的属性卡`, ...sections].join("\n\n");
}

function findMentionedRole(label: string, roomRoles: UserRole[]): UserRole | undefined {
  const normalized = label.trim().replace(/^@/, "");
  if (!normalized) {
    return undefined;
  }
  const roleIdMatch = normalized.match(/^#?(\d+)$/);
  if (roleIdMatch) {
    const roleId = Number.parseInt(roleIdMatch[1], 10);
    return roomRoles.find(role => role.roleId === roleId);
  }
  return roomRoles.find((role) => {
    const roleName = role.roleName?.trim();
    return roleName === normalized || `角色#${role.roleId}` === normalized || `角色 #${role.roleId}` === normalized;
  });
}

function stripMobileMentions(command: string, roomRoles: UserRole[]): {
  command: string;
  mentionedRoles: UserRole[];
} {
  const mentionedRoles: UserRole[] = [];
  const commandWithoutMentions = command.replace(/@(\S+)/g, (raw, label: string) => {
    const role = findMentionedRole(label, roomRoles);
    if (role && !mentionedRoles.some(item => item.roleId === role.roleId)) {
      mentionedRoles.push(role);
      return " ";
    }
    return raw;
  });

  return {
    command: commandWithoutMentions.replace(/\s+/g, " ").trim(),
    mentionedRoles,
  };
}

function buildOperatorRole(roleId: number | undefined, roomRoles: UserRole[]): UserRole | null {
  if (!roleId || roleId <= 0) {
    return null;
  }
  const role = roomRoles.find(item => item.roleId === roleId);
  if (role) {
    return role;
  }
  return {
    roleId,
    userId: -1,
    roleName: `角色 #${roleId}`,
    type: 0,
  };
}

async function updateSpaceDicerData(params: {
  dicerData: Record<string, string>;
  queryClient: QueryClient;
  space: Space | null | undefined;
}): Promise<void> {
  const spaceId = params.space?.spaceId;
  if (!spaceId || spaceId <= 0) {
    return;
  }

  await mobileApiClient.spaceController.setSpaceExtra({
    spaceId,
    key: "dicerData",
    value: JSON.stringify(params.dicerData),
  });
  await Promise.all([
    params.queryClient.invalidateQueries({ queryKey: getUserActiveSpacesQueryKey() }),
    params.queryClient.invalidateQueries({ queryKey: getUserSpacesQueryKey() }),
  ]);
}

export async function executeMobileDicerCommand(params: ExecuteMobileDicerCommandParams): Promise<void> {
  const roomId = requirePositiveId(params.roomId, "请先选择一个房间。");
  const ruleId = params.ruleId && params.ruleId > 0 ? params.ruleId : 1;
  const originDiceContent = params.command.trim();
  const mentionParsed = stripMobileMentions(originDiceContent, params.roomRoles);
  const commandForExecution = mentionParsed.command;
  const { args, name: cmdPart } = parseCommand(commandForExecution);
  if (!cmdPart) {
    throw new Error("无法识别指令。");
  }

  const operator = buildOperatorRole(params.sendIdentity.roleId, params.roomRoles);
  const mentioned: UserRole[] = [...mentionParsed.mentionedRoles];
  if (operator && !mentioned.some(role => role.roleId === operator.roleId)) {
    mentioned.push(operator);
  }

  const baseRoleAbilities = new Map<number, RoleAbility>();
  const mentionedRoleEntries = await Promise.all(
    mentioned
      .filter(role => role.roleId > 0)
      .map(async role => [role.roleId, await getOrFetchRoleAbility(params.queryClient, role.roleId, ruleId)] as const),
  );
  for (const [roleId, ability] of mentionedRoleEntries) {
    baseRoleAbilities.set(roleId, ability);
  }

  const runtimeStateValues = buildRuntimeStateValues(
    params.messages,
    Object.fromEntries(mentionedRoleEntries),
  );
  const roleAbilitySnapshotsBeforeCommand = new Map<number, RoleAbility>();
  const commandRoleAbilities = new Map<number, RoleAbility>();
  const mutatedRoleIds = new Set<number>();
  const dicerMessageQueue: QueuedDicerMessage[] = [];
  let pendingRoleAbilityCardModel: StShowCardModel | null = null;
  let copywritingKey: string | null = null;
  let spaceDicerData = readSpaceDicerData(params.space);
  let spaceDicerDataModified = false;

  const buildCurrentRoleAbility = (roleId: number): RoleAbility => {
    // 房间级状态变量作为共享兜底注入，角色当前值以角色卡为准。
    const ability = mergeRuntimeRoleValuesIntoAbility(
      baseRoleAbilities.get(roleId),
      runtimeStateValues.room,
      { overrideExisting: false },
    );
    ability.roleId = ability.roleId ?? roleId;
    ability.ruleId = ability.ruleId ?? ruleId;
    return ability;
  };

  const cpi: CPI = {
    replyMessage: (message, options) => {
      dicerMessageQueue.push({
        content: message,
        visibility: options?.visibility === "kp_and_sender" ? "kp_and_sender" : "public",
      });
    },
    sendToast: (message) => {
      dicerMessageQueue.push({
        content: message,
        visibility: "public",
      });
    },
    getRoleAbilityList: (roleId) => {
      const ability = commandRoleAbilities.has(roleId)
        ? cloneRoleAbility(commandRoleAbilities.get(roleId))
        : buildCurrentRoleAbility(roleId);
      if (!roleAbilitySnapshotsBeforeCommand.has(roleId)) {
        roleAbilitySnapshotsBeforeCommand.set(roleId, cloneRoleAbility(ability));
      }
      ability.roleId = ability.roleId ?? roleId;
      ability.ruleId = ability.ruleId ?? ruleId;
      return ability;
    },
    setRoleAbilityList: (roleId, ability) => {
      if (!roleAbilitySnapshotsBeforeCommand.has(roleId)) {
        roleAbilitySnapshotsBeforeCommand.set(roleId, buildCurrentRoleAbility(roleId));
      }
      const nextAbility = cloneRoleAbility(ability);
      nextAbility.roleId = nextAbility.roleId ?? roleId;
      nextAbility.ruleId = nextAbility.ruleId ?? ruleId;
      commandRoleAbilities.set(roleId, nextAbility);
      mutatedRoleIds.add(roleId);
    },
    setCopywritingKey: (key) => {
      copywritingKey = key?.trim() || null;
    },
    getSpaceInfo: () => params.space,
    getSpaceData: key => spaceDicerData[key],
    setSpaceData: (key, value) => {
      const nextDicerData = { ...spaceDicerData };
      if (value === null) {
        delete nextDicerData[key];
      }
      else {
        nextDicerData[key] = value;
      }
      spaceDicerData = nextDicerData;
      spaceDicerDataModified = true;
    },
    showRoleAbilityCard: async (props) => {
      if (params.onShowRoleAbilityCard) {
        pendingRoleAbilityCardModel = buildStShowCardModel(props);
        return;
      }
      dicerMessageQueue.push({
        content: buildRoleAbilityCardReply(props),
        visibility: "public",
      });
    },
  };

  const ruleExecutor = RULES.get(ruleId);
  if (ruleExecutor?.getCmd(cmdPart)) {
    try {
      await ruleExecutor.execute(cmdPart, [...args], mentioned, cpi);
    }
    catch (error) {
      cpi.sendToast(`执行错误：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  else {
    try {
      await executorPublic.execute(cmdPart, [...args], mentioned, cpi);
    }
    catch (error) {
      cpi.sendToast(`执行错误：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const stateEventAtoms: StateEventAtom[] = [];
  for (const roleId of mutatedRoleIds) {
    const afterAbility = commandRoleAbilities.get(roleId);
    if (!afterAbility) {
      continue;
    }
    stateEventAtoms.push(...buildRoleAbilityStateEventsFromDiff(
      roleId,
      roleAbilitySnapshotsBeforeCommand.get(roleId) ?? buildCurrentRoleAbility(roleId),
      afterAbility,
    ));
  }

  await Promise.all(
    Array.from(mutatedRoleIds).map(async (roleId) => {
      const afterAbility = commandRoleAbilities.get(roleId);
      if (!afterAbility) {
        return;
      }
      await persistRoleAbility(
        params.queryClient,
        baseRoleAbilities.get(roleId),
        afterAbility,
      );
    }),
  );

  if (spaceDicerDataModified) {
    await updateSpaceDicerData({
      dicerData: spaceDicerData,
      queryClient: params.queryClient,
      space: params.space,
    });
  }

  const stateEventRequest = stateEventAtoms.length > 0
    ? {
      roomId,
      messageType: MESSAGE_TYPE.STATE_EVENT,
      content: buildStateEventMessageContent(stateEventAtoms),
      roleId: params.sendIdentity.roleId,
      avatarId: params.sendIdentity.avatarId,
      customRoleName: params.sendIdentity.customRoleName,
      replayMessageId: params.replyMessageId ?? undefined,
      extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra(cmdPart, stateEventAtoms)),
    } satisfies ChatMessageRequest
    : null;

  if (pendingRoleAbilityCardModel && dicerMessageQueue.length === 0 && !stateEventRequest) {
    await params.onShowRoleAbilityCard?.(pendingRoleAbilityCardModel);
    return;
  }

  if (dicerMessageQueue.length === 0) {
    if (stateEventRequest) {
      await params.sendRoomMessageMutation.sendRequest(stateEventRequest);
    }
    return;
  }

  const currentRole = params.sendIdentity.roleId && params.sendIdentity.roleId > 0
    ? params.roomRoles.find(role => role.roleId === params.sendIdentity.roleId)
    : null;
  const dicerRoleId = await resolveDicerRoleId({
    currentRole,
    roomRoles: params.roomRoles,
    space: params.space,
  });
  const copywritingSuffix = copywritingKey ? "" : "";
  const diceReplies = dicerMessageQueue.map((queuedMessage): DiceTurnReplyPayload => ({
    content: buildDicerReplyContent(queuedMessage.content, copywritingSuffix),
    visibility: queuedMessage.visibility,
    roleId: dicerRoleId,
  }));
  const commandMessage = await params.sendRoomMessageMutation.sendRequest({
    roomId,
    messageType: MESSAGE_TYPE.DICE,
    content: originDiceContent,
    roleId: params.sendIdentity.roleId,
    avatarId: params.sendIdentity.avatarId,
    customRoleName: params.sendIdentity.customRoleName,
    replayMessageId: params.replyMessageId ?? undefined,
    extra: buildDiceTurnMessageExtra(originDiceContent, diceReplies),
  });
  const commandMessageId = commandMessage.data?.messageId;
  if (!commandMessageId) {
    throw new Error("指令消息发送失败，请稍后重试。");
  }
  const requests: ChatMessageRequest[] = [];
  if (stateEventRequest) {
    requests.push({
      ...stateEventRequest,
      replayMessageId: commandMessageId,
    });
  }

  if (requests.length > 0) {
    await params.sendRoomMessageMutation.sendRequests(requests);
  }
}
