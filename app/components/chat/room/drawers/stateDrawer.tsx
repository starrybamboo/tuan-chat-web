import React from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { getFallbackRoleAbilityValue } from "@/components/chat/state/stateRuntime";
import { formatStateKeyLabel, formatStateNumericValue, formatStateScopeLabel } from "@/types/stateEvent";

function EmptyStateSection({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-base-300/80 bg-base-200/30 px-3 py-4 text-sm text-base-content/60">
      {text}
    </div>
  );
}

function StateValueList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; baseValue: number; displayValue: number }>;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-base-content/80">{title}</h3>
      {rows.length === 0
        ? (
            <EmptyStateSection text="当前没有可展示的变量。" />
          )
        : (
            <div className="space-y-2">
              {rows.map(row => (
                <div
                  key={`${title}:${row.key}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-base-300/70 bg-base-100/70 px-3 py-2"
                >
                  <div className="min-w-0 truncate text-sm font-medium text-base-content">
                    {formatStateKeyLabel(row.key)}
                  </div>
                  <div className="shrink-0 text-right text-sm text-base-content/75">
                    {row.baseValue === row.displayValue
                      ? formatStateNumericValue(row.displayValue)
                      : `${formatStateNumericValue(row.baseValue)} -> ${formatStateNumericValue(row.displayValue)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
    </section>
  );
}

export default function StateDrawer() {
  const roomContext = React.useContext(RoomContext);
  const runtime = useStateRuntimeContext();
  const currentRoleId = runtime.currentRoleId;
  const currentRole = roomContext.roomRolesThatUserOwn.find(role => role.roleId === currentRoleId);

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

  const currentRoleRows = React.useMemo(() => {
    if (currentRoleId <= 0) {
      return [];
    }
    const roleVars = runtime.roleVarsByRoleId[currentRoleId] ?? {};
    const baseValues = runtime.baseDisplayValues.rolesByRoleId[currentRoleId] ?? {};
    const displayValues = runtime.derivedDisplayValues.rolesByRoleId[currentRoleId] ?? {};
    const fallbackAbility = runtime.fallbackRoleAbilitiesByRoleId[currentRoleId];
    return [...new Set([...Object.keys(roleVars), ...Object.keys(baseValues), ...Object.keys(displayValues)])]
      .sort((left, right) => left.localeCompare(right, "zh-CN"))
      .map(key => {
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
  }, [
    currentRoleId,
    runtime.baseDisplayValues.rolesByRoleId,
    runtime.derivedDisplayValues.rolesByRoleId,
    runtime.fallbackRoleAbilitiesByRoleId,
    runtime.roleVarsByRoleId,
  ]);

  return (
    <div className="h-full overflow-auto bg-base-200/40 px-3 py-4">
      <div className="space-y-4">
        <section className="rounded-2xl border border-base-300/80 bg-base-100/70 px-4 py-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-base-content/50">当前回合</div>
          <div className="mt-1 text-3xl font-semibold text-base-content">{runtime.turn}</div>
          {runtime.isAbilityLoading && (
            <div className="mt-2 text-xs text-base-content/55">正在同步角色基础变量…</div>
          )}
        </section>

        <StateValueList title="房间变量" rows={roomRows} />

        <StateValueList
          title={currentRoleId > 0
            ? `当前角色变量${currentRole?.roleName ? ` · ${currentRole.roleName}` : ` · #${currentRoleId}`}`
            : "当前角色变量"}
          rows={currentRoleRows}
        />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-base-content/80">激活状态</h3>
          {runtime.activeStates.length === 0
            ? (
                <EmptyStateSection text="当前没有激活状态。" />
              )
            : (
                <div className="space-y-2">
                  {runtime.activeStates.map(state => (
                    <div
                      key={state.instanceId}
                      className="rounded-xl border border-base-300/70 bg-base-100/70 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-base-content">
                            {state.statusName}
                          </div>
                          <div className="mt-1 text-xs text-base-content/60">
                            {formatStateScopeLabel(state.scope)}
                            {" · "}
                            {state.statusId}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-base-content/70">
                          {typeof state.remainingTurns === "number" ? `剩余 ${state.remainingTurns} 回合` : "持续中"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-base-content/80">未解析状态</h3>
          {runtime.unresolvedStates.length === 0
            ? (
                <EmptyStateSection text="当前没有未解析状态。" />
              )
            : (
                <div className="space-y-2">
                  {runtime.unresolvedStates.map((item, index) => (
                    <div
                      key={`${item.messageId}:${item.statusId}:${index}`}
                      className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-content"
                    >
                      <div className="font-medium">{item.statusId}</div>
                      <div className="mt-1 text-xs opacity-80">
                        消息 #{item.messageId}
                        {" · "}
                        {formatStateScopeLabel(item.scope)}
                        {" · "}
                        {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </section>
      </div>
    </div>
  );
}
