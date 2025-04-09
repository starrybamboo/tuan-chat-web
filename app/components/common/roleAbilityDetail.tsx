import { useGetRoleAbilitiesQuery } from "../../../api/queryHooks";

export function RoleAbilityDetail({ roleId }: { roleId: number }) {
  const roleAbilityListQuery = useGetRoleAbilitiesQuery(roleId);
  return (
    <div className="flex flex-col gap-2 overflow-auto h-[70vh]">
      {roleAbilityListQuery.data?.data?.map((ability) => {
        return (
          <div key={ability.abilityId} className="flex flex-col gap-1">
            <div className="collapse bg-base-100 border-base-300 border">
              <input type="checkbox" />
              <div className="collapse-title font-semibold">
                ruleId:
                {ability.ruleId}
              </div>
              <div className="flex flex-row gap-2">
                <div className="flex flex-col gap-1">
                  <div className="collapse bg-base-100 border-base-300 border m-2">
                    <input type="checkbox" />
                    <div className="collapse-title font-semibold">角色属性</div>
                    <div className="collapse-content">
                      <div className="grid grid-cols-6 overflow-auto">
                        {Object.entries(ability.ability ?? {}).map(([key, value]) => (
                          <div
                            key={key}
                            className="break-inside-avoid mb-2 ml-1 p-2 border rounded-lg"
                          >
                            <div className="flex justify-between">
                              <div
                                className="text-xs font-medium text-gray-500 truncate"
                              >
                                {key}
                              </div>
                              <div className="text-xs text-gray-800">{value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="collapse bg-base-100 border-base-300 border m-2">
                    <input type="checkbox" />
                    <div className="collapse-title font-semibold">角色能力</div>
                    <div className="collapse-content">
                      <div className="grid grid-cols-6 overflow-auto">
                        {Object.entries(ability.act ?? {}).map(([key, value]) => (
                          <div
                            key={key}
                            className="break-inside-avoid mb-2 ml-1 p-2 border rounded-lg"
                          >
                            <div className="flex justify-between">
                              <div
                                className="text-xs font-medium text-gray-500 truncate"
                              >
                                {key}
                              </div>
                              <div className="text-xs text-gray-800">{value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
