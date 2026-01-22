import type { Rule } from "api/models/Rule";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { SaveIcon } from "@/icons";
import Section from "../Editors/Section";
import CustomRuleExpansionModule from "./CustomRuleExpansionModule";
import RuleCloneModal from "./RuleCloneModal";

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
  const [ruleEdit, setRuleEdit] = useState<Rule>({});
  const [loadedRuleId, setLoadedRuleId] = useState<number | null>(null);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneVersion, setCloneVersion] = useState(0); // 用于克隆时重置编辑内容

  function applyClonedRule(rule: Rule) {
    // 仅导入数据作为本地编辑初始值：不保留源规则 id
    // 但在 edit 模式下，必须保留“当前正在编辑的规则 id”，否则保存时会变成 ruleId 为空
    const { ruleId: _sourceRuleId, ...rest } = rule as any;

    setRuleEdit((prev) => {
      if (mode !== "edit") {
        return rest as Rule;
      }

      const currentRuleId = prev.ruleId ?? ruleId;
      return {
        ...(rest as Rule),
        ...(typeof currentRuleId === "number" && currentRuleId > 0 ? { ruleId: currentRuleId } : {}),
      };
    });
    setCloneVersion(prev => prev + 1);
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
              {`#${ruleEdit.ruleId || ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="tooltip tooltip-bottom" data-tip="从已有规则导入并覆盖当前编辑">
            <button
              type="button"
              className="btn btn-secondary btn-sm md:btn-lg rounded-lg"
              onClick={() => setIsCloneModalOpen(true)}
            >
              克隆
            </button>
          </div>
          <div className="tooltip tooltip-bottom" data-tip="保存当前修改">
            <button
              type="button"
              className="btn btn-primary btn-sm md:btn-lg rounded-lg"
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
                      规则ID
                      {" "}
                      {`#${ruleEdit.ruleId || ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="tooltip tooltip-bottom" data-tip="从已有规则导入并覆盖当前编辑">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm md:btn-lg rounded-lg"
                        onClick={() => setIsCloneModalOpen(true)}
                      >
                        克隆
                      </button>
                    </div>
                    <div className="tooltip tooltip-bottom" data-tip="保存当前修改">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm md:btn-lg rounded-lg"
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
              {/* 基础文本信息：纵向布局 */}
              <div className="space-y-6">
                {/* 角色名 */}
                <div className="form-control">
                  <div className="flex gap-2 mb-2 items-center font-semibold">
                    <span>规则名称</span>
                  </div>
                  <input
                    type="text"
                    className="input input-bordered bg-base-100 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="输入规则名称"
                    value={ruleEdit.ruleName ?? ""}
                    onChange={e => setRuleEdit({ ...ruleEdit, ruleName: e.target.value })}
                  />
                </div>
                {/* 规则描述 */}
                <div className="form-control">
                  <div className="flex gap-2 mb-2 items-center font-semibold">
                    <span>规则描述</span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered bg-base-100 rounded-md min-h-30 resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="输入规则描述"
                    value={ruleEdit.ruleDescription ?? ""}
                    onChange={e => setRuleEdit({ ...ruleEdit, ruleDescription: e.target.value })}
                  />
                </div>
              </div>
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
    </div>
  );
}
