import type { StAbilityDraft } from "./stImportParser";
import { CopyIcon, EditIcon } from "app/icons";
import { useState } from "react";

import { toast } from "react-hot-toast";

import {
  useGetRoleAbilitiesQuery,
  useSetRoleAbilityMutation,
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "../../../../api/hooks/ruleQueryHooks";

import { applyStCommandToDraft } from "./stImportParser";

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

function useHandleStCmd(ruleId: number, roleId: number): (cmd: string) => Promise<string> {
  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityList = abilityQuery.data?.data ?? [];
  const ruleDetailQuery = useRuleDetailQuery(ruleId);

  const updateAbilityMutation = useUpdateRoleAbilityMutation(); // 更改属性与能力字段
  const updateKeyFieldByRoleIdMutation = useUpdateKeyFieldByRoleIdMutation(); // 删除错位字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组

  function buildAbilityDraft(): { draft: StAbilityDraft; shouldUpdate: boolean } {
    const currentAbility = abilityList.find(a => a.ruleId === ruleId);
    const draft: StAbilityDraft = {
      abilityId: currentAbility?.abilityId,
      // 保持历史行为：只基于现有能力组进行覆盖，不自动灌入规则模板。
      act: { ...(currentAbility?.act ?? {}) },
      basic: { ...(currentAbility?.basic ?? {}) },
      ability: { ...(currentAbility?.ability ?? {}) },
      skill: { ...(currentAbility?.skill ?? {}) },
    };
    const shouldUpdate = (draft.abilityId ?? 0) > 0;
    return { draft, shouldUpdate };
  }

  async function handleStCmdInner(cmd: string): Promise<string> {
    const { draft, shouldUpdate } = buildAbilityDraft();
    const parsed = applyStCommandToDraft({
      cmd,
      draft,
      templateKeys: {
        basic: new Set(Object.keys(ruleDetailQuery.data?.basicDefault ?? {})),
        ability: new Set(Object.keys(ruleDetailQuery.data?.abilityFormula ?? {})),
        skill: new Set(Object.keys(ruleDetailQuery.data?.skillDefault ?? {})),
      },
    });

    // 已存在能力则更新，否则创建，并保留本次导入后的字段内容
    if (shouldUpdate) {
      await updateAbilityMutation.mutateAsync({
        abilityId: parsed.draft.abilityId as number,
        act: parsed.draft.act,
        basic: parsed.draft.basic,
        ability: parsed.draft.ability,
        skill: parsed.draft.skill,
      });

      if (parsed.abilityFieldsToDelete.size > 0) {
        const deleteMap: Record<string, string> = {};
        for (const key of parsed.abilityFieldsToDelete) {
          // 后端约定：value 为 null 代表删除该键
          deleteMap[key] = null as unknown as string;
        }
        await updateKeyFieldByRoleIdMutation.mutateAsync({
          roleId,
          ruleId,
          abilityFields: deleteMap,
        });
      }
    }
    else {
      await setAbilityMutation.mutateAsync({
        roleId,
        ruleId,
        act: parsed.draft.act,
        basic: parsed.draft.basic,
        ability: parsed.draft.ability,
        skill: parsed.draft.skill,
      });
    }
    return `更新属性: ${JSON.stringify(parsed.abilityToUpdate, null, 2)}`;
  }
  return handleStCmdInner;
}
