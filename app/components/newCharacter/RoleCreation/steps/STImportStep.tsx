import type { CharacterData } from "../types";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface STImportStepProps {
  ruleId: number;
  characterData: CharacterData;
  onImportSuccess: (importedData: Partial<CharacterData>) => void;
}

export default function STImportStep({ characterData, onImportSuccess }: STImportStepProps) {
  const [commandInput, setCommandInput] = useState("");

  const ABILITY_MAP: { [key: string]: string } = {
    str: "力量",
    dex: "敏捷",
    pow: "意志",
    con: "体质",
    app: "外貌",
    edu: "教育",
    siz: "体型",
    int: "智力",
    san值: "san",
    luck: "幸运",
    魔法: "mp",
    体力: "hp",
    cm: "克苏鲁神话",
  };

  // 收集所有可识别的字段
  const getAllRecognizableFields = () => {
    const fields = new Set<string>();

    // 添加ABILITY_MAP中的所有中文和英文
    Object.entries(ABILITY_MAP).forEach(([en, zh]) => {
      fields.add(zh);
      fields.add(en.toUpperCase());
    });

    // 添加characterData中已有的字段
    Object.keys(characterData.skill || {}).forEach(key => fields.add(key));
    Object.keys(characterData.basic || {}).forEach(key => fields.add(key));
    Object.keys(characterData.ability || {}).forEach(key => fields.add(key));

    return Array.from(fields).sort();
  };

  const recognizableFields = getAllRecognizableFields();

  const handleImport = () => {
    try {
      let cmd = commandInput.trim();

      if (!cmd.startsWith(".st") && !cmd.startsWith("。st")) {
        throw new Error("指令必须以 .st 开头");
      }

      cmd = cmd.slice(3).trim();
      const args = cmd.split(/\s+/).filter(arg => arg !== "");
      const input = args.join("");

      // 使用正则匹配所有属性+数值的组合
      const matches = input.matchAll(/(\D+)(\d+)/g);
      const updatedSkills = { ...characterData.skill };
      const updatedBasic = { ...characterData.basic };
      const updatedAbility = { ...characterData.ability };

      const importedAttrs: string[] = [];

      for (const match of matches) {
        const rawKey = match[1].trim();
        const value = match[2];
        const normalizedKey = rawKey.toLowerCase();

        // 查找映射关系
        const finalKey = ABILITY_MAP[normalizedKey] || rawKey;

        // 根据属性类型分配到不同的section
        // 优先检查原始characterData中是否已存在该字段
        if (finalKey in characterData.basic) {
          updatedBasic[finalKey] = value;
        }
        else if (finalKey in characterData.ability) {
          updatedAbility[finalKey] = value;
        }
        else if (finalKey in characterData.skill) {
          updatedSkills[finalKey] = value;
        }
        else {
          // 默认放到skill中
          updatedSkills[finalKey] = value;
        }

        importedAttrs.push(`${finalKey}:${value}`);
      }

      if (importedAttrs.length === 0) {
        throw new Error("未识别到有效的属性数据");
      }

      // 回调更新父组件数据
      onImportSuccess({
        skill: updatedSkills,
        basic: updatedBasic,
        ability: updatedAbility,
      });

      // 显示成功提示
      const displayAttrs = importedAttrs.length > 5
        ? `${importedAttrs.slice(0, 5).join(", ")}等`
        : importedAttrs.join(", ");

      toast.success(`成功导入 ${importedAttrs.length} 项属性: ${displayAttrs}`, {
        duration: 4000,
        position: "top-center",
      });

      setCommandInput("");
    }
    catch (error) {
      toast.error(`导入失败: ${error instanceof Error ? error.message : "指令格式有误"}`, {
        duration: 4000,
        position: "top-center",
      });
    }
  };

  return (
    <div className="card bg-gradient-to-br rounded-xl from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-dashed border-blue-300 dark:border-blue-600">
      <div className="card-body mt-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-500 dark:to-cyan-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-300 dark:to-cyan-300 bg-clip-text text-transparent">
              输入ST指令
            </h3>
            <p className="text-sm text-base-content/70 dark:text-base-content/80">
              使用.st指令快速导入角色属性数据
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative w-full">
            <textarea
              className="textarea textarea-bordered rounded-md w-full min-h-[180px] bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
              placeholder="输入.st指令导入属性&#10;&#10;例如：.st 力量80 敏捷70 意志50&#10;或者：.st str80 dex70 pow50"
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary text-white rounded-md w-full bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-600 dark:to-cyan-600 border-none hover:from-blue-600 hover:to-cyan-600 dark:hover:from-blue-700 dark:hover:to-cyan-700"
            onClick={handleImport}
            disabled={!commandInput.trim()}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入属性
          </button>

          {/* 可识别字段列表 */}
          <div className="card bg-base-200/60 rounded-lg border border-base-content/10">
            <div className="card-body p-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                可识别的属性字段
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {recognizableFields.map(field => (
                  <span
                    key={field}
                    className="badge badge-sm badge-outline hover:badge-primary cursor-default transition-colors"
                  >
                    {field}
                  </span>
                ))}
              </div>
              <p className="text-xs text-base-content/60 mt-2">
                共
                {" "}
                {recognizableFields.length}
                {" "}
                个可用字段, 不可识别的字段将被视作技能添加
              </p>
            </div>
          </div>

          <div className="alert bg-info/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-xs">
              <p className="font-semibold">提示</p>
              <p>支持中文属性名(如：力量、敏捷)和英文缩写(如：str、dex、pow)</p>
              <p>导入成功后才能进入下一步</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
