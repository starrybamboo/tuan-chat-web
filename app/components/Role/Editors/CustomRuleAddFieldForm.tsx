import { useId, useState } from "react";

interface CustomRuleAddFieldFormProps {
  title?: string;
  onAddField: (key: string, value: string) => void;
}

/**
 * 添加字段表单组件
 * 提供统一的添加新字段界面
 */
export default function CustomRuleAddFieldForm({
  title = "添加字段",
  onAddField,
}: CustomRuleAddFieldFormProps) {
  const formId = useId();
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const canSubmit = !!newFieldKey.trim();

  const submit = () => {
    const key = newFieldKey.trim();
    if (!key) {
      return;
    }
    onAddField(key, newFieldValue);
    setNewFieldKey("");
    setNewFieldValue("");
  };
  return (
    <div className="pt-4">
      <span className="text-sm text-base-content/50 mb-2 block">{title}</span>

      <label className="input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none">
        <input
          id={`${formId}-key`}
          type="text"
          value={newFieldKey}
          placeholder="字段名"
          className="text-sm font-medium bg-transparent border-none focus:outline-none outline-none w-24 shrink-0"
          onChange={e => setNewFieldKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="w-px h-4 bg-base-content/20"></div>
        <input
          id={`${formId}-value`}
          type="text"
          value={newFieldValue}
          placeholder="字段值"
          className="grow focus:outline-none border-none outline-none"
          onChange={e => setNewFieldValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn btn-xs btn-primary"
          title="添加字段"
        >
          ✓ 添加
        </button>
      </label>
    </div>
  );
}
