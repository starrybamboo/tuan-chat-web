import type { UserRole } from "../../../../../api";
import type { ActiveStateInstance } from "@/components/chat/state/stateRuntime";
import type { StateRuntimeContextValue } from "@/components/chat/state/stateRuntimeContext";

import React from "react";
import { toast } from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { getFallbackRoleAbilityValue } from "@/components/chat/state/stateRuntime";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import {
  buildCommandStateEventExtra,
  formatStateKeyLabel,
  formatStateNumericValue,
  formatStateScopeLabel,
  toApiMessageExtraWithStateEvent,
} from "@/types/stateEvent";
import { MessageType } from "../../../../../api/wsModels";

type StateValueRow = {
  key: string;
  baseValue: number;
  displayValue: number;
};

type PrimaryStatConfig = {
  label: string;
  keys: string[];
  className: string;
};

type PrimaryStatViewModel = {
  config: PrimaryStatConfig;
  row: StateValueRow;
  maxRow?: StateValueRow;
};

type RoleStateRowViewModel = {
  roleId: number;
  roleName: string;
  avatarId: number;
  isCurrent: boolean;
  primaryStats: PrimaryStatViewModel[];
  secondaryRows: StateValueRow[];
  activeStates: ActiveStateInstance[];
  hasRoomContent: boolean;
};

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
    secondaryRows: rows.filter(row => !consumedKeys.has(row.key)),
  };
}

function formatPrimaryStatText(item: PrimaryStatViewModel): string {
  const currentValue = compareStateValueText(item.row);
  if (!item.maxRow) {
    return `${item.config.label} ${currentValue}`;
  }
  return `${item.config.label} ${currentValue}/${formatStateNumericValue(item.maxRow.displayValue)}`;
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

function CompactRoleRow({ row }: { row: RoleStateRowViewModel }) {
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
            {!row.hasRoomContent && (
              <span className="text-[11px] text-base-content/45">无房间态</span>
            )}
          </div>
          {row.hasRoomContent && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {row.primaryStats.map(item => (
                <StatPill
                  key={`${row.roleId}:${item.config.label}`}
                  text={formatPrimaryStatText(item)}
                  className={item.config.className}
                />
              ))}
              {row.secondaryRows.map(item => (
                <StatPill
                  key={`${row.roleId}:${item.key}`}
                  text={`${formatStateKeyLabel(item.key)} ${compareStateValueText(item)}`}
                />
              ))}
              {row.activeStates.map(state => (
                <StatusPill key={state.instanceId} state={state} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StateDrawer() {
  const roomContext = React.useContext(RoomContext);
  const runtime = useStateRuntimeContext();
  const [isAdvancingTurn, setIsAdvancingTurn] = React.useState(false);

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

    setIsAdvancingTurn(true);
    try {
      const createdMessage = await roomContext.sendMessageWithInsert({
        roomId: roomContext.roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
        content: ".next",
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
    isAdvancingTurn,
    roomContext.curAvatarId,
    roomContext.curRoleId,
    roomContext.roomId,
    roomContext.sendMessageWithInsert,
  ]);

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
    runtime.activeStates.forEach((state) => {
      if (state.scope.kind === "role" && state.scope.roleId > 0) {
        roleIds.add(state.scope.roleId);
      }
    });

    return [...roleIds]
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
        const activeStates = runtime.activeStates.filter(
          state => state.scope.kind === "role" && state.scope.roleId === roleId,
        );
        const rows = buildRoleValueRows(runtime, roleId, activeStates);
        const { primaryStats, secondaryRows } = splitRoleRows(rows);
        const hasRoomContent = primaryStats.length > 0 || secondaryRows.length > 0 || activeStates.length > 0;
        return {
          roleId,
          roleName: role?.roleName?.trim() || `角色 #${roleId}`,
          avatarId: role?.avatarId ?? -1,
          isCurrent: roleId === runtime.currentRoleId,
          primaryStats,
          secondaryRows,
          activeStates,
          hasRoomContent,
        };
      });
  }, [
    roleById,
    roomContext.roomAllRoles,
    runtime,
  ]);

  const rolesWithContent = roleRows.filter(row => row.hasRoomContent);
  const rolesWithoutContent = roleRows.filter(row => !row.hasRoomContent);
  const shouldShowRoomSummary = roomRows.length > 0 || roomStates.length > 0;
  const shouldShowUnresolvedStates = runtime.unresolvedStates.length > 0;

  return (
    <div className="h-full overflow-auto bg-base-200/45 px-2.5 py-3">
      <div className="space-y-2.5">
        <section className="rounded-2xl border border-base-300/75 bg-base-100/80 px-3 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-end gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-base-content/42">回合</span>
              <span className="text-2xl font-semibold leading-none text-base-content">{runtime.turn}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-xs h-8 min-h-8 rounded-lg px-3 text-[11px] font-semibold"
              onClick={() => {
                void handleAdvanceTurn();
              }}
              disabled={isAdvancingTurn || !roomContext.sendMessageWithInsert || !roomContext.roomId}
            >
              {isAdvancingTurn ? "推进中..." : "下一回合"}
            </button>
          </div>
          {runtime.isAbilityLoading && (
            <div className="mt-1.5 text-[11px] text-base-content/50">正在同步房间角色基础变量…</div>
          )}
          {shouldShowRoomSummary && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roomRows.map(row => (
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
                      <CompactRoleRow key={row.roleId} row={row} />
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

        {shouldShowUnresolvedStates && (
          <section className="space-y-2">
            {runtime.unresolvedStates.map((item, index) => (
              <div
                key={`${item.messageId}:${item.statusId}:${index}`}
                className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-content"
              >
                <div className="font-medium">{item.statusId}</div>
                <div className="mt-1 opacity-80">
                  消息 #{item.messageId}
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
    </div>
  );
}
