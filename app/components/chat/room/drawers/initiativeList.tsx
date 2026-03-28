import { Fragment, use, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRoomExtra } from "@/components/chat/core/hooks";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import UTILS from "@/components/common/dicer/utils/utils";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { useGlobalContext } from "@/components/globalContextProvider";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useSendMessageMutation } from "../../../../../api/hooks/chatQueryHooks";
import { useGetRolesAbilitiesQueries, useUpdateRoleAbilityByRoleIdMutation } from "../../../../../api/hooks/abilityQueryHooks";

interface Initiative {
  name: string;
  value: number;
  // 新增：当前 HP 和最大 HP（可为空）
  hp?: number | null;
  maxHp?: number | null;
  // 可选的自定义参数键值对（按配置的 key 存储）
  extras?: Record<string, string | number | null>;
  // 关联来源角色ID
  roleId?: number;
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

const POKEMON_TYPE_CHART: Record<string, Record<string, number>> = {
  普通: { 岩石: 0.5, 幽灵: 0, 钢: 0.5 },
  火: { 火: 0.5, 水: 0.5, 草: 2, 冰: 2, 虫: 2, 岩石: 0.5, 龙: 0.5, 钢: 2 },
  水: { 火: 2, 水: 0.5, 草: 0.5, 地面: 2, 岩石: 2, 龙: 0.5 },
  电: { 水: 2, 电: 0.5, 草: 0.5, 地面: 0, 飞行: 2, 龙: 0.5 },
  草: { 火: 0.5, 水: 2, 草: 0.5, 毒: 0.5, 地面: 2, 飞行: 0.5, 虫: 0.5, 岩石: 2, 龙: 0.5, 钢: 0.5 },
  冰: { 火: 0.5, 水: 0.5, 草: 2, 冰: 0.5, 地面: 2, 飞行: 2, 龙: 2, 钢: 0.5 },
  格斗: { 普通: 2, 冰: 2, 毒: 0.5, 飞行: 0.5, 超能力: 0.5, 虫: 0.5, 岩石: 2, 幽灵: 0, 恶: 2, 钢: 2, 妖精: 0.5 },
  毒: { 草: 2, 毒: 0.5, 地面: 0.5, 岩石: 0.5, 幽灵: 0.5, 钢: 0, 妖精: 2 },
  地面: { 火: 2, 电: 2, 草: 0.5, 毒: 2, 飞行: 0, 虫: 0.5, 岩石: 2, 钢: 2 },
  飞行: { 电: 0.5, 草: 2, 格斗: 2, 虫: 2, 岩石: 0.5, 钢: 0.5 },
  超能力: { 格斗: 2, 毒: 2, 超能力: 0.5, 恶: 0, 钢: 0.5 },
  虫: { 火: 0.5, 草: 2, 格斗: 0.5, 毒: 0.5, 飞行: 0.5, 超能力: 2, 幽灵: 0.5, 恶: 2, 钢: 0.5, 妖精: 0.5 },
  岩石: { 火: 2, 冰: 2, 格斗: 0.5, 地面: 0.5, 飞行: 2, 虫: 2, 钢: 0.5 },
  幽灵: { 普通: 0, 超能力: 2, 幽灵: 2, 恶: 0.5 },
  龙: { 龙: 2, 钢: 0.5, 妖精: 0 },
  恶: { 格斗: 0.5, 超能力: 2, 幽灵: 2, 恶: 0.5, 妖精: 0.5 },
  钢: { 火: 0.5, 水: 0.5, 电: 0.5, 冰: 2, 岩石: 2, 钢: 0.5, 妖精: 2 },
  妖精: { 火: 0.5, 格斗: 2, 毒: 0.5, 龙: 2, 恶: 2, 钢: 0.5 },
};

const POKEMON_ATTACK_TYPES = Object.keys(POKEMON_TYPE_CHART);

function normalizePokemonType(value: string | null | undefined): string | null {
  if (!value)
    return null;
  const raw = value.trim();
  if (!raw)
    return null;
  if (raw === "一般")
    return "普通";
  return raw;
}

function computePokemonDefensiveMatchups(type1Raw: string | null | undefined, type2Raw: string | null | undefined) {
  const type1 = normalizePokemonType(type1Raw);
  const type2 = normalizePokemonType(type2Raw);
  const groups: Record<"4" | "2" | "0.5" | "0.25" | "0", string[]> = {
    4: [],
    2: [],
    0.5: [],
    0.25: [],
    0: [],
  };

  if (!type1 && !type2) {
    return groups;
  }

  for (const atkType of POKEMON_ATTACK_TYPES) {
    const m1 = type1 ? (POKEMON_TYPE_CHART[atkType]?.[type1] ?? 1) : 1;
    const m2 = type2 ? (POKEMON_TYPE_CHART[atkType]?.[type2] ?? 1) : 1;
    const total = m1 * m2;

    if (total === 4)
      groups["4"].push(atkType);
    else if (total === 2)
      groups["2"].push(atkType);
    else if (total === 0.5)
      groups["0.5"].push(atkType);
    else if (total === 0.25)
      groups["0.25"].push(atkType);
    else if (total === 0)
      groups["0"].push(atkType);
  }

  return groups;
}

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

function applyPokemonStageModifier(baseValue: number, stageModifier: number): number {
  if (!Number.isFinite(baseValue))
    return 0;

  if (!Number.isFinite(stageModifier) || stageModifier === 0)
    return baseValue;

  if (stageModifier > 0)
    return baseValue * (2 + stageModifier) / 2;

  return baseValue * 2 / (2 - stageModifier);
}

function getPokemonStageFactor(stageModifier: number): number {
  if (!Number.isFinite(stageModifier) || stageModifier === 0)
    return 1;

  if (stageModifier > 0)
    return (2 + stageModifier) / 2;

  return 2 / (2 - stageModifier);
}

function formatPokemonBattleNumber(value: number): string {
  if (!Number.isFinite(value))
    return "0";
  if (Number.isInteger(value))
    return String(value);
  return String(Math.round(value * 1000) / 1000);
}

function formatPokemonModifiedStat(label: string, baseValue: number, stageModifier: number, finalValue: number): string {
  const finalText = formatPokemonBattleNumber(finalValue);
  if (!Number.isFinite(stageModifier) || stageModifier === 0)
    return `${label}${finalText}`;

  const factor = getPokemonStageFactor(stageModifier);
  const baseText = formatPokemonBattleNumber(baseValue);
  const factorText = formatPokemonBattleNumber(factor);
  return `${label}${finalText}（${baseText}*${factorText}）`;
}

/**
 * 先攻列表
 */
export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext.roomId ?? -1;
  const globalContext = useGlobalContext();
  const initiativeRuleScope = typeof spaceContext.ruleId === "number"
    ? `rule-${spaceContext.ruleId}`
    : "default";
  const initiativeListKey = initiativeRuleScope === "default"
    ? "initiativeList"
    : `initiativeList-${initiativeRuleScope}`;
  const initiativeParamsKey = initiativeRuleScope === "default"
    ? "initiativeParams"
    : `initiativeParams-${initiativeRuleScope}`;

