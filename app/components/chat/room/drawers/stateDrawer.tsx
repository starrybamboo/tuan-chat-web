import type { UserRole } from "../../../../../api";
import type { Initiative } from "./initiativeListTypes";
import type { ActiveStateInstance } from "@/components/chat/state/stateRuntime";
import type { StateRuntimeContextValue } from "@/components/chat/state/stateRuntimeContext";
import type { Role } from "@/components/Role/types";
import type { StateEventAtom } from "@/types/stateEvent";

import { Broom } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { toast } from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { mergeRoleVarOpSnapshotsIntoEvents, writeRoleVarOpsThroughAbilities } from "@/components/chat/state/roleVarWriteThrough";
import { NEXT_TURN_CONTENT } from "@/components/chat/state/stateCommandParser";
import { getFallbackRoleAbilityValue } from "@/components/chat/state/stateRuntime";
import { useStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { useGlobalUserId } from "@/components/globalContextProvider";
import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  formatStateKeyLabel,
  formatStateNumericValue,
  formatStateScopeLabel,
  STATE_EVENT_VAR_OP,
  toApiMessageExtraWithStateEvent,
} from "@/types/stateEvent";
import { invalidateRoleAbilityCaches } from "../../../../../api/hooks/abilityMutationInvalidation";
import {
  loadRoleAbilityByRule,
  setRoleAbilityWithSuccessGuard,
  updateRoleAbilityByRuleWithSuccessGuard,
  useGetRolesAbilitiesQueries,
  useUpdateKeyFieldByRoleIdMutation,
} from "../../../../../api/hooks/abilityQueryHooks";
import { useAddRoomRoleMutation, useDeleteMessageMutation } from "../../../../../api/hooks/chatQueryHooks";
import { useCopyRoleMutation } from "../../../../../api/hooks/RoleAndAvatarHooks";
import { MessageType } from "../../../../../api/wsModels";
import { getCombatRoundControlState } from "./combatRoundControls";
import { buildEndCombatMessageRequest, buildStartCombatMessageRequest, executeAllInitiativeRolls } from "./initiativeCommandRequest";
import { InitiativeImportDialog } from "./initiativeImportDialog";
import {
  extractAgilityFromQuery,
  extractHpFromQuery,
} from "./initiativeListAbilityExtractors";
import {
  buildImportRoleInitiativeEvents,
} from "./initiativeListEvents";
import {
  buildNextCopiedInitiativeRoleName,
  buildRoleAbilityFieldDeletePatch,
  collectCombatInitiativeRecords,
  collectRecordedRoleValueIds,
  compareCombatRoleRowsByInitiative,
  isInitiativeRoleValueKey,
  isInlineRoleValueKey,
  parseCustomCombatStateKey,
  readCombatRoleInitiativeValue,
  shouldCommitCombatRoleValueEdit,
} from "./stateDrawerRoleRows";

interface StateValueRow {
  key: string;
  baseValue: number;
  displayValue: number;
}

interface PrimaryStatConfig {
  label: string;
  keys: string[];
  className: string;
}

interface PrimaryStatViewModel {
  config: PrimaryStatConfig;
  row: StateValueRow;
  maxRow?: StateValueRow;
}

interface RoleStateRowViewModel {
  canDelete?: boolean;
  roleId: number;
  rowId: string;
  roleName: string;
  avatarId: number;
  isCurrent: boolean;
  initiative: number | null;
  primaryStats: PrimaryStatViewModel[];
  secondaryRows: StateValueRow[];
  activeStates: ActiveStateInstance[];
  hasRoomContent: boolean;
  sourceMessageId?: number;
}

interface RoleValueEditState {
  key: string;
  roleId: number;
  valueKey: string;
}

interface DuplicateInitiativeImportState {
  roleId: number;
  roleName: string;
}

const PRIMARY_STAT_CONFIGS: PrimaryStatConfig[] = [
  {
    label: "HP",
    keys: ["hp"],
    className: "border-error/20 bg-error/10 text-error",
  },
  {
    label: "MP",
    keys: ["mp"],
    className: "border-info/20 bg-info/10 text-info",
  },
  {
    label: "SAN",
    keys: ["san", "sc"],
    className: "border-warning/20 bg-warning/10 text-warning-content",
  },
  {
    label: "SP",
    keys: ["sp", "stamina"],
    className: "border-success/20 bg-success/10 text-success",
  },
];

function toCopyableRole(role: UserRole): Role {
  return {
    id: role.roleId,
    name: role.roleName?.trim() || `角色${role.roleId}`,
    description: role.description ?? "",
    avatarId: role.avatarId ?? -1,
    type: role.type,
    voiceUrl: role.voiceUrl,
    voiceFileId: role.voiceFileId,
    extra: role.extra,
  };
}

