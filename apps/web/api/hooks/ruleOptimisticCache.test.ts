import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  beginRuleDeleteOptimisticMutation,
  beginRuleUpdateOptimisticMutation,
  rollbackRuleOptimisticMutation,
} from "./ruleOptimisticCache";

describe("rule optimistic cache", () => {
  it("规则更新与删除覆盖详情、分页和简化列表缓存", async () => {
    const queryClient = new QueryClient();
    const rule = { ruleId: 3, ruleName: "旧规则" };
    queryClient.setQueryData(["getRuleDetail", 3], { success: true, data: rule });
    queryClient.setQueryData(["getRulePage", {}], { pages: [{ data: { list: [rule] } }], pageParams: [] });
    queryClient.setQueryData(["rules", { page: 1 }], { list: [rule], meta: {} });

    const transaction = await beginRuleUpdateOptimisticMutation(queryClient, {
      ruleId: 3,
      ruleName: "新规则",
      ruleDescription: "说明",
      actTemplate: {},
      basicDefault: {},
      abilityFormula: {},
      skillDefault: {},
    });
    expect(queryClient.getQueryData<any>(["getRuleDetail", 3])?.data.ruleName).toBe("新规则");
    expect(queryClient.getQueryData<any>(["getRulePage", {}])?.pages[0].data.list[0].ruleName).toBe("新规则");
    expect(queryClient.getQueryData<any>(["rules", { page: 1 }])?.list[0].ruleName).toBe("新规则");

    rollbackRuleOptimisticMutation(queryClient, transaction);
    expect(queryClient.getQueryData<any>(["getRuleDetail", 3])?.data).toEqual(rule);

    await beginRuleDeleteOptimisticMutation(queryClient, 3);
    expect(queryClient.getQueryData<any>(["getRulePage", {}])?.pages[0].data.list).toEqual([]);
  });
});
