// types.ts
export type Role = {
  id: string;
  avatar?: string;
  name: string;
  description: string;
  inventory: InventoryItem[];
  abilities: string[];
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  description?: string;
};
