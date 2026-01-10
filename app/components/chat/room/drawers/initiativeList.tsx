import { use, useState } from "react";
import toast from "react-hot-toast";
import { useRoomExtra } from "@/components/chat/core/hooks";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { EditableField } from "@/components/common/editableField";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetRolesAbilitiesQueries } from "../../../../../api/hooks/abilityQueryHooks";

export interface Initiative {
  name: string;
  value: number;
  // 新增：当前 HP 和最大 HP（可为空）
  hp?: number | null;
  maxHp?: number | null;
}

/**
 * 先攻列表
 */
export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const globalContext = useGlobalContext();
  const [initiativeList, setInitiativeList] = useRoomExtra<Initiative[]>(roomId, "initiativeList", []);
  const [newItem, setNewItem] = useState({ name: "", value: "", hp: "", maxHp: "" });
  const [isImportPopupOpen, setIsImportPopupOpen] = useState(false);
  const spaceContext = use(SpaceContext);
  const spaceOwner = spaceContext.isSpaceOwner;
  const curUserId = globalContext.userId ?? -1;

  const roomRolesThatUserOwn = roomContext.roomRolesThatUserOwn ?? [];

  const importableRoles = spaceOwner
    ? roomRolesThatUserOwn
    : roomRolesThatUserOwn.filter(r => r.userId === curUserId);

  const abilityQueries = useGetRolesAbilitiesQueries(importableRoles.map(r => r.roleId));

  const extractAgilityFromQuery = (query: ReturnType<typeof useGetRolesAbilitiesQueries>[number] | undefined): number | null => {
    const res = query?.data;
    if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId)
      return null;

    const ruleId = spaceContext.ruleId;
    const record = res.data.find(item => item.ruleId === ruleId);
    if (!record)
      return null;

    const source: Record<string, any> = record.basic || {};
    const entries = Object.entries(source);
    if (!entries.length)
      return null;

    const candidates = ["敏捷", "敏", "dex", "agi", "速度", "spd"];
    const lower = (s: string) => s.toLowerCase();

    const hit = entries.find(([k]) => candidates.includes(lower(String(k))));
    if (!hit)
      return null;

    const v = Number(hit[1]);
    return Number.isFinite(v) ? v : null;
  };

  const extractHpFromQuery = (
    query: ReturnType<typeof useGetRolesAbilitiesQueries>[number] | undefined,
  ): { hp: number | null; maxHp: number | null } => {
    const res = query?.data;
    if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId)
      return { hp: null, maxHp: null };

    const ruleId = spaceContext.ruleId;
    const record = res.data.find(item => item.ruleId === ruleId);
    if (!record)
      return { hp: null, maxHp: null };

    const source: Record<string, any> = record.ability || {};
    const entries = Object.entries(source);
    if (!entries.length)
      return { hp: null, maxHp: null };

    const hpKeys = ["hp", "当前hp", "生命", "生命值", "体力", "血量", "health"];
    const maxHpKeys = ["maxhp", "hp上限", "最大hp", "最大生命", "最大生命值", "最大体力", "最大血量", "maxhealth"];

    const lower = (s: string) => String(s).toLowerCase();

    let hp: number | null = null;
    let maxHp: number | null = null;

    for (const [k, v] of entries) {
      const lk = lower(k);
      const num = Number(v);
      if (!Number.isFinite(num))
        continue;

      if (hpKeys.some(key => lk.includes(lower(key)))) {
        hp = num;
      }
      if (maxHpKeys.some(key => lk.includes(lower(key)))) {
        maxHp = num;
      }
    }

    // 如果只找到一个值，则同时作为当前和最大
    if (hp == null && maxHp != null)
      hp = maxHp;
    if (maxHp == null && hp != null)
      maxHp = hp;

    return { hp, maxHp };
  };

  // 仅导入单个角色
  const handleImportSingle = (roleId: number) => {
    const idx = importableRoles.findIndex(r => r.roleId === roleId);
    if (idx === -1)
      return;

    // 严格使用同 index 的 query，避免错位
    const query = abilityQueries[idx];
    const agi = extractAgilityFromQuery(query);
    if (agi == null)
      return;

    const { hp, maxHp } = extractHpFromQuery(query);

    const role = importableRoles[idx];
    const name = role.roleName ?? `角色${role.roleId}`;

    // 新增：如果该名字已存在，则提示并不覆盖
    const exists = initiativeList.some(i => i.name === name);
    if (exists) {
      toast.error("该角色已导入");
      return;
    }

    const next: Initiative[] = [
      // 不再覆盖同名，直接追加
      ...initiativeList,
      { name, value: agi, hp, maxHp },
    ];
    setInitiativeList(next.sort((a, b) => b.value - a.value));
    // 成功导入后关闭弹窗
    setIsImportPopupOpen(false);
  };

  // 删除项
  const handleDelete = (index: number) => {
    setInitiativeList(initiativeList.filter((_, i) => i !== index));
  };

  // 保存编辑
  const handleUpdate = (initiativeList: Initiative[]) => {
    setInitiativeList(initiativeList.sort((a, b) => b.value - a.value));
  };

  // 添加新项
  const handleAdd = () => {
    const hpNum = newItem.hp.trim() === "" ? null : Number(newItem.hp);
    const maxHpNum = newItem.maxHp.trim() === "" ? null : Number(newItem.maxHp);

    const exists = initiativeList.some(i => i.name === newItem.name);
    if (exists) {
      toast.error("该角色已导入");
      return;
    }

    handleUpdate([
      // 不再 filter 覆盖同名
      ...initiativeList,
      {
        name: newItem.name,
        value: Number(newItem.value),
        hp: Number.isNaN(hpNum) ? null : hpNum,
        maxHp: Number.isNaN(maxHpNum) ? null : maxHpNum,
      },
    ]);
    setNewItem({ name: "", value: "", hp: "", maxHp: "" });
  };

  return (
    <div className="flex flex-col bg-base-100">
      {/* 卡片容器 */}
      <div className="w-full p-3">
        <div className="rounded-xl border border-base-300 bg-base-100 shadow-sm">
          {/* 头部：标题 + 统计 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-base-content">先攻列表</span>
              <span className="text-xs text-base-content/60">
                共
                {" "}
                {initiativeList.length}
                {" "}
                项
              </span>
            </div>

            {/* 改为使用弹窗导入先攻 */}
            {importableRoles.length > 0 && (
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={() => setIsImportPopupOpen(true)}
              >
                导入角色先攻
              </button>
            )}
          </div>

          {/* 内容区 */}
          <div className="px-4 py-3 space-y-3">
            {/* 添加表单 */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="角色名"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg col-span-2"
                />
                <input
                  type="text"
                  placeholder="先攻"
                  value={newItem.value}
                  onChange={e => setNewItem({ ...newItem, value: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg text-left"
                />
                {/* 新增：当前 HP / 最大 HP 手动输入 */}
                <input
                  type="text"
                  placeholder="当前HP"
                  value={newItem.hp}
                  onChange={e => setNewItem({ ...newItem, hp: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg text-left"
                />
                <input
                  type="text"
                  placeholder="最大HP"
                  value={newItem.maxHp}
                  onChange={e => setNewItem({ ...newItem, maxHp: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg text-left col-span-2"
                />
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="btn btn-md rounded px-5 bg-primary text-primary-content border-none hover:bg-primary/90 shadow-sm w-full disabled:bg-base-300 disabled:text-base-content/40"
                disabled={
                  !newItem.name
                  || Number.isNaN(Number(newItem.value))
                  || (newItem.hp.trim() !== "" && Number.isNaN(Number(newItem.hp)))
                  || (newItem.maxHp.trim() !== "" && Number.isNaN(Number(newItem.maxHp)))
                }
              >
                添加
              </button>
            </div>

            {/* 分割线 */}
            <div className="h-px bg-base-200" />

            {/* 编辑提示 */}
            <div className="text-[11px] text-base-content/50 px-1">
              提示：双击名称或数值可以进行编辑。
            </div>

            {/* 列表 */}
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {initiativeList.length === 0 && (
                <div className="text-xs text-base-content/50 text-center py-4">
                  暂无先攻记录，添加一个吧。
                </div>
              )}

              {initiativeList.map((item, index) => {
                const hp = item.hp ?? null;
                const maxHp = item.maxHp ?? null;
                const percent
                  = hp != null && maxHp != null && maxHp > 0
                    ? Math.max(0, Math.min(100, (hp / maxHp) * 100))
                    : null;

                return (
                  <div
                    key={item.name}
                    className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-base-200/70 transition-colors group"
                  >
                    {/* 左侧：名称 + HP 显示 / 编辑 + 血条 */}
                    <div className="flex flex-col flex-1 min-w-0 gap-1">
                      <EditableField
                        content={item.name}
                        handleContentUpdate={(newName) => {
                          handleUpdate(
                            initiativeList.map(i =>
                              i.name === item.name ? { ...i, name: newName } : i,
                            ),
                          );
                        }}
                        className="font-medium text-sm text-base-content truncate max-w-[9rem] sm:max-w-[12rem] min-h-6 leading-6 inline-flex items-center"
                        usingInput
                      >
                      </EditableField>

                      {/* HP 编辑行 */}
                      <div className="flex items-center gap-2 text-xs text-base-content/70 leading-5">
                        <span className="whitespace-nowrap">HP</span>
                        <EditableField
                          content={hp != null ? String(hp) : ""}
                          handleContentUpdate={(newHp) => {
                            const parsed = newHp.trim() === "" ? null : Number(newHp);
                            handleUpdate(
                              initiativeList.map(i =>
                                i.name === item.name
                                  ? { ...i, hp: Number.isNaN(parsed) ? null : parsed }
                                  : i,
                              ),
                            );
                          }}
                          className="w-[3rem] text-right tabular-nums min-h-5 leading-5 inline-flex items-center justify-end"
                          usingInput
                          type="number"
                        />
                        <span className="px-0.5">/</span>
                        <EditableField
                          content={maxHp != null ? String(maxHp) : ""}
                          handleContentUpdate={(newMaxHp) => {
                            const parsed = newMaxHp.trim() === "" ? null : Number(newMaxHp);
                            handleUpdate(
                              initiativeList.map(i =>
                                i.name === item.name
                                  ? { ...i, maxHp: Number.isNaN(parsed) ? null : parsed }
                                  : i,
                              ),
                            );
                          }}
                          className="w-[3rem] text-right tabular-nums min-h-5 leading-5 inline-flex items-center justify-end"
                          usingInput
                          type="number"
                        />
                      </div>

                      {/* 血条可视化 */}
                      {hp != null && maxHp != null && maxHp > 0 && (
                        <div className="h-1.5 rounded-full bg-base-300 overflow-hidden">
                          <div
                            className="h-full bg-error transition-all"
                            style={{ width: `${percent ?? 0}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 右侧：先攻数值 + 删除 */}
                    <div className="flex items-center gap-3 pt-0.5">
                      <EditableField
                        content={item.value.toString()}
                        handleContentUpdate={(newValue) => {
                          handleUpdate(
                            initiativeList.map(i =>
                              i.name === item.name ? { ...i, value: Number(newValue) } : i,
                            ),
                          );
                        }}
                        className="w-[3.5rem] text-right text-sm tabular-nums text-base-content/90 min-h-6 leading-6 inline-flex items-center justify-end"
                        usingInput
                        type="number"
                      >
                      </EditableField>

                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="btn btn-ghost btn-square btn-xs text-error hover:bg-error/5 border-none px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端下的分割线，与其他模块对齐 */}
      <div className="h-px bg-base-300 md:hidden"></div>

      {/* 导入角色敏捷 */}
      <PopWindow
        isOpen={isImportPopupOpen}
        onClose={() => setIsImportPopupOpen(false)}
        fullScreen={false}
      >
        <div className="p-4 space-y-4 min-w-[260px] max-w-sm">
          <h3 className="text-base font-semibold">从角色导入先攻（敏捷）</h3>
          <p className="text-xs text-base-content/60">
            选择一个角色，从其当前规则的能力/基础属性中自动识别“敏捷”等字段并填入先攻列表。
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {importableRoles.map((role, idx) => {
              const q = abilityQueries[idx];
              const loading = q.isLoading;
              const hasData = !!q.data && q.data.success;
              return (
                <div
                  key={role.roleId}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-base-100 border border-base-200"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {role.roleName ?? `角色${role.roleId}`}
                    </span>
                    <span className="text-[11px] text-base-content/60">
                      {loading
                        ? "正在加载能力数据..."
                        : hasData
                          ? "已加载，点击导入"
                          : "尚无该规则的能力数据"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs btn-primary"
                    disabled={loading || !hasData}
                    onClick={() => handleImportSingle(role.roleId)}
                  >
                    导入
                  </button>
                </div>
              );
            })}
            {importableRoles.length === 0 && (
              <div className="text-xs text-base-content/60 text-center py-4">
                暂无可导入的角色。
              </div>
            )}
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
