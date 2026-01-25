import type { Rule } from "api/models/Rule";
import { useCreateRuleMutation, useDeleteRuleMutation, useUpdateRuleMutation } from "api/hooks/ruleQueryHooks";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import { useGlobalContext } from "@/components/globalContextProvider";
import { SaveIcon, TrashIcon } from "@/icons";
import Section from "../Editors/Section";
import CustomRuleExpansionModule from "./CustomRuleExpansionModule";
import RuleCloneModal from "./RuleCloneModal";
import RuleDeleteModal from "./RuleDeleteModal";
import RuleTextInfoEditor from "./RuleTextInfoEditor";

type RuleEditorMode = "create" | "edit";

interface RuleCreationEditorProps {
  mode?: RuleEditorMode;
  isQueryLoading?: boolean;
  ruleId?: number;
  ruleDetail?: Rule;
  onBack?: () => void;
}

function RuleCreationEditorSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="h-12 w-28 rounded-md bg-base-200" />
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 rounded-lg bg-base-200" />
          <div className="h-10 w-24 rounded-lg bg-base-200" />
        </div>
      </div>

      <div className="max-md:hidden divider"></div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 self-start lg:sticky lg:top-4 space-y-6">
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
            <div className="card-body p-4 max-h-168">
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

export default function RuleCreationEditor({
  mode = "create",
  isQueryLoading = false,
  ruleId,
  ruleDetail,
  onBack,
}: RuleCreationEditorProps) {
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
  const [cloneVersion, setCloneVersion] = useState(0); // 用于克隆时重置编辑内容

  const displayRuleId = ruleEdit.ruleId;
  const displayAuthorId = mode === "edit" ? (ruleDetail?.authorId ?? ruleEdit.authorId) : userId;
  const authorIdText = typeof displayAuthorId === "number" && displayAuthorId > 0 ? `#${displayAuthorId}` : (mode === "create" ? "未登录" : "#");
  const ruleIdText = typeof displayRuleId === "number" && displayRuleId > 0 ? `#${displayRuleId}` : "#";

  // 干净的文本
  const cleanText = (text: string) => {
    if (!text)
      return "";
    return text
      .replace(/\r\n/g, "\n") // 替换Windows换行符为Unix换行符
      .replace(/ {2,}/g, " ") // 压缩多个空格为单个空格
      .replace(/\n{2,}/g, "\n") // 压缩多个换行为单个换行
      .replace(/\s+$/g, ""); // 移除末尾空格
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
  }

  async function handleSave() {
    try {
      const cleanedRuleName = typeof ruleEdit.ruleName === "string" ? cleanText(ruleEdit.ruleName) : ruleEdit.ruleName;
      const cleanedRuleDescription = typeof ruleEdit.ruleDescription === "string" ? cleanText(ruleEdit.ruleDescription) : ruleEdit.ruleDescription;

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

        const res = await updateRuleMutation.mutateAsync({
          ruleId: currentRuleId,
          ruleName: cleanedRuleName,
          ruleDescription: cleanedRuleDescription,
          actTemplate: ruleEdit.actTemplate,
          abilityFormula: ruleEdit.abilityFormula,
          skillDefault: ruleEdit.skillDefault,
          basicDefault: ruleEdit.basicDefault,
          dicerConfig: ruleEdit.dicerConfig,
        });

        if (res?.success) {
          toast.success("规则已保存");
          onBack ? onBack() : navigate("/role", { replace: true });
        }
        else {
          toast.error(res?.errMsg || "保存失败");
        }
        return;
      }

      const res = await createRuleMutation.mutateAsync({
        ruleName: cleanedRuleName,
        ruleDescription: cleanedRuleDescription,
        actTemplate: ruleEdit.actTemplate,
        abilityFormula: ruleEdit.abilityFormula,
        skillDefault: ruleEdit.skillDefault,
        basicDefault: ruleEdit.basicDefault,
        dicerConfig: ruleEdit.dicerConfig,
      });

      if (res?.success) {
        toast.success("规则已创建");
        onBack ? onBack() : navigate("/role", { replace: true });
      }
      else {
        toast.error(res?.errMsg || "创建失败");
      }
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : "请求失败";
      toast.error(msg);
    }
  }

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
        toast.error("规则删除失败");
      }
    }
    catch {
      toast.error("规则删除失败");
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

  if (isQueryLoading) {
    return <RuleCreationEditorSkeleton />;
  }

  return (
    <div className="p-4">
      {/* 桌面端显示的头部区域 */}
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {onBack
            ? (
                <button
                  type="button"
                  className="btn btn-lg btn-outline rounded-md btn-ghost mr-4"
                  onClick={onBack}
                >
                  ← 返回
                </button>
              )
            : (
                <Link to="/role" type="button" className="btn btn-lg btn-outline rounded-md btn-ghost mr-4">
                  ← 返回
                </Link>
              )}
          <div>
            <h1 className="font-semibold text-2xl md:text-3xl my-2">
              {ruleEdit.ruleName || "未命名规则"}
            </h1>
            <p className="text-base-content/60">
              规则ID
              {" "}
              {ruleIdText}
              <span className="mx-1">·</span>
              作者ID
              {" "}
              {authorIdText}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <div className="tooltip tooltip-bottom" data-tip="删除该规则（不可恢复）">
              <button
                type="button"
                className="btn btn-error btn-sm md:btn-lg rounded-lg"
                onClick={() => setIsDeleteModalOpen(true)}
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
          <div className="tooltip tooltip-bottom" data-tip="保存当前修改">
            <button
              type="button"
              className="btn btn-primary btn-sm md:btn-lg rounded-lg"
              onClick={handleSave}
            >
              <span className="flex items-center gap-1">
                <SaveIcon className="w-4 h-4" />
                保存
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-md:hidden divider"></div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：规则名称和规则描述 */}
        <div className="lg:col-span-1 self-start lg:sticky lg:top-4 space-y-6">
          {/* 卡片 */}
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
            <div className="card-body p-4 max-h-168">
              {/* 移动端显示的头部区域 */}
              <div className="md:hidden mb-4 pl-4 pr-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h1 className="font-semibold text-xl max-w-32 truncate">
                      {ruleEdit.ruleName || "未命名规则"}
                    </h1>
                    <p className="text-base-content/60 text-sm">
                      作者ID
                      {" "}
                      {authorIdText}
                      {" "}
                      <span className="mx-1">·</span>
                      规则ID
                      {" "}
                      {ruleIdText}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {mode === "edit" && (
                      <div className="tooltip tooltip-bottom" data-tip="删除该规则（不可恢复）">
                        <button
                          type="button"
                          className="btn btn-error btn-sm md:btn-lg rounded-lg"
                          onClick={() => setIsDeleteModalOpen(true)}
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
                      >
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
                      </button>
                    </div>
                    <div className="tooltip tooltip-bottom" data-tip="保存当前修改">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm md:btn-lg rounded-lg"
                        onClick={handleSave}
                      >
                        <span className="flex items-center gap-1">
                          <SaveIcon className="w-4 h-4" />
                          保存
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="divider my-0" />
              </div>
              <RuleTextInfoEditor
                ruleName={ruleEdit.ruleName ?? ""}
                ruleDescription={ruleEdit.ruleDescription ?? ""}
                cloneVersion={cloneVersion}
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
        {/* 右侧：编辑信息模块 */}
        <div className="lg:col-span-3 space-y-6">
          <CustomRuleExpansionModule localRule={ruleEdit} onRuleChange={setRuleEdit} cloneVersion={cloneVersion} />
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
