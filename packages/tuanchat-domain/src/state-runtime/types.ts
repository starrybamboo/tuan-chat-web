import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import type {
  StateEventScope,
  StateEventStackMode,
  StateStatusModifierOp,
} from "../state-event";

export type StateDefinitionModifier = {
  key: string;
  op: StateStatusModifierOp;
  value: number;
};

export type StateDefinition = {
  statusId: string;
  name: string;
  modifiers: StateDefinitionModifier[];
  durationTurns?: number;
  stackMode: StateEventStackMode;
};

export type StateDefinitionResolver = {
  resolveById: (statusId: string) => StateDefinition | null;
  resolveLatestByName: (statusName: string) => StateDefinition | null;
};

export type StateValueMap = Record<string, number>;

export type StateDisplayValues = {
  room: StateValueMap;
  rolesByRoleId: Record<number, StateValueMap>;
};

export type ActiveStateInstance = {
  instanceId: string;
  sourceMessageId: number;
  scope: StateEventScope;
  statusId: string;
  statusName: string;
  durationTurns?: number;
  remainingTurns?: number;
  stackMode: StateEventStackMode;
  modifiers: StateDefinition["modifiers"];
};

export type UnresolvedState = {
  messageId: number;
  statusId: string;
  scope: StateEventScope;
  reason: string;
};

export type StateEventMessageSummary = {
  primaryText: string;
  secondaryText?: string;
  detailLines: string[];
};

export type StateRuntime = {
  turn: number;
  combatRoundActive: boolean;
  roomVars: StateValueMap;
  roleVarsByRoleId: Record<number, StateValueMap>;
  recordedRoleValueKeysByRoleId: Record<number, string[]>;
  activeStates: ActiveStateInstance[];
  baseDisplayValues: StateDisplayValues;
  derivedDisplayValues: StateDisplayValues;
  unresolvedStates: UnresolvedState[];
  messageSummariesByMessageId: Record<number, StateEventMessageSummary>;
};

export type BuildStateRuntimeParams = {
  messages: Array<Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra">>;
  fallbackRoleAbilitiesByRoleId?: Record<number, RoleAbility | null | undefined>;
  resolver?: StateDefinitionResolver;
};

export type CombatParticipant = {
  participantId: string;
  name: string;
  roleId?: number;
  initiative: number;
  values: Record<string, string | number | null>;
  baseValues: StateValueMap;
  derivedValues: StateValueMap;
  activeStates: ActiveStateInstance[];
};

export type CombatMapToken = {
  roleId: number;
  rowIndex: number;
  colIndex: number;
};

export type CombatMapConfig = {
  mapFileId: number;
  gridRows: number;
  gridCols: number;
  gridColor: string;
};

export type CombatStateRuntime = StateRuntime & {
  participants: CombatParticipant[];
  participantsById: Record<string, CombatParticipant>;
  mapConfig: CombatMapConfig | null;
  mapTokens: CombatMapToken[];
  mapTokensByRoleId: Record<number, CombatMapToken>;
  hasMapConfigState: boolean;
  hasMapState: boolean;
};

export type BuildCombatStateRuntimeParams = BuildStateRuntimeParams;
