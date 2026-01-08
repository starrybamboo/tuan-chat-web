import { useGetInfiniteUserRolesQuery, useGetRoleAvatarQuery, useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useMemo, useState } from "react";
import { useGlobalContext } from "@/components/globalContextProvider";

interface DiceMaidenLinkModalProps {
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
  role: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const avatarQuery = useGetRoleAvatarQuery(role.avatarId || 0);
  const avatarUrl = avatarQuery.data?.data?.avatarUrl || "/favicon.ico";

  return (
    <div
      className={`card cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-primary/20 border-2 border-primary"
          : "bg-base-200 hover:bg-base-300"
      }`}
      onClick={onSelect}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          {/* 骰娘头像 */}
          <div className="avatar">
            <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src={avatarUrl} alt={role.roleName || "骰娘"} />
            </div>
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
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 手动输入角色预览组件
 */
function ManualRolePreview({ roleId }: { roleId: number }) {
  const { data: roleData } = useGetRoleQuery(roleId);
  const role = roleData?.data;
  const avatarQuery = useGetRoleAvatarQuery(role?.avatarId || 0);
  const avatarUrl = avatarQuery.data?.data?.avatarUrl || "/favicon.ico";

  if (!role)
    return null;

  return (
    <div className="card bg-primary/10 border-2 border-primary">
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src={avatarUrl} alt={role.roleName || "骰娘"} />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{role.roleName || "未命名骰娘"}</h4>
            <p className="text-sm text-base-content/60 truncate">
              ID:
              {" "}
              {role.roleId}
            </p>
          </div>
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
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
  const globalContext = useGlobalContext();
  const userId = globalContext.userId ?? -1;

  // 获取用户的所有角色
  const { data: userRolesQuery, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetInfiniteUserRolesQuery(userId);

  // 提取所有骰娘角色
  const diceMaidenRoles = useMemo(() => {
    const allRoles = userRolesQuery?.pages.flatMap(page => page.data?.list ?? []) ?? [];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-base-100 rounded-xl shadow-2xl w-full mx-4 flex flex-col"
        style={{ maxWidth: "28rem", height: "600px" }}
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 - 固定 */}
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">关联骰娘角色</h3>
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 选择模式切换 */}
          <div className="flex gap-2">
            <button
              type="button"
              className={`btn btn-sm flex-1 ${inputMode === "select" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setInputMode("select")}
            >
              选择骰娘
            </button>
            <button
              type="button"
              className={`btn btn-sm flex-1 ${inputMode === "manual" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setInputMode("manual")}
            >
              手动输入ID
            </button>
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

                          {hasNextPage && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost w-full"
                              onClick={() => fetchNextPage()}
                              disabled={isFetchingNextPage}
                            >
                              {isFetchingNextPage
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    "加载更多"
                                  )}
                            </button>
                          )}
                        </>
                      )}
                </div>
              )
            : (
                <div className="space-y-4 pb-4">
                  <div>
                    <label className="label">
                      <span className="label-text">骰娘角色ID</span>
                    </label>
                    <input
                      type="number"
                      className={`input input-bordered w-full ${
                        manualRoleError ? "input-error" : ""
                      }`}
                      placeholder="请输入骰娘角色的ID"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                    />
                    {manualRoleError
                      ? (
                          <label className="label">
                            <span className="label-text-alt text-error">
                              {manualRoleError}
                            </span>
                          </label>
                        )
                      : (
                          <label className="label">
                            <span className="label-text-alt text-base-content/60">
                              输入骰娘角色的ID号进行绑定
                            </span>
                          </label>
                        )}
                  </div>

                  {/* 角色预览 */}
                  {manualInputId && !manualRoleError && manualRole && (
                    <ManualRolePreview roleId={manualInputId} />
                  )}

                  {/* 加载状态 */}
                  {manualInputId && isManualRoleLoading && (
                    <div className="flex justify-center py-4">
                      <span className="loading loading-spinner loading-md"></span>
                    </div>
                  )}
                </div>
              )}
        </div>

        {/* 底部按钮 - 固定 */}
        <div className="p-6 pt-4 flex-shrink-0 border-t border-base-300">
          <div className="flex gap-2">
            {currentDicerRoleId && (
              <button
                type="button"
                className="btn btn-error btn-sm"
                onClick={handleClear}
              >
                清除绑定
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm flex-1"
              onClick={handleConfirm}
              disabled={
                inputMode === "select"
                  ? !selectedId
                  : !manualInputId || !!manualRoleError || isManualRoleLoading
              }
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
