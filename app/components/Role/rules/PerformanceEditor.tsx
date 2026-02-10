import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/utils/getScreenSize";
import { getGridSpan, getGridSpanMobile } from "@/utils/gridSpan";

import AddFieldForm from "../Editors/AddFieldForm";
import PerformanceField from "../Editors/PerformanceField";

interface PerformanceEditorProps {
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  abilityData: Record<string, string>;
  roleId: number;
  ruleId: number;
  isEditing?: boolean;
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
  isEditing: controlledIsEditing,
}: PerformanceEditorProps) {
  // 接入api
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityByRoleIdMutation();
  const { mutate: updateKeyField } = useUpdateKeyFieldByRoleIdMutation();
  // 是否编辑
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isEditingControlled = typeof controlledIsEditing === "boolean";
  const isEditing = isEditingControlled ? controlledIsEditing : internalIsEditing;
  const prevIsEditingRef = useRef(isEditing);
  // 是否移动端
  const isMobile = useIsMobile();

  const longFieldKeys = [""];
  const shortFields = Object.keys(abilityData || fields)
    .filter(key => key !== "携带物品" && !longFieldKeys.includes(key));

  const handleSaveAndExit = useCallback(() => {
    setIsTransitioning(true);
    const updateData = {
      roleId,
      ruleId,
      act: fields,
      ability: {}, // 表演编辑器不修改能力字段，传空对象
    };
    updateFiledAbility(updateData, {
      onSuccess: () => {
        setTimeout(() => {
          setInternalIsEditing(false);
          setIsTransitioning(false);
        }, 300);
      },
      onError: () => {
        setIsTransitioning(false);
      },
    });
  }, [fields, roleId, ruleId, updateFiledAbility]);

  // 受控编辑模式下：顶部总编辑从开到关时，自动提交表演字段编辑
  useEffect(() => {
    if (!isEditingControlled)
      return;

    const wasEditing = prevIsEditingRef.current;
    if (wasEditing && !isEditing) {
      handleSaveAndExit();
    }
    prevIsEditingRef.current = isEditing;
  }, [handleSaveAndExit, isEditing, isEditingControlled]);

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
    const nextFields = { ...fields };
    delete nextFields[key];
    onChange(nextFields);
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
          基本信息
        </h3>
        {!isEditingControlled && (
          <button
            type="button"
            onClick={isEditing ? handleSaveAndExit : () => setInternalIsEditing(true)}
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
        )}
      </div>

      {/* 表演字段区域 - 响应式布局 */}
      <div
        className="grid gap-4 grid-cols-2 md:grid-cols-4"
        style={{
          gridAutoFlow: "dense",
          gridAutoRows: "minmax(80px, auto)",
        }}
      >
        {shortFields.map((key) => {
          const { colSpan, rowSpan } = isMobile
            ? getGridSpanMobile(fields[key])
            : getGridSpan(fields[key]);

          return (
            <div
              key={key}
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
              }}
            >
              {isEditing
                ? (
                    <PerformanceField
                      fieldKey={key}
                      value={fields[key] || ""}
                      onValueChange={handleValueChange}
                      onDelete={handleDeleteField}
                      onRename={handleRename}
                      placeholder="请输入表演描述..."
                      rowSpan={rowSpan}
                    />
                  )
                : (
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
          );
        })}

        {/* 添加新字段区域 - 占满整行 */}
        {isEditing && (
          <div className="col-span-full">
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
          </div>
        )}
      </div>
    </div>
  );
}
