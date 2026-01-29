import { TrashIcon } from "@/icons";

export default function RuleDeleteModal({
  isOpen,
  isDeleting,
  ruleName,
  ruleId,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isDeleting: boolean;
  ruleName?: string;
  ruleId?: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen)
    return null;

  const ruleNameText = (ruleName ?? "").trim() || "（未命名规则）";
  const ruleIdText = typeof ruleId === "number" && ruleId > 0 ? `#${ruleId}` : "#";

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          disabled={isDeleting}
          onClick={() => {
            if (isDeleting)
              return;
            onCancel();
          }}
        >
          ✕
        </button>

        <h3 className="font-bold text-lg mb-2">
          删除规则
        </h3>

        <div className="text-sm text-base-content/70 space-y-2">
          <p>
            你将要删除：
            <span className="font-semibold text-base-content">{ruleNameText}</span>
            <span className="ml-2 text-base-content/60">
              (
              {ruleIdText}
              )
            </span>
          </p>
          <p>
            删除后将无法恢复，且影响引用该规则的角色创建/显示。
          </p>
        </div>

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isDeleting}
            onClick={() => {
              if (isDeleting)
                return;
              onCancel();
            }}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-error"
            disabled={isDeleting}
            onClick={() => {
              if (isDeleting)
                return;
              onConfirm();
            }}
          >
            {isDeleting
              ? (
                  <span className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-xs" />
                    正在删除…
                  </span>
                )
              : (
                  <span className="flex items-center gap-2">
                    <TrashIcon className="w-4 h-4" />
                    确认删除
                  </span>
                )}
          </button>
        </div>
      </div>

      {/* 非 loading 允许点击遮罩关闭；loading 禁止关闭 */}
      <form method="dialog" className={`modal-backdrop ${isDeleting ? "cursor-default" : ""}`}>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => {
            if (isDeleting)
              return;
            onCancel();
          }}
        >
          close
        </button>
      </form>
    </dialog>
  );
}
