import type { Rule } from "api/models/Rule";
import { ApiError } from "api/core/ApiError";
import { useCreateRuleMutation, useDeleteRuleMutation, useUpdateRuleMutation } from "api/hooks/ruleQueryHooks";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { useGlobalContext } from "@/components/globalContextProvider";
import { EditIcon, SaveIcon, TrashIcon } from "@/icons";
import Section from "../Editors/Section";
import RuleCloneModal from "./RuleCloneModal";
import RuleDeleteModal from "./RuleDeleteModal";
import RuleExpansionModule from "./RuleExpansionModule";
import RuleTextInfoEditor from "./RuleTextInfoEditor";

type RuleEditorMode = "create" | "edit";

interface RuleEditorProps {
  mode?: RuleEditorMode;
  isQueryLoading?: boolean;
  ruleId?: number;
  ruleDetail?: Rule;
  onBack?: () => void;
}

const RULE_NAME_MAX_LENGTH = 20;
const RULE_DESCRIPTION_MAX_LENGTH = 200;

function RuleEditorSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 animate-pulse">
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="h-12 w-28 rounded-md bg-base-200" />
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 rounded-lg bg-base-200" />
          <div className="h-10 w-24 rounded-lg bg-base-200" />
        </div>
      </div>

      <div className="max-md:hidden divider"></div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 self-start lg:sticky lg:top-4">
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
            <div className="card-body p-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-5 w-20 rounded bg-base-200" />
                  <div className="h-11 w-full rounded-md bg-base-200" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-20 rounded bg-base-200" />
                  <div className="h-30 w-full rounded-md bg-base-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 space-y-6">
          <div className="flex gap-2 rounded-lg">
            <div className="skeleton h-10 w-20 rounded-lg" />
            <div className="skeleton h-10 w-20 rounded-lg" />
            <div className="skeleton h-10 w-20 rounded-lg" />
            <div className="skeleton h-10 w-20 rounded-lg" />
          </div>

          <Section
            className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
            collapsible={false}
          >
            <div className="space-y-4">
              <div className="h-6 w-40 rounded bg-base-200" />
              <div className="h-36 w-full rounded-lg bg-base-200" />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function RuleEditor({
  mode = "create",
  isQueryLoading = false,
  ruleId,
  ruleDetail,
  onBack,
}: RuleEditorProps) {
  const navigate = useNavigate();
  const { userId } = useGlobalContext();
  const createRuleMutation = useCreateRuleMutation();
  const updateRuleMutation = useUpdateRuleMutation();
  const deleteRuleMutation = useDeleteRuleMutation();
  const [ruleEdit, setRuleEdit] = useState<Rule>({});
  const [loadedRuleId, setLoadedRuleId] = useState<number | null>(null);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [cloneVersion, setCloneVersion] = useState(0); // 用于克隆时重置编辑内容
  const [editingMap, setEditingMap] = useState<Record<string, boolean>>({});
  const [isCreateBaseInfoReady, setIsCreateBaseInfoReady] = useState(mode !== "create");
  const [isEditing, setIsEditing] = useState(mode === "create");
  const [editorSaveSignal, setEditorSaveSignal] = useState(0);
  const [pendingHeaderSave, setPendingHeaderSave] = useState(false);
  const handleSaveRef = useRef<() => void>(() => {});

  const setModuleEditing = useCallback((moduleKey: string, editing: boolean) => {
    setEditingMap((prev) => {
      if (prev[moduleKey] === editing) {
        return prev;
      }
      return {
        ...prev,
        [moduleKey]: editing,
      };
    });
  }, []);

  const handleTextInfoEditingChange = useCallback(
    (editing: boolean) => setModuleEditing("textInfo", editing),
    [setModuleEditing],
  );

  const handleBack = useCallback(() => {
    if (isSavingRule)
      return;

    if (onBack) {
      onBack();
      return;
    }

    navigate("/role");
  }, [isSavingRule, navigate, onBack]);

  useEffect(() => {
    setIsCreateBaseInfoReady(mode !== "create");
    setIsEditing(mode === "create");
    setPendingHeaderSave(false);
  }, [mode]);

  useEffect(() => {
    if (mode === "edit") {
      setIsEditing(false);
      setPendingHeaderSave(false);
    }
  }, [mode, ruleId]);

  const editorStatusBadge = mode === "create"
    ? { text: "新建规则", className: "badge-success" }
    : { text: `#${ruleEdit.ruleId}`, className: "badge-info" };
  const canEnterCreateEditor = (ruleEdit.ruleName ?? "").trim().length > 0
    && (ruleEdit.ruleDescription ?? "").trim().length > 0;

  const handleEnterCreateEditor = () => {
    if (!canEnterCreateEditor) {
      toast.error("请先填写规则名称和规则描述");
      return;
    }
    setIsCreateBaseInfoReady(true);
  };

  function applyClonedRule(rule: Rule) {
    // 仅导入数据作为本地编辑初始值：不保留源规则 id
    // 但在 edit 模式下，保留当前正在编辑的规则 id 以及 authorId
    const { ruleId: _sourceRuleId, authorId: _sourceAuthorId, ...rest } = rule as any;

    setRuleEdit((prev) => {
      if (mode !== "edit") {
        return rest as Rule;
      }

      const currentRuleId = prev.ruleId ?? ruleId;
      const currentAuthorId = prev.authorId ?? ruleDetail?.authorId;
      return {
        ...(rest as Rule),
        ...(typeof currentRuleId === "number" && currentRuleId > 0 ? { ruleId: currentRuleId } : {}),
        ...(typeof currentAuthorId === "number" && currentAuthorId > 0 ? { authorId: currentAuthorId } : {}),
      };
    });
    setCloneVersion(prev => prev + 1);
    toast.success("规则导入成功");
  }

  function handleSave() {
    if (isSavingRule)
      return;

    // 前端校验
    // 编辑态校验，该校验必须放在规则名称校验之前
    const hasEditingModule = Object.values(editingMap).some(Boolean);
    if (hasEditingModule) {
      toast.error("请先应用或取消所有编辑");
      return;
    }

    // 规则名称校验
    const nextRuleName = ruleEdit.ruleName ?? "";
    if (nextRuleName.length === 0) {
      toast.error("规则名称不能为空");
      return;
    }

    // 编辑模式下的规则id与作者id校验
    if (mode === "edit") {
      const currentRuleId = ruleEdit.ruleId ?? ruleId;
      if (typeof currentRuleId !== "number" || currentRuleId <= 0) {
        toast.error("规则ID无效，无法保存");
        return;
      }

      const authorId = ruleEdit.authorId ?? ruleDetail?.authorId;
      if (typeof authorId === "number" && authorId > 0) {
        const loginUserId = userId ?? -1;
        if (loginUserId <= 0) {
          toast.error("未登录，无法修改规则");
          return;
        }
        if (loginUserId !== authorId) {
          toast.error("只有规则作者可以修改该规则");
          return;
        }
      }
    }

    // 通过校验后，开始提交并进入过渡状态
    setIsSavingRule(true);

    const onMutationError = (err: any) => {
      const msg = err instanceof ApiError ? err.body?.errMsg : undefined;
      toast.error(msg || (mode === "edit" ? "保存失败" : "创建失败"));
      setIsSavingRule(false);
      setPendingHeaderSave(false);
    };

    const onMutationSuccess = (res: any, isCreate: boolean) => {
      if (res?.success) {
        toast.success(isCreate ? "规则已创建" : "规则已保存");

        // 成功时延时关闭过渡状态
        setTimeout(() => {
          setIsSavingRule(false);
          setIsEditing(false);
          setPendingHeaderSave(false);

          // 创建成功时调整到编辑界面
          if (isCreate) {
            const newRuleId = res?.data;
            if (typeof newRuleId === "number" && newRuleId > 0) {
              navigate(`/role?type=rule&mode=edit&ruleId=${newRuleId}`, { replace: true });
            }
          }
        }, 300);
      }
      else {
        toast.error(res?.errMsg || (isCreate ? "创建失败" : "保存失败"));
        setIsSavingRule(false);
        setPendingHeaderSave(false);
      }
    };

    if (mode === "edit") {
      const currentRuleId = ruleEdit.ruleId ?? ruleId;
      const updatePayload = {
        ruleId: currentRuleId as number,
        ruleName: nextRuleName,
        ruleDescription: ruleEdit.ruleDescription,
        actTemplate: ruleEdit.actTemplate,
        abilityFormula: ruleEdit.abilityFormula,
        skillDefault: ruleEdit.skillDefault,
        basicDefault: ruleEdit.basicDefault,
        dicerConfig: ruleEdit.dicerConfig,
      };
      updateRuleMutation.mutate(updatePayload, {
        onSuccess: res => onMutationSuccess(res, false),
        onError: onMutationError,
      });
    }
    else {
      const createPayload = {
        ruleName: nextRuleName,
        ruleDescription: ruleEdit.ruleDescription,
        actTemplate: ruleEdit.actTemplate,
        abilityFormula: ruleEdit.abilityFormula,
        skillDefault: ruleEdit.skillDefault,
        basicDefault: ruleEdit.basicDefault,
        dicerConfig: ruleEdit.dicerConfig,
      };
      createRuleMutation.mutate(createPayload, {
        onSuccess: res => onMutationSuccess(res, true),
        onError: onMutationError,
      });
    }
  }

  handleSaveRef.current = handleSave;

  async function handleDeleteRule() {
    try {
      const currentRuleId = ruleEdit.ruleId ?? ruleId;
      if (typeof currentRuleId !== "number" || currentRuleId <= 0) {
        toast.error("规则ID无效，无法删除");
        return;
      }

      // 前端做基础作者校验（若能拿到 authorId），避免误删；最终权限仍由后端判定
      const authorId = ruleEdit.authorId ?? ruleDetail?.authorId;
      if (typeof authorId === "number" && authorId > 0) {
        const loginUserId = userId ?? -1;
        if (loginUserId <= 0) {
          toast.error("未登录，无法删除规则");
          return;
        }
        if (loginUserId !== authorId) {
          toast.error("只有规则作者可以删除该规则");
          return;
        }
      }

      setIsDeletingRule(true);
      const res = await deleteRuleMutation.mutateAsync(currentRuleId);
      if (res?.success) {
        setIsDeleteModalOpen(false);
        toast.success("规则删除成功");
        onBack ? onBack() : navigate("/role", { replace: true });
      }
      else {
        toast.error(res?.errMsg || "规则删除失败");
      }
    }
    catch (err) {
      const msg = err instanceof ApiError ? err.body?.errMsg : undefined;
      toast.error(msg || "规则删除失败");
    }
    finally {
      setIsDeletingRule(false);
    }
  }

  useEffect(() => {
    // 避免新建页面还残留上一次编辑的规则内容
    if (mode !== "edit") {
      if (loadedRuleId !== null) {
        setLoadedRuleId(null);
        setRuleEdit({});
      }
      return;
    }

    const nextRuleId = typeof ruleId === "number" && ruleId > 0 ? ruleId : null;

    // 避免重复灌入覆盖用户输入
    if (nextRuleId !== loadedRuleId) {
      // ruleId 变化但数据还没到，先清空本地数据，等待 query 灌入
      if (!ruleDetail || !nextRuleId) {
        setLoadedRuleId(null);
        setRuleEdit({});
        return;
      }

      setRuleEdit(ruleDetail);
      setLoadedRuleId(nextRuleId);
    }
  }, [loadedRuleId, mode, ruleDetail, ruleId]);

  const hasEditingModule = Object.values(editingMap).some(Boolean);

  useEffect(() => {
    if (!pendingHeaderSave) {
      return;
    }

    if (hasEditingModule) {
      return;
    }

    setPendingHeaderSave(false);
    handleSaveRef.current();
  }, [hasEditingModule, pendingHeaderSave]);

  const handleHeaderPrimaryAction = () => {
    if (isSavingRule) {
      return;
    }

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setEditorSaveSignal(prev => prev + 1);
    setPendingHeaderSave(true);
  };
  const shouldForceModuleEditing = isEditing ? true : undefined;
  const moduleSaveSignal = isEditing ? editorSaveSignal : undefined;

  if (mode === "create" && !isCreateBaseInfoReady) {
    const nextName = ruleEdit.ruleName ?? "";
    const nextDescription = ruleEdit.ruleDescription ?? "";

    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="hidden md:flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="btn btn-lg btn-outline rounded-md btn-ghost mr-4"
              onClick={handleBack}
            >
              ← 返回
            </button>
            <div>
              <h1 className="font-semibold text-2xl md:text-3xl my-2">新建规则</h1>
              <p className="text-base-content/60">先填写规则基础信息，再进入字段模板编辑</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm md:btn-lg rounded-lg"
            onClick={handleEnterCreateEditor}
            disabled={!canEnterCreateEditor}
          >
            下一步
          </button>
        </div>

        <div className="max-md:hidden divider"></div>

        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body space-y-6">
            <div className="md:hidden flex items-center justify-between gap-2">
              <h2 className="font-semibold text-xl">规则基础信息</h2>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-lg"
                onClick={handleEnterCreateEditor}
                disabled={!canEnterCreateEditor}
              >
                下一步
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold">规则名称</label>
                <span className={`text-xs ${nextName.length >= RULE_NAME_MAX_LENGTH ? "text-error" : "text-base-content/50"}`}>
                  {nextName.length}
                  /
                  {RULE_NAME_MAX_LENGTH}
                </span>
              </div>
              <input
                type="text"
                className="input input-bordered bg-base-200 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="输入规则名称"
                value={nextName}
                maxLength={RULE_NAME_MAX_LENGTH}
                onChange={e => setRuleEdit(prev => ({ ...prev, ruleName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold">规则描述</label>
                <span className={`text-xs ${nextDescription.length >= RULE_DESCRIPTION_MAX_LENGTH ? "text-error" : "text-base-content/50"}`}>
                  {nextDescription.length}
                  /
                  {RULE_DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered bg-base-200 rounded-md min-h-[160px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="描述这套规则的定位和核心机制"
                value={nextDescription}
                maxLength={RULE_DESCRIPTION_MAX_LENGTH}
                onChange={e => setRuleEdit(prev => ({ ...prev, ruleDescription: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isQueryLoading) {
    return <RuleEditorSkeleton />;
  }

  return (
    <div
      className={`max-w-7xl mx-auto p-4 transition-opacity duration-300 ease-in-out ${isSavingRule ? "opacity-50 pointer-events-none" : ""}`}
      aria-busy={isSavingRule}
    >
      {/* 桌面端显示的头部区域 */}
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn btn-lg btn-outline rounded-md btn-ghost mr-4"
            onClick={handleBack}
            disabled={isSavingRule}
          >
            ← 返回
          </button>
          <div>
            <h1 className="font-semibold text-2xl md:text-3xl my-2">
              {ruleEdit.ruleName || "未命名规则"}
            </h1>
            <div className={`badge badge-outline badge-sm md:badge-md ${editorStatusBadge.className}`}>
              {editorStatusBadge.text}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <div className="tooltip tooltip-bottom" data-tip="删除该规则（不可恢复）">
              <button
                type="button"
                className="btn btn-error btn-sm md:btn-lg rounded-lg"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isSavingRule}
              >
                <span className="flex items-center gap-1">
                  <TrashIcon className="w-4 h-4" />
                  删除
                </span>
              </button>
            </div>
          )}
          <div className="tooltip tooltip-bottom" data-tip="从已有规则导入并覆盖当前编辑">
            <button
              type="button"
              className="btn btn-secondary btn-sm md:btn-lg rounded-lg"
              onClick={() => setIsCloneModalOpen(true)}
              disabled={isSavingRule}
            >
              <span className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1024 1024"
                  className="w-4 h-4"
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M880 912H144c-17.7 0-32-14.3-32-32V144c0-17.7 14.3-32 32-32h360c4.4 0 8 3.6 8 8v56c0 4.4-3.6 8-8 8H184v656h656V520c0-4.4 3.6-8 8-8h56c4.4 0 8 3.6 8 8v360c0 17.7-14.3 32-32 32M653.3 424.6l52.2 52.2c4.7 4.7 1.9 12.8-4.7 13.6l-179.4 21c-5.1.6-9.5-3.7-8.9-8.9l21-179.4c.8-6.6 8.9-9.4 13.6-4.7l52.4 52.4l256.2-256.2c3.1-3.1 8.2-3.1 11.3 0l42.4 42.4c3.1 3.1 3.1 8.2 0 11.3z"
                  >
                  </path>
                </svg>
                导入
              </span>
            </button>
          </div>
          {isEditing
            ? (
                <div className="tooltip tooltip-bottom" data-tip={mode === "create" ? "创建规则" : "保存当前修改"}>
                  <button
                    type="button"
                    className={`btn btn-primary btn-sm md:btn-lg rounded-lg ${isSavingRule ? "scale-95" : ""}`}
                    onClick={handleHeaderPrimaryAction}
                    disabled={isSavingRule}
                  >
                    {isSavingRule
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          <span className="flex items-center gap-1">
                            <SaveIcon className="w-4 h-4" />
                            {mode === "create" ? "创建" : "保存"}
                          </span>
                        )}
                  </button>
                </div>
              )
            : (
                <div className="tooltip tooltip-bottom" data-tip="编辑规则信息">
                  <button
                    type="button"
                    className="btn btn-accent btn-sm md:btn-lg rounded-lg"
                    onClick={handleHeaderPrimaryAction}
                    disabled={isSavingRule}
                  >
                    <span className="flex items-center gap-1">
                      <EditIcon className="w-4 h-4" />
                      编辑
                    </span>
                  </button>
                </div>
              )}
        </div>
      </div>

      <div className="max-md:hidden divider"></div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 self-start lg:sticky lg:top-4">
          {/* 左侧规则信息卡 */}
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
            <div className="card-body p-4">
              {/* 移动端显示的头部区域 */}
              <div className="md:hidden mb-4 pl-4 pr-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h1 className="font-semibold text-xl max-w-32 truncate">
                      {ruleEdit.ruleName || "未命名规则"}
                    </h1>
                    <div className={`badge badge-outline badge-sm ${editorStatusBadge.className}`}>
                      {editorStatusBadge.text}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mode === "edit" && (
                      <div className="tooltip tooltip-bottom" data-tip="删除该规则（不可恢复）">
                        <button
                          type="button"
                          className="btn btn-error btn-sm md:btn-lg rounded-lg"
                          onClick={() => setIsDeleteModalOpen(true)}
                          disabled={isSavingRule}
                        >
                          <span className="flex items-center gap-1">
                            删除
                          </span>
                        </button>
                      </div>
                    )}
                    <div className="tooltip tooltip-bottom" data-tip="从已有规则导入并覆盖当前编辑">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm md:btn-lg rounded-lg"
                        onClick={() => setIsCloneModalOpen(true)}
                        disabled={isSavingRule}
                      >
                        导入
                      </button>
                    </div>
                    {isEditing
                      ? (
                          <div className="tooltip tooltip-bottom" data-tip={mode === "create" ? "创建规则" : "保存当前修改"}>
                            <button
                              type="button"
                              className={`btn btn-primary btn-sm md:btn-lg rounded-lg ${isSavingRule ? "scale-95" : ""}`}
                              onClick={handleHeaderPrimaryAction}
                              disabled={isSavingRule}
                            >
                              {isSavingRule
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    <span className="flex items-center gap-1">
                                      {mode === "create" ? "创建" : "保存"}
                                    </span>
                                  )}
                            </button>
                          </div>
                        )
                      : (
                          <div className="tooltip tooltip-bottom" data-tip="编辑规则信息">
                            <button
                              type="button"
                              className="btn btn-accent btn-sm md:btn-lg rounded-lg"
                              onClick={handleHeaderPrimaryAction}
                              disabled={isSavingRule}
                            >
                              <span className="flex items-center gap-1">
                                编辑
                              </span>
                            </button>
                          </div>
                        )}
                  </div>
                </div>
                <div className="divider my-0" />
              </div>

              <RuleTextInfoEditor
                ruleName={ruleEdit.ruleName ?? ""}
                ruleDescription={ruleEdit.ruleDescription ?? ""}
                cloneVersion={cloneVersion}
                onEditingChange={handleTextInfoEditingChange}
                forcedEditing={shouldForceModuleEditing}
                saveSignal={moduleSaveSignal}
                onApply={({ ruleName, ruleDescription }) => {
                  setRuleEdit(prev => ({
                    ...prev,
                    ruleName,
                    ruleDescription,
                  }));
                }}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <RuleExpansionModule
            localRule={ruleEdit}
            onRuleChange={setRuleEdit}
            cloneVersion={cloneVersion}
            onModuleEditingChange={setModuleEditing}
            forcedEditing={shouldForceModuleEditing}
            saveSignal={moduleSaveSignal}
          />
        </div>
      </div>

      <RuleCloneModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onConfirm={applyClonedRule}
      />

      <RuleDeleteModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingRule}
        ruleName={ruleEdit.ruleName ?? ruleDetail?.ruleName}
        ruleId={ruleEdit.ruleId ?? ruleId}
        onCancel={() => {
          if (isDeletingRule)
            return;
          setIsDeleteModalOpen(false);
        }}
        onConfirm={handleDeleteRule}
      />
    </div>
  );
}
