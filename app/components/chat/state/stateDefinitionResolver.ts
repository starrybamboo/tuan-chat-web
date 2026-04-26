import type { StateEventStackMode, StateStatusModifierOp } from "@/types/stateEvent";

import { STATE_EVENT_STACK_MODE } from "@/types/stateEvent";

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

export class EmptyStateDefinitionResolver implements StateDefinitionResolver {
  resolveById(): StateDefinition | null {
    return null;
  }

  resolveLatestByName(): StateDefinition | null {
    return null;
  }
}

export class MemoryStateDefinitionResolver implements StateDefinitionResolver {
  private readonly definitionsById = new Map<string, StateDefinition>();

  private readonly definitionsByName = new Map<string, StateDefinition[]>();

  constructor(definitions: StateDefinition[]) {
    definitions.forEach((definition) => {
      this.definitionsById.set(definition.statusId, definition);
      const list = this.definitionsByName.get(definition.name) ?? [];
      list.push(definition);
      this.definitionsByName.set(definition.name, list);
    });
  }

  resolveById(statusId: string): StateDefinition | null {
    return this.definitionsById.get(statusId) ?? null;
  }

  resolveLatestByName(statusName: string): StateDefinition | null {
    const list = this.definitionsByName.get(statusName);
    return list?.[list.length - 1] ?? null;
  }
}

export const EMPTY_STATE_DEFINITION_RESOLVER: StateDefinitionResolver = new EmptyStateDefinitionResolver();

export function createStateDefinition(definition: Omit<StateDefinition, "stackMode"> & {
  stackMode?: StateEventStackMode;
}): StateDefinition {
  return {
    ...definition,
    stackMode: definition.stackMode ?? STATE_EVENT_STACK_MODE.REPLACE,
  };
}
