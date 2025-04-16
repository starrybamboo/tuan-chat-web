// types.ts
export type Role = {
  id: number;
  avatar?: string;
  name: string;
  description: string;
  inventory: InventoryItem[];
  abilities: AbilityLabel[];
  avatarId: number;
};

export type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  description?: string;
};

export type AbilityLabel = {
  id: number;
  name: string;
  value: number;
  description?: string;
};