  const [initiativeList, setInitiativeList] = useRoomExtra<Initiative[]>(roomId, initiativeListKey, []);
  const [params, setParams] = useRoomExtra<InitiativeParam[]>(roomId, initiativeParamsKey, []);
  const [newItem, setNewItem] = useState({ name: "", value: "", hp: "", maxHp: "" });
  const [newExtras, setNewExtras] = useState<Record<string, string>>({});
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [newParam, setNewParam] = useState<{
    key: string;
    label: string;
    source: InitiativeParam["source"];
    attrKey: string;
  }>({ key: "", label: "", source: "manual", attrKey: "" });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportPopupOpen, setIsImportPopupOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const spaceOwner = spaceContext.isSpaceOwner;
  const curUserId = globalContext.userId ?? -1;
  const sendMessageMutation = useSendMessageMutation(roomId);
  const { mutateAsync: updateRoleAbilityByRoleIdAsync } = useUpdateRoleAbilityByRoleIdMutation();
  const isPokemonRule = spaceContext.ruleId === 7;
  const [isAdvancingRound, setIsAdvancingRound] = useState(false);

  const levelParam = useMemo(
    () => params.find(p => (p.attrKey ?? "").trim() === "等级" || p.label.trim() === "等级"),
    [params],
  );

  const displayParams = useMemo(() => {
    if (!isPokemonRule || !levelParam)
      return params;
    return params.filter(p => p.key !== levelParam.key);
  }, [isPokemonRule, levelParam, params]);

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

  // 规则7默认增加“等级”列（来自角色属性“等级”）。
  useEffect(() => {
    if (!isPokemonRule || levelParam)
      return;

    const key = makeUniqueKey("level", params);
    setParams([
      ...params,
      {
        key,
        label: "等级",
        source: "roleAttr",
        attrKey: "等级",
      },
    ]);
    setNewExtras(prev => ({ ...prev, [key]: "" }));
  }, [isPokemonRule, levelParam, params]);

  const importableRoles = spaceOwner
    ? roomRolesThatUserOwn
    : roomRolesThatUserOwn.filter(r => r.userId === curUserId);

  const abilityQueries = useGetRolesAbilitiesQueries(importableRoles.map(r => r.roleId));

