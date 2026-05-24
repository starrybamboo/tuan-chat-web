import type { AbilityRecord } from "./types";

const INITIATIVE_DIRECT_KEYS = ["先攻", "Initiative", "initiative", "Init", "init"] as const;
const INITIATIVE_DEX_KEYS = ["敏捷", "Dexterity", "Dex", "dex"] as const;

export type InitiativeAbilityRecord = Pick<AbilityRecord, "ability" | "basic" | "skill">;

export type InitiativeRollResult = {
  formulaText: string;
  modifier: number;
  modifierLabel: string;
  roll: number;
  total: number;
};

function toNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function readSectionNumericValue(section: Record<string, unknown> | undefined, key: string): number | null {
  if (!section || !Object.prototype.hasOwnProperty.call(section, key)) {
    return null;
  }
  return toNumericValue(section[key]);
}

function readInitiativeDirectModifier(record: InitiativeAbilityRecord): { modifier: number; modifierLabel: string } | null {
  for (const key of INITIATIVE_DIRECT_KEYS) {
    const abilityValue = readSectionNumericValue(record.ability, key);
    if (typeof abilityValue === "number") {
      return {
        modifier: abilityValue,
        modifierLabel: `${key}(${abilityValue})`,
      };
    }

    const skillValue = readSectionNumericValue(record.skill, key);
    if (typeof skillValue === "number") {
      return {
        modifier: skillValue,
        modifierLabel: `${key}(${skillValue})`,
      };
    }
  }
  return null;
}

function readInitiativeDexModifier(record: InitiativeAbilityRecord): { modifier: number; modifierLabel: string } | null {
  for (const key of INITIATIVE_DEX_KEYS) {
    const baseValue = readSectionNumericValue(record.basic, key);
    if (typeof baseValue === "number") {
      const modifier = Math.floor((baseValue - 10) / 2);
      return {
        modifier,
        modifierLabel: `${key}调整值(${modifier})`,
      };
    }
  }
  return null;
}

export function getDndInitiativeModifier(record: InitiativeAbilityRecord | null | undefined): { modifier: number; modifierLabel: string } | null {
  if (!record) {
    return null;
  }
  return readInitiativeDirectModifier(record) ?? readInitiativeDexModifier(record);
}

function rollD20(random: () => number): number {
  return Math.floor(random() * 20) + 1;
}

export function rollDndInitiative(
  record: InitiativeAbilityRecord | null | undefined,
  options?: {
    extraModifier?: number;
    random?: () => number;
  },
): InitiativeRollResult {
  const modifier = getDndInitiativeModifier(record) ?? { modifier: 0, modifierLabel: "" };
  const random = options?.random ?? Math.random;
  const roll = rollD20(random);
  const extraModifier = options?.extraModifier ?? 0;
  const total = roll + modifier.modifier + extraModifier;

  let formulaText = `1d20(${roll})`;
  if (modifier.modifierLabel) {
    formulaText += ` + ${modifier.modifierLabel}`;
  }
  if (extraModifier !== 0) {
    formulaText += ` ${extraModifier > 0 ? "+" : ""}${extraModifier}`;
  }

  return {
    formulaText,
    modifier: modifier.modifier,
    modifierLabel: modifier.modifierLabel,
    roll,
    total,
  };
}
