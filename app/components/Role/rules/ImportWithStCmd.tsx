import { CopyIcon, EditIcon } from "app/icons";
import { useState } from "react";
import { toast } from "react-hot-toast";
import UTILS from "@/components/common/dicer/utils/utils";
import {
  useGetRoleAbilitiesQuery,
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "../../../../api/hooks/ruleQueryHooks";

interface ImportWithStCmdProps {
  ruleId: number;
  roleId: number;
  onImportSuccess?: () => void;
}

export default function ImportWithStCmd({ ruleId, roleId, onImportSuccess }: ImportWithStCmdProps) {
  const handleStCmd = useHandleStCmd(ruleId, roleId);
  const [commandInput, setCommandInput] = useState("");
  const isCOC7 = ruleId === 1; // COC7规则ID为1
  const abilityQuery = useGetRoleAbilitiesQuery(roleId);

  const handleImport = () => {
    void (async () => {
      try {
        const importResult = await handleStCmd(commandInput.trim());

        // 处理结果格式
        let formattedResult = importResult
          .replace(/[\n\r]/g, "") // 去掉换行
          .replace(/[{}]/g, ""); // 去掉大括号

        // 统计属性数量并格式化
        const props = formattedResult.split(",");
        const propCount = props.length;
        if (propCount > 5) {
          formattedResult = `${props.slice(0, 5).join(",")}等`;
        }

        // 添加总数信息
        formattedResult += `共${propCount}项属性`;

        toast.success(formattedResult, {
          duration: 4000,
          position: "top-center",
        });
        setCommandInput("");
        onImportSuccess?.();
      }
      catch (error) {
        toast.error(`导入失败: ${error instanceof Error ? error.message : "指令格式有误"}`, {
          duration: 4000,
          position: "top-center",
        });
      }
    })();
  };

  const handleExport = () => {
    const abilityList = abilityQuery.data?.data ?? [];
    const curAbility = abilityList.find(a => a.ruleId === ruleId);

    if (!curAbility?.skill) {
      toast.error("暂无属性可导出", { duration: 2000 });
      return;
    }

    const ABILITY_MAP: { [key: string]: string } = {
      力量: "str",
      敏捷: "dex",
      意志: "pow",
      体质: "con",
      外貌: "app",
      教育: "edu",
      体型: "siz",
      智力: "int",
      sanֵ: "san",
      幸运: "luck",
      魔法: "mp",
      体力: "hp",
      克苏鲁神话: "cm",
    };

    const parts: string[] = [];
    for (const [key, value] of Object.entries(curAbility.skill)) {
      const abbr = ABILITY_MAP[key] || key;
      parts.push(`${abbr}${value}`);
    }

    const stCmd = `.st ${parts.join(" ")}`;
    navigator.clipboard.writeText(stCmd);
    toast.success("ST指令已复制到剪贴板", { duration: 2000 });
  };

  return (
    <div className="space-y-4">
      <fieldset className="border border-base-300 rounded-lg p-4">
        <div className="relative w-full">
          <textarea
            className="bg-base-200 rounded-lg p-4 w-full h-40 overflow-auto resize-none"
            placeholder="输入.st指令导入属性（例：.st 力量80 敏捷70 意志50）"
            value={commandInput}
            onChange={e => setCommandInput(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-accent absolute bottom-4 right-2"
            onClick={handleImport}
            disabled={!commandInput.trim()}
          >
            <EditIcon className="w-4 h-4" />
            导入属性
          </button>
        </div>
      </fieldset>

      {isCOC7 && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleExport}
          >
            <CopyIcon className="w-4 h-4" />
            导出ST指令
          </button>
        </div>
      )}
    </div>
  );
}

interface StAbilityDraft {
  abilityId?: number;
  act: Record<string, string>;
  basic: Record<string, string>;
  ability: Record<string, string>;
  skill: Record<string, string>;
}

function useHandleStCmd(ruleId: number, roleId: number): (cmd: string) => Promise<string> {
  const ABILITY_MAP: { [key: string]: string } = {
    str: "力量",
    dex: "敏捷",
    pow: "意志",
    con: "体质",
    app: "外貌",
    edu: "教育",
    siz: "体型",
    int: "智力",
    san: "sanֵ",
    luck: "幸运",
    mp: "魔法",
    hp: "体力",
    cm: "克苏鲁神话",
  };

  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityList = abilityQuery.data?.data ?? [];
  const ruleDetailQuery = useRuleDetailQuery(ruleId);

  const updateAbilityMutation = useUpdateRoleAbilityMutation(); // 更改属性与能力字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组

  function buildAbilityDraft(): { draft: StAbilityDraft; shouldUpdate: boolean } {
    const currentAbility = abilityList.find(a => a.ruleId === ruleId);
    const draft: StAbilityDraft = {
      abilityId: currentAbility?.abilityId,
      act: { ...(currentAbility?.act ?? ruleDetailQuery.data?.actTemplate ?? {}) },
      basic: { ...(currentAbility?.basic ?? ruleDetailQuery.data?.basicDefault ?? {}) },
      ability: { ...(currentAbility?.ability ?? ruleDetailQuery.data?.abilityFormula ?? {}) },
      skill: { ...(currentAbility?.skill ?? ruleDetailQuery.data?.skillDefault ?? {}) },
    };
    const shouldUpdate = (draft.abilityId ?? 0) > 0;
    return { draft, shouldUpdate };
  }

  async function handleStCmdInner(cmd: string): Promise<string> {
    if (!cmd.startsWith(".st") && !cmd.startsWith("。st")) {
      throw new Error("指令必须以 .st 开头");
    }
    cmd = cmd.slice(3).trim();
    const args = cmd.split(/\s+/).filter(arg => arg !== "");
    const input = args.join("");
    const { draft, shouldUpdate } = buildAbilityDraft();

    // 支持 .st 力量70 / .st 力量+10 / .st 敏捷-5 这三种写法
    const matches = input.matchAll(/([^\d+-]+)([+-]?)(\d+)/g);
    const abilityToUpdate = new Map<string, string>();
    let matchCount = 0;
    for (const match of matches) {
      matchCount += 1;
      const rawKey = match[1].trim();
      const operator = match[2];
      const value = Number.parseInt(match[3], 10);

      // 统一转换为小写进行比较
      const normalizedKey = rawKey.toLowerCase();
      const key = ABILITY_MAP[normalizedKey] || rawKey;

      const currentValue = Number.parseInt(UTILS.getRoleAbilityValue(draft, key) ?? "0", 10);
      let newValue: number;
      if (operator === "+") {
        newValue = currentValue + value;
      }
      else if (operator === "-") {
        newValue = currentValue - value;
      }
      else {
        newValue = value;
      }

      UTILS.setRoleAbilityValue(draft, key, String(newValue), "skill", "auto");
      abilityToUpdate.set(key, String(newValue));
    }

    if (matchCount === 0) {
      throw new Error("未解析到属性，请检查格式（例：.st 力量80 敏捷+10）");
    }

    // 已存在能力则更新，否则创建，并保留本次导入后的字段内容
    if (shouldUpdate) {
      await updateAbilityMutation.mutateAsync({
        abilityId: draft.abilityId as number,
        act: draft.act,
        basic: draft.basic,
        ability: draft.ability,
        skill: draft.skill,
      });
    }
    else {
      await setAbilityMutation.mutateAsync({
        roleId,
        ruleId,
        act: draft.act,
        basic: draft.basic,
        ability: draft.ability,
        skill: draft.skill,
      });
    }
    return `更新属性: ${JSON.stringify(abilityToUpdate, null, 2)}`;
  }
  return handleStCmdInner;
}
