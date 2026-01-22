import type { Rule } from "api/models/Rule";
import { useDebounce } from "ahooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";

function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed)
    return null;

  const num = Number(trimmed);
  if (!Number.isFinite(num))
    return null;
  if (!Number.isInteger(num))
    return null;
  if (num <= 0)
    return null;

  return num;
}

export default function RuleCloneModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rule: Rule) => void;
}) {
  const [ruleIdText, setRuleIdText] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setRuleIdText("");
    }
  }, [isOpen]);

  const parsedRuleId = useMemo(() => parsePositiveInt(ruleIdText), [ruleIdText]);
  const debouncedRuleId = useDebounce(parsedRuleId ?? 0, { wait: 300 });

  const ruleQuery = useRuleDetailQuery(debouncedRuleId, {
    enabled: isOpen && debouncedRuleId > 0,
  });

  const isRequestingName = ruleQuery.isFetching || ruleQuery.isLoading;
  const hasValidRule = ruleQuery.isSuccess && !!ruleQuery.data;

  const confirmDisabled = !hasValidRule || isRequestingName;

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

        <h3 className="font-bold text-lg mb-2">克隆/导入规则</h3>
        <p className="text-sm text-base-content/70 mb-4">
          输入规则ID后会拉取对应规则，并在确认后覆盖当前编辑内容。
        </p>

        <div className="form-control">
          <label className="label">
            <span className="label-text">规则ID</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            className="input input-bordered rounded-md w-full mt-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="例如：1"
            value={ruleIdText}
            onChange={e => setRuleIdText(e.target.value)}
          />
        </div>

        <div className="mt-3 min-h-6 text-sm">
          {parsedRuleId == null
            ? (
                <span className="text-base-content/60">请输入有效的规则ID</span>
              )
            : isRequestingName
              ? (
                  <span className="flex items-center gap-2 text-base-content/60">
                    <span className="loading loading-spinner loading-xs" />
                    正在获取规则名称…
                  </span>
                )
              : hasValidRule
                ? (
                    <span className="text-base-content/80">
                      规则名称：
                      <span className="font-semibold">{ruleQuery.data.ruleName || "（未命名）"}</span>
                    </span>
                  )
                : (
                    <span className="text-warning">未找到/请求失败</span>
                  )}
        </div>

        <div className="modal-action">
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

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
