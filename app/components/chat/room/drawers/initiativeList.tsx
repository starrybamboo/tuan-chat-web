import type { Initiative, InitiativeDraft, SortDirection, SortKey } from "./initiativeListTypes";
import type { StateEventAtom } from "@/types/stateEvent";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { useStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { useGlobalUserId } from "@/components/globalContextProvider";
import {
  buildCommandStateEventExtra,
  toApiMessageExtraWithStateEvent,
} from "@/types/stateEvent";
import { useGetRolesAbilitiesQueries } from "../../../../../api/hooks/abilityQueryHooks";
import { MessageType } from "../../../../../api/wsModels";
import { executeAllInitiativeRolls } from "./initiativeCommandRequest";
import { InitiativeImportDialog } from "./initiativeImportDialog";
import {
  extractAgilityFromQuery as extractAgilityFromAbilityQuery,
  extractHpFromQuery as extractHpFromAbilityQuery,
} from "./initiativeListAbilityExtractors";
import { InitiativeListControls } from "./initiativeListControls";
import { useSortedInitiativeList } from "./initiativeListDerived";
import {
  buildImportRoleInitiativeEvents,
  buildRemoveInitiativeEvents,
  buildUpdateInitiativeEvents,
} from "./initiativeListEvents";
import { InitiativeListTable } from "./initiativeListTable";

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

/**
 * 先攻列表。参与者与顺序来自统一 combat runtime。
 */
export default function InitiativeList() {
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const runtime = useStateRuntimeContext();
  const currentUserId = useGlobalUserId();
  const [newItem, setNewItem] = useState<InitiativeDraft>({ name: "", value: "", hp: "", maxHp: "" });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportPopupOpen, setIsImportPopupOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const spaceOwner = Boolean(spaceContext.isSpaceOwner);
  const curUserId = currentUserId ?? -1;
  const roomRolesThatUserOwn = roomContext.roomRolesThatUserOwn ?? [];
  const visibleRoomRoles = roomContext.roomAllRoles ?? [];
  const importableRoles = spaceOwner
    ? roomRolesThatUserOwn
    : roomRolesThatUserOwn.filter(r => r.userId === curUserId);
  const rollableRoles = spaceOwner ? visibleRoomRoles : importableRoles;
  const abilityQueries = useGetRolesAbilitiesQueries(importableRoles.map(r => r.roleId));

  const initiativeList = useMemo<Initiative[]>(() => {
    return importableRoles.map((role) => {
      const roleId = role.roleId;
      const baseValues = runtime.baseDisplayValues.rolesByRoleId[roleId] ?? {};
      const derivedValues = runtime.derivedDisplayValues.rolesByRoleId[roleId] ?? {};
      const stateValues = {
        ...baseValues,
        ...derivedValues,
      };
      const hp = getNumericValue(derivedValues, ["hp"])
        ?? getNumericValue(stateValues, ["hp"]);
      const maxHp = getNumericValue(stateValues, ["maxHp", "maxhp", "hpMax", "hpmax"])
        ?? null;
      return {
        participantId: `role:${roleId}`,
        name: role.roleName?.trim() || `角色${roleId}`,
        value: getNumericValue(stateValues, ["initiative"]) ?? 0,
        hp,
        maxHp,
        extras: {},
        roleId,
        activeStates: runtime.activeStates.filter(state => state.scope.kind === "role" && state.scope.roleId === roleId).map(state => (
          `${state.statusName}${typeof state.remainingTurns === "number" ? ` ${state.remainingTurns}T` : ""}`
        )),
      };
    });
  }, [importableRoles, runtime.activeStates, runtime.baseDisplayValues.rolesByRoleId, runtime.derivedDisplayValues.rolesByRoleId]);

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
    if (!roomContext.executeCommand) {
      toast.error("当前房间暂不能投掷全员先攻");
      return;
    }

    try {
      await executeAllInitiativeRolls({
        executeCommand: roomContext.executeCommand,
        roles: rollableRoles,
      });
      toast.success("已投掷全员先攻");
    }
    catch (error) {
      console.error("投掷全员先攻失败", error);
      toast.error(error instanceof Error && error.message ? error.message : "投掷全员先攻失败");
    }
  }, [rollableRoles, roomContext, spaceOwner]);

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
      hp: hpData?.hp ?? null,
      initiative,
      maxHp: hpData?.maxHp ?? null,
      roleId,
      name,
    });

    await sendCombatEvents(events, ".combat import");
  };

  const handleDelete = (item: Initiative) => {
    const events = buildRemoveInitiativeEvents(item);
    if (events.length > 0) {
      void sendCombatEvents(events, ".combat remove");
    }
  };

  const handleAdd = () => {
    toast.error("先攻现在按房间角色维护，请先导入角色再编辑数值");
    setNewItem({ name: "", value: "", hp: "", maxHp: "" });
  };

  const updateItem = (item: Initiative, patch: Partial<Initiative>) => {
    const events = buildUpdateInitiativeEvents(item, patch);
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
            newItem={newItem}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onOpenImportPopup={() => setIsImportPopupOpen(true)}
            onAddItem={handleAdd}
            setNewItem={setNewItem}
            setSortKey={setSortKey}
            setSortDirection={setSortDirection}
          />

          <div className="px-4 pb-3">
            <InitiativeListTable
              initiativeList={initiativeList}
              sortedList={sortedList}
              editingKey={editingKey}
              editingValue={editingValue}
              getEditingRef={getEditingRef}
              setEditingValue={setEditingValue}
              startEditing={startEditing}
              stopEditing={stopEditing}
              commitEditing={commitEditing}
              updateItem={updateItem}
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
