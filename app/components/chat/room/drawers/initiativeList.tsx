import { use, useEffect, useMemo, useState } from "react";
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
  // 可选的自定义参数键值对（按配置的 key 存储）
  extras?: Record<string, string | number | null>;
}

interface InitiativeParam {
  key: string;
  label: string;
  source: "manual" | "roleAttr";
  attrKey?: string;
}

type SortKey = "name" | "value" | "hp" | "maxHp" | { paramKey: string };
type SortDirection = "asc" | "desc";

const RESERVED_KEYS = ["name", "value", "hp", "maxHp"] as const;

function slugifyLabel(label: string): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "field";
}

function makeUniqueKey(base: string, params: InitiativeParam[]): string {
  let key = base;
  let suffix = 2;
  while (RESERVED_KEYS.includes(key as any) || params.some(p => p.key === key)) {
    key = `${base}-${suffix}`;
    suffix += 1;
  }
  return key;
}

/**
 * 先攻列表
 */
export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const globalContext = useGlobalContext();
  const [initiativeList, setInitiativeList] = useRoomExtra<Initiative[]>(roomId, "initiativeList", []);
  const [params, setParams] = useRoomExtra<InitiativeParam[]>(roomId, "initiativeParams", []);
  const [newItem, setNewItem] = useState({ name: "", value: "", hp: "", maxHp: "" });
  const [newExtras, setNewExtras] = useState<Record<string, string>>({});
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [newParam, setNewParam] = useState({ key: "", label: "", source: "manual" as const, attrKey: "" });
  const [isImportPopupOpen, setIsImportPopupOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const spaceContext = use(SpaceContext);
  const spaceOwner = spaceContext.isSpaceOwner;
  const curUserId = globalContext.userId ?? -1;

  const roomRolesThatUserOwn = roomContext.roomRolesThatUserOwn ?? [];

  // 保证新建输入区的 extras 与当前参数列表保持同步
  useEffect(() => {
    setNewExtras((prev) => {
      const next: Record<string, string> = { ...prev };
      let changed = false;
      // 补充缺失 key
      params.forEach((p) => {
        if (!(p.key in next)) {
          next[p.key] = "";
          changed = true;
        }
      });
      // 移除已删除 key
      Object.keys(next).forEach((k) => {
        if (!params.some(p => p.key === k)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [params]);

  const importableRoles = spaceOwner
    ? roomRolesThatUserOwn
    : roomRolesThatUserOwn.filter(r => r.userId === curUserId);

  const abilityQueries = useGetRolesAbilitiesQueries(importableRoles.map(r => r.roleId));

  const calcChWidth = (value: string, placeholder: string, min = 8, max = 18, pad = 4) => {
    const valLen = value?.length ?? 0;
    const base = Math.max(valLen, placeholder.length);
    return Math.min(max, Math.max(min, base + pad));
  };

  const extractAgilityFromQuery = (query: ReturnType<typeof useGetRolesAbilitiesQueries>[number] | undefined): number | null => {
    const res = query?.data;
    if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId)
      return null;

    const ruleId = spaceContext.ruleId;
    const record = res.data.find(item => item.ruleId === ruleId);
    if (!record)
      return null;

    const initiativeKeys = ["先攻", "先攻值", "initiative"];
    const agilityKeys = ["敏捷", "敏", "dex", "agi", "速度", "spd"];
    const lower = (s: string) => String(s).toLowerCase();

    const tryPickScalar = (obj: any, _candidates: string[]): number | null => {
      if (obj == null)
        return null;
      if (typeof obj === "number")
        return Number.isFinite(obj) ? obj : null;
      if (typeof obj === "string") {
        const num = Number(obj);
        return Number.isFinite(num) ? num : null;
      }
      return null;
    };

    const search = (node: any, _candidates: string[], depth = 0): number | null => {
      if (node == null || depth > 3)
        return null;

      // 数字/字符串直接返回
      const scalar = tryPickScalar(node, _candidates);
      if (scalar != null)
        return scalar;

      // 对象：优先看有无 name/label 字段匹配，再看 key 匹配
      if (typeof node === "object" && !Array.isArray(node)) {
        const keys = Object.keys(node);

        // 如果有 name/label/title 匹配候选，取 value/数值字段
        const nameField = node.name ?? node.label ?? node.title;
        if (typeof nameField === "string") {
          const ln = lower(nameField);
          if (_candidates.some(c => ln.includes(lower(c)))) {
            const val = tryPickScalar(node.value ?? node.val ?? node.score ?? node.num, _candidates);
            if (val != null)
              return val;
          }
        }

        for (const k of keys) {
          const lk = lower(k);
          if (_candidates.some(c => lk.includes(lower(c)))) {
            const val = tryPickScalar(node[k], _candidates);
            if (val != null)
              return val;
          }
        }

        // 深度遍历子节点
        for (const k of keys) {
          const found = search(node[k], _candidates, depth + 1);
          if (found != null)
            return found;
        }
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          const found = search(item, _candidates, depth + 1);
          if (found != null)
            return found;
        }
      }

      return null;
    };

    const source: Record<string, any> = { ...(record.ability || {}), ...(record.basic || {}), ...(record as any).skill };

    return search(source, initiativeKeys) ?? search(source, agilityKeys);
  };

  const extractAttrFromQuery = (
    query: ReturnType<typeof useGetRolesAbilitiesQueries>[number] | undefined,
    attrKey: string,
  ): number | string | null => {
    const res = query?.data;
    if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId)
      return null;

    const ruleId = spaceContext.ruleId;
    const record = res.data.find(item => item.ruleId === ruleId);
    if (!record)
      return null;

    const lowerKey = attrKey.toLowerCase();
    const pick = (obj?: Record<string, any>) => {
      if (!obj)
        return undefined;
      for (const [k, v] of Object.entries(obj)) {
        if (String(k).toLowerCase() === lowerKey)
          return v;
      }
      return undefined;
    };

    const val = pick(record.ability) ?? pick(record.basic);
    if (val == null)
      return null;
    const num = Number(val);
    return Number.isFinite(num) ? num : val;
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

    // 构造自定义属性
    const extras: Record<string, any> = {};
    params.forEach((param) => {
      if (param.source === "roleAttr" && param.attrKey) {
        const val = extractAttrFromQuery(query, param.attrKey);
        extras[param.key] = val ?? "";
      }
      else {
        // manual：默认空，可手动编辑
        extras[param.key] = "";
      }
    });

    const next: Initiative[] = [
      // 不再覆盖同名，直接追加
      ...initiativeList,
      { name, value: agi, hp, maxHp, extras },
    ];
    setInitiativeList(next.sort((a, b) => b.value - a.value));
    // 成功导入后关闭弹窗
    setIsImportPopupOpen(false);
  };

  // 删除项（按名称）
  const handleDelete = (name: string) => {
    setInitiativeList(initiativeList.filter(i => i.name !== name));
  };

  // 保存编辑
  const handleUpdate = (nextList: Initiative[]) => {
    setInitiativeList(nextList);
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

    // 计算先攻值：优先使用输入框；若为空，尝试从同名角色的属性中读取“先攻/敏捷”；仍无则为 0
    let computedValue: number | null = null;
    if (newItem.value.trim() !== "") {
      const n = Number(newItem.value);
      if (Number.isFinite(n))
        computedValue = n;
    }
    if (computedValue == null) {
      const idx = importableRoles.findIndex(r => (r.roleName ?? "") === newItem.name);
      if (idx !== -1) {
        const q = abilityQueries[idx];
        const maybe = extractAgilityFromQuery(q);
        if (typeof maybe === "number" && Number.isFinite(maybe)) {
          computedValue = maybe;
        }
      }
    }

    // 初始化 extras：手动属性使用输入值，角色属性留空（导入时覆盖）
    const extras: Record<string, any> = {};
    params.forEach((p) => {
      if (p.source === "manual") {
        extras[p.key] = newExtras[p.key] ?? "";
      }
      else {
        extras[p.key] = "";
      }
    });

    handleUpdate([
      // 不再 filter 覆盖同名
      ...initiativeList,
      {
        name: newItem.name,
        value: computedValue == null ? 0 : computedValue,
        hp: Number.isNaN(hpNum) ? null : hpNum,
        maxHp: Number.isNaN(maxHpNum) ? null : maxHpNum,
        extras,
      },
    ]);
    setNewItem({ name: "", value: "", hp: "", maxHp: "" });
    setNewExtras((prev) => {
      const next: Record<string, string> = { ...prev };
      params.forEach((p) => {
        next[p.key] = "";
      });
      return next;
    });
  };

  const handleAddParam = () => {
    const label = newParam.label.trim();

    if (!label)
      return;

    if (newParam.source === "roleAttr" && !newParam.attrKey.trim()) {
      toast.error("请填写角色属性键");
      return;
    }

    const baseKey = slugifyLabel(label);
    const key = makeUniqueKey(baseKey, params);

    const newParamItem: InitiativeParam = {
      key,
      label,
      source: newParam.source,
      attrKey: newParam.source === "roleAttr" ? newParam.attrKey.trim() : undefined,
    };

    setParams([...params, newParamItem]);

    // 为现有列表填充默认值（仅填充缺失项，不覆盖已有值）
    if (initiativeList.length > 0) {
      setInitiativeList(
        initiativeList.map((i) => {
          const extras = { ...(i.extras ?? {}) };
          if (extras[key] == null)
            extras[key] = "";
          return { ...i, extras };
        }),
      );
    }

    setNewExtras(prev => ({ ...prev, [key]: "" }));
    setNewParam({ key: "", label: "", source: "manual", attrKey: "" });
  };

  const handleRemoveParam = (key: string) => {
    setParams(params.filter(p => p.key !== key));
    setInitiativeList(
      initiativeList.map((i) => {
        const extras = { ...(i.extras ?? {}) };
        delete extras[key];
        return { ...i, extras };
      }),
    );
    setNewExtras((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateItemExtras = (item: Initiative, key: string, value: string) => {
    handleUpdate(
      initiativeList.map((i) => {
        if (i.name !== item.name)
          return i;
        const extras = { ...(i.extras ?? {}) };
        extras[key] = value === "" ? null : value;
        return { ...i, extras };
      }),
    );
  };

  const resolveField = (item: Initiative, key: SortKey): number | string | null => {
    if (key === "name")
      return item.name ?? "";
    if (key === "value")
      return item.value ?? null;
    if (key === "hp")
      return item.hp ?? null;
    if (key === "maxHp")
      return item.maxHp ?? null;
    const paramKey = (key as { paramKey: string }).paramKey;
    const val = item.extras?.[paramKey];
    if (val == null)
      return null;
    if (typeof val === "number")
      return val;
    const num = Number(val);
    return Number.isFinite(num) ? num : String(val);
  };

  const activeSortKey = spaceOwner ? sortKey : "value";
  const activeSortDirection = spaceOwner ? sortDirection : "desc";

  const sortedList = useMemo(() => {
    const list = [...initiativeList];
    list.sort((a, b) => {
      const aVal = resolveField(a, activeSortKey);
      const bVal = resolveField(b, activeSortKey);

      if (aVal == null && bVal == null)
        return 0;
      if (aVal == null)
        return 1;
      if (bVal == null)
        return -1;

      const dir = activeSortDirection === "asc" ? 1 : -1;

      const aNum = typeof aVal === "number" ? aVal : Number(aVal);
      const bNum = typeof bVal === "number" ? bVal : Number(bVal);

      const aIsNum = Number.isFinite(aNum);
      const bIsNum = Number.isFinite(bNum);

      if (aIsNum && bIsNum) {
        if (aNum === bNum)
          return 0;
        return aNum > bNum ? dir : -dir;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr === bStr)
        return 0;
      return aStr > bStr ? dir : -dir;
    });
    return list;
  }, [initiativeList, activeSortKey, activeSortDirection]);

  return (
    <div className="flex flex-col bg-transparent">
      {/* 卡片容器 */}
      <div className="w-full p-3">
        <div className="rounded-xl border border-base-300 bg-base-300 shadow-none">
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

            <div className="flex items-center gap-2">
              {importableRoles.length > 0 && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => setIsImportPopupOpen(true)}
                >
                  导入角色先攻
                </button>
              )}
              {spaceOwner && (
                <button
                  type="button"
                  className={`btn btn-square btn-ghost btn-xs border border-base-300 ${showParamEditor ? "bg-base-200" : ""}`}
                  title="添加自定义参数"
                  onClick={() => setShowParamEditor(v => !v)}
                >
                  +
                </button>
              )}
            </div>
          </div>

          {/* 内容区 */}
          <div className="px-4 py-3 space-y-3">
            {showParamEditor && spaceOwner && (
              <div className="rounded-lg border border-base-200 bg-base-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-base-content">自定义参数</span>
                  <span className="text-[11px] text-base-content/60">影响当前房间的列</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="显示名称 (必填)"
                    value={newParam.label}
                    onChange={(e) => {
                      const nextLabel = e.target.value;
                      const baseKey = slugifyLabel(nextLabel);
                      const nextKey = makeUniqueKey(baseKey, params);
                      setNewParam({ ...newParam, label: nextLabel, key: nextKey });
                    }}
                    className="input input-sm bg-base-50 border border-base-300 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg min-w-32"
                  />
                  <span className="text-xs text-base-content/60 px-2">
                    键名：
                    {newParam.key || "(自动生成)"}
                  </span>
                  <select
                    className="select select-sm bg-base-50 border border-base-300 text-sm"
                    value={newParam.source}
                    onChange={e => setNewParam({ ...newParam, source: e.target.value as typeof newParam.source })}
                  >
                    <option value="manual">可编辑</option>
                    <option value="roleAttr">来自角色属性</option>
                  </select>
                  {newParam.source === "roleAttr" && (
                    <input
                      type="text"
                      placeholder="角色属性键 (必填)"
                      value={newParam.attrKey}
                      onChange={e => setNewParam({ ...newParam, attrKey: e.target.value })}
                      className="input input-sm bg-base-50 border border-base-300 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg min-w-28"
                    />
                  )}
                  <button
                    type="button"
                    className="btn btn-sm bg-primary text-primary-content border-none hover:bg-primary/90"
                    onClick={handleAddParam}
                    disabled={!newParam.label.trim() || (newParam.source === "roleAttr" && !newParam.attrKey.trim())}
                  >
                    添加
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {params.length === 0 && (
                    <div className="text-xs text-base-content/60">暂无自定义参数。</div>
                  )}
                  {params.map(param => (
                    <div key={param.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200">
                      <div className="flex flex-col text-sm">
                        <span className="font-medium text-base-content">{param.label || param.key}</span>
                        <span className="text-[11px] text-base-content/60">
                          键：
                          {param.key}
                        </span>
                        <span className="text-[11px] text-base-content/50">{param.source === "roleAttr" ? `来源: 角色属性 ${param.attrKey ?? ""}` : "来源: 固定/可编辑"}</span>
                      </div>
                      {spaceOwner && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleRemoveParam(param.key)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 添加表单 */}
            <div className="flex flex-col gap-2">
              <div className="relative flex flex-nowrap gap-2 overflow-x-auto pb-1 pr-8">
                <input
                  type="text"
                  placeholder="角色名"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg shrink-0"
                  style={{ width: `${calcChWidth(newItem.name, "角色名", 10, 22, 4)}ch` }}
                />
                {/* 当前 HP / 最大 HP / 先攻 输入顺序 */}
                <input
                  type="text"
                  placeholder="当前HP"
                  value={newItem.hp}
                  onChange={e => setNewItem({ ...newItem, hp: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg shrink-0"
                  style={{ width: `${calcChWidth(newItem.hp, "当前HP", 10, 18, 4)}ch` }}
                />
                <input
                  type="text"
                  placeholder="最大HP"
                  value={newItem.maxHp}
                  onChange={e => setNewItem({ ...newItem, maxHp: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg shrink-0"
                  style={{ width: `${calcChWidth(newItem.maxHp, "最大HP", 10, 18, 4)}ch` }}
                />
                <input
                  type="text"
                  placeholder="先攻"
                  value={newItem.value}
                  onChange={e => setNewItem({ ...newItem, value: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg shrink-0"
                  style={{ width: `${calcChWidth(newItem.value, "先攻", 8, 14, 4)}ch` }}
                />
                {params.map(param => (
                  <input
                    key={param.key}
                    type="text"
                    placeholder={param.label}
                    value={newExtras[param.key] ?? ""}
                    onChange={e => setNewExtras({ ...newExtras, [param.key]: e.target.value })}
                    className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg shrink-0"
                    style={{ width: `${calcChWidth(newExtras[param.key] ?? "", param.label, 8, 18, 4)}ch` }}
                    disabled={param.source === "roleAttr"}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="btn btn-md rounded px-5 bg-primary text-primary-content border-none hover:bg-primary/90 shadow-sm w-full disabled:bg-base-300 disabled:text-base-content/40"
                disabled={
                  !newItem.name
                  || (newItem.hp.trim() !== "" && Number.isNaN(Number(newItem.hp)))
                  || (newItem.maxHp.trim() !== "" && Number.isNaN(Number(newItem.maxHp)))
                }
              >
                添加
              </button>
            </div>

            {/* 排序控制（仅空间主持人可用） */}
            {spaceOwner && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[{ key: "name" as SortKey, label: "名称" }, { key: "hp" as SortKey, label: "当前HP" }, { key: "maxHp" as SortKey, label: "最大HP" }, { key: "value" as SortKey, label: "先攻" }, ...params.map(p => ({ key: { paramKey: p.key } as SortKey, label: p.label }))].map((entry) => {
                  const active = (typeof entry.key === "string" && entry.key === sortKey)
                    || (typeof entry.key === "object" && typeof sortKey === "object" && entry.key.paramKey === sortKey.paramKey);
                  const arrow = active ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
                  return (
                    <button
                      key={typeof entry.key === "string" ? entry.key : entry.key.paramKey}
                      type="button"
                      className={`btn btn-ghost btn-xs border border-base-300 ${active ? "bg-base-200" : ""}`}
                      onClick={() => {
                        // 切换排序：同列时切换方向，不同列默认升序
                        if (active) {
                          setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
                        }
                        else {
                          setSortKey(entry.key);
                          setSortDirection("asc");
                        }
                      }}
                    >
                      {entry.label}
                      <span className="ml-1 text-[11px]">{arrow}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 分割线 */}
            <div className="h-px bg-base-200" />

            {/* 编辑提示 */}
            <div className="text-[11px] text-base-content/50 px-1">
              提示：双击名称或数值可以进行编辑。
            </div>

            {/* 列表 */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {initiativeList.length === 0 && (
                <div className="text-xs text-base-content/50 text-center py-4">
                  暂无先攻记录，添加一个吧。
                </div>
              )}

              {sortedList.map((item, _index) => {
                const hp = item.hp ?? null;
                const maxHp = item.maxHp ?? null;

                return (
                  <div
                    key={item.name}
                    className="flex flex-nowrap items-center gap-3 px-4 py-3 rounded-lg bg-base-100 border border-base-200 hover:border-base-300 hover:bg-base-100/80 transition-colors group overflow-x-auto"
                  >
                    <EditableField
                      content={item.name}
                      handleContentUpdate={(newName) => {
                        handleUpdate(
                          initiativeList.map(i =>
                            i.name === item.name ? { ...i, name: newName } : i,
                          ),
                        );
                      }}
                      className="font-medium text-sm text-base-content truncate w-28 min-h-6 leading-6 inline-flex items-center shrink-0"
                      usingInput
                    >
                    </EditableField>

                    <div className="flex items-center gap-1 text-xs text-base-content/70 leading-5 shrink-0">
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
                        className="text-right tabular-nums min-h-6 leading-6 px-2 rounded-md border border-base-300 bg-base-100 inline-flex items-center justify-end"
                        autoWidth
                        minCh={6}
                        maxCh={14}
                        padCh={4}
                        usingInput
                        type="number"
                      />
                      <span className="px-1">/</span>
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
                        className="text-right tabular-nums min-h-6 leading-6 px-2 rounded-md border border-base-300 bg-base-100 inline-flex items-center justify-end"
                        autoWidth
                        minCh={6}
                        maxCh={14}
                        padCh={4}
                        usingInput
                        type="number"
                      />
                    </div>

                    {params.map(param => (
                      <div key={param.key} className="flex items-center gap-1 text-xs text-base-content/70 leading-5 shrink-0">
                        <span className="whitespace-nowrap" title={param.label}>{param.label}</span>
                        <EditableField
                          content={(item.extras?.[param.key] ?? "").toString()}
                          handleContentUpdate={val => updateItemExtras(item, param.key, val)}
                          className="text-right tabular-nums min-h-6 leading-6 px-2 rounded-md border border-base-300 bg-base-100 inline-flex items-center justify-end"
                          autoWidth
                          minCh={4}
                          maxCh={16}
                          padCh={4}
                          usingInput
                        />
                      </div>
                    ))}

                    <div className="flex items-center gap-1 text-xs text-base-content/70 leading-5 ml-auto shrink-0">
                      <span className="whitespace-nowrap">先攻</span>
                      <EditableField
                        content={item.value.toString()}
                        handleContentUpdate={(newValue) => {
                          handleUpdate(
                            initiativeList.map(i =>
                              i.name === item.name ? { ...i, value: Number(newValue) } : i,
                            ),
                          );
                        }}
                        className="text-right tabular-nums min-h-6 leading-6 px-2 rounded-md border border-base-300 bg-base-100 inline-flex items-center justify-end"
                        autoWidth
                        minCh={4}
                        maxCh={12}
                        padCh={4}
                        usingInput
                        type="number"
                      >
                      </EditableField>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.name)}
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
        <div className="p-4 space-y-4 min-w-65 max-w-sm">
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
