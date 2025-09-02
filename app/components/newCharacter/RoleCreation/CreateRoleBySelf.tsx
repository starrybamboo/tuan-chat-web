import { useState } from "react";

interface CharacterData {
  // 基础信息
  name: string;
  description: string;
  avatar: string;
  // 规则和能力
  ruleSystem: string;
  act: Record<string, number>;
  basic: Record<string, number>;
  ability: Record<string, number>;
  skill: Record<string, number>;
}

const RULE_SYSTEMS = [
  { id: "dnd5e", name: "D&D 5E", description: "龙与地下城第五版" },
  { id: "coc7e", name: "CoC 7E", description: "克苏鲁的呼唤第七版" },
  { id: "pathfinder", name: "Pathfinder", description: "探索者规则" },
  { id: "custom", name: "自定义", description: "自定义规则系统" },
];

const SAMPLE_ATTRIBUTES = {
  dnd5e: {
    basic: { 力量: 10, 敏捷: 10, 体质: 10, 智力: 10, 感知: 10, 魅力: 10 },
    ability: { 生命值: 8, 护甲等级: 10, 先攻: 0, 速度: 30 },
    skill: { 运动: 0, 欺骗: 0, 历史: 0, 洞察: 0, 调查: 0, 医药: 0 },
    act: { 表演: 0, 说服: 0, 威吓: 0, 欺骗: 0 },
  },
  coc7e: {
    basic: { 力量: 50, 体质: 50, 体型: 50, 敏捷: 50, 外貌: 50, 智力: 50, 意志: 50, 教育: 50 },
    ability: { 生命值: 10, 魔法值: 10, 理智值: 50, 幸运: 50 },
    skill: { 会计: 5, 人类学: 1, 估价: 5, 考古学: 1, 魅惑: 15, 攀爬: 20 },
    act: { 表演: 5, 话术: 5, 心理学: 10, 恐吓: 15 },
  },
};

