import type { Initiative, InitiativeDraft, InitiativeParam, InitiativeParamDraft, SortDirection, SortKey } from "./initiativeListTypes";
import { useQueryClient } from "@tanstack/react-query";
import { use, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRoomExtra } from "@/components/chat/core/hooks";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import UTILS from "@/components/common/dicer/utils/utils";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { buildMessageExtraForRequest } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useGetRolesAbilitiesQueries, useUpdateRoleAbilityByRoleIdMutation } from "../../../../../api/hooks/abilityQueryHooks";
import { useSendMessageMutation } from "../../../../../api/hooks/chatQueryHooks";
import { InitiativeImportDialog } from "./initiativeImportDialog";
import {
  extractAgilityFromQuery as extractAgilityFromAbilityQuery,
  extractAttrFromQuery as extractAttrFromAbilityQuery,
  extractHpFromQuery as extractHpFromAbilityQuery,
  extractPokemonInitiativeRoll as extractPokemonInitiativeRollFromAbilityQuery,
  stringifyRecord,
} from "./initiativeListAbilityExtractors";
import { InitiativeListControls } from "./initiativeListControls";
import { usePokemonInitiativeMetadata, useSortedInitiativeList } from "./initiativeListDerived";
import { makeUniqueKey, slugifyLabel } from "./initiativeListKeyUtils";
import { InitiativeListTable } from "./initiativeListTable";
import { formatPokemonBattleNumber } from "./initiativePokemonRules";

/**
 * 先攻列表
 */
