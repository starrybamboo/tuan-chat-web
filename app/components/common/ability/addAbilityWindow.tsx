import { useSetRoleAbilityMutation } from "../../../../api/hooks/abilityQueryHooks";
import { useGetRulePageInfiniteQuery } from "../../../../api/hooks/ruleQueryHooks";

export default function AddAbilityWindow({ roleId, onClose }: { roleId: number; onClose?: () => void }) {
  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];

  const setAbilityMutation = useSetRoleAbilityMutation();

  function handleCreateAbility(ruleId: number) {
    setAbilityMutation.mutate({
      ruleId,
      roleId,
      act: {},
      ability: {},
    });
    if (onClose) {
      onClose();
    }
  }

  return (
    <div className="modal-box w-max">
      <h3 className="font-bold text-lg mb-4">添加能力组</h3>

      <div className="overflow-y-auto max-h-[80vh]">
        {rules.length === 0
          ? (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无可用规则</p>
              </div>
            )
          : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div
                    key={rule.ruleId}
                    className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="card-body p-4">
                      <div className="flex justify-between items-center gap-6">
                        <div className="flex flex-row gap-4 items-center">
                          <h4 className="card-title text-sm">{rule.ruleName}</h4>
                          <p className="text-xs text-gray-500">{rule.ruleDescription}</p>
                        </div>
                        <button
                          onClick={() => handleCreateAbility(rule.ruleId!)}
                          className="btn btn-sm btn-info"
                          disabled={setAbilityMutation.isPending}
                          type="button"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      <div className="modal-action">
        <button className="btn" type="button">关闭</button>
      </div>
    </div>
  );
}
