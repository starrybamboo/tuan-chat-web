import { useState } from "react";

export type WorkflowConditionEditorProps = {
  initialValue: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export default function WorkflowConditionEditor({
  initialValue,
  onCancel,
  onConfirm,
}: WorkflowConditionEditorProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[24vh] max-w-sm flex-col p-4">
      <h3 className="mb-4 text-center text-lg font-bold">是否确认修改条件？</h3>
      <div className="mb-4 flex flex-1 items-center justify-center">
        <div className="w-full">
          <label htmlFor="workflow-condition-input" className="
            mb-2 block text-center text-sm font-medium text-base-content/70
          ">修改后的工作流条件：</label>
          <input
            id="workflow-condition-input"
            type="text"
            autoComplete="off"
            aria-label="修改后的工作流条件"
            className="
              w-full rounded-md border border-base-300 bg-base-100 px-3 py-2
              text-sm transition
              focus:border-info focus:outline-none focus:ring-2
              focus:ring-info/20
            "
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="请输入修改后的条件"
          />
          <p className="mt-1 text-xs text-base-content/60">
            填写触发条件表达式
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="
            rounded-md border border-base-300 px-3 py-2 text-sm font-medium
            text-base-content transition
            hover:bg-base-200
          "
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="
            rounded-md bg-info px-3 py-2 text-sm font-medium
            text-info-content transition
            hover:bg-info/90
          "
          onClick={() => onConfirm(value)}
        >
          确认提交
        </button>
      </div>
    </div>
  );
}