function readNumber(values: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = values[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function normalizeStateKeyToken(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function compareStateValueText(row: StateValueRow): string {
  if (row.baseValue === row.displayValue) {
    return formatStateNumericValue(row.displayValue);
  }
  return `${formatStateNumericValue(row.baseValue)}→${formatStateNumericValue(row.displayValue)}`;
}

function buildRoleValueRows(
  runtime: StateRuntimeContextValue,
  roleId: number,
  roleStates: ActiveStateInstance[],
): StateValueRow[] {
  const roleVars = runtime.roleVarsByRoleId[roleId] ?? {};
  const baseValues = runtime.baseDisplayValues.rolesByRoleId[roleId] ?? {};
  const displayValues = runtime.derivedDisplayValues.rolesByRoleId[roleId] ?? {};
  const fallbackAbility = runtime.fallbackRoleAbilitiesByRoleId[roleId];
  const keys = new Set<string>(Object.keys(roleVars));
  (runtime.recordedRoleValueKeysByRoleId[roleId] ?? []).forEach(key => keys.add(key));

  roleStates.forEach((state) => {
    state.modifiers.forEach((modifier) => {
      keys.add(modifier.key);
    });
  });

  return [...keys]
    .sort((left, right) => left.localeCompare(right, "zh-CN"))
    .map((key) => {
      const baseValue = baseValues[key]
        ?? roleVars[key]
        ?? getFallbackRoleAbilityValue(fallbackAbility, key)
        ?? 0;
      return {
        key,
        baseValue,
        displayValue: displayValues[key] ?? baseValue,
      };
    });
}

function buildMaxKeyCandidates(baseKey: string): string[] {
  return [
    `max${baseKey}`,
    `${baseKey}max`,
    `${baseKey}limit`,
    `limit${baseKey}`,
  ];
}

function splitRoleRows(rows: StateValueRow[]): {
  primaryStats: PrimaryStatViewModel[];
  secondaryRows: StateValueRow[];
} {
  const normalizedRowMap = new Map<string, StateValueRow>();
  rows.forEach((row) => {
    normalizedRowMap.set(normalizeStateKeyToken(row.key), row);
  });

  const consumedKeys = new Set<string>();
  const primaryStats = PRIMARY_STAT_CONFIGS.flatMap((config) => {
    const matchedRow = config.keys
      .map(key => normalizedRowMap.get(key))
      .find((row): row is StateValueRow => Boolean(row));
    if (!matchedRow) {
      return [];
    }

    consumedKeys.add(matchedRow.key);
    const maxRow = buildMaxKeyCandidates(config.keys[0])
      .map(key => normalizedRowMap.get(key))
      .find((row): row is StateValueRow => Boolean(row));
    if (maxRow) {
      consumedKeys.add(maxRow.key);
    }

    return [{
      config,
      row: matchedRow,
      ...(maxRow ? { maxRow } : {}),
    }];
  });

  return {
    primaryStats,
    secondaryRows: rows.filter(row => !consumedKeys.has(row.key) && isInlineRoleValueKey(row.key)),
  };
}

function formatPrimaryStatText(item: PrimaryStatViewModel): string {
  const currentValue = compareStateValueText(item.row);
  if (!item.maxRow) {
    return `${item.config.label} ${currentValue}`;
  }
  return `${item.config.label} ${currentValue}/${formatStateNumericValue(item.maxRow.displayValue)}`;
}

function formatInitiativeText(initiative: number | null): string {
  return typeof initiative === "number" && Number.isFinite(initiative)
    ? `先攻 ${formatStateNumericValue(initiative)}`
    : "先攻 --";
}

function EmptyStateSection({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-base-300/70 bg-base-100/55 px-3 py-3 text-xs text-base-content/55">
      {text}
    </div>
  );
}

function StatPill({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium leading-none ${className ?? "border-base-300/70 bg-base-100/75 text-base-content/70"}`}>
      {text}
    </span>
  );
}

function parseFiniteRoleValue(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function StatusPill({ state }: { state: ActiveStateInstance }) {
  const isEndingSoon = typeof state.remainingTurns === "number" && state.remainingTurns <= 1;
  return (
    <StatPill
      text={`${state.statusName}${typeof state.remainingTurns === "number" ? ` ${state.remainingTurns}T` : ""}`}
      className={isEndingSoon
        ? "border-warning/30 bg-warning/10 text-warning-content"
        : "border-base-300/70 bg-base-100/75 text-base-content/70"}
    />
  );
}

function EditableStatPill({
  editKey,
  editingKey,
  editingValue,
  initialValue,
  onCommit,
  setEditingValue,
  startEditing,
  stopEditing,
  text,
  className,
}: {
  className?: string;
  editKey: string;
  editingKey: string | null;
  editingValue: string;
  initialValue: number;
  onCommit: (value: number) => void;
  setEditingValue: (value: string) => void;
  startEditing: (key: string, value: string) => void;
  stopEditing: () => void;
  text: string;
}) {
  if (editingKey === editKey) {
    return (
      <input
        type="number"
        autoFocus
        className="input input-xs h-6 min-h-6 w-20 rounded-full border-base-300 bg-base-100 px-2 text-right text-[11px] tabular-nums"
        value={editingValue}
        onChange={event => setEditingValue(event.target.value)}
        onBlur={() => {
          const parsed = parseFiniteRoleValue(editingValue);
          if (parsed != null) {
            onCommit(parsed);
          }
          stopEditing();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const parsed = parseFiniteRoleValue(editingValue);
            if (parsed != null) {
              onCommit(parsed);
            }
            stopEditing();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            stopEditing();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium leading-none transition hover:border-primary/40 hover:bg-primary/8 ${className ?? "border-base-300/70 bg-base-100/75 text-base-content/70"}`}
      title="点击编辑"
      onClick={() => startEditing(editKey, String(initialValue))}
    >
      {text}
    </button>
  );
}

function CompactRoleRow({
  editingKey,
  editingValue,
  onCommitRoleValue,
  onDelete,
  row,
  setEditingValue,
  startEditing,
  stopEditing,
}: {
  editingKey: string | null;
  editingValue: string;
  onCommitRoleValue: (roleId: number, valueKey: string, value: number) => void;
  onDelete?: (row: RoleStateRowViewModel) => void;
  row: RoleStateRowViewModel;
  setEditingValue: (value: string) => void;
  startEditing: (state: RoleValueEditState) => void;
  stopEditing: () => void;
}) {
  const buildEditKey = (valueKey: string) => `${row.roleId}:${valueKey}`;
  const startValueEditing = (valueKey: string, value: string) => {
    startEditing({
      key: buildEditKey(valueKey),
      roleId: row.roleId,
      valueKey,
    });
    setEditingValue(value);
  };

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${
      row.isCurrent
        ? "border-primary/35 bg-primary/5"
        : "border-base-300/75 bg-base-100/70"
    }`}
    >
      <div className="flex items-start gap-2.5">
        <RoleAvatarComponent
          avatarId={row.avatarId}
          roleId={row.roleId}
          width={8}
          isRounded={true}
          stopToastWindow={true}
          useDefaultAvatarFallback={false}
          alt={row.roleName.slice(0, 1) || "角"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-base-content">
              {row.roleName}
            </span>
            {row.isCurrent && (
              <span className="rounded-full bg-primary/14 px-2 py-0.5 text-[10px] font-semibold text-primary">
                当前
              </span>
            )}
            <EditableStatPill
              editKey={buildEditKey("initiative")}
              editingKey={editingKey}
              editingValue={editingValue}
              initialValue={row.initiative ?? 0}
              onCommit={value => onCommitRoleValue(row.roleId, "initiative", value)}
              setEditingValue={setEditingValue}
              startEditing={(_, value) => startValueEditing("initiative", value)}
              stopEditing={stopEditing}
              text={formatInitiativeText(row.initiative)}
            />
            {!row.hasRoomContent && (
              <span className="text-[11px] text-base-content/45">无房间态</span>
            )}
          </div>
          {row.hasRoomContent && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {row.primaryStats.map(item => (
                <EditableStatPill
                  key={`${row.roleId}:${item.config.label}`}
                  editKey={buildEditKey(item.row.key)}
                  editingKey={editingKey}
                  editingValue={editingValue}
                  initialValue={item.row.displayValue}
                  onCommit={value => onCommitRoleValue(row.roleId, item.row.key, value)}
                  setEditingValue={setEditingValue}
                  startEditing={(_, value) => startValueEditing(item.row.key, value)}
                  stopEditing={stopEditing}
                  text={formatPrimaryStatText(item)}
                  className={item.config.className}
                />
              ))}
              {row.secondaryRows.map(item => (
                <EditableStatPill
                  key={`${row.roleId}:${item.key}`}
                  editKey={buildEditKey(item.key)}
                  editingKey={editingKey}
                  editingValue={editingValue}
                  initialValue={item.displayValue}
                  onCommit={value => onCommitRoleValue(row.roleId, item.key, value)}
                  setEditingValue={setEditingValue}
                  startEditing={(_, value) => startValueEditing(item.key, value)}
                  stopEditing={stopEditing}
                  text={`${formatStateKeyLabel(item.key)} ${compareStateValueText(item)}`}
                />
              ))}
              {row.activeStates.map(state => (
                <StatusPill key={state.instanceId} state={state} />
              ))}
            </div>
          )}
        </div>
        {row.canDelete && (
          <div className="ml-auto flex shrink-0 items-start justify-end pl-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs h-6 min-h-6 rounded-md px-2 text-[11px] text-error hover:bg-error/10"
              title="删除这条先攻记录"
              onClick={() => onDelete?.(row)}
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StateDrawer() {
  const roomContext = React.use(RoomContext);
  const spaceContext = React.use(SpaceContext);
  const runtime = useStateRuntimeContext();
  const queryClient = useQueryClient();
  const deleteMessageMutation = useDeleteMessageMutation();
  const addRoomRoleMutation = useAddRoomRoleMutation();
  const copyRoleMutation = useCopyRoleMutation();
  const updateKeyFieldByRoleIdMutation = useUpdateKeyFieldByRoleIdMutation();
  const currentUserId = useGlobalUserId();
  const [isAdvancingTurn, setIsAdvancingTurn] = React.useState(false);
  const [isStartingCombat, setIsStartingCombat] = React.useState(false);
  const [isEndingCombat, setIsEndingCombat] = React.useState(false);
  const [isImportPopupOpen, setIsImportPopupOpen] = React.useState(false);
  const [editingRoleValue, setEditingRoleValue] = React.useState<RoleValueEditState | null>(null);
  const [editingRoleValueText, setEditingRoleValueText] = React.useState("");
  const [duplicateImportRole, setDuplicateImportRole] = React.useState<DuplicateInitiativeImportState | null>(null);
  const spaceOwner = Boolean(spaceContext.isSpaceOwner);
  const curUserId = currentUserId ?? -1;
  const roomRolesThatUserOwn = roomContext.roomRolesThatUserOwn ?? [];
  const visibleRoomRoles = roomContext.roomAllRoles ?? [];
  const importableRoles = spaceOwner
    ? roomRolesThatUserOwn
    : roomRolesThatUserOwn.filter(role => role.userId === curUserId);
  const rollableRoles = spaceOwner ? visibleRoomRoles : importableRoles;
  const abilityQueries = useGetRolesAbilitiesQueries(importableRoles.map(role => role.roleId));
  const { canAdvanceTurn, canEndCombat, canStartCombat, primaryAction } = getCombatRoundControlState(runtime.combatRoundActive);
  const displayedRound = runtime.combatRoundActive ? runtime.turn : 0;

  const initiativeList = React.useMemo<Initiative[]>(() => {
    return runtime.participants.map((participant) => {
      const stateValues = {
        ...participant.baseValues,
        ...participant.derivedValues,
      };
      const hp = readNumber(participant.derivedValues, ["hp"])
        ?? readNumber(participant.values, ["hp"]);
      const maxHp = readNumber(stateValues, ["maxHp", "maxhp", "hpMax", "hpmax"])
        ?? readNumber(participant.values, ["maxHp", "maxhp"]);
      return {
        participantId: participant.participantId,
        name: participant.name,
        value: participant.initiative,
        hp,
        maxHp,
        extras: participant.values,
        roleId: participant.roleId,
        activeStates: participant.activeStates.map(state => (
          `${state.statusName}${typeof state.remainingTurns === "number" ? ` ${state.remainingTurns}T` : ""}`
        )),
      };
    });
  }, [runtime.participants]);

  const importedInitiativeRoleIds = React.useMemo(() => {
    const roleIds = new Set<number>();
    initiativeList.forEach((item) => {
      if (typeof item.roleId === "number" && item.roleId > 0) {
        roleIds.add(item.roleId);
      }
    });
    collectCombatInitiativeRecords(roomContext.chatHistory?.messages).forEach((record) => {
      if (record.roleId > 0) {
        roleIds.add(record.roleId);
      }
    });
    Object.entries(runtime.recordedRoleValueKeysByRoleId).forEach(([rawRoleId, keys]) => {
      const roleId = Number(rawRoleId);
      if (roleId > 0 && keys.some(isInitiativeRoleValueKey)) {
        roleIds.add(roleId);
      }
    });
    Object.entries(runtime.baseDisplayValues.rolesByRoleId).forEach(([rawRoleId, values]) => {
      const roleId = Number(rawRoleId);
      if (roleId > 0 && typeof readCombatRoleInitiativeValue(values) === "number") {
        roleIds.add(roleId);
      }
    });
    Object.entries(runtime.derivedDisplayValues.rolesByRoleId).forEach(([rawRoleId, values]) => {
      const roleId = Number(rawRoleId);
      if (roleId > 0 && typeof readCombatRoleInitiativeValue(values) === "number") {
        roleIds.add(roleId);
      }
    });
    return roleIds;
  }, [
    initiativeList,
    roomContext.chatHistory?.messages,
    runtime.baseDisplayValues.rolesByRoleId,
    runtime.derivedDisplayValues.rolesByRoleId,
    runtime.recordedRoleValueKeysByRoleId,
  ]);

  const sendCombatEvents = React.useCallback(async (events: StateEventAtom[], content = ".combat") => {
    if (!roomContext.sendMessageWithInsert || !roomContext.roomId) {
      toast.error("当前房间暂不能写入先攻事件");
      return false;
    }

    try {
      const ruleId = spaceContext.ruleId ?? -1;
      const { changedRoleIds, roleVarOps } = await writeRoleVarOpsThroughAbilities({
        events,
        ruleId,
        loadRoleAbility: loadRoleAbilityByRule,
        createRoleAbility: setRoleAbilityWithSuccessGuard,
        updateRoleAbility: updateRoleAbilityByRuleWithSuccessGuard,
      });
      const eventsForMessage = mergeRoleVarOpSnapshotsIntoEvents(events, roleVarOps);
      await Promise.all(changedRoleIds.map(roleId => invalidateRoleAbilityCaches(queryClient, { roleId, ruleId })));
      const createdMessage = await roomContext.sendMessageWithInsert({
        roomId: roomContext.roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
        content,
        messageType: MessageType.STATE_EVENT,
        extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", eventsForMessage)),
      });
      if (!createdMessage) {
        toast.error("写入先攻事件失败");
        return false;
      }
      return true;
    }
    catch (error) {
      console.error("写入先攻事件失败", error);
      toast.error("写入先攻事件失败");
      return false;
    }
  }, [queryClient, roomContext, spaceContext.ruleId]);

  const importRoleIntoInitiative = React.useCallback(async (
    roleId: number,
    name: string,
    query: (typeof abilityQueries)[number] | undefined,
  ) => {
    const res = query?.data;
    if (res?.success && Array.isArray(res.data) && spaceContext.ruleId) {
      const hasMatchingRule = res.data.some(item => item.ruleId === spaceContext.ruleId);
      if (!hasMatchingRule && res.data.length > 0) {
        toast.error("导入失败：请检查角色卡规则与空间设置的规则是否一致");
        return;
      }
    }

    const ruleId = spaceContext.ruleId ?? undefined;
    const initiative = extractAgilityFromQuery(ruleId, query) ?? 0;
    const hpData = extractHpFromQuery(ruleId, query);
    await sendCombatEvents(buildImportRoleInitiativeEvents({
      hp: hpData?.hp ?? null,
      initiative,
      maxHp: hpData?.maxHp ?? null,
      roleId,
      name,
    }), ".combat import");
  }, [sendCombatEvents, spaceContext.ruleId]);

  const handleImportSingle = React.useCallback(async (roleId: number) => {
    const idx = importableRoles.findIndex(role => role.roleId === roleId);
    if (idx === -1) {
      return;
    }

    const role = importableRoles[idx];
    const name = role.roleName?.trim() || `角色${role.roleId}`;
    const isAlreadyImported = importedInitiativeRoleIds.has(roleId);
    if (isAlreadyImported) {
      setDuplicateImportRole({ roleId, roleName: name });
      return;
    }

    await importRoleIntoInitiative(roleId, name, abilityQueries[idx]);
  }, [abilityQueries, importedInitiativeRoleIds, importRoleIntoInitiative, importableRoles]);

  const handleConfirmDuplicateImport = React.useCallback(async () => {
    if (!duplicateImportRole || copyRoleMutation.isPending || addRoomRoleMutation.isPending) {
      return;
    }
    const targetSpaceId = roomContext.spaceId ?? spaceContext.spaceId;
    if (!roomContext.roomId || !targetSpaceId) {
      toast.error("当前房间暂不能加入复制角色");
      return;
    }

    const idx = importableRoles.findIndex(role => role.roleId === duplicateImportRole.roleId);
    const sourceRole = importableRoles[idx];
    if (!sourceRole) {
      toast.error("未找到要复制的角色");
      setDuplicateImportRole(null);
      return;
    }

    const existingNames = [
      ...(roomContext.roomAllRoles ?? []),
      ...importableRoles,
    ]
      .map(role => role.roleName?.trim())
      .filter((name): name is string => Boolean(name));
    const copiedName = buildNextCopiedInitiativeRoleName(duplicateImportRole.roleName, existingNames);

    try {
      const copiedRole = await copyRoleMutation.mutateAsync({
        sourceRole: toCopyableRole(sourceRole),
        targetType: "npc",
        newName: copiedName,
        newDescription: sourceRole.description,
        spaceId: targetSpaceId,
      });
      await addRoomRoleMutation.mutateAsync({
        roomId: roomContext.roomId,
        roleIdList: [copiedRole.id],
        type: 2,
      });
      await importRoleIntoInitiative(copiedRole.id, copiedRole.name || copiedName, abilityQueries[idx]);
      setDuplicateImportRole(null);
      setIsImportPopupOpen(false);
      toast.success(`已复制 ${copiedName} 并导入先攻`);
    }
    catch (error) {
      console.error("复制角色并导入先攻失败", error);
      toast.error(error instanceof Error && error.message ? error.message : "复制角色并导入先攻失败");
    }
  }, [
    abilityQueries,
    addRoomRoleMutation,
    copyRoleMutation,
    duplicateImportRole,
    importRoleIntoInitiative,
    importableRoles,
    roomContext.roomAllRoles,
    roomContext.roomId,
    roomContext.spaceId,
    spaceContext.spaceId,
  ]);

  const handleRollAllInitiative = React.useCallback(async () => {
    if (!spaceOwner) {
      return;
    }
    if (!roomContext.executeCommand) {
      toast.error("当前房间暂不能投掷全员先攻");
      return;
    }

    try {
      await executeAllInitiativeRolls({
        executeCommand: roomContext.executeCommand,
        roles: rollableRoles,
      });
      toast.success("已投掷全员先攻");
    }
    catch (error) {
      console.error("投掷全员先攻失败", error);
      toast.error(error instanceof Error && error.message ? error.message : "投掷全员先攻失败");
    }
  }, [rollableRoles, roomContext, spaceOwner]);

  const handleEndCombat = React.useCallback(async () => {
    if (!spaceOwner || isEndingCombat) {
      return;
    }
    if (!canEndCombat) {
      toast.error("当前没有进行中的战斗");
      return;
    }
    if (!roomContext.sendMessageWithInsert || !roomContext.roomId) {
      toast.error("当前房间暂不能结束战斗");
      return;
    }

    setIsEndingCombat(true);
    try {
      const createdMessage = await roomContext.sendMessageWithInsert(buildEndCombatMessageRequest({
        roomId: roomContext.roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
      }));
      if (!createdMessage) {
        toast.error("结束战斗失败");
        return;
      }
      toast.success("已结束战斗");
    }
    catch (error) {
      console.error("结束战斗失败", error);
      toast.error(error instanceof Error && error.message ? error.message : "结束战斗失败");
    }
    finally {
      setIsEndingCombat(false);
    }
  }, [canEndCombat, isEndingCombat, roomContext, spaceOwner]);

  const handleStartCombat = React.useCallback(async () => {
    if (!spaceOwner || isStartingCombat) {
      return;
    }
    if (!canStartCombat) {
      toast.error("当前战斗已经开始");
      return;
    }
    if (!roomContext.sendMessageWithInsert || !roomContext.roomId) {
      toast.error("当前房间暂不能开始战斗");
      return;
    }

    setIsStartingCombat(true);
    try {
      const createdMessage = await roomContext.sendMessageWithInsert(buildStartCombatMessageRequest({
        roomId: roomContext.roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
      }));
      if (!createdMessage) {
        toast.error("开始战斗失败");
        return;
      }
      toast.success("已开始战斗");
    }
    catch (error) {
      console.error("开始战斗失败", error);
      toast.error(error instanceof Error && error.message ? error.message : "开始战斗失败");
    }
    finally {
      setIsStartingCombat(false);
    }
  }, [canStartCombat, isStartingCombat, roomContext, spaceOwner]);

  const roleNameById = React.useMemo(() => {
    const nextMap: Record<number, string> = {};
    const allRoles = roomContext.roomAllRoles ?? roomContext.roomRolesThatUserOwn;
    allRoles.forEach((role) => {
      const roleId = Number(role.roleId ?? 0);
      const roleName = String(role.roleName ?? "").trim();
      if (roleId > 0 && roleName) {
        nextMap[roleId] = roleName;
      }
    });
    return nextMap;
  }, [roomContext.roomAllRoles, roomContext.roomRolesThatUserOwn]);

  const formatScopeText = React.useCallback((scope: Parameters<typeof formatStateScopeLabel>[0]) => {
    return formatStateScopeLabel(scope, { roleNameById });
  }, [roleNameById]);

  const handleAdvanceTurn = React.useCallback(async () => {
    if (isAdvancingTurn || !roomContext.sendMessageWithInsert || !roomContext.roomId) {
      return;
    }
    if (!canAdvanceTurn) {
      toast.error("请先开始战斗");
      return;
    }

    setIsAdvancingTurn(true);
    try {
      const createdMessage = await roomContext.sendMessageWithInsert({
        roomId: roomContext.roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
        content: NEXT_TURN_CONTENT,
        messageType: MessageType.STATE_EVENT,
        extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("next", [{ type: "nextTurn" }])),
      });

      if (!createdMessage) {
        toast.error("推进回合失败");
      }
    }
    catch (error) {
      console.error("推进回合失败", error);
      toast.error("推进回合失败");
    }
    finally {
      setIsAdvancingTurn(false);
    }
  }, [
    canAdvanceTurn,
    isAdvancingTurn,
    roomContext,
  ]);

  const handleDeleteRoleRow = React.useCallback(async (row: RoleStateRowViewModel) => {
    const messageId = row.sourceMessageId;
    if (deleteMessageMutation.isPending || updateKeyFieldByRoleIdMutation.isPending) {
      return;
    }
    if (!messageId) {
      const ruleId = spaceContext.ruleId ?? -1;
      if (!Number.isFinite(ruleId) || ruleId <= 0) {
        toast.error("当前空间没有有效规则，无法删除先攻字段");
        return;
      }
      try {
        const cachedAbility = runtime.fallbackRoleAbilitiesByRoleId[row.roleId];
        const patch = buildRoleAbilityFieldDeletePatch(cachedAbility, "initiative")
          ?? buildRoleAbilityFieldDeletePatch(await loadRoleAbilityByRule(row.roleId, ruleId), "initiative");
        if (!patch) {
          toast.error("未找到可删除的先攻字段");
          return;
        }
        await updateKeyFieldByRoleIdMutation.mutateAsync({
          roleId: row.roleId,
          ruleId,
          ...patch,
        });
        toast.success("已删除先攻记录");
      }
      catch (error) {
        console.error("删除先攻字段失败", error);
        toast.error("删除先攻记录失败");
      }
      return;
    }

    const targetMessage = roomContext.chatHistory?.messages.find(item => item.message.messageId === messageId);
    if (targetMessage) {
      await roomContext.chatHistory?.addOrUpdateMessage({
        ...targetMessage,
        message: {
          ...targetMessage.message,
          status: 1,
        },
      });
    }
    try {
      const response = await deleteMessageMutation.mutateAsync(messageId);
      if (response?.data) {
        await roomContext.chatHistory?.addOrUpdateMessage({
          ...targetMessage,
          message: {
            ...targetMessage?.message,
            ...response.data,
          },
        } as any);
      }
      toast.success("已删除先攻记录");
    }
    catch (error) {
      console.error("删除先攻记录失败", error);
      if (targetMessage) {
        await roomContext.chatHistory?.addOrUpdateMessage(targetMessage);
      }
      toast.error("删除先攻记录失败");
    }
  }, [deleteMessageMutation, roomContext.chatHistory, runtime.fallbackRoleAbilitiesByRoleId, spaceContext.ruleId, updateKeyFieldByRoleIdMutation]);

  const roomRows = React.useMemo(() => {
    const baseValues = runtime.baseDisplayValues.room;
    const displayValues = runtime.derivedDisplayValues.room;
    return [...new Set([...Object.keys(baseValues), ...Object.keys(displayValues)])]
      .sort((left, right) => left.localeCompare(right, "zh-CN"))
      .map(key => ({
        key,
        baseValue: baseValues[key] ?? 0,
        displayValue: displayValues[key] ?? baseValues[key] ?? 0,
      }));
  }, [runtime.baseDisplayValues.room, runtime.derivedDisplayValues.room]);

  const visibleRoomRows = React.useMemo(
    () => roomRows.filter(row => !parseCustomCombatStateKey(row.key)),
    [roomRows],
  );

  const roleById = React.useMemo(() => {
    const nextMap = new Map<number, UserRole>();
    (roomContext.roomAllRoles ?? []).forEach((role) => {
      if (role.roleId > 0) {
        nextMap.set(role.roleId, role);
      }
    });
    return nextMap;
  }, [roomContext.roomAllRoles]);

  const roomStates = React.useMemo(
    () => runtime.activeStates.filter(state => state.scope.kind === "room"),
    [runtime.activeStates],
  );

  const roleRows = React.useMemo(() => {
    const initiativeRecords = collectCombatInitiativeRecords(roomContext.chatHistory?.messages);
    const initiativeRecordRoleIds = new Set(initiativeRecords.map(record => record.roleId));
    const initiativeRecordRows = initiativeRecords.map((record): RoleStateRowViewModel => {
      const role = roleById.get(record.roleId);
      const activeStates = runtime.activeStates.filter(
        state => state.scope.kind === "role" && state.scope.roleId === record.roleId,
      );
      const rows: StateValueRow[] = [];
      if (typeof record.hp === "number") {
        rows.push({ key: "hp", baseValue: record.hp, displayValue: record.hp });
      }
      if (typeof record.maxHp === "number") {
        rows.push({ key: "maxHp", baseValue: record.maxHp, displayValue: record.maxHp });
      }
      const { primaryStats, secondaryRows } = splitRoleRows(rows);
      return {
        canDelete: true,
        roleId: record.roleId,
        rowId: record.recordId,
        roleName: role?.roleName?.trim() || `角色 #${record.roleId}`,
        avatarId: role?.avatarId ?? -1,
        isCurrent: record.roleId === runtime.currentRoleId,
        initiative: record.initiative,
        primaryStats,
        secondaryRows,
        activeStates,
        hasRoomContent: true,
        sourceMessageId: record.sourceMessageId,
      };
    });

    const roleIds = new Set<number>();
    (roomContext.roomAllRoles ?? []).forEach((role) => {
      if (role.roleId > 0) {
        roleIds.add(role.roleId);
      }
    });
    Object.keys(runtime.roleVarsByRoleId).forEach((value) => {
      const roleId = Number(value);
      if (roleId > 0) {
        roleIds.add(roleId);
      }
    });
    collectRecordedRoleValueIds(runtime.recordedRoleValueKeysByRoleId).forEach(roleId => roleIds.add(roleId));
    runtime.activeStates.forEach((state) => {
      if (state.scope.kind === "role" && state.scope.roleId > 0) {
        roleIds.add(state.scope.roleId);
      }
    });

    const aggregateRows = [...roleIds]
      .filter(roleId => !initiativeRecordRoleIds.has(roleId))
      .sort((left, right) => {
        if (left === runtime.currentRoleId) {
          return -1;
        }
        if (right === runtime.currentRoleId) {
          return 1;
        }
        const leftName = roleById.get(left)?.roleName?.trim() || `角色 ${left}`;
        const rightName = roleById.get(right)?.roleName?.trim() || `角色 ${right}`;
        return leftName.localeCompare(rightName, "zh-CN");
      })
      .map((roleId): RoleStateRowViewModel => {
        const role = roleById.get(roleId);
        const participant = runtime.participants.find(item => item.roleId === roleId);
        const activeStates = runtime.activeStates.filter(
          state => state.scope.kind === "role" && state.scope.roleId === roleId,
        );
        const rows = buildRoleValueRows(runtime, roleId, activeStates);
        const { primaryStats, secondaryRows } = splitRoleRows(rows);
        const baseValues = runtime.baseDisplayValues.rolesByRoleId[roleId] ?? {};
        const derivedValues = runtime.derivedDisplayValues.rolesByRoleId[roleId] ?? {};
        const initiative = participant?.initiative
          ?? readCombatRoleInitiativeValue(derivedValues)
          ?? readCombatRoleInitiativeValue(baseValues);
        const hasRecordedValues = (runtime.recordedRoleValueKeysByRoleId[roleId]?.length ?? 0) > 0;
        // 先攻本身也是战斗状态的一部分；只有先攻的角色也要进入主卡片区。
        const hasRoomContent = primaryStats.length > 0
          || secondaryRows.length > 0
          || activeStates.length > 0
          || typeof initiative === "number"
          || hasRecordedValues;
        return {
          canDelete: typeof initiative === "number",
          roleId,
          rowId: `role:${roleId}`,
          roleName: role?.roleName?.trim() || `角色 #${roleId}`,
          avatarId: role?.avatarId ?? -1,
          isCurrent: roleId === runtime.currentRoleId,
          initiative,
          primaryStats,
          secondaryRows,
          activeStates,
          hasRoomContent,
        };
      })
      .sort(compareCombatRoleRowsByInitiative);

    return [...initiativeRecordRows, ...aggregateRows].sort(compareCombatRoleRowsByInitiative);
  }, [
    roleById,
    roomContext.chatHistory?.messages,
    roomContext.roomAllRoles,
    runtime,
  ]);

  const handleCommitRoleValue = React.useCallback((roleId: number, valueKey: string, value: number) => {
    const row = roleRows.find(row => row.roleId === roleId && editingRoleValue?.key === `${row.roleId}:${valueKey}`);
    const previousValue = valueKey === "initiative"
      ? row?.initiative
      : row?.primaryStats.find(item => item.row.key === valueKey)?.row.displayValue
        ?? row?.secondaryRows.find(item => item.key === valueKey)?.displayValue;
    if (!shouldCommitCombatRoleValueEdit(previousValue, value)) {
      return;
    }
    void sendCombatEvents([{
      type: "varOp",
      scope: buildRoleStateEventScope(roleId),
      key: valueKey,
      op: STATE_EVENT_VAR_OP.SET,
      value,
    }], ".combat update");
  }, [editingRoleValue?.key, roleRows, sendCombatEvents]);

  const rolesWithContent = roleRows.filter(row => row.hasRoomContent);
  const rolesWithoutContent = roleRows.filter(row => !row.hasRoomContent);
  const looseParticipants = React.useMemo(() => {
    const roleIdsWithContent = new Set(rolesWithContent.map(row => row.roleId));
    return runtime.participants.filter((participant) => {
      if (typeof participant.roleId !== "number" || participant.roleId <= 0) {
        return true;
      }
      return !roleIdsWithContent.has(participant.roleId);
    });
  }, [rolesWithContent, runtime.participants]);
  const shouldShowRoomSummary = visibleRoomRows.length > 0 || roomStates.length > 0;
  const shouldShowUnresolvedStates = runtime.unresolvedStates.length > 0;

  return (
    <div className="h-full overflow-auto bg-base-200/45 px-2.5 py-3">
      <div className="space-y-2.5">
        <section className="rounded-2xl border border-base-300/75 bg-base-100/80 px-3 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-end gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-base-content/42">回合</span>
              <span className="text-2xl font-semibold leading-none text-base-content">{displayedRound}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${runtime.combatRoundActive ? "bg-primary/14 text-primary" : "bg-base-200 text-base-content/45"}`}>
                {runtime.combatRoundActive ? "战斗轮进行中" : "未进入战斗轮"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {importableRoles.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline btn-xs h-8 min-h-8 rounded-lg px-3 text-[11px]"
                  onClick={() => setIsImportPopupOpen(true)}
                >
                  导入先攻
                </button>
              )}
              {spaceOwner && primaryAction === "start" && (
                <button
                  type="button"
                  className="btn btn-outline btn-primary btn-xs h-8 min-h-8 rounded-lg px-3 text-[11px]"
                  onClick={() => {
                    void handleStartCombat();
                  }}
                  disabled={!canStartCombat || isStartingCombat || !roomContext.sendMessageWithInsert || !roomContext.roomId}
                  title="写入开始战斗事件"
                >
                  {isStartingCombat ? "开始中..." : "开始战斗"}
                </button>
              )}
              {spaceOwner && primaryAction === "end" && (
                <button
                  type="button"
                  className="btn btn-outline btn-error btn-xs h-8 min-h-8 gap-1 rounded-lg px-3 text-[11px]"
                  onClick={() => {
                    void handleEndCombat();
                  }}
                  disabled={!canEndCombat || isEndingCombat || !roomContext.sendMessageWithInsert || !roomContext.roomId}
                  title="结束战斗轮并将回合归零"
                >
                  <Broom className="size-3.5" />
                  {isEndingCombat ? "结束中..." : "结束战斗"}
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-xs h-8 min-h-8 rounded-lg px-3 text-[11px] font-semibold"
                onClick={() => {
                  void handleAdvanceTurn();
                }}
                disabled={!canAdvanceTurn || isAdvancingTurn || !roomContext.sendMessageWithInsert || !roomContext.roomId}
              >
                {isAdvancingTurn ? "推进中..." : "下一回合"}
              </button>
            </div>
          </div>
          {runtime.isAbilityLoading && (
            <div className="mt-1.5 text-[11px] text-base-content/50">正在同步房间角色基础变量…</div>
          )}
          {shouldShowRoomSummary && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleRoomRows.map(row => (
                <StatPill
                  key={`room:${row.key}`}
                  text={`${formatStateKeyLabel(row.key)} ${compareStateValueText(row)}`}
                />
              ))}
              {roomStates.map(state => (
                <StatusPill key={state.instanceId} state={state} />
              ))}
            </div>
          )}
        </section>

        {roleRows.length === 0
          ? (
              <EmptyStateSection text="当前房间没有可展示的角色。" />
            )
          : (
              <>
                {rolesWithContent.length > 0 && (
                  <div className="space-y-2">
                    {rolesWithContent.map(row => (
                      <CompactRoleRow
                        key={row.rowId}
                        editingKey={editingRoleValue?.key ?? null}
                        editingValue={editingRoleValueText}
                        onCommitRoleValue={handleCommitRoleValue}
                        onDelete={handleDeleteRoleRow}
                        row={row}
                        setEditingValue={setEditingRoleValueText}
                        startEditing={setEditingRoleValue}
                        stopEditing={() => {
                          setEditingRoleValue(null);
                          setEditingRoleValueText("");
                        }}
                      />
                    ))}
                  </div>
                )}

                {rolesWithoutContent.length > 0 && (
                  <div className="rounded-xl border border-base-300/70 bg-base-100/70 px-3 py-2 text-xs text-base-content/52">
                    无房间态：
                    {" "}
                    {rolesWithoutContent.map(row => row.roleName).join("、")}
                  </div>
                )}
              </>
            )}

        {looseParticipants.length > 0 && (
          <section className="space-y-2">
            <div className="text-xs font-semibold text-base-content/55">其他战斗参与者</div>
            <div className="space-y-2">
              {looseParticipants.map(participant => (
                <div
                  key={participant.participantId}
                  className="rounded-2xl border border-base-300/75 bg-base-100/70 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-base-content">
                      {participant.name || participant.participantId}
                    </span>
                    <StatPill text={formatInitiativeText(participant.initiative)} />
                  </div>
                  {participant.activeStates.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {participant.activeStates.map(state => (
                        <StatusPill key={state.instanceId} state={state} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {shouldShowUnresolvedStates && (
          <section className="space-y-2">
            {runtime.unresolvedStates.map((item, index) => (
              <div
                key={`${item.messageId}:${item.statusId}:${index}`}
                className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-content"
              >
                <div className="font-medium">{item.statusId}</div>
                <div className="mt-1 opacity-80">
                  消息 #
                  {item.messageId}
                  {" · "}
                  {formatScopeText(item.scope)}
                  {" · "}
                  {item.reason}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
      <InitiativeImportDialog
        isOpen={isImportPopupOpen}
        importableRoles={importableRoles}
        abilityQueries={abilityQueries}
        initiativeList={initiativeList}
        importedRoleIds={importedInitiativeRoleIds}
        onClose={() => setIsImportPopupOpen(false)}
        onRollAllInitiative={spaceOwner ? handleRollAllInitiative : undefined}
        onImportSingle={roleId => void handleImportSingle(roleId)}
      />
      <ToastWindow
        isOpen={Boolean(duplicateImportRole)}
        onClose={() => setDuplicateImportRole(null)}
        fullScreen={false}
      >
        <div className="w-80 max-w-[calc(100vw-2rem)] space-y-4 p-4">
          <div>
            <h3 className="text-base font-semibold">复制角色并导入？</h3>
            <p className="mt-2 text-sm leading-6 text-base-content/70">
              {duplicateImportRole?.roleName ?? "这个角色"}
              已经在先攻表中。确认后会复制成新的 NPC，加入当前房间和空间，再导入先攻。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={copyRoleMutation.isPending || addRoomRoleMutation.isPending}
              onClick={() => setDuplicateImportRole(null)}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={copyRoleMutation.isPending || addRoomRoleMutation.isPending}
              onClick={() => void handleConfirmDuplicateImport()}
            >
              {copyRoleMutation.isPending || addRoomRoleMutation.isPending ? "处理中..." : "复制并导入"}
            </button>
          </div>
        </div>
      </ToastWindow>
    </div>
  );
}
