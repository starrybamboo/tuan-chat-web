import AddFieldForm from "../../shared/AddFieldForm";
import EditableField from "../../shared/EditableField";
import PerformanceField from "../../shared/PerformanceField";

interface AttributeEditorProps {
  title: string;
  attributes: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onAddField?: (key: string, value: string) => void;
  onDeleteField?: (key: string) => void;
  onRenameField?: (oldKey: string, newKey: string) => void;
}

export default function AttributeEditor({
  title,
  attributes,
  onChange,
  onAddField,
  onDeleteField,
  onRenameField,
}: AttributeEditorProps) {
  // 添加新字段
  const handleAddField = (key: string, value: string) => {
    onAddField?.(key, value);
  };

  // 删除字段
  const handleDeleteField = (fieldKey: string) => {
    onDeleteField?.(fieldKey);
  };

  // 修改字段名
  const handleRenameField = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in attributes) {
      return; // 新字段名不能为空、相同或重复
    }
    onRenameField?.(oldKey, newKey);
  };
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h3 className="card-title text-lg flex items-center gap-2">
          ⚡
          {title}
        </h3>

        {title === "角色表演能力"
          ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {Object.entries(attributes).map(([key, value]) => (
                  <PerformanceField
                    key={key}
                    fieldKey={key}
                    value={value}
                    onValueChange={onChange}
                    onDelete={handleDeleteField}
                    onRename={handleRenameField}
                    placeholder="请输入表演描述..."
                  />
                ))}

                {/* 添加新表演字段 */}
                <div className="form-control w-full">
                  <AddFieldForm
                    onAddField={handleAddField}
                    existingKeys={Object.keys(attributes)}
                    layout="stacked"
                    title="添加新表演字段"
                    placeholder={{
                      key: "字段名（如：性格特点、背景故事等）",
                      value: "请输入表演描述...",
                    }}
                  />
                </div>
              </div>
            )
          : (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(attributes).map(([key, value]) => (
                    <EditableField
                      key={key}
                      fieldKey={key}
                      value={value}
                      isEditing={true}
                      onValueChange={onChange}
                      onDelete={handleDeleteField}
                      onRename={handleRenameField}
                    />
                  ))}
                </div>

                {/* 添加新数值字段 */}
                <AddFieldForm
                  onAddField={handleAddField}
                  existingKeys={Object.keys(attributes)}
                  layout="inline"
                  title="添加新字段"
                  placeholder={{
                    key: "字段名",
                    value: "字段值",
                  }}
                />
              </div>
            )}
      </div>
    </div>
  );
}
