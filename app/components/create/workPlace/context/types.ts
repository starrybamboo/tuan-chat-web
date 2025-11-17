import type { Module, StageEntityResponse } from "api";

export type TabId = string | number;

export type ModuleContextType = {
  moduleTabItems: ModuleTabItem[];
  currentSelectedTabId: TabId | null;
  stageId: TabId | null;
  moduleId: TabId | null;
  activeList: ModuleListEnum;
  setStageId: (id: TabId) => void;
  setModuleId: (id: TabId) => void;
  setCurrentSelectedTabId: (itemId: TabId) => void;
  /** 强制设置当前选中 tab, 不受锁限制 */
  forceSetCurrentSelectedTabId: (itemId: TabId) => void;
  pushModuleTabItem: (item: ModuleTabItem) => void;
  removeModuleTabItem: (id: TabId) => void;
  updateModuleTabLabel: (id: TabId, label: string) => void;
  updateModuleTabContentName: (id: TabId, name: string) => void;
  setActiveList: (list: ModuleListEnum) => void;
  /** 开启一个短暂的选中锁，期间外部对 setCurrentSelectedTabId 的调用会被忽略 */
  beginSelectionLock: (reason?: string, ttlMs?: number) => void;
  /** 主动结束选中锁 */
  endSelectionLock: () => void;
  /** 设置当前 tab 的保存函数 */
  setTabSaveFunction: (fn: () => void) => void;
  // 状态
  /** 是否已提交（用于驱动 UI 渲染） */
  isCommitted: boolean;
  setIsCommitted: (val: boolean) => void;
};

/**
 * 基础的 ModuleTabItem, 每个 item 都代表了一个编辑区内打开的 tab
 * 可以按照 type 来区分是哪个类别的 tab
 */

type BaseModuleTabItem<T, C = StageEntityResponse> = {
  id: string | number; // 唯一标识符
  label: string;
  content: C;
  type: T;
};
export type RoleModuleItem = BaseModuleTabItem<ModuleItemEnum.ROLE>;
export type ItemModuleItem = BaseModuleTabItem<ModuleItemEnum.ITEM>;
export type SceneModuleItem = BaseModuleTabItem<ModuleItemEnum.SCENE>;
// export type StageModuleItem = BaseModuleTabItem<ModuleItemEnum.STAGE>;
// export type CommitModuleItem = BaseModuleTabItem<ModuleItemEnum.COMMIT>;
export type ClueModuleItem = BaseModuleTabItem<ModuleItemEnum.CLUE>;
export type LocationModuleItem = BaseModuleTabItem<ModuleItemEnum.LOCATION>;
export type MapModuleItem = BaseModuleTabItem<ModuleItemEnum.MAP>;
export type ModuleModuleItem = BaseModuleTabItem<ModuleItemEnum.MODULE, Module>;
export type ModuleTabItem = RoleModuleItem | ItemModuleItem | SceneModuleItem | ClueModuleItem | LocationModuleItem | MapModuleItem | ModuleModuleItem;
export enum ModuleItemEnum {
  ROLE = "role",
  ITEM = "item",
  SCENE = "scene",
  LOCATION = "location",
  MAP = "map",
  MODULE = "module",
  CLUE = "clue",
}

export enum ModuleListEnum {
  STAGE = "stage",
  MAP = "map",
  MODULE = "module",
  BASIC_INFO = "basic_info",
  CLUE = "clue",
}