export default function CreateRoleBySelf({ onBack }: { onBack?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const steps = [
    { id: 1, title: "基础信息", icon: "👤" },
    { id: 2, title: "选择规则", icon: "⚙️" },
    { id: 3, title: "角色表演", icon: "🎭" },
    { id: 4, title: "基础能力", icon: "⚡" },
    { id: 5, title: "计算能力", icon: "📊" },
    { id: 6, title: "技能设定", icon: "📚" },
  ];

  const handleAIGenerate = async (section: string) => {
    setIsGenerating(true);
    // 模拟AI生成
    setTimeout(() => {
      if (section === "basic-info") {
        setCharacterData(prev => ({
          ...prev,
          name: "艾莉娅·暗影行者",
          description: "一位来自精灵王国的神秘刺客，擅长潜行和暗杀技巧，背负着复仇的使命。",
        }));
      }
      else if (section === "attributes" && characterData.ruleSystem) {
        const sampleData = SAMPLE_ATTRIBUTES[characterData.ruleSystem as keyof typeof SAMPLE_ATTRIBUTES];
        if (sampleData) {
          setCharacterData(prev => ({
            ...prev,
            ...sampleData,
          }));
        }
      }
      setIsGenerating(false);
    }, 2000);
  };

  const handleRuleSystemChange = (ruleSystem: string) => {
    setCharacterData(prev => ({ ...prev, ruleSystem }));
    // 自动加载该规则系统的默认属性
    const sampleData = SAMPLE_ATTRIBUTES[ruleSystem as keyof typeof SAMPLE_ATTRIBUTES];
    if (sampleData) {
      setCharacterData(prev => ({
        ...prev,
        ...sampleData,
      }));
    }
  };

  const renderAttributeEditor = (
    title: string,
    attributes: Record<string, number>,
    onChange: (key: string, value: number) => void,
    section: string,
    aiPromptPlaceholder: string,
  ) => (
    <div className="space-y-6">
      {/* AI生成卡片 */}
      <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-dashed border-purple-300">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI智能生成
                {" "}
                {title}
              </h3>
              <p className="text-sm text-base-content/70">让AI为你快速生成合理的数值配置</p>
            </div>
          </div>
          <div className="space-y-3">
            <textarea
              className="textarea textarea-bordered w-full min-h-[80px] bg-white/80"
              placeholder={aiPromptPlaceholder}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1 bg-gradient-to-r from-purple-500 to-pink-500 border-none"
                onClick={() => handleAIGenerate(section)}
                disabled={isGenerating}
              >
                {isGenerating
                  ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        AI生成中...
                      </>
                    )
                  : (
                      <>
                        ✨ AI智能生成
                      </>
                    )}
              </button>
              <button type="button" className="btn btn-outline">
                📊 Excel导入
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 属性编辑器 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg flex items-center gap-2">
            ⚡
            {" "}
            {title}
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {Object.entries(attributes).map(([key, value]) => (
              <div key={key} className="form-control">
                <label className="label">
                  <span className="label-text">{key}</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={value}
                  onChange={e => onChange(key, Number.parseInt(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2">
                  👤 基础信息设置
                </h3>

                {/* AI生成卡片 */}
                <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-purple-300 mt-6">
                  <div className="card-body">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-xl">🤖</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          AI智能生成角色
                        </h4>
                        <p className="text-base-content/70">描述你的想法，AI将为你创造独特的角色</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <textarea
                        className="textarea textarea-bordered w-full min-h-[100px] bg-white/80"
                        placeholder="描述你想要的角色，例如：一个勇敢的精灵战士，擅长弓箭，有着神秘的过去..."
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="btn btn-primary flex-1 bg-gradient-to-r from-purple-500 to-pink-500 border-none font-semibold"
                          onClick={() => handleAIGenerate("basic-info")}
                          disabled={isGenerating}
                        >
                          {isGenerating
                            ? (
                                <>
                                  <span className="loading loading-spinner loading-sm"></span>
                                  AI创造中...
                                </>
                              )
                            : (
                                <>
                                  ✨ AI智能生成
                                </>
                              )}
                        </button>
                        <button type="button" className="btn btn-outline">
                          📊 Excel导入
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                {/* 头像上传 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">角色头像</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📷</span>
                    </div>
                    <button type="button" className="btn btn-outline">
                      📤 上传立绘差分
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt">支持多种表情和姿态的差分图片</span>
                  </label>
                </div>

                {/* 角色名 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">角色名</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    placeholder="输入角色名称"
                    value={characterData.name}
                    onChange={e => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* 角色简介 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">角色简介</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="描述角色的背景故事、性格特点等"
                    value={characterData.description}
                    onChange={e => setCharacterData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2">
                  ⚙️ 选择规则系统
                </h3>
                <div className="grid gap-4 mt-4">
                  {RULE_SYSTEMS.map(rule => (
                    <div
                      key={rule.id}
                      className={`card cursor-pointer transition-all ${characterData.ruleSystem === rule.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:bg-base-200"
                      }`}
                      onClick={() => handleRuleSystemChange(rule.id)}
                    >
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{rule.name}</h4>
                            <p className="text-sm text-base-content/70">{rule.description}</p>
                          </div>
                          {characterData.ruleSystem === rule.id && (
                            <div className="badge badge-primary">已选择</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {renderAttributeEditor(
              "角色表演能力",
              characterData.act,
              (key, value) =>
                setCharacterData(prev => ({
                  ...prev,
                  act: { ...prev.act, [key]: value },
                })),
              "act",
              "描述角色的表演风格，例如：一个充满魅力的吟游诗人，擅长说服和欺骗...",
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {renderAttributeEditor(
              "基础能力值",
              characterData.basic,
              (key, value) =>
                setCharacterData(prev => ({
                  ...prev,
                  basic: { ...prev.basic, [key]: value },
                })),
              "basic",
              "描述角色的身体素质和天赋，例如：一个敏捷的刺客，力量中等但速度极快...",
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {renderAttributeEditor(
              "计算能力值",
              characterData.ability,
              (key, value) =>
                setCharacterData(prev => ({
                  ...prev,
                  ability: { ...prev.ability, [key]: value },
                })),
              "ability",
              "描述角色的战斗表现，例如：一个坚韧的战士，生命值高，护甲厚重...",
            )}
            <div className="alert alert-info">
              <span>💡 这些数值通常根据基础能力自动计算，你也可以手动调整</span>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            {renderAttributeEditor(
              "技能设定",
              characterData.skill,
              (key, value) =>
                setCharacterData(prev => ({
                  ...prev,
                  skill: { ...prev.skill, [key]: value },
                })),
              "skill",
              "描述角色的专业技能，例如：一个博学的法师，精通奥秘知识和历史...",
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleComplete = () => {
    // Character creation completed
    // 这里可以添加保存逻辑或跳转到展示页面
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部导航 */}
      <div className="flex items-center gap-4 mb-8">
        {onBack && (
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← 返回
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold">逐步自主创建</h1>
          <p className="text-base-content/70">手动填写角色信息，完全自定义角色的每一个细节</p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="card bg-base-100 shadow-sm mb-8">
        <div className="card-body p-4">
          <ul className="steps steps-horizontal w-full">
            {steps.map(step => (
              <li
                key={step.id}
                className={`step ${currentStep >= step.id ? "step-primary" : ""}`}
                data-content={step.icon}
              >
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="mb-8">{renderStepContent()}</div>

      {/* 底部按钮 */}
      <div className="flex justify-between">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          ← 上一步
        </button>
        {currentStep < steps.length
          ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                disabled={currentStep === 2 && !characterData.ruleSystem}
              >
                下一步 →
              </button>
            )
          : (
              <button
                type="button"
                className="btn btn-success bg-gradient-to-r from-green-500 to-emerald-500 border-none"
                onClick={handleComplete}
              >
                完成创建 ✨
              </button>
            )}
      </div>
    </div>
  );
}
