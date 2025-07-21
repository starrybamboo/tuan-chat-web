export type TabId = string | number;

export type ModuleContextType = {
  moduleTabItems: ModuleTabItem[];
  currentSelectedTabId: TabId | null;
  stageId: TabId | null;
  activeList: ModuleListEnum;
  setStageId: (id: TabId) => void;
  setCurrentSelectedTabId: (itemId: TabId) => void;
  pushModuleTabItem: (item: ModuleTabItem) => void;
  removeModuleTabItem: (id: TabId) => void;
  setActiveList: (list: ModuleListEnum) => void;
};

/**
 * 基础的 ModuleTabItem, 每个 item 都代表了一个编辑区内打开的 tab
 * 可以按照 type 来区分是哪个类别的 tab
 */
type BaseModuleTabItem<T> = {
  id: string | number; // 唯一标识符
  label: string;
  type: T;
};
export type RoleModuleItem = BaseModuleTabItem<ModuleItemEnum.ROLE>;
export type ItemModuleItem = BaseModuleTabItem<ModuleItemEnum.ITEM>;
export type SceneModuleItem = BaseModuleTabItem<ModuleItemEnum.SCENE>;
export type StageModuleItem = BaseModuleTabItem<ModuleItemEnum.STAGE>;
export type CommitModuleItem = BaseModuleTabItem<ModuleItemEnum.COMMIT>;
export type ModuleTabItem = RoleModuleItem | ItemModuleItem | SceneModuleItem | StageModuleItem | CommitModuleItem;

export enum ModuleItemEnum {
  ROLE = "role",
  ITEM = "item",
  SCENE = "scene",
  STAGE = "stage",
  COMMIT = "commit",
}

export enum ModuleListEnum {
  CONTENT = "content",
  STAGE = "stage",
  HISTORY = "history",
  BRANCH = "branch",
}
