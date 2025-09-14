import { useUpdateKeyFieldMutation, useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useEffect, useState } from "react";
import AddFieldForm from "../shared/AddFieldForm";
import EditableField from "../shared/EditableField";

// Type for numerical data - flat structure
type NumericalData = Record<string, string>;

// 字段类型枚举
type FieldType = "basic" | "ability" | "skill";

interface NumericalEditorProps {
  data: NumericalData;
  onChange: (data: NumericalData) => void;
  abilityId: number;
  title?: string;
  fieldType: FieldType; // 新增：指定要更新的字段类型
}

/**
 * 数值编辑器组件
 * 用于渲染和编辑数值数据的通用组件
 */
export default function NumericalEditor({
  data,
  onChange,
  abilityId,
  title = "数值数据",
  fieldType,
}: NumericalEditorProps) {
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityMutation();
  const { mutate: updateKeyField } = useUpdateKeyFieldMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // 处理字段值更新
  const handleExitEditing = () => {
    setIsTransitioning(true);

    // 更新前端状态
    onChange(localData);

    // 数据本身就是字符串格式，直接使用

    // 根据字段类型构建更新对象
    const updatedAbility: any = {
      abilityId,
    };

    // 根据fieldType设置对应的字段
    switch (fieldType) {
      case "basic":
        updatedAbility.basic = localData;
        break;
      case "ability":
        updatedAbility.ability = localData;
        break;
      case "skill":
        updatedAbility.skill = localData;
        break;
    }

    updateFiledAbility(updatedAbility, {
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
  };

  // 处理字段值更新
  const handleFieldUpdate = (fieldKey: string, newValue: string) => {
    const updatedData = {
      ...localData,
      [fieldKey]: newValue,
    };
    setLocalData(updatedData);
  };

  // 添加新字段
  const handleAddField = (newFieldKey: string, newFieldValue: string) => {
    const updatedData = {
      ...localData,
      [newFieldKey]: newFieldValue,
    };
    setLocalData(updatedData);

    // 使用 API 更新字段 (根据 AbilityFieldUpdateRequest 定义)
    const fieldUpdateRequest = {
      abilityId,
      // 根据字段类型使用对应的字段
      ...(fieldType === "basic" && { basicFields: { [newFieldKey]: newFieldValue } }),
      ...(fieldType === "ability" && { abilityFields: { [newFieldKey]: newFieldValue } }),
      ...(fieldType === "skill" && { skillFields: { [newFieldKey]: newFieldValue } }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  // 删除字段
  const handleDeleteField = (fieldKey: string) => {
    const updatedData = { ...localData };
    delete updatedData[fieldKey];
    setLocalData(updatedData);

    // 使用 API 删除字段（传 null 表示删除）
    const fieldUpdateRequest = {
      abilityId,
      // 根据字段类型使用对应的字段
      ...(fieldType === "basic" && { basicFields: { [fieldKey]: null as any } }),
      ...(fieldType === "ability" && { abilityFields: { [fieldKey]: null as any } }),
      ...(fieldType === "skill" && { skillFields: { [fieldKey]: null as any } }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  // 修改字段名
  const handleRenameField = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in localData) {
      return; // 新字段名不能为空、相同或重复
    }

    const value = localData[oldKey];
    const updatedData = { ...localData };
    delete updatedData[oldKey];
    updatedData[newKey] = value;
    setLocalData(updatedData);

    // 删除旧字段，添加新字段
    const fieldUpdateRequest = {
      abilityId,
      // 根据字段类型使用对应的字段
      ...(fieldType === "basic" && {
        basicFields: {
          [oldKey]: null as any, // 删除旧字段，类型断言因为API支持null
          [newKey]: String(value), // 添加新字段
        },
      }),
      ...(fieldType === "ability" && {
        abilityFields: {
          [oldKey]: null as any,
          [newKey]: String(value),
        },
      }),
      ...(fieldType === "skill" && {
        skillFields: {
          [oldKey]: null as any,
          [newKey]: String(value),
        },
      }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };
  return (
    <div className={`space-y-6 bg-base-200 rounded-lg p-4 duration-300 transition-opacity ${
      isTransitioning ? "opacity-50" : ""
    } ${isEditing ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="card-title text-lg flex items-center gap-2 ml-1">
          ⚡
          {title}
        </h3>
        <button
          type="button"
          onClick={isEditing ? handleExitEditing : () => setIsEditing(true)}
          className={`btn btn-sm ${isEditing ? "btn-primary" : "btn-accent"
          } ${isTransitioning ? "scale-95" : ""
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

      <div className="bg-base-200 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Object.entries(localData).map(([key, value]) => (
            <EditableField
              key={key}
              fieldKey={key}
              value={value}
              isEditing={isEditing}
              onValueChange={handleFieldUpdate}
              onDelete={handleDeleteField}
              onRename={handleRenameField}
              className={isEditing ? "form-control" : "flex flex-col gap-1 flex-shrink-0"}
            />
          ))}

          {/* 添加新字段区域 */}
          {isEditing && (
            <div className="col-span-full">
              <AddFieldForm
                onAddField={handleAddField}
                existingKeys={Object.keys(localData)}
                layout="inline"
                className="col-span-full pt-2 mt-2"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
