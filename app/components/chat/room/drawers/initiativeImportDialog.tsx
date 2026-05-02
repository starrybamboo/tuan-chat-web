import type { InitiativeAbilityQuery, InitiativeRoleRef } from "./initiativeListDerived";
import type { Initiative } from "./initiativeListTypes";

import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface InitiativeImportDialogProps {
  isOpen: boolean;
  importableRoles: InitiativeRoleRef[];
  abilityQueries: InitiativeAbilityQuery[];
  initiativeList: Initiative[];
  onClose: () => void;
  onImportSingle: (roleId: number) => void;
}

export function InitiativeImportDialog({
  isOpen,
  importableRoles,
  abilityQueries,
  initiativeList,
  onClose,
  onImportSingle,
}: InitiativeImportDialogProps) {
  return (
    <ToastWindow
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={false}
    >
      <div className="p-4 space-y-4 min-w-65 max-w-sm">
        <h3 className="text-base font-semibold">从角色导入先攻（敏捷）</h3>
        <p className="text-xs text-base-content/60">
          选择一个角色，从其当前规则的能力/基础属性中自动识别“敏捷”等字段并填入先攻列表。
        </p>
        <div className="flex flex-col gap-2">
          {importableRoles.map((role, idx) => {
            const q = abilityQueries[idx];
            const loading = q?.isLoading ?? false;
            const hasData = !!q?.data && q.data.success;
            const name = role.roleName ?? `角色${role.roleId}`;
            const isImported = initiativeList.some((item) => {
              if (typeof item.roleId === "number") {
                return item.roleId === role.roleId;
              }
              return item.name === name;
            });

            return (
              <div
                key={role.roleId}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-base-100 border border-base-200"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {name}
                  </span>
                  <span className="text-[11px] text-base-content/60">
                    {loading
                      ? "正在加载能力数据..."
                      : hasData
                        ? "已加载，点击导入"
                        : "尚无该规则的能力数据"}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-primary"
                  disabled={loading || !hasData}
                  onClick={() => onImportSingle(role.roleId)}
                >
                  {isImported ? "再次导入" : "导入"}
                </button>
              </div>
            );
          })}
          {importableRoles.length === 0 && (
            <div className="text-xs text-base-content/60 text-center py-4">
              暂无可导入的角色。
            </div>
          )}
        </div>
      </div>
    </ToastWindow>
  );
}
