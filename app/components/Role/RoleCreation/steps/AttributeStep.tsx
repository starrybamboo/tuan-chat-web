import AttributeEditor from "./AttributeEditor";

interface AttributeStepProps {
  title: string;
  attributes: Record<string, string>;
  showInfoAlert?: boolean;
  onAttributeChange: (key: string, value: string) => void;
  onAddField?: (key: string, value: string) => void;
  onDeleteField?: (key: string) => void;
  onRenameField?: (oldKey: string, newKey: string) => void;
}

export default function AttributeStep({
  title,
  attributes,
  showInfoAlert = false,
  onAttributeChange,
  onAddField,
  onDeleteField,
  onRenameField,
}: AttributeStepProps) {
  return (
    <div className="space-y-6 bg-base-100 p-4 rounded-lg">
      <AttributeEditor
        title={title}
        attributes={attributes}
        onChange={onAttributeChange}
        onAddField={onAddField}
        onDeleteField={onDeleteField}
        onRenameField={onRenameField}
      />

      {showInfoAlert && (
        <div className="alert alert-info">
          <span>💡 这些数值通常根据基础能力自动计算，你也可以手动调整</span>
        </div>
      )}
    </div>
  );
}
