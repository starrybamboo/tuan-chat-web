import { Suspense, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import { useGlobalContext } from "@/components/globalContextProvider";
import RulesSection from "@/components/Role/rules/RulesSection";

export default function RuleEditorEntryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { userId } = useGlobalContext();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog)
      return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        }
        catch {
          // Fallback for environments where showModal might throw.
          dialog.setAttribute("open", "");
        }
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen)
    return null;

  const handleCreate = () => {
    navigate("/role?type=rule");
    onClose();
  };

  const handleEdit = (ruleId: number) => {
    navigate(`/role?type=rule&ruleId=${ruleId}`);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={(e) => {
        // Ensure ESC triggers React state close instead of leaving it open.
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        // Only notify parent when user closes the dialog.
        if (isOpen)
          onClose();
      }}
    >
      <div className="modal-box max-w-2xl p-4">
        <form method="dialog">
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >
            ✕
          </button>
        </form>

        <h3 className="font-bold text-lg">规则编辑器</h3>

        <div className="mt-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">新建</h4>
            </div>
            <button
              type="button"
              className="w-full text-left card bg-base-100 border-3 border-dashed border-base-300 hover:bg-base-200/60 transition-all cursor-pointer"
              onClick={handleCreate}
            >
              <div className="card-body p-4">
                <div className="font-semibold">新建自定义规则</div>
              </div>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">编辑我的规则</h4>
            </div>

            <Suspense
              fallback={(
                <div className="flex items-center gap-2 text-sm text-base-content/60 py-6">
                  <span className="loading loading-spinner loading-sm" />
                  正在加载规则列表…
                </div>
              )}
            >
              <RulesSection
                large={false}
                currentRuleId={0}
                autoSelectFirst={false}
                authorId={typeof userId === "number" && userId > 0 ? userId : undefined}
                onRuleChange={handleEdit}
              />
            </Suspense>
          </div>
        </div>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop cursor-default">
        <button type="button" className="cursor-default" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
