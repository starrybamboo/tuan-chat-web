import type { Rule } from "@tuanchat/openapi-client/models/Rule";
import type { Role } from "../types";
import { useDeleteRolesMutation } from "api/hooks/RoleAndAvatarHooks";
import { useDeleteRuleMutation, useRuleListQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { getRoleRule } from "@/utils/roleRuleStorage";
import { useGlobalContext } from "../../globalContextProvider";
import { useRoleUiStore } from "../stores/roleUiStore";
import { RoleListItem } from "./RoleListItem";

interface SidebarProps {
  roles: Role[];
  selectedRoleId: number | null;
  onNavigate?: () => void;
}

export function Sidebar({
  roles,
  selectedRoleId,
  onNavigate,
}: SidebarProps) {
  const searchQuery = useRoleUiStore(state => state.sidebarSearchQuery);
  const setSearchQuery = useRoleUiStore(state => state.setSidebarSearchQuery);
  const collapsedSidebarGroups = useRoleUiStore(state => state.collapsedSidebarGroups);
  const toggleSidebarGroup = useRoleUiStore(state => state.toggleSidebarGroup);
  const isSelectionMode = useRoleUiStore(state => state.selectionMode);
  const setSelectionMode = useRoleUiStore(state => state.setSelectionMode);
  const selectedRoles = useRoleUiStore(state => state.selectedRoleIds);
  const toggleRoleSelection = useRoleUiStore(state => state.toggleSelectedRoleId);
  const clearSelectedRoleIds = useRoleUiStore(state => state.clearSelectedRoleIds);
  const isDiceCollapsed = collapsedSidebarGroups.dice;
  const isNormalCollapsed = collapsedSidebarGroups.normal;
  const isRuleCollapsed = collapsedSidebarGroups.rule;
  const [searchParams] = useSearchParams();
  const userId = useGlobalContext().userId;
  const ruleListQuery = useRuleListQuery();
  const deleteRolesMutation = useDeleteRolesMutation();
  const { mutateAsync: deleteRule } = useDeleteRuleMutation();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<number | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const handleDelete = (id: number) => {
    setDeleteConfirmOpen(true);
    setDeleteCharacterId(id);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
    setDeleteRuleId(null);
  };

  const filteredRoles = roles
    .filter(role => role.name.toLowerCase().includes(searchQuery.toLowerCase())
      || role.description.toLowerCase().includes(searchQuery.toLowerCase()));

  // 在"全部"视图中，分离骰娘角色和普通角色
  const diceRoles = filteredRoles.filter(role => role.type === 1);
  const normalRoles = filteredRoles.filter(role => role.type !== 1);
  const filteredRules = useMemo(() => {
    if (typeof userId !== "number" || userId <= 0) {
      return [] as Rule[];
    }

    const list = ruleListQuery.data ?? [];
    return list
      .filter(rule => rule.authorId === userId)
      .filter((rule: Rule) => {
        if (!searchQuery.trim()) {
          return true;
        }
        const keyword = searchQuery.toLowerCase();
        return `${rule.ruleName ?? ""} ${rule.ruleDescription ?? ""}`.toLowerCase().includes(keyword);
      })
      .sort((a, b) => (b.ruleId ?? 0) - (a.ruleId ?? 0));
  }, [ruleListQuery.data, searchQuery, userId]);

  const activeRuleId = Number(searchParams.get("ruleId") ?? 0);

  // 切换选择模式
  const toggleSelectionMode = () => {
    setSelectionMode(!isSelectionMode);
  };

  // 批量删除角色
  const handleBatchDelete = () => {
    setDeleteConfirmOpen(true);
    setDeleteCharacterId(null);
  };

  const navigate = useNavigate();

  const handleDeleteRule = async (ruleId: number) => {
    setDeleteCharacterId(null);
    setDeleteRuleId(ruleId);
    setDeleteConfirmOpen(true);
  };

  // 删除确认处理函数
  const handleConfirmDelete = async () => {
    if (deleteRuleId !== null) {
      if (deletingRuleId === deleteRuleId) {
        return;
      }

      setDeletingRuleId(deleteRuleId);
      try {
        const res = await deleteRule(deleteRuleId);
        if (res?.success) {
          toast.success("规则删除成功");
          await ruleListQuery.refetch();
          if (activeRuleId === deleteRuleId) {
            navigate("/role?type=rule&mode=entry", { replace: true });
          }
          onNavigate?.();
        }
        else {
          toast.error(res?.errMsg || "规则删除失败");
        }
      }
      catch (error) {
        console.error("删除规则失败:", error);
        toast.error("规则删除失败");
      }
      finally {
        setDeletingRuleId(null);
        setDeleteConfirmOpen(false);
        setDeleteRuleId(null);
      }
      return;
    }

    if (deleteCharacterId !== null) {
      // 单个删除逻辑
      const roleId = deleteCharacterId;
      setDeleteConfirmOpen(false);
      setDeleteCharacterId(null);
      setDeleteRuleId(null);
      if (roleId) {
        try {
          await deleteRolesMutation.mutateAsync([roleId]);
          if (selectedRoleId === roleId) {
            navigate("/role", { replace: true });
          }
        }
        catch (error) {
          console.error("删除角色失败:", error);
          toast.error("角色删除失败");
        }
      }
      return;
    }
    else if (selectedRoles.size > 0) {
      // 批量删除逻辑
      const roleIds = Array.from(selectedRoles);
      setDeleteConfirmOpen(false);
      setDeleteCharacterId(null);
      setDeleteRuleId(null);
      clearSelectedRoleIds();
      setSelectionMode(false);
      try {
        await deleteRolesMutation.mutateAsync(roleIds);
        if (selectedRoleId && roleIds.includes(selectedRoleId)) {
          navigate("/role", { replace: true });
        }
      }
      catch (error) {
        console.error("批量删除角色失败:", error);
        toast.error("角色删除失败");
      }
      return;
    }

    // 关闭弹窗
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
    setDeleteRuleId(null);
  };

  useEffect(() => {
    // 只有当角色列表已加载（非空）且选中的角色不存在时才跳转
    // 避免在初始加载时（roles 为空）错误触发跳转
    if (roles.length > 0 && selectedRoleId && !roles.find(c => c.id === selectedRoleId)) {
      // 当前选中角色被删掉了，跳转
      navigate("/role", { replace: true });
    }
  }, [roles, selectedRoleId, navigate]);

  const deleteDialogTitle = deleteRuleId !== null ? "确认删除规则" : "确认删除角色";
  const deleteDialogMessage = deleteRuleId !== null
    ? "确定要删除这个规则模板吗？"
    : deleteCharacterId !== null
      ? "确定要删除这个角色吗？"
      : `确定要删除选中的 ${selectedRoles.size} 个角色吗？`;

  return (
    <>

      <div className="menu p-4 w-72 lg:w-80 h-full bg-base-200 md:bg-base-300/40 flex flex-col border-t border-gray-300 dark:border-gray-700">
        {/* 搜索和创建区域 - 固定在顶部 */}
        <div className="flex gap-2 sticky top-0 bg-transparent z-50 py-2">
          <label className="input">
            <svg className="h-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth="2.5"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </g>
            </svg>
            <input
              type="text"
              className="grow"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
          {isSelectionMode
            ? (
                <>
                  <button
                    type="button"
                    className={`btn btn-error btn-square ${selectedRoles.size === 0 ? "btn-disabled" : ""}`}
                    onClick={handleBatchDelete}
                    title="删除所选角色"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-square"
                    onClick={toggleSelectionMode}
                    title="退出选择模式"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )
            : (
                <>
                  <button
                    type="button"
                    className="btn btn-square btn-soft bg-base-200"
                    onClick={toggleSelectionMode}
                    title="进入选择模式"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </button>
                </>
              )}
        </div>
        {/* 分类切换移除，仅保留全部视图 */}

        {/* 创建角色 - 虚线占位项，始终位于列表顶部 */}

        {/* 角色列表 */}
        <div className="flex-1 overflow-hidden">

          <div
            className="h-full overflow-y-auto"
          >
            {/* "全部"视图：分组可折叠列表，顺序为规则->骰娘->角色 */}
            <>
              {/* 我的规则分组 */}
              <div className="mb-2">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-base-100 transition-colors"
                  onClick={() => toggleSidebarGroup("rule")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 transition-transform ${isRuleCollapsed ? "" : "rotate-90"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="font-medium">规则</span>
                  <span className="text-xs text-base-content/60">
                    (
                    {filteredRules.length}
                    )
                  </span>
                </button>
                {!isRuleCollapsed && (
                  <div className="ml-2">
                    <Link
                      to="/role?type=rule&mode=entry"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group hover:bg-base-100 transition-all duration-150"
                      onClick={onNavigate}
                      title="新建规则模板"
                    >
                      <div className="avatar shrink-0 px-1">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-info/40 group-hover:border-info/60 bg-info/5 text-info/60 group-hover:text-info/80 transition-colors duration-150 relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5" />
                            <path d="M12 8v8" />
                            <path d="M8 12h8" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-medium truncate">新建规则</h3>
                        <p className="text-xs text-base-content/70 mt-1 truncate">创建自定义规则模板</p>
                      </div>
                    </Link>

                    {ruleListQuery.isLoading && (
                      <div className="text-xs text-base-content/60 px-3 py-2">正在加载规则...</div>
                    )}

                    {!ruleListQuery.isLoading && filteredRules.length === 0 && (
                      <div className="text-xs text-base-content/60 px-3 py-2">
                        暂无规则，点击上方“新建规则”
                      </div>
                    )}

                    {filteredRules.map((rule) => {
                      const currentRuleId = rule.ruleId ?? 0;
                      const isRuleActive = searchParams.get("type") === "rule"
                        && searchParams.get("mode") === "edit"
                        && activeRuleId === currentRuleId;
                      return (
                        <Link
                          key={`my-${currentRuleId}`}
                          to={`/role?type=rule&mode=edit&ruleId=${currentRuleId}`}
                          className={`block rounded-lg px-1 ${
                            isRuleActive ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={onNavigate}
                        >
                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer group transition-all duration-150 ${
                              isRuleActive ? "bg-base-100" : "hover:bg-base-100"
                            }`}
                          >
                            <div className="avatar shrink-0">
                              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-base-content/10 bg-base-100 text-base-content/70 relative">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-6 h-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5" />
                                  <path d="M8 7h8" />
                                  <path d="M8 11h8" />
                                  <path d="M8 15h5" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <h3 className="font-medium truncate">{rule.ruleName || "未命名规则"}</h3>
                              <p className="text-xs text-base-content/70 mt-1 truncate">
                                #
                                {currentRuleId}
                                {" · "}
                                {(rule.ruleDescription || "暂无描述").trim() || "暂无描述"}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs text-error hover:bg-error/10 md:opacity-0 md:group-hover:opacity-100 opacity-70 rounded-full p-1"
                              disabled={deletingRuleId === currentRuleId}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void handleDeleteRule(currentRuleId);
                              }}
                              title="删除规则"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path
                                  fill="currentColor"
                                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                                />
                              </svg>
                            </button>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 骰娘角色分组 */}
              <div className="mb-2">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-base-100 transition-colors"
                  onClick={() => toggleSidebarGroup("dice")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 transition-transform ${isDiceCollapsed ? "" : "rotate-90"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="font-medium">骰娘</span>
                  <span className="text-xs text-base-content/60">
                    (
                    {diceRoles.length}
                    )
                  </span>
                </button>
                {!isDiceCollapsed && (
                  <div className="ml-2">
                    {/* 创建骰娘入口 */}
                    <Link
                      to="/role?type=dice"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group hover:bg-base-100 transition-all duration-150"
                      onClick={onNavigate}
                      title="创建骰娘角色"
                    >
                      <div className="avatar shrink-0 px-1">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-success/40 group-hover:border-success/60 bg-success/5 text-success/60 group-hover:text-success/80 transition-colors duration-150 relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <circle cx="15.5" cy="8.5" r="1.5" />
                            <circle cx="8.5" cy="15.5" r="1.5" />
                            <circle cx="15.5" cy="15.5" r="1.5" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-medium truncate">创建骰娘</h3>
                        <p className="text-xs text-base-content/70 mt-1 truncate">创建跑团骰娘</p>
                      </div>
                    </Link>
                    {/* 骰娘角色列表 */}
                    {diceRoles.map((role) => {
                      const storedRuleId = getRoleRule(role.id) || 1;
                      const roleUrl = `/role/${role.id}?rule=${storedRuleId}`;
                      return (
                        <NavLink
                          key={role.id}
                          to={roleUrl}
                          className={({ isActive }) => `block rounded-lg px-1 ${
                            isActive && !isSelectionMode ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={(e) => {
                            if (isSelectionMode) {
                              e.preventDefault();
                              toggleRoleSelection(role.id);
                            }
                            else {
                              onNavigate?.();
                            }
                          }}
                        >
                          <RoleListItem
                            role={role}
                            isSelected={isSelectionMode ? selectedRoles.has(role.id) : selectedRoleId === role.id}
                            onDelete={() => handleDelete(role.id)}
                            isSelectionMode={isSelectionMode}
                          />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 角色分组 */}
              <div className="mb-2">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-base-100 transition-colors"
                  onClick={() => toggleSidebarGroup("normal")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 transition-transform ${isNormalCollapsed ? "" : "rotate-90"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="font-medium">角色</span>
                  <span className="text-xs text-base-content/60">
                    (
                    {normalRoles.length}
                    )
                  </span>
                </button>
                {!isNormalCollapsed && (
                  <div className="ml-2">
                    <Link
                      to="/role?type=normal"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group hover:bg-base-100 transition-all duration-150"
                      onClick={onNavigate}
                      title="创建普通角色"
                    >
                      <div className="avatar shrink-0 px-1">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-primary/40 group-hover:border-primary/60 bg-primary/5 text-primary/60 group-hover:text-primary/80 transition-colors duration-150 relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-medium truncate">创建普通角色</h3>
                        <p className="text-xs text-base-content/70 mt-1 truncate">创建普通游戏角色</p>
                      </div>
                    </Link>

                    {normalRoles.map((role) => {
                      const storedRuleId = getRoleRule(role.id) || 1;
                      const roleUrl = `/role/${role.id}?rule=${storedRuleId}`;
                      return (
                        <NavLink
                          key={role.id}
                          to={roleUrl}
                          className={({ isActive }) => `block rounded-lg px-1 ${
                            isActive && !isSelectionMode ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={(e) => {
                            if (isSelectionMode) {
                              e.preventDefault();
                              toggleRoleSelection(role.id);
                            }
                            else {
                              onNavigate?.();
                            }
                          }}
                        >
                          <RoleListItem
                            role={role}
                            isSelected={isSelectionMode ? selectedRoles.has(role.id) : selectedRoleId === role.id}
                            onDelete={() => handleDelete(role.id)}
                            isSelectionMode={isSelectionMode}
                          />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            </>

          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <ToastWindow isOpen={deleteConfirmOpen} onClose={handleCancelDelete}>
        <div className="card flex flex-col w-full max-w-md">
          <div className="card-body items-center text-center">
            <h2 className="card-title text-2xl font-bold">{deleteDialogTitle}</h2>
            <div className="divider"></div>
            <p className="text-lg opacity-75 mb-8">{deleteDialogMessage}</p>
          </div>
        </div>
        <div className="card-actions justify-center gap-6 mt-8">
          <button type="button" className="btn btn-outline" onClick={handleCancelDelete}>
            取消
          </button>
          <button type="button" className="btn btn-error" onClick={handleConfirmDelete}>
            删除
          </button>
        </div>
      </ToastWindow>
    </>
  );
}
