import { create } from "zustand";

type AbilityTab = "basic" | "ability" | "skill" | "act";
type SidebarGroup = "rule" | "dice" | "normal";

type RoleUiState = {
  activeAbilityTabByRoleRule: Record<string, AbilityTab>;
  sidebarSearchQuery: string;
  sidebarCollapsed: boolean;
  collapsedSidebarGroups: Record<SidebarGroup, boolean>;
  selectionMode: boolean;
  selectedRoleIds: Set<number>;
  editingAbilityFieldId?: string;
  setSidebarSearchQuery: (query: string) => void;
  setActiveAbilityTab: (roleId: number, ruleId: number, tab: AbilityTab) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  toggleSidebarGroup: (group: SidebarGroup) => void;
  setSelectionMode: (enabled: boolean) => void;
  toggleSelectedRoleId: (roleId: number) => void;
  clearSelectedRoleIds: () => void;
  setEditingAbilityFieldId: (fieldId?: string) => void;
};

function roleRuleKey(roleId: number, ruleId: number) {
  return `${roleId}:${ruleId}`;
}

export const useRoleUiStore = create<RoleUiState>((set) => ({
  activeAbilityTabByRoleRule: {},
  sidebarSearchQuery: "",
  sidebarCollapsed: false,
  collapsedSidebarGroups: {
    rule: true,
    dice: true,
    normal: false,
  },
  selectionMode: false,
  selectedRoleIds: new Set<number>(),
  editingAbilityFieldId: undefined,
  setSidebarSearchQuery: query => set(state => (
    state.sidebarSearchQuery === query ? state : { sidebarSearchQuery: query }
  )),
  setActiveAbilityTab: (roleId, ruleId, tab) => set((state) => {
    const key = roleRuleKey(roleId, ruleId);
    if (state.activeAbilityTabByRoleRule[key] === tab) {
      return state;
    }
    return {
      activeAbilityTabByRoleRule: {
        ...state.activeAbilityTabByRoleRule,
        [key]: tab,
      },
    };
  }),
  setSidebarCollapsed: collapsed => set(state => (
    state.sidebarCollapsed === collapsed ? state : { sidebarCollapsed: collapsed }
  )),
  toggleSidebarCollapsed: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleSidebarGroup: group => set(state => ({
    collapsedSidebarGroups: {
      ...state.collapsedSidebarGroups,
      [group]: !state.collapsedSidebarGroups[group],
    },
  })),
  setSelectionMode: enabled => set(state => (
    state.selectionMode === enabled && state.selectedRoleIds.size === 0
      ? state
      : { selectionMode: enabled, selectedRoleIds: new Set<number>() }
  )),
  toggleSelectedRoleId: roleId => set((state) => {
    const next = new Set(state.selectedRoleIds);
    if (next.has(roleId)) {
      next.delete(roleId);
    }
    else {
      next.add(roleId);
    }
    return { selectedRoleIds: next };
  }),
  clearSelectedRoleIds: () => set(state => (
    state.selectedRoleIds.size === 0 ? state : { selectedRoleIds: new Set<number>() }
  )),
  setEditingAbilityFieldId: fieldId => set(state => (
    state.editingAbilityFieldId === fieldId ? state : { editingAbilityFieldId: fieldId }
  )),
}));

export function getRoleAbilityTab(roleId: number, ruleId: number, tabs: Record<string, AbilityTab>) {
  return tabs[roleRuleKey(roleId, ruleId)] ?? "basic";
}
