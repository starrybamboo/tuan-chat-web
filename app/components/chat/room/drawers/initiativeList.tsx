import type { RoleAbility } from "../../../../../api";
import type { Initiative, InitiativeDraft, InitiativeParam, InitiativeParamDraft, SortDirection, SortKey } from "./initiativeListTypes";
import type { StateEventAtom } from "@/types/stateEvent";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { useStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { useGlobalUserId } from "@/components/globalContextProvider";
import {
  buildCommandStateEventExtra,
  STATE_EVENT_COMBAT_COLUMN_SOURCE,
  toApiMessageExtraWithStateEvent,
} from "@/types/stateEvent";
import { useGetRolesAbilitiesQueries } from "../../../../../api/hooks/abilityQueryHooks";
import { MessageType } from "../../../../../api/wsModels";
import { buildAllInitiativeCombatMessageRequest } from "./initiativeCommandRequest";
import { InitiativeImportDialog } from "./initiativeImportDialog";
import {
  extractAgilityFromQuery as extractAgilityFromAbilityQuery,
  extractHpFromQuery as extractHpFromAbilityQuery,
  parseNullableNumber,
} from "./initiativeListAbilityExtractors";
import { InitiativeListControls } from "./initiativeListControls";
import { useSortedInitiativeList } from "./initiativeListDerived";
import {
  buildImportRoleInitiativeEvents,
  buildInitiativeOrderSetAtom,
  buildRemoveInitiativeEvents,
  buildUpdateInitiativeEvents,
  buildUpdateInitiativeExtraEvents,
  normalizeCombatValue,
} from "./initiativeListEvents";
import { makeUniqueKey, slugifyLabel } from "./initiativeListKeyUtils";
import { InitiativeListTable } from "./initiativeListTable";

const DEFAULT_NEW_PARAM: InitiativeParamDraft = {
  key: "",
  label: "",
  source: "manual",
  attrKey: "",
  stateKey: "",
};

function createManualParticipantId(): string {
  const randomId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `manual:${randomId}`;
}

function readAbilityValue(roleAbility: RoleAbility | null | undefined, key: string | undefined): string | number | null {
  const normalizedKey = key?.trim().toLowerCase();
  if (!normalizedKey) {
    return null;
  }
  const sources = [roleAbility?.ability, roleAbility?.basic, roleAbility?.skill];
  for (const source of sources) {
    if (!source) {
      continue;
    }
    for (const [candidateKey, value] of Object.entries(source)) {
      if (candidateKey.trim().toLowerCase() !== normalizedKey || value == null) {
        continue;
      }
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : String(value);
    }
  }
  return null;
}

function getNumericValue(values: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = values[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function toColumnSource(source: InitiativeParam["source"]) {
  if (source === "roleAttr") {
    return STATE_EVENT_COMBAT_COLUMN_SOURCE.ROLE_ATTR;
  }
  if (source === "stateKey") {
    return STATE_EVENT_COMBAT_COLUMN_SOURCE.STATE_KEY;
  }
  return STATE_EVENT_COMBAT_COLUMN_SOURCE.MANUAL;
}

/**
 * 先攻列表。参与者、顺序和自定义列都来自统一 combat runtime。
 */
export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const runtime = useStateRuntimeContext();
  const currentUserId = useGlobalUserId();
  const [newItem, setNewItem] = useState<InitiativeDraft>({ name: "", value: "", hp: "", maxHp: "" });
  const [newExtras, setNewExtras] = useState<Record<string, string>>({});
  const [showParamEditor, setShowParamEditor] = useState(false);
  const [newParam, setNewParam] = useState<InitiativeParamDraft>(DEFAULT_NEW_PARAM);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportPopupOpen, setIsImportPopupOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const spaceOwner = Boolean(spaceContext.isSpaceOwner);
  const curUserId = currentUserId ?? -1;
  const roomRolesThatUserOwn = roomContext.roomRolesThatUserOwn ?? [];
  const importableRoles = spaceOwner
    ? roomRolesThatUserOwn
    : roomRolesThatUserOwn.filter(r => r.userId === curUserId);
  const abilityQueries = useGetRolesAbilitiesQueries(importableRoles.map(r => r.roleId));

  const params = useMemo<InitiativeParam[]>(
    () => runtime.columns.map(column => ({
      key: column.key,
      label: column.label,
      source: column.source,
      attrKey: column.attrKey,
      stateKey: column.stateKey,
    })),
    [runtime.columns],
  );
  const displayParams = params;

  const initiativeList = useMemo<Initiative[]>(() => {
    return runtime.participants.map((participant) => {
      const stateValues = {
        ...participant.baseValues,
        ...participant.derivedValues,
      };
      const participantValues = participant.values;
      const hp = getNumericValue(participant.derivedValues, ["hp"])
        ?? getNumericValue(participantValues, ["hp"]);
      const maxHp = getNumericValue(stateValues, ["maxHp", "maxhp", "hpMax", "hpmax"])
        ?? getNumericValue(participantValues, ["maxHp", "maxhp"]);
      const roleAbility = typeof participant.roleId === "number"
        ? runtime.fallbackRoleAbilitiesByRoleId[participant.roleId]
        : null;
      const extras = Object.fromEntries(params.map((param) => {
        const manualValue = participantValues[param.key];
        if (manualValue != null) {
          return [param.key, manualValue];
        }
        if (param.source === "stateKey") {
          const key = param.stateKey ?? param.key;
          return [param.key, participant.derivedValues[key] ?? participant.baseValues[key] ?? ""];
        }
        if (param.source === "roleAttr") {
          return [param.key, readAbilityValue(roleAbility, param.attrKey) ?? ""];
        }
        return [param.key, ""];
      }));
      return {
        participantId: participant.participantId,
        name: participant.name,
        value: participant.initiative,
        hp,
        maxHp,
        extras,
        roleId: participant.roleId,
        activeStates: participant.activeStates.map(state => (
          `${state.statusName}${typeof state.remainingTurns === "number" ? ` ${state.remainingTurns}T` : ""}`
        )),
      };
    });
  }, [params, runtime.fallbackRoleAbilitiesByRoleId, runtime.participants]);

  const sendCombatEvents = useCallback(async (events: StateEventAtom[], content = ".combat") => {
    if (!roomContext.sendMessageWithInsert || !roomContext.roomId) {
      toast.error("当前房间暂不能写入先攻事件");
      return false;
    }

    try {
      const createdMessage = await roomContext.sendMessageWithInsert({
        roomId: roomContext.roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
        content,
        messageType: MessageType.STATE_EVENT,
        extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", events)),
      });
      if (!createdMessage) {
        toast.error("写入先攻事件失败");
        return false;
      }
      return true;
    }
    catch (error) {
      console.error("写入先攻事件失败", error);
      toast.error("写入先攻事件失败");
      return false;
    }
  }, [roomContext]);

  const handleRollAllInitiative = useCallback(async () => {
    if (!spaceOwner) {
      return;
    }
    if (!roomContext.sendMessageWithInsert || !roomContext.roomId) {
      toast.error("当前房间暂不能投掷全员先攻");
      return;
    }

    try {
      const createdMessage = await roomContext.sendMessageWithInsert(buildAllInitiativeCombatMessageRequest({
        abilityQueries,
        currentList: initiativeList,
        importableRoles,
        ruleId: spaceContext.ruleId ?? undefined,
        roomId: roomContext.roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
      }));
      if (!createdMessage) {
        toast.error("投掷全员先攻失败");
        return;
      }
      toast.success("已投掷全员先攻");
    }
    catch (error) {
      console.error("投掷全员先攻失败", error);
      toast.error(error instanceof Error && error.message ? error.message : "投掷全员先攻失败");
    }
  }, [abilityQueries, importableRoles, initiativeList, roomContext, spaceContext.ruleId, spaceOwner]);

  const startEditing = (key: string, value: string) => {
    setEditingKey(key);
    setEditingValue(value);
  };

  const stopEditing = () => {
    setEditingKey(null);
    setEditingValue("");
  };

  const commitEditing = (key: string, apply: (value: string) => void) => {
    if (editingKey !== key) {
      return;
    }
    apply(editingValue);
    stopEditing();
  };

  const getEditingRef = (key: string) => (node: HTMLInputElement | null) => {
    if (editingKey === key) {
      editingInputRef.current = node;
    }
  };

  useEffect(() => {
    if (!editingKey || !editingInputRef.current) {
      return;
    }
    editingInputRef.current.focus();
    editingInputRef.current.select();
  }, [editingKey]);

  const handleImportSingle = async (roleId: number) => {
    const idx = importableRoles.findIndex(r => r.roleId === roleId);
    if (idx === -1) {
      return;
    }

    const query = abilityQueries[idx];
    const res = query?.data;
    if (res?.success && Array.isArray(res.data) && spaceContext.ruleId) {
      const hasMatchingRule = res.data.some(item => item.ruleId === spaceContext.ruleId);
      if (!hasMatchingRule && res.data.length > 0) {
        toast.error("导入失败：请检查角色卡规则与空间设置的规则是否一致");
        return;
      }
    }

    const initiative = extractAgilityFromAbilityQuery(spaceContext.ruleId, query) ?? 0;
    const hpData = extractHpFromAbilityQuery(spaceContext.ruleId, query);
    const role = importableRoles[idx];
    const name = role.roleName ?? `角色${role.roleId}`;
    const events = buildImportRoleInitiativeEvents({
      currentList: initiativeList,
      hp: hpData?.hp ?? null,
      initiative,
      maxHp: hpData?.maxHp ?? null,
      roleId,
      name,
    });

    await sendCombatEvents(events, ".combat import");
  };

  const handleDelete = (item: Initiative) => {
    void sendCombatEvents(buildRemoveInitiativeEvents(initiativeList, item), ".combat remove");
  };

  const handleAdd = () => {
    const name = newItem.name.trim();
    if (!name) {
      return;
    }
    const hp = parseNullableNumber(newItem.hp);
    const maxHp = parseNullableNumber(newItem.maxHp);
    const initiative = parseNullableNumber(newItem.value) ?? 0;
    const participantId = createManualParticipantId();
    const values: NonNullable<Extract<StateEventAtom, { type: "combatParticipantUpsert" }>["values"]> = {};
    if (hp != null) {
      values.hp = hp;
    }
    if (maxHp != null) {
      values.maxHp = maxHp;
    }
    params.forEach((param) => {
      if (param.source === "manual") {
        values[param.key] = normalizeCombatValue(newExtras[param.key] ?? "");
      }
    });

    const nextParticipant: Initiative = {
      participantId,
      name,
      value: initiative,
      hp,
      maxHp,
      extras: values,
    };
    void sendCombatEvents([
      {
        type: "combatParticipantUpsert",
        participantId,
        name,
        initiative,
        ...(Object.keys(values).length > 0 ? { values } : {}),
      },
      buildInitiativeOrderSetAtom([...initiativeList, nextParticipant]),
    ], ".combat add");
    setNewItem({ name: "", value: "", hp: "", maxHp: "" });
    setNewExtras(Object.fromEntries(params.map(param => [param.key, ""])));
  };

  const handleAddParam = () => {
    const label = newParam.label.trim();
    if (!label) {
      return;
    }
    if (newParam.source === "roleAttr" && !newParam.attrKey.trim()) {
      toast.error("请填写角色属性键");
      return;
    }
    if (newParam.source === "stateKey" && !newParam.stateKey.trim()) {
      toast.error("请填写状态变量键");
      return;
    }

    const baseKey = slugifyLabel(label);
    const key = makeUniqueKey(baseKey, params);
    void sendCombatEvents([{
      type: "combatColumnUpsert",
      key,
      label,
      source: toColumnSource(newParam.source),
      ...(newParam.source === "roleAttr" ? { attrKey: newParam.attrKey.trim() } : {}),
      ...(newParam.source === "stateKey" ? { stateKey: newParam.stateKey.trim() } : {}),
    }], ".combat column");
    setNewParam(DEFAULT_NEW_PARAM);
  };

  const handleRemoveParam = (key: string) => {
    void sendCombatEvents([{
      type: "combatColumnRemove",
      key,
    }], ".combat column-remove");
    setNewExtras((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateItemExtras = (item: Initiative, key: string, value: string) => {
    const param = params.find(candidate => candidate.key === key);
    const events = buildUpdateInitiativeExtraEvents(item, param, key, value);
    void sendCombatEvents(events, param?.source === "stateKey" ? ".combat state-column" : ".combat value");
  };

  const updateItem = (item: Initiative, patch: Partial<Initiative>) => {
    const events = buildUpdateInitiativeEvents(initiativeList, item, patch);
    if (events.length > 0) {
      void sendCombatEvents(events, ".combat update");
    }
  };

  const sortedList = useSortedInitiativeList(initiativeList, sortKey, sortDirection, spaceOwner);

  return (
    <div className="flex flex-col bg-transparent">
      <div className="w-full p-3">
        <div className="rounded-xl border border-base-300 bg-base-300 shadow-none">
          <InitiativeListControls
            initiativeCount={initiativeList.length}
            spaceOwner={spaceOwner}
            importableRoleCount={importableRoles.length}
            showParamEditor={showParamEditor}
            params={params}
            displayParams={displayParams}
            newItem={newItem}
            newExtras={newExtras}
            newParam={newParam}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onOpenImportPopup={() => setIsImportPopupOpen(true)}
            onToggleParamEditor={() => setShowParamEditor(prev => !prev)}
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
              editingKey={editingKey}
              editingValue={editingValue}
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
        onClose={() => setIsImportPopupOpen(false)}
        onRollAllInitiative={spaceOwner ? handleRollAllInitiative : undefined}
        onImportSingle={roleId => void handleImportSingle(roleId)}
      />
    </div>
  );
}
