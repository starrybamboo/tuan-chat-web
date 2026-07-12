import { useGetRoleQuery, useGetUserRolesQuery } from "api/hooks/RoleAndAvatarHooks";
import { useMemo, useState } from "react";

import { Button } from "@/components/common/Button";
import { DialogFrame } from "@/components/common/DialogFrame";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { FieldDescription, FieldError, FieldLabel, TextInput } from "@/components/common/FormField";
import { StateView } from "@/components/common/StateView";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { useGlobalUserId } from "@/components/globalContextProvider";

import type { UserRole } from "../../../api";

type DiceMaidenLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentDicerRoleId?: number;
  onConfirm: (dicerRoleId: number) => void;
}

/**
 * 骰娘角色项组件
 */
function DiceMaidenRoleItem({
  role,
  isSelected,
  onSelect,
}: {
  role: UserRole;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={surfaceClassName({ level: "content", className: `w-full cursor-pointer text-left transition-all duration-200 ${
        isSelected
          ? "bg-info/20 border-2 border-info"
          : "bg-base-200 hover:bg-base-300"
      }` })}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* 骰娘头像 */}
          <div className="rounded-full ring ring-info ring-offset-base-100 ring-offset-2">
            <RoleAvatarByRole
              role={role}
              width={12}
              isRounded={true}
              stopToastWindow={true}
              alt={role.roleName || "骰娘"}
            />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{role.roleName || "未命名骰娘"}</h4>
            <p className="text-sm text-base-content/60 truncate">
              ID:
              {" "}
              {role.roleId}
            </p>
          </div>
          {isSelected && (
            <svg className="w-5 h-5 text-info" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * 手动输入角色预览组件
 */
function ManualRolePreview({ roleId }: { roleId: number }) {
  const { data: roleData } = useGetRoleQuery(roleId);
  const role = roleData?.data;

  if (!role)
    return null;

  return (
    <div className={surfaceClassName({ level: "content", className: "border-2 border-info bg-info/10" })}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full ring ring-info ring-offset-base-100 ring-offset-2">
            <RoleAvatarByRole
              role={role}
              width={12}
              isRounded={true}
              stopToastWindow={true}
              alt={role.roleName || "骰娘"}
            />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{role.roleName || "未命名骰娘"}</h4>
            <p className="text-sm text-base-content/60 truncate">
              ID:
              {" "}
              {role.roleId}
            </p>
          </div>
          <svg className="w-5 h-5 text-info" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * 骰娘关联弹窗组件
 */
export default function DiceMaidenLinkModal({
  isOpen,
  onClose,
  currentDicerRoleId,
  onConfirm,
}: DiceMaidenLinkModalProps) {
  const userId = useGlobalUserId() ?? -1;

  // 获取用户的所有角色
  const { data: userRolesQuery } = useGetUserRolesQuery(userId);

  // 提取所有骰娘角色
  const diceMaidenRoles = useMemo(() => {
    const allRoles = userRolesQuery?.data ?? [];
    return allRoles.filter(role => role.type === 1);
  }, [userRolesQuery]);

  const [selectedId, setSelectedId] = useState<number | undefined>(currentDicerRoleId);
  const [manualInput, setManualInput] = useState<string>("");
  const [inputMode, setInputMode] = useState<"select" | "manual">("select");

  // 手动输入的ID转换
  const manualInputId = useMemo(() => {
    const parsed = Number.parseInt(manualInput, 10);
    return (Number.isNaN(parsed) || parsed <= 0) ? undefined : parsed;
  }, [manualInput]);

  // 查询手动输入的角色信息
  const { data: manualRoleData, isLoading: isManualRoleLoading } = useGetRoleQuery(manualInputId || 0);
  const manualRole = manualRoleData?.data;

  // 验证手动输入的角色是否为骰娘
  const manualRoleError = useMemo(() => {
    if (!manualInputId)
      return null;
    if (isManualRoleLoading)
      return null;
    if (!manualRole)
      return "角色不存在";
    if (manualRole.type !== 1)
      return "此角色不是骰娘类型";
    return null;
  }, [manualInputId, manualRole, isManualRoleLoading]);

  const handleConfirm = () => {
    let dicerRoleId: number | undefined;

    if (inputMode === "manual") {
      // 手动输入模式：验证角色有效性
      if (manualRoleError) {
        return; // 有错误时不允许提交
      }
      dicerRoleId = manualInputId;
    }
    else {
      dicerRoleId = selectedId;
    }

    if (dicerRoleId && dicerRoleId > 0) {
      onConfirm(dicerRoleId);
      onClose();
    }
  };

  const handleClear = () => {
    onConfirm(0); // 传递 0 表示清除绑定
    onClose();
  };

  if (!isOpen)
    return null;

  return (
    <DialogFrame
      open={isOpen}
      mode="inline"
      onClose={onClose}
      ariaLabel="关联骰娘"
      rootClassName="z-50 bg-black/50"
      panelClassName="bg-base-100 rounded-xl shadow-2xl w-full mx-4 flex flex-col"
      panelStyle={{ maxWidth: "28rem", height: "600px" }}
    >
        {/* 头部 - 固定 */}
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="mb-4">
            <h3 className="text-xl font-semibold">关联骰娘角色</h3>
          </div>

          {/* 选择模式切换 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={inputMode === "select" ? "outline" : "ghost"}
              className={`flex-1 ${inputMode === "select" ? "border-info/45 text-info hover:border-info/70 hover:bg-info/10" : ""}`}
              onClick={() => setInputMode("select")}
            >
              选择骰娘
            </Button>
            <Button
              size="sm"
              variant={inputMode === "manual" ? "outline" : "ghost"}
              className={`flex-1 ${inputMode === "manual" ? "border-info/45 text-info hover:border-info/70 hover:bg-info/10" : ""}`}
              onClick={() => setInputMode("manual")}
            >
              手动输入ID
            </Button>
          </div>
        </div>

        {/* 内容区域 - 可滚动，固定高度 */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          {inputMode === "select"
            ? (
                <div className="space-y-2 pb-4">
                  {diceMaidenRoles.length === 0
                    ? (
                        <div className="text-center py-8 text-base-content/60">
                          <p>暂无骰娘角色</p>
                          <p className="text-sm mt-2">请先创建骰娘角色</p>
                        </div>
                      )
                    : (
                        <>
                          {diceMaidenRoles.map(role => (
                            <DiceMaidenRoleItem
                              key={role.roleId}
                              role={role}
                              isSelected={selectedId === role.roleId}
                              onSelect={() => setSelectedId(role.roleId)}
                            />
                          ))}

                        </>
                      )}
                </div>
              )
            : (
                <div className="space-y-4 pb-4">
                  <div>
                    <FieldLabel htmlFor="dice-maiden-role-id">骰娘角色ID</FieldLabel>
                    <TextInput
                      id="dice-maiden-role-id"
                      type="number"
                      aria-invalid={Boolean(manualRoleError)}
                      placeholder="请输入骰娘角色的ID"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                    />
                    {manualRoleError
                      ? (
                          <FieldError>{manualRoleError}</FieldError>
                        )
                      : (
                          <FieldDescription>输入骰娘角色的ID号进行绑定</FieldDescription>
                        )}
                  </div>

                  {/* 角色预览 */}
                  {manualInputId && !manualRoleError && manualRole && (
                    <ManualRolePreview roleId={manualInputId} />
                  )}

                  {/* 加载状态 */}
                  {manualInputId && isManualRoleLoading && (
                    <StateView loading title="正在加载角色" className="py-4" />
                  )}
                </div>
              )}
        </div>

        {/* 底部按钮 - 固定 */}
        <div className="p-6 pt-4 flex-shrink-0 border-t border-base-300">
          <div className="flex gap-2">
            {currentDicerRoleId && (
              <Button
                size="sm"
                variant="error"
                onClick={handleClear}
              >
                清除绑定
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="flex-1"
              onClick={handleConfirm}
              disabled={
                inputMode === "select"
                  ? !selectedId
                  : !manualInputId || !!manualRoleError || isManualRoleLoading
              }
            >
              确认
            </Button>
          </div>
        </div>
    </DialogFrame>
  );
}
