import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import { useState } from "react";
import AddFieldForm from "../shared/AddFieldForm";
import PerformanceField from "../shared/PerformanceField";

interface PerformanceEditorProps {
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  abilityData: Record<string, string>;
  roleId: number;
  ruleId: number;
}

/**
 * 表演字段编辑器组件
 * 负责管理角色的表演相关字段，如性别、年龄、背景故事等
 * 展示方式被划分为了 短字段、长字段和携带物品 三种不同的展示方式
 */
export default function PerformanceEditor({
  fields,
  onChange,
  abilityData,
  roleId,
  ruleId,
}: PerformanceEditorProps) {
  // 接入api
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityByRoleIdMutation();
  const { mutate: updateKeyField } = useUpdateKeyFieldByRoleIdMutation();
  // 是否编辑
  const [isEditing, setIsEditing] = useState(false);
  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  const longFieldKeys = [""];
  const shortFields = Object.keys(abilityData || fields)
    .filter(key => key !== "携带物品" && !longFieldKeys.includes(key));

  // 处理编辑模式切换
  const handleEditToggle = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
    else {
      setIsTransitioning(true);
      // 保存更改
      const updateData = {
        roleId,
        ruleId,
        act: fields,
        ability: {}, // 表演编辑器不修改能力字段，传空对象
      };
      updateFiledAbility(updateData, {
        onSuccess: () => {
          setTimeout(() => {
            setIsEditing(false);
            setIsTransitioning(false);
          }, 300);
        },
        onError: () => {
          setIsTransitioning(false);
        },
      });
    }
  };

  const handleDeleteField = (key: string) => {
    updateKeyField(
      {
        ruleId,
        roleId,
        actFields: {
          [key]: "",
        },
        abilityFields: {},
      },
    );
    delete fields[key];
    onChange(fields);
  };

  const handleAddField = (key: string, value: string) => {
    if (key.trim()) {
      onChange({ ...fields, [key.trim()]: value });
    }
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  const handleRename = (oldKey: string, newKey: string) => {
    const newFields = { ...fields };
    newFields[newKey] = newFields[oldKey];
    delete newFields[oldKey];
    onChange(newFields);
  };

  return (
    <div className={`space-y-6 bg-base-200 rounded-lg p-4 transition-opacity duration-300 ${
      isTransitioning ? "opacity-50" : ""
    } ${
      isEditing ? "ring-2 ring-primary" : ""
    }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="card-title text-lg flex items-center gap-2 ml-1">
          ⚡
          基本信息
        </h3>
        <button
          type="button"
          onClick={handleEditToggle}
          className={`btn btn-sm ${
            isEditing ? "btn-primary" : "btn-accent"
          } ${
            isTransitioning ? "scale-95" : ""
          }`}
          disabled={isTransitioning}
        >
          {isTransitioning
            ? (
                <span className="loading loading-spinner loading-xs"></span>
              )
            : isEditing
              ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    保存
                  </span>
                )
              : (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    编辑
                  </span>
                )}
        </button>
      </div>

      {/* 表演字段区域 - 多列排布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shortFields.map(key => (
          <div key={key}>
            {isEditing
              ? (
                  <PerformanceField
                    fieldKey={key}
                    value={fields[key] || ""}
                    onValueChange={handleValueChange}
                    onDelete={handleDeleteField}
                    onRename={handleRename}
                    placeholder="请输入表演描述..."
                  />
                )
              : (
                  // 非编辑模式下的UI
                  <div className="card bg-base-100 shadow-sm p-2 h-full">
                    <div className="divider">{key}</div>
                    <div className="text-base-content mt-0.5 flex justify-center p-2">
                      <div className="text-left break-all">
                        {fields[key] || <span className="text-base-content/50">未设置</span>}
                      </div>
                    </div>
                  </div>
                )}
          </div>
        ))}

        {/* 添加新字段区域 - 作为grid的一部分 */}
        {isEditing && (
          <AddFieldForm
            onAddField={handleAddField}
            existingKeys={shortFields}
            layout="stacked"
            placeholder={{
              key: "字段名（如：性格特点、背景故事等）",
              value: "请输入表演描述...",
            }}
            title="添加新表演字段"
            showTitle={true}
          />
        )}
      </div>
    </div>
  );
}
