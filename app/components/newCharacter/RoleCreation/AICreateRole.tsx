import type { Role } from "../types";
import type { CharacterData } from "./types";
import { useGenerateAbilityByRuleMutation, useGenerateBasicInfoByRuleMutation, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useCreateRoleMutation, useUpdateRoleWithLocalMutation, useUploadAvatarMutation } from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import RulesSection from "../rules/RulesSection";
import AIGenerationCard from "./components/AIGenerationCard";
import AttributeEditor from "./components/AttributeEditor";

interface AICreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: CharacterData) => void;
  // 添加状态维护相关的props
  setRoles?: React.Dispatch<React.SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
}

/**
 * AI智能创建角色组件
 * 通过AI辅助，一站式完成角色创建
 */
export default function AICreateRole({
  onBack,
  onComplete,
  setRoles,
  setSelectedRoleId,
  onSave,
}: AICreateRoleProps) {
  // 角色数据状态
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: "",
    description: "",
    avatar: "",
    ruleSystem: "",
    act: {},
    basic: {},
    ability: {},
    skill: {},
  });

  // AI相关状态
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // 表单验证
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 跟踪当前已加载的规则ID，用于检测规则变更
  const [loadedRuleId, setLoadedRuleId] = useState<number>(0);

  // API hooks
  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: generateBasicInfoByRule } = useGenerateBasicInfoByRuleMutation();
  const { mutate: generateAbilityByRule } = useGenerateAbilityByRuleMutation();
  const { mutate: setRoleAbility } = useSetRoleAbilityMutation();
  // 添加更新角色的hook，只有在onSave存在时才使用
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave || (() => {}));

  // 获取规则详情
  const selectedRuleId = characterData.ruleSystem ? Number.parseInt(characterData.ruleSystem) : 0;
  const isValidRuleId = !Number.isNaN(selectedRuleId) && selectedRuleId > 0;
  const { data: ruleDetailData } = useRuleDetailQuery(selectedRuleId, {
    enabled: isValidRuleId, // 只有当 ruleId 有效时才发送请求
  });

  // 常量
  const NAME_MAX = 32;
  const DESC_MAX = 300;

  // 检查是否可以保存
  const canSave = characterData.name.trim()
    && characterData.description.trim()
    && characterData.ruleSystem;

  // 处理规则系统变更
  const handleRuleSystemChange = (ruleSystemId: number) => {
    setCharacterData(prev => ({ ...prev, ruleSystem: ruleSystemId.toString() }));

    // 重置已加载的规则ID，这样可以触发新规则的数据初始化
    setLoadedRuleId(0);

    // 清除错误信息
    if (errors.ruleSystem) {
      setErrors(prev => ({ ...prev, ruleSystem: "" }));
    }
  };

  // 初始化规则数据的回调函数
  const initializeRuleData = useCallback(() => {
    // 当规则有效且规则数据加载完成时，并且（首次加载或规则发生了变更）
    if (isValidRuleId && ruleDetailData && characterData.ruleSystem
      && (loadedRuleId === 0 || loadedRuleId !== selectedRuleId)) {
      // 转换 actTemplate 为正确的类型
      const actData: Record<string, number | string> = {};
      if (ruleDetailData.actTemplate) {
        Object.entries(ruleDetailData.actTemplate).forEach(([key, value]) => {
          actData[key] = value;
        });
      }

      // 处理 basicDefault，新接口返回单层结构的字符串
      const abilityData: Record<string, string> = {};
      if (ruleDetailData.basicDefault) {
        Object.entries(ruleDetailData.basicDefault).forEach(([key, value]) => {
          // 新接口直接返回字符串格式的数值
          abilityData[key] = String(value);
        });
      }

      setCharacterData(prev => ({
        ...prev,
        act: actData,
        ability: abilityData,
      }));

      // 记录已加载的规则ID
      setLoadedRuleId(selectedRuleId);
    }
  }, [isValidRuleId, ruleDetailData, characterData.ruleSystem, loadedRuleId, selectedRuleId]);

  // 当规则数据加载完成时，自动填充默认属性
  useEffect(() => {
    initializeRuleData();
  }, [initializeRuleData]);

  // 处理基础信息变更
  const handleBasicInfoChange = (field: string, value: string) => {
    setCharacterData(prev => ({ ...prev, [field]: value }));

    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // 处理属性变更
  const handleAttributeChange = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
    value: number | string,
  ) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  // AI生成处理
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !characterData.ruleSystem || !isValidRuleId) {
      return;
    }

    setIsGenerating(true);
    setCurrentGenerationStep("开始生成");

    try {
      const ruleId = selectedRuleId; // 使用已验证的 ruleId

      // 生成基础信息 (act)
      setCurrentGenerationStep("生成角色描述...");
      await new Promise((resolve) => {
        generateBasicInfoByRule(
          { ruleId, prompt: aiPrompt },
          {
            onSuccess: (data) => {
              if (data?.data) {
                const actData: Record<string, number | string> = {};
                Object.entries(data.data).forEach(([key, value]) => {
                  actData[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
                });

                setCharacterData(prev => ({
                  ...prev,
                  act: { ...prev.act, ...actData },
                }));
              }
              resolve(data);
            },
            onError: (error) => {
              console.error("生成基础信息失败:", error);
              resolve(null);
            },
          },
        );
      });

      // 生成能力数据 (ability)
      setCurrentGenerationStep("生成能力数据...");
      await new Promise((resolve) => {
        generateAbilityByRule(
          { ruleId, prompt: aiPrompt },
          {
            onSuccess: (data) => {
              if (data?.data) {
                // 新接口返回单层结构，直接处理
                const abilityData: Record<string, string> = {};

                // 直接处理单层数据结构
                Object.entries(data.data).forEach(([key, value]) => {
                  // 新接口直接返回字符串格式的数值
                  abilityData[key] = String(value);
                });

                setCharacterData(prev => ({
                  ...prev,
                  ability: { ...prev.ability, ...abilityData },
                }));
              }
              resolve(data);
            },
            onError: (error) => {
              console.error("生成能力数据失败:", error);
              resolve(null);
            },
          },
        );
      });

      setCurrentGenerationStep("生成完成");
    }
    catch (error) {
      console.error("AI生成失败:", error);
    }
    finally {
      setIsGenerating(false);
      setCurrentGenerationStep("");
    }
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!characterData.name.trim()) {
      newErrors.name = "角色名称不能为空";
    }

    if (!characterData.description.trim()) {
      newErrors.description = "角色描述不能为空";
    }

    if (!characterData.ruleSystem) {
      newErrors.ruleSystem = "请选择规则系统";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存角色
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // 1. 创建角色
      const roleId = await createRole({
        roleName: characterData.name,
        description: characterData.description,
      });

      if (!roleId) {
        throw new Error("角色创建失败");
      }

      // 2. 上传头像 (使用默认头像)
      const avatarRes = await uploadAvatar({
        avatarUrl: "/favicon.ico",
        spriteUrl: "/favicon.ico",
        roleId,
      });

      if (!avatarRes?.data?.avatarId) {
        throw new Error("头像上传失败");
      }

      // 3. 设置角色能力数据
      if (characterData.ruleSystem && isValidRuleId) {
        const ruleId = selectedRuleId; // 使用已验证的 ruleId

        // 转换 act 数据为字符串类型
        const actData: Record<string, string> = {};
        Object.entries(characterData.act).forEach(([key, value]) => {
          actData[key] = String(value);
        });

        // 将数值转换为字符串格式
        const basicData: Record<string, string> = {};
        Object.entries(characterData.ability || {}).forEach(([key, value]) => {
          basicData[key] = String(value);
        });

        setRoleAbility({
          ruleId,
          roleId,
          act: actData,
          basic: basicData,
        });
      }

      // 4. 创建Role对象并维护状态（参考Sidebar的handleCreate）
      const newRole: Role = {
        id: roleId,
        name: characterData.name,
        description: characterData.description,
        avatar: avatarRes.data.avatarUrl || "/favicon.ico",
        avatarId: avatarRes.data.avatarId,
        modelName: "散华", // 默认模型名
        speakerName: "鸣潮", // 默认说话人名
      };

      // 5. 更新角色列表状态（如果提供了setRoles）
      if (setRoles) {
        setRoles(prev => [newRole, ...prev]);
      }

      // 6. 设置选中的角色ID（如果提供了setSelectedRoleId）
      if (setSelectedRoleId) {
        setSelectedRoleId(newRole.id);
      }

      // 7. 调用updateRole进行角色更新（如果提供了onSave）
      if (onSave) {
        updateRole(newRole);
      }

      // 8. 调用完成回调
      onComplete?.({
        ...characterData,
        avatar: avatarRes.data.avatarUrl || "/favicon.ico",
      });
    }
    catch (error) {
      console.error("保存角色失败:", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        {onBack && (
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← 返回
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold">AI智能创建角色</h1>
          <p className="text-base-content/70">
            描述你的想法，AI将帮你创建完整的角色
            {currentGenerationStep && (
              <span className="ml-2 text-primary">
                {currentGenerationStep}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* AI生成卡片 */}

        <AIGenerationCard
          title="描述你的角色想法"
          description="详细描述角色的背景、性格、能力特点，AI会根据描述生成完整的角色信息"
          placeholder="例如：一个来自北方的勇敢战士，擅长双手剑，有着保护弱者的坚定信念，曾经是皇家骑士团的成员..."
          prompt={aiPrompt}
          isGenerating={isGenerating}
          onPromptChange={setAiPrompt}
          onGenerate={handleAIGenerate}
        />

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：规则选择 */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-sm rounded-2xl border-2 border-base-content/10">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">⚙️ 规则系统</h3>
                <RulesSection
                  currentRuleId={selectedRuleId}
                  onRuleChange={handleRuleSystemChange}
                />
                {errors.ruleSystem && (
                  <div className="text-error text-sm mt-2">{errors.ruleSystem}</div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：基础信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基础信息 */}
            <div className="card bg-base-100 shadow-sm rounded-2xl border-2 border-base-content/10">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">📝 基础信息</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 头像上传 */}
                  {/* <div className="md:col-span-2">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色头像</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 border-2 border-dashed border-base-content/20 rounded-md flex items-center justify-center">
                        <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className="text-sm text-base-content/60">
                        点击上传或拖拽图片到此处
                        <br />
                        支持 JPG、PNG 格式
                      </div>
                    </div>
                    <div className="text-xs text-base-content/60 mt-2">
                      支持多种表情和姿态的差分图片
                    </div>
                  </div> */}

                  {/* 角色名 */}
                  <div className="form-control">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色名称</span>
                      <span className="label-text-alt text-base-content/60">
                        {characterData.name.length}
                        /
                        {NAME_MAX}
                      </span>
                    </div>
                    <input
                      type="text"
                      className={`input input-bordered rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.name ? "input-error" : ""}`}
                      placeholder="输入角色名称"
                      value={characterData.name}
                      maxLength={NAME_MAX}
                      onChange={e => handleBasicInfoChange("name", e.target.value)}
                    />
                    {errors.name && (
                      <div className="text-error text-sm mt-1">{errors.name}</div>
                    )}
                  </div>

                  {/* 角色描述 */}
                  <div className="form-control md:col-span-2">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色描述</span>
                      <span className="label-text-alt text-base-content/60">
                        {characterData.description.length}
                        /
                        {DESC_MAX}
                      </span>
                    </div>
                    <textarea
                      className={`textarea textarea-bordered rounded-md min-h-[120px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.description ? "textarea-error" : ""}`}
                      placeholder="描述角色的背景故事、性格特点、外貌特征等..."
                      value={characterData.description}
                      maxLength={DESC_MAX}
                      onChange={e => handleBasicInfoChange("description", e.target.value)}
                    />
                    {errors.description && (
                      <div className="text-error text-sm mt-1">{errors.description}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 角色属性 - 只有在选择规则系统后才显示 */}
        {characterData.ruleSystem && (
          <>
            <div className="divider"></div>
            <div className="space-y-6">
              {/* 角色表演能力 */}
              <AttributeEditor
                title="角色表演能力"
                attributes={characterData.act}
                onChange={(key, value) => handleAttributeChange("act", key, value)}
              />

              {/* 基础能力值 */}
              <AttributeEditor
                title="基础能力值"
                attributes={characterData.basic}
                onChange={(key, value) => handleAttributeChange("basic", key, value)}
              />

              {/* 计算能力值 */}
              <AttributeEditor
                title="计算能力值"
                attributes={characterData.ability}
                onChange={(key, value) => handleAttributeChange("ability", key, value)}
              />

              {/* 技能设定 */}
              <AttributeEditor
                title="技能设定"
                attributes={characterData.skill}
                onChange={(key, value) => handleAttributeChange("skill", key, value)}
              />
            </div>
          </>
        )}

        {/* 底部操作按钮 */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-base-content/60">
            {canSave ? "角色信息完整，可以保存" : "请完善必填信息"}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setCharacterData({
                  name: "",
                  description: "",
                  avatar: "",
                  ruleSystem: "",
                  act: {},
                  basic: {},
                  ability: {},
                  skill: {},
                });
                setAiPrompt("");
                setErrors({});
              }}
            >
              重置
            </button>
            <button
              type="button"
              className={`btn btn-primary ${!canSave || isSaving ? "btn-disabled" : ""}`}
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving
                ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      保存中...
                    </>
                  )
                : (
                    "保存角色"
                  )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