  const parseNullableNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed)
      return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  };

  const parseNumberOrZero = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const startEditing = (key: string, value: string) => {
    setEditingKey(key);
    setEditingValue(value);
  };

  const stopEditing = () => {
    setEditingKey(null);
    setEditingValue("");
  };

  const commitEditing = (key: string, apply: (value: string) => void) => {
    if (editingKey !== key)
      return;
    apply(editingValue);
    stopEditing();
  };

  const getEditingRef = (key: string) => (node: HTMLInputElement | null) => {
    if (editingKey === key) {
      editingInputRef.current = node;
    }
  };

  useEffect(() => {
    if (!editingKey)
      return;
    if (!editingInputRef.current)
      return;
    editingInputRef.current.focus();
    editingInputRef.current.select();
  }, [editingKey]);

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

    const tryPickScalar = (obj: any): number | null => {
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

      // 对象：优先看有无 name/label 字段匹配，再看 key 匹配
      if (typeof node === "object" && !Array.isArray(node)) {
        const keys = Object.keys(node);

        // 如果有 name/label/title 匹配候选，取 value/数值字段
        const nameField = node.name ?? node.label ?? node.title;
        if (typeof nameField === "string") {
          const ln = lower(nameField);
          if (_candidates.some(c => ln.includes(lower(c)))) {
            const val = tryPickScalar(node.value ?? node.val ?? node.score ?? node.num);
            if (val != null)
              return val;
          }
        }

        // 键名直接匹配候选时，读取其数值或深挖其子节点
        for (const k of keys) {
          const lk = lower(k);
          if (_candidates.some(c => lk.includes(lower(c)))) {
            const val = tryPickScalar(node[k]) ?? search(node[k], _candidates, depth + 1);
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

    // 规则7（宝可梦trpg）：导入先攻按 1d20 + 速度/10（向下取整）。
    if (ruleId === 7) {
      const speedKeys = ["速度", "speed", "spd"];
      const speed = search(source, speedKeys);
      if (speed != null) {
        const speedStageKeys = ["速度修正", "speedstage", "spdstage"];
        const speedStage = search(source, speedStageKeys) ?? 0;
        const finalSpeed = applyPokemonStageModifier(speed, speedStage);
        const diceResult = Math.floor(Math.random() * 20) + 1;
        return diceResult + Math.floor(finalSpeed / 10);
      }
    }

    return search(source, initiativeKeys) ?? search(source, agilityKeys);
  };

  const extractPokemonInitiativeRoll = (
    query: ReturnType<typeof useGetRolesAbilitiesQueries>[number] | undefined,
  ): { total: number; diceResult: number; speedRollBonus: number; speedDisplay: string } | null => {
    const res = query?.data;
    if (!res?.success || !Array.isArray(res.data) || spaceContext.ruleId !== 7)
      return null;

    const record = res.data.find(item => item.ruleId === 7);
    if (!record)
      return null;

    const source: Record<string, any> = { ...(record.ability || {}), ...(record.basic || {}), ...(record as any).skill };
    const speedKeys = ["速度", "speed", "spd"];
    const lower = (s: string) => String(s).toLowerCase();

    const tryPickScalar = (obj: any): number | null => {
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

    const search = (node: any, candidates: string[], depth = 0): number | null => {
      if (node == null || depth > 3)
        return null;

      if (typeof node === "object" && !Array.isArray(node)) {
        const keys = Object.keys(node);

        for (const k of keys) {
          const lk = lower(k);
          if (candidates.some(c => lk.includes(lower(c)))) {
            const val = tryPickScalar(node[k]) ?? search(node[k], candidates, depth + 1);
            if (val != null)
              return val;
          }
        }

        for (const k of keys) {
          const found = search(node[k], candidates, depth + 1);
          if (found != null)
            return found;
        }
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          const found = search(item, candidates, depth + 1);
          if (found != null)
            return found;
        }
      }

      return null;
    };

    const speed = search(source, speedKeys);
    if (speed == null)
      return null;

    const speedStageKeys = ["速度修正", "speedstage", "spdstage"];
    const speedStage = search(source, speedStageKeys) ?? 0;
    const finalSpeed = applyPokemonStageModifier(speed, speedStage);
    const speedDisplay = formatPokemonModifiedStat("速度", speed, speedStage, finalSpeed);

    const diceResult = Math.floor(Math.random() * 20) + 1;
    const speedRollBonus = Math.floor(finalSpeed / 10);
    return {
      total: diceResult + speedRollBonus,
      diceResult,
      speedRollBonus,
      speedDisplay,
    };
  };

  const sendPokemonInitiativeDiceMessage = async (
    roleName: string,
    diceResult: number,
    speedRollBonus: number,
    speedDisplay: string,
    total: number,
  ) => {
    try {
      const dicerRoleId = await UTILS.getDicerRoleId(roomContext);
      const result = `${roleName}的先攻掷骰：\n`
        + `1d20 = ${diceResult}，${speedDisplay}/${10} = ${speedRollBonus}\n`
        + `先攻：${diceResult} + ${speedRollBonus} = ${total}`;
      sendMessageMutation.mutate({
        roomId,
        roleId: dicerRoleId,
        messageType: MESSAGE_TYPE.DICE,
        content: result,
        extra: { result },
      });
    }
    catch (e) {
      console.error("发送先攻骰娘消息失败", e);
    }
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
  ): { hp: number | null; maxHp: number | null } | null => {
    const res = query?.data;
    if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId)
      return null;

    const ruleId = spaceContext.ruleId;
    const record = res.data.find(item => item.ruleId === ruleId);
    if (!record)
      return null;

    const source: Record<string, any> = record.ability || {};
    const entries = Object.entries(source);
    if (!entries.length)
      return { hp: null, maxHp: null };

    const normalizeKey = (s: string) => String(s).toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
    const hpKeys = ["hp", "当前hp", "生命", "生命值", "体力", "血量", "health"].map(normalizeKey);
    const maxHpKeys = ["最大hp", "maxhp", "hp上限", "最大生命", "最大生命值", "最大体力", "最大血量", "maxhealth"].map(normalizeKey);

    const valueByKey = new Map<string, number>();
    for (const [k, v] of entries) {
      const num = Number(v);
      if (!Number.isFinite(num))
        continue;
      valueByKey.set(normalizeKey(k), num);
    }

    const pickFirst = (keys: string[]) => {
      for (const key of keys) {
        const found = valueByKey.get(key);
        if (found != null)
          return found;
      }
      return null;
    };

    const hp = pickFirst(hpKeys);
    const maxHp = pickFirst(maxHpKeys);

    return { hp, maxHp };
  };

  // 绑定了 roleId 的先攻项，会随角色 hp / 最大hp 变化自动同步。
  useEffect(() => {
    if (initiativeList.length === 0)
      return;

    let changed = false;
    const nextList = initiativeList.map((item) => {
      if (typeof item.roleId !== "number")
        return item;

      const roleIndex = importableRoles.findIndex(r => r.roleId === item.roleId);
      if (roleIndex === -1)
        return item;

      const hpData = extractHpFromQuery(abilityQueries[roleIndex]);
      const currentHp = item.hp ?? null;
      const currentMaxHp = item.maxHp ?? null;
      const nextHp = hpData?.hp ?? currentHp;
      const nextMaxHp = hpData?.maxHp ?? currentMaxHp;
      const hpChanged = currentHp !== nextHp || currentMaxHp !== nextMaxHp;

      let levelChanged = false;
      let nextExtras = item.extras;
      if (isPokemonRule && levelParam) {
        const levelValue = extractAttrFromQuery(abilityQueries[roleIndex], levelParam.attrKey || "等级");
        if (levelValue != null) {
          const currentLevel = item.extras?.[levelParam.key] ?? null;
          const normalizedLevel = typeof levelValue === "number" ? levelValue : String(levelValue);
          if (currentLevel !== normalizedLevel) {
            levelChanged = true;
            nextExtras = {
              ...(item.extras ?? {}),
              [levelParam.key]: normalizedLevel,
            };
          }
        }
      }

      if (!hpChanged && !levelChanged)
        return item;

      changed = true;
      return {
        ...item,
        hp: nextHp,
        maxHp: nextMaxHp,
        ...(levelChanged ? { extras: nextExtras } : {}),
      };
    });

    if (changed)
      setInitiativeList(nextList);
  }, [initiativeList, importableRoles, abilityQueries, isPokemonRule, levelParam]);

  // 仅导入单个角色
  const handleImportSingle = async (roleId: number) => {
    const idx = importableRoles.findIndex(r => r.roleId === roleId);
    if (idx === -1)
      return;

    // 严格使用同 index 的 query，避免错位
    const query = abilityQueries[idx];

    // 检测规则一致性：如果有数据但没有当前规则的数据，提示用户
    const res = query?.data;
    if (res?.success && Array.isArray(res.data) && spaceContext.ruleId) {
      const hasMatchingRule = res.data.some(item => item.ruleId === spaceContext.ruleId);
      if (!hasMatchingRule && res.data.length > 0) {
        toast.error("导入失败：请检查角色卡规则与空间设置的规则是否一致");
        return;
      }
    }

    const pokemonRoll = extractPokemonInitiativeRoll(query);
    const agi = pokemonRoll?.total ?? extractAgilityFromQuery(query);
    if (agi == null)
      return;

    // 宝可梦规则：导入角色时将“行动点”同步为“最大行动点”
    if (isPokemonRule && typeof spaceContext.ruleId === "number") {
      const res = query?.data;
      const record = res?.success && Array.isArray(res.data)
        ? res.data.find(entry => entry.ruleId === spaceContext.ruleId)
        : undefined;

      if (record) {
        const roleAbility: RoleAbility = {
          basic: { ...(record.basic || {}) },
          ability: { ...(record.ability || {}) },
          skill: { ...((record as any).skill || {}) },
        };

        const actionPointKeys = ["行动点", "行动值", "AP", "ap"];
        const maxActionPointKeys = ["最大行动点", "最大行动值", "最大AP", "maxAP", "maxAp", "max_action_point"];

        const actionPointKey = actionPointKeys.find(key => UTILS.getRoleAbilityValue(roleAbility, key) != null) ?? "行动点";
        const maxActionPointKey = maxActionPointKeys.find(key => UTILS.getRoleAbilityValue(roleAbility, key) != null);

        if (maxActionPointKey) {
          const maxActionPoint = Number(UTILS.getRoleAbilityValue(roleAbility, maxActionPointKey));
          if (Number.isFinite(maxActionPoint)) {
            UTILS.setRoleAbilityValue(roleAbility, actionPointKey, String(maxActionPoint), "ability", "auto");

            const stringifyRecord = (obj?: Record<string, any>): Record<string, string> => {
              const result: Record<string, string> = {};
              if (!obj)
                return result;
              Object.entries(obj).forEach(([k, v]) => {
                result[k] = String(v ?? "");
              });
              return result;
            };

            try {
              await updateRoleAbilityByRoleIdAsync({
                roleId,
                ruleId: spaceContext.ruleId,
                basic: stringifyRecord(roleAbility.basic as Record<string, any>),
                ability: stringifyRecord(roleAbility.ability as Record<string, any>),
                skill: stringifyRecord(roleAbility.skill as Record<string, any>),
              });
            }
            catch {
              toast.error("导入成功，但同步行动点失败");
            }
          }
        }
      }
    }

    const hpData = extractHpFromQuery(query);
    const hp = hpData?.hp ?? null;
    const maxHp = hpData?.maxHp ?? null;

    const role = importableRoles[idx];
    const baseName = role.roleName ?? `角色${role.roleId}`;

    // 自动重名处理：如果名字重复，自动添加序号
    let name = baseName;
    let suffix = 2;
    while (initiativeList.some(i => i.name === name)) {
      name = `${baseName} ${suffix}`;
      suffix += 1;
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
      { name, value: agi, hp, maxHp, extras, roleId },
    ];
    setInitiativeList(next.sort((a, b) => b.value - a.value));

    if (pokemonRoll) {
      void sendPokemonInitiativeDiceMessage(
        name,
        pokemonRoll.diceResult,
        pokemonRoll.speedRollBonus,
        pokemonRoll.speedDisplay,
        pokemonRoll.total,
      );
    }

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

  const handleNextRound = async () => {
    if (!isPokemonRule || typeof spaceContext.ruleId !== "number")
      return;

    if (isAdvancingRound)
      return;

    const roleItems = initiativeList.filter(i => typeof i.roleId === "number");
    if (roleItems.length === 0) {
      toast.error("先攻表中没有可更新行动点的角色");
      return;
    }

    setIsAdvancingRound(true);

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      for (const item of roleItems) {
        const roleId = item.roleId as number;
        const idx = importableRoles.findIndex(r => r.roleId === roleId);
        if (idx === -1) {
          skippedCount += 1;
          continue;
        }

        const query = abilityQueries[idx];
        const res = query?.data;
        if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId) {
          skippedCount += 1;
          continue;
        }

        const record = res.data.find(entry => entry.ruleId === spaceContext.ruleId);
        if (!record) {
          skippedCount += 1;
          continue;
        }

        const roleAbility: RoleAbility = {
          basic: { ...(record.basic || {}) },
          ability: { ...(record.ability || {}) },
          skill: { ...((record as any).skill || {}) },
        };

        const actionPointKeys = ["行动点", "行动值", "AP", "ap"];
        const maxActionPointKeys = ["最大行动点", "最大行动值", "最大AP", "maxAP", "maxAp", "max_action_point"];

        const actionPointKey = actionPointKeys.find(key => UTILS.getRoleAbilityValue(roleAbility, key) != null);
        const maxActionPointKey = maxActionPointKeys.find(key => UTILS.getRoleAbilityValue(roleAbility, key) != null);

        if (!actionPointKey || !maxActionPointKey) {
          skippedCount += 1;
          continue;
        }

        const currentActionPoint = Number(UTILS.getRoleAbilityValue(roleAbility, actionPointKey));
        const maxActionPoint = Number(UTILS.getRoleAbilityValue(roleAbility, maxActionPointKey));
        if (!Number.isFinite(currentActionPoint) || !Number.isFinite(maxActionPoint)) {
          skippedCount += 1;
          continue;
        }

        const nextActionPoint = Math.min(8, currentActionPoint + maxActionPoint);
        UTILS.setRoleAbilityValue(roleAbility, actionPointKey, String(nextActionPoint), "ability", "auto");

        const stringifyRecord = (obj?: Record<string, any>): Record<string, string> => {
          const result: Record<string, string> = {};
          if (!obj)
            return result;
          Object.entries(obj).forEach(([k, v]) => {
            result[k] = String(v ?? "");
          });
          return result;
        };

        try {
          await updateRoleAbilityByRoleIdAsync({
            roleId,
            ruleId: spaceContext.ruleId,
            basic: stringifyRecord(roleAbility.basic as Record<string, any>),
            ability: stringifyRecord(roleAbility.ability as Record<string, any>),
            skill: stringifyRecord(roleAbility.skill as Record<string, any>),
          });
          updatedCount += 1;
        }
        catch {
          failedCount += 1;
        }
      }

      if (updatedCount > 0) {
        toast.success(`下一轮完成：更新${updatedCount}个角色${skippedCount > 0 ? `，跳过${skippedCount}个` : ""}${failedCount > 0 ? `，失败${failedCount}个` : ""}`);
      }
      else if (failedCount > 0) {
        toast.error(`下一轮失败：失败${failedCount}个角色${skippedCount > 0 ? `，跳过${skippedCount}个` : ""}`);
      }
      else {
        toast.error("下一轮未执行：未找到可用的行动点与最大行动点数据");
      }
    }
    finally {
      setIsAdvancingRound(false);
    }
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

  const updateItem = (item: Initiative, patch: Partial<Initiative>) => {
    handleUpdate(
      initiativeList.map(i => (i.name === item.name ? { ...i, ...patch } : i)),
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

  const pokemonDefensiveByRoleId = useMemo(() => {
    const result = new Map<number, Record<"4" | "2" | "0.5" | "0.25" | "0", string[]>>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const query = abilityQueries[idx];
      const res = query?.data;
      if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId)
        return;

      const record = res.data.find(item => item.ruleId === spaceContext.ruleId);
      if (!record)
        return;

      const source: Record<string, any> = { ...(record.ability || {}), ...(record.basic || {}), ...(record as any).skill };
      const type1 = source.属性1 ?? source.type1 ?? source.属性 ?? source.type;
      const type2 = source.属性2 ?? source.type2;

      result.set(role.roleId, computePokemonDefensiveMatchups(type1, type2));
    });

    return result;
  }, [isPokemonRule, importableRoles, abilityQueries, spaceContext.ruleId]);

  const pokemonTraitByRoleId = useMemo(() => {
    const result = new Map<number, string>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const query = abilityQueries[idx];
      const res = query?.data;
      if (!res?.success || !Array.isArray(res.data) || !spaceContext.ruleId)
        return;

      const record = res.data.find(item => item.ruleId === spaceContext.ruleId);
      if (!record)
        return;

      const source: Record<string, any> = { ...(record.ability || {}), ...(record.basic || {}), ...(record as any).skill };
      const trait = source.特性 ?? source.ability;

      if (trait != null && String(trait).trim() !== "") {
        result.set(role.roleId, String(trait).trim());
      }
    });

    return result;
  }, [isPokemonRule, importableRoles, abilityQueries, spaceContext.ruleId]);

  const pokemonActionPointByRoleId = useMemo(() => {
    const result = new Map<number, string>();
    if (!isPokemonRule)
      return result;

    importableRoles.forEach((role, idx) => {
      const query = abilityQueries[idx];
      const actionPoint = extractAttrFromQuery(query, "行动点")
        ?? extractAttrFromQuery(query, "行动值")
        ?? extractAttrFromQuery(query, "AP")
        ?? extractAttrFromQuery(query, "ap");

      if (actionPoint != null && String(actionPoint).trim() !== "") {
        result.set(role.roleId, String(actionPoint).trim());
      }
    });

    return result;
  }, [isPokemonRule, importableRoles, abilityQueries, spaceContext.ruleId]);

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
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-base-content truncate">先攻列表</span>
              <span className="text-xs text-base-content/60 truncate">
                共
                {" "}
                {initiativeList.length}
                {" "}
                项
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isPokemonRule && spaceOwner && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => void handleNextRound()}
                  disabled={isAdvancingRound}
                >
                  {isAdvancingRound ? "结算中..." : "下一轮"}
                </button>
              )}
              {importableRoles.length > 0 && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => setIsImportPopupOpen(true)}
                >
                  导入先攻
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
              <div className="rounded-md border border-base-200 bg-base-100 p-3 space-y-2">
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
                    className="input input-sm bg-base-50 border border-base-300 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md min-w-32"
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
                      className="input input-sm bg-base-50 border border-base-300 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md min-w-28"
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
                <div className="flex flex-col gap-1">
                  {params.length === 0 && (
                    <div className="text-xs text-base-content/60">暂无自定义参数。</div>
                  )}
                  {params.map(param => (
                    <div key={param.key} className="flex items-center justify-between px-3 py-2 rounded-md bg-base-200">
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
            <div className="flex flex-col gap-1">
              <div className="relative flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="角色名"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
                />
                {/* 当前 HP / 最大 HP / 先攻 输入顺序 */}
                <input
                  type="text"
                  placeholder="先攻"
                  value={newItem.value}
                  onChange={e => setNewItem({ ...newItem, value: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
                />
                <input
                  type="text"
                  placeholder="当前HP"
                  value={newItem.hp}
                  onChange={e => setNewItem({ ...newItem, hp: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
                />
                <input
                  type="text"
                  placeholder="最大HP"
                  value={newItem.maxHp}
                  onChange={e => setNewItem({ ...newItem, maxHp: e.target.value })}
                  className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
                />

                {displayParams.map(param => (
                  <input
                    key={param.key}
                    type="text"
                    placeholder={param.label}
                    value={newExtras[param.key] ?? ""}
                    onChange={e => setNewExtras({ ...newExtras, [param.key]: e.target.value })}
                    className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px]"
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
              <div className="flex flex-wrap items-center gap-2 p-2">
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
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    {isPokemonRule && <th className="text-xs font-semibold text-base-content/70">等级</th>}
                    <th className="text-xs font-semibold text-base-content/70">角色名</th>
                    <th className="text-xs font-semibold text-base-content/70">HP</th>
                    {isPokemonRule && <th className="text-xs font-semibold text-base-content/70">行动点</th>}
                    <th className="text-xs font-semibold text-base-content/70">先攻</th>
                  </tr>
                </thead>
                <tbody>
                  {initiativeList.length === 0
                    ? (
                        <tr>
                          <td colSpan={isPokemonRule ? 5 : 3} className="text-xs text-base-content/50 text-center py-4">
                            暂无先攻记录，添加一个吧。
                          </td>
                        </tr>
                      )
                    : (
                        sortedList.map((item, _index) => {
                          const hp = item.hp ?? null;
                          const maxHp = item.maxHp ?? null;
                          const levelValue = levelParam ? item.extras?.[levelParam.key] : null;
                          const defensiveMatchup = typeof item.roleId === "number"
                            ? pokemonDefensiveByRoleId.get(item.roleId)
                            : undefined;
                          const traitText = typeof item.roleId === "number"
                            ? (pokemonTraitByRoleId.get(item.roleId) ?? "--")
                            : "--";
                          const actionPointText = typeof item.roleId === "number"
                            ? (pokemonActionPointByRoleId.get(item.roleId) ?? "--")
                            : "--";
                          const multiplierText = (() => {
                            if (!defensiveMatchup)
                              return "--";
                            const order: Array<"4" | "2" | "0.5" | "0.25" | "0"> = ["4", "2", "0.5", "0.25", "0"];
                            const spacing = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
                            const segments = order
                              .filter(multiplier => defensiveMatchup[multiplier].length > 0)
                              .map(multiplier => `${multiplier}：${defensiveMatchup[multiplier].join("/")}`);
                            return segments.length > 0 ? segments.join(spacing) : "--";
                          })();
                          const rowKey = item.name || `${_index}`;
                          const nameEditKey = `${rowKey}:name`;
                          const hpEditKey = `${rowKey}:hp`;
                          const maxHpEditKey = `${rowKey}:maxHp`;
                          const valueEditKey = `${rowKey}:value`;

                          return (
                            <Fragment key={rowKey}>
                              <tr className="group hover">
                              {isPokemonRule && (
                                <td className="align-top">
                                  <div className="text-sm tabular-nums min-h-6 leading-6 px-1">{levelValue != null && levelValue !== "" ? String(levelValue) : "--"}</div>
                                </td>
                              )}
                              <td className="align-top">
                                {editingKey === nameEditKey
                                  ? (
                                      <input
                                        ref={getEditingRef(nameEditKey)}
                                        type="text"
                                        value={editingValue}
                                        onChange={e => setEditingValue(e.target.value)}
                                        onBlur={() => {
                                          commitEditing(nameEditKey, val => updateItem(item, { name: val }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            commitEditing(nameEditKey, val => updateItem(item, { name: val }));
                                          }
                                          if (e.key === "Escape") {
                                            e.preventDefault();
                                            stopEditing();
                                          }
                                        }}
                                        className="input input-xs bg-base-100 border border-base-300 text-sm font-medium text-base-content w-full min-h-6 leading-6 min-w-0"
                                      />
                                    )
                                  : (
                                      <button
                                        type="button"
                                        className="text-left text-sm font-medium text-base-content w-full min-h-6 leading-6 truncate px-1 min-w-0"
                                        onDoubleClick={() => startEditing(nameEditKey, item.name)}
                                        title="双击编辑"
                                      >
                                        {item.name}
                                      </button>
                                    )}
                              </td>
                              <td className="align-top">
                                <div className="flex items-center gap-0.5 text-xs text-base-content/70 leading-5">
                                  {editingKey === hpEditKey
                                    ? (
                                        <input
                                          ref={getEditingRef(hpEditKey)}
                                          type="number"
                                          value={editingValue}
                                          onChange={e => setEditingValue(e.target.value)}
                                          onBlur={() => {
                                            commitEditing(hpEditKey, val => updateItem(item, { hp: parseNullableNumber(val) }));
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              commitEditing(hpEditKey, val => updateItem(item, { hp: parseNullableNumber(val) }));
                                            }
                                            if (e.key === "Escape") {
                                              e.preventDefault();
                                              stopEditing();
                                            }
                                          }}
                                          className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                        />
                                      )
                                    : (
                                        <button
                                          type="button"
                                          className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                          onDoubleClick={() => startEditing(hpEditKey, hp != null ? String(hp) : "")}
                                          title="双击编辑"
                                        >
                                          {hp != null ? String(hp) : "--"}
                                        </button>
                                      )}
                                  <span className="px-1">/</span>
                                  {editingKey === maxHpEditKey
                                    ? (
                                        <input
                                          ref={getEditingRef(maxHpEditKey)}
                                          type="number"
                                          value={editingValue}
                                          onChange={e => setEditingValue(e.target.value)}
                                          onBlur={() => {
                                            commitEditing(maxHpEditKey, val => updateItem(item, { maxHp: parseNullableNumber(val) }));
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              commitEditing(maxHpEditKey, val => updateItem(item, { maxHp: parseNullableNumber(val) }));
                                            }
                                            if (e.key === "Escape") {
                                              e.preventDefault();
                                              stopEditing();
                                            }
                                          }}
                                          className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                        />
                                      )
                                    : (
                                        <button
                                          type="button"
                                          className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                          onDoubleClick={() => startEditing(maxHpEditKey, maxHp != null ? String(maxHp) : "")}
                                          title="双击编辑"
                                        >
                                          {maxHp != null ? String(maxHp) : "--"}
                                        </button>
                                      )}
                                </div>

                                {displayParams.length > 0 && (
                                  <div className="mt-1 flex flex-wrap items-center gap-0.5 text-xs text-base-content/70 leading-5">
                                    {displayParams.map(param => (
                                      <div key={param.key} className="flex items-center gap-0.5">
                                        <span className="whitespace-nowrap" title={param.label}>{param.label}</span>
                                        {editingKey === `${rowKey}:extra:${param.key}`
                                          ? (
                                              <input
                                                ref={getEditingRef(`${rowKey}:extra:${param.key}`)}
                                                type="text"
                                                value={editingValue}
                                                onChange={e => setEditingValue(e.target.value)}
                                                onBlur={() => {
                                                  commitEditing(`${rowKey}:extra:${param.key}`, val => updateItemExtras(item, param.key, val));
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    commitEditing(`${rowKey}:extra:${param.key}`, val => updateItemExtras(item, param.key, val));
                                                  }
                                                  if (e.key === "Escape") {
                                                    e.preventDefault();
                                                    stopEditing();
                                                  }
                                                }}
                                                className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                              />
                                            )
                                          : (
                                              <button
                                                type="button"
                                                className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                                onDoubleClick={() => startEditing(`${rowKey}:extra:${param.key}`, (item.extras?.[param.key] ?? "").toString())}
                                                title="双击编辑"
                                              >
                                                {(item.extras?.[param.key] ?? "--").toString()}
                                              </button>
                                            )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {isPokemonRule && (
                                <td className="align-top">
                                  <div className="text-sm tabular-nums min-h-6 leading-6 px-1">
                                    {actionPointText}
                                  </div>
                                </td>
                              )}
                              <td className="align-top">
                                <div className="flex items-center gap-2 text-xs text-base-content/70 leading-6">
                                  {editingKey === valueEditKey
                                    ? (
                                        <input
                                          ref={getEditingRef(valueEditKey)}
                                          type="number"
                                          value={editingValue}
                                          onChange={e => setEditingValue(e.target.value)}
                                          onBlur={() => {
                                            commitEditing(valueEditKey, val => updateItem(item, { value: parseNumberOrZero(val) }));
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              commitEditing(valueEditKey, val => updateItem(item, { value: parseNumberOrZero(val) }));
                                            }
                                            if (e.key === "Escape") {
                                              e.preventDefault();
                                              stopEditing();
                                            }
                                          }}
                                          className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                        />
                                      )
                                    : (
                                        <button
                                          type="button"
                                          className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                          onDoubleClick={() => startEditing(valueEditKey, item.value.toString())}
                                          title="双击编辑"
                                        >
                                          {item.value.toString()}
                                        </button>
                                      )}

                                  <button
                                    type="button"
                                    onClick={() => handleDelete(item.name)}
                                    className="btn btn-ghost btn-square btn-xs text-error hover:bg-error/5 border-none px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="删除"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                              </tr>
                              {isPokemonRule && (
                                <tr key={`${rowKey}:multiplier`}>
                                  <td colSpan={5} className="pt-0 pb-1">
                                    <div className="text-[11px] text-base-content/60 px-1 whitespace-normal wrap-break-word">
                                      属性克制倍率
                                      {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                                      {multiplierText}
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {isPokemonRule && (
                                <tr key={`${rowKey}:trait`}>
                                  <td colSpan={5} className="pt-0 pb-1">
                                    <div className="text-[11px] text-base-content/60 px-1 whitespace-normal wrap-break-word">
                                      特性
                                      {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                                      {traitText}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })
                      )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端下的分割线，与其他模块对齐 */}
      <div className="h-px bg-base-300 md:hidden"></div>

      {/* 导入角色敏捷 */}
      <ToastWindow
        isOpen={isImportPopupOpen}
        onClose={() => setIsImportPopupOpen(false)}
        fullScreen={false}
      >
        <div className="p-4 space-y-4 min-w-65 max-w-sm">
          <h3 className="text-base font-semibold">从角色导入先攻（敏捷）</h3>
          <p className="text-xs text-base-content/60">
            选择一个角色，从其当前规则的能力/基础属性中自动识别“敏捷”等字段并填入先攻列表。
          </p>
          <div className="flex flex-col gap-2">
            {importableRoles.map((role, idx) => {
              const q = abilityQueries[idx];
              const loading = q.isLoading;
              const hasData = !!q.data && q.data.success;
              const name = role.roleName ?? `角色${role.roleId}`;
              // 优先通过 ID 判断是否已导入，没有 ID 则通过名字判断（兼容旧数据）
              const isImported = initiativeList.some((i) => {
                if (typeof i.roleId === "number") {
                  return i.roleId === role.roleId;
                }
                return i.name === name;
              });

              return (
                <div
                  key={role.roleId}
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-base-100 border border-base-200"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {name}
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
                    onClick={() => void handleImportSingle(role.roleId)}
                  >
                    {isImported ? "再次导入" : "导入"}
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
      </ToastWindow>
    </div>
  );
}