export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const queryClient = useQueryClient();
  const roomId = roomContext.roomId ?? -1;
  const currentUserId = useGlobalUserId();
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
  const [newItem, setNewItem] = useState<InitiativeDraft>({ name: "", value: "", hp: "", maxHp: "" });
  const [newExtras, setNewExtras] = useState<Record<string, string>>({});
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [newParam, setNewParam] = useState<InitiativeParamDraft>({ key: "", label: "", source: "manual", attrKey: "" });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportPopupOpen, setIsImportPopupOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const spaceOwner = Boolean(spaceContext.isSpaceOwner);
  const curUserId = currentUserId ?? -1;
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
  }, [isPokemonRule, levelParam, params, setParams]);

  const importableRoles = spaceOwner
    ? roomRolesThatUserOwn
    : roomRolesThatUserOwn.filter(r => r.userId === curUserId);

  const abilityQueries = useGetRolesAbilitiesQueries(importableRoles.map(r => r.roleId));

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

  const sendPokemonInitiativeDiceMessage = async (
    roleName: string,
    diceResult: number,
    speedRollBonus: number,
    speedDisplay: string,
    total: number,
  ) => {
    try {
      const dicerRoleId = await UTILS.getDicerRoleId(roomContext, { queryClient });
      const result = `${roleName}的先攻掷骰：\n`
        + `1d20 = ${diceResult}，${speedDisplay}/${10} = ${speedRollBonus}\n`
        + `先攻：${diceResult} + ${speedRollBonus} = ${total}`;
      sendMessageMutation.mutate({
        roomId,
        roleId: dicerRoleId,
        messageType: MESSAGE_TYPE.DICE,
        content: result,
        extra: buildMessageExtraForRequest(MESSAGE_TYPE.DICE, { diceResult: { result } }),
      });
    }
    catch (e) {
      console.error("发送先攻骰娘消息失败", e);
    }
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

      const hpData = extractHpFromAbilityQuery(spaceContext.ruleId, abilityQueries[roleIndex]);
      const currentHp = item.hp ?? null;
      const currentMaxHp = item.maxHp ?? null;
      const nextHp = hpData?.hp ?? currentHp;
      const nextMaxHp = hpData?.maxHp ?? currentMaxHp;
      const hpChanged = currentHp !== nextHp || currentMaxHp !== nextMaxHp;

      let levelChanged = false;
      let nextExtras = item.extras;
      if (isPokemonRule && levelParam) {
        const levelValue = extractAttrFromAbilityQuery(spaceContext.ruleId, abilityQueries[roleIndex], levelParam.attrKey || "等级");
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
  }, [abilityQueries, importableRoles, initiativeList, isPokemonRule, levelParam, setInitiativeList, spaceContext.ruleId]);

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

    const pokemonRoll = extractPokemonInitiativeRollFromAbilityQuery(spaceContext.ruleId, query);
    const agi = pokemonRoll?.total ?? extractAgilityFromAbilityQuery(spaceContext.ruleId, query);
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

    const hpData = extractHpFromAbilityQuery(spaceContext.ruleId, query);
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
        const val = extractAttrFromAbilityQuery(spaceContext.ruleId, query, param.attrKey);
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

  // 删除项（宝可梦规则下：若绑定角色，移除时清零五项属性修正并发送骰娘信息）
  const handleDelete = async (item: Initiative) => {
    setInitiativeList(initiativeList.filter(i => i.name !== item.name));

    if (!isPokemonRule || typeof item.roleId !== "number" || typeof spaceContext.ruleId !== "number")
      return;

    const roleId = item.roleId;
    const idx = importableRoles.findIndex(r => r.roleId === roleId);
    if (idx === -1)
      return;

    const query = abilityQueries[idx];
    const res = query?.data;
    const record = res?.success && Array.isArray(res.data)
      ? res.data.find(entry => entry.ruleId === spaceContext.ruleId)
      : undefined;
    if (!record)
      return;

    const roleAbility: RoleAbility = {
      basic: { ...(record.basic || {}) },
      ability: { ...(record.ability || {}) },
      skill: { ...((record as any).skill || {}) },
    };

    const stageKeys = ["攻击修正", "防御修正", "特攻修正", "特防修正", "速度修正"];
    const changedLines: string[] = [];

    stageKeys.forEach((key) => {
      const currentRaw = Number(UTILS.getRoleAbilityValue(roleAbility, key));
      if (!Number.isFinite(currentRaw) || currentRaw === 0)
        return;

      UTILS.setRoleAbilityValue(roleAbility, key, "0", "ability", "auto");
      changedLines.push(`${key}：${formatPokemonBattleNumber(currentRaw)} -> 0`);
    });

    if (changedLines.length === 0)
      return;

    try {
      await updateRoleAbilityByRoleIdAsync({
        roleId,
        ruleId: spaceContext.ruleId,
        basic: stringifyRecord(roleAbility.basic as Record<string, any>),
        ability: stringifyRecord(roleAbility.ability as Record<string, any>),
        skill: stringifyRecord(roleAbility.skill as Record<string, any>),
      });

      const dicerRoleId = await UTILS.getDicerRoleId(roomContext, { queryClient });
      const result = `${item.name}已从宝可梦先攻表移除，属性修正清零：\n${changedLines.join("\n")}`;
      sendMessageMutation.mutate({
        roomId,
        roleId: dicerRoleId,
        messageType: MESSAGE_TYPE.DICE,
        content: result,
        extra: buildMessageExtraForRequest(MESSAGE_TYPE.DICE, { diceResult: { result } }),
      });
    }
    catch (e) {
      console.error("移除角色时清零属性修正失败", e);
      toast.error("角色已移除，但属性修正清零失败");
    }
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
        const maybe = extractAgilityFromAbilityQuery(spaceContext.ruleId, q);
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

  const {
    pokemonDefensiveByRoleId,
    pokemonTraitByRoleId,
    pokemonStatusByRoleId,
    pokemonItemByRoleId,
    pokemonActionPointByRoleId,
  } = usePokemonInitiativeMetadata({
    abilityQueries,
    importableRoles,
    isPokemonRule,
    ruleId: spaceContext.ruleId,
  });
  const sortedList = useSortedInitiativeList(initiativeList, sortKey, sortDirection, spaceOwner);

  const handleOpenImportPopup = () => {
    setIsImportPopupOpen(true);
  };

  const handleCloseImportPopup = () => {
    setIsImportPopupOpen(false);
  };

  const handleToggleParamEditor = () => {
    setShowParamEditor(prev => !prev);
  };

  return (
    <div className="flex flex-col bg-transparent">
      <div className="w-full p-3">
        <div className="rounded-xl border border-base-300 bg-base-300 shadow-none">
          <InitiativeListControls
            initiativeCount={initiativeList.length}
            isPokemonRule={isPokemonRule}
            spaceOwner={spaceOwner}
            importableRoleCount={importableRoles.length}
            isAdvancingRound={isAdvancingRound}
            showParamEditor={showParamEditor}
            params={params}
            displayParams={displayParams}
            newItem={newItem}
            newExtras={newExtras}
            newParam={newParam}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onNextRound={() => void handleNextRound()}
            onOpenImportPopup={handleOpenImportPopup}
            onToggleParamEditor={handleToggleParamEditor}
            onAddParam={handleAddParam}
            onRemoveParam={handleRemoveParam}
            onAddItem={handleAdd}
            setNewItem={setNewItem}
            setNewExtras={setNewExtras}
            setNewParam={setNewParam}
            setSortKey={setSortKey}
            setSortDirection={setSortDirection}
          />

          <div className="px-4 pb-3">
            <InitiativeListTable
              initiativeList={initiativeList}
              sortedList={sortedList}
              displayParams={displayParams}
              levelParam={levelParam}
              isPokemonRule={isPokemonRule}
              editingKey={editingKey}
              editingValue={editingValue}
              pokemonDefensiveByRoleId={pokemonDefensiveByRoleId}
              pokemonTraitByRoleId={pokemonTraitByRoleId}
              pokemonStatusByRoleId={pokemonStatusByRoleId}
              pokemonItemByRoleId={pokemonItemByRoleId}
              pokemonActionPointByRoleId={pokemonActionPointByRoleId}
              getEditingRef={getEditingRef}
              setEditingValue={setEditingValue}
              startEditing={startEditing}
              stopEditing={stopEditing}
              commitEditing={commitEditing}
              updateItem={updateItem}
              updateItemExtras={updateItemExtras}
              handleDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-base-300 md:hidden"></div>

      <InitiativeImportDialog
        isOpen={isImportPopupOpen}
        importableRoles={importableRoles}
        abilityQueries={abilityQueries}
        initiativeList={initiativeList}
        onClose={handleCloseImportPopup}
        onImportSingle={roleId => void handleImportSingle(roleId)}
      />
    </div>
  );
}
