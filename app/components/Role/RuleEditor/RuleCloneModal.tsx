import type { Rule } from "api/models/Rule";
import { useDebounce } from "ahooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import RulesSection from "../rules/RulesSection";

export default function RuleCloneModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rule: Rule) => void;
}) {
  const [selectedRuleId, setSelectedRuleId] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setSelectedRuleId(0);
    }
  }, [isOpen]);

  const debouncedRuleId = useDebounce(selectedRuleId, { wait: 150 });

  const ruleQuery = useRuleDetailQuery(debouncedRuleId, {
    enabled: isOpen && debouncedRuleId > 0,
  });

  const isRequestingName = ruleQuery.isFetching || ruleQuery.isLoading;
  const hasValidRule = ruleQuery.isSuccess && !!ruleQuery.data;

  const confirmDisabled = debouncedRuleId <= 0 || !hasValidRule || isRequestingName;

  const statusNode = useMemo(() => {
    if (debouncedRuleId <= 0) {
      return <span className="text-base-content/60">请选择要导入的规则</span>;
    }

    if (isRequestingName) {
      return (
        <span className="flex items-center gap-2 text-base-content/60">
          <span className="loading loading-spinner loading-xs" />
          正在获取规则详情…
        </span>
      );
    }

    if (hasValidRule) {
      return (
        <span className="text-base-content/80">
          已选择：
          <span className="font-semibold">{ruleQuery.data.ruleName || "（未命名）"}</span>
        </span>
      );
    }

    return <span className="text-warning">未找到/请求失败</span>;
  }, [debouncedRuleId, hasValidRule, isRequestingName, ruleQuery.data]);

  if (!isOpen)
    return null;

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box max-w-lg">
        <form method="dialog">
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >
            ✕
          </button>
        </form>

        <h3 className="font-bold text-lg mb-2">导入规则</h3>
        <p className="text-sm text-base-content/70 mb-4">
          选择一个规则进行导入，确认后将覆盖当前编辑的内容。
        </p>

        <div className="mt-2">
          <RulesSection
            currentRuleId={selectedRuleId}
            onRuleChange={setSelectedRuleId}
            large={false}
            autoSelectFirst={false}
          />
        </div>

        <div className="modal-action justify-between w-full items-center">
          <div className="min-h-6 text-sm flex items-center">{statusNode}</div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={confirmDisabled}
              onClick={() => {
                if (!ruleQuery.data)
                  return;
                onConfirm(ruleQuery.data);
                onClose();
              }}
            >
              确认
            </button>
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
