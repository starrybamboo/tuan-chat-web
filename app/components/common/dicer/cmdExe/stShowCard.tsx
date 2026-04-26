import type { RoleAbility } from "../../../../../api";

import UTILS from "@/components/common/dicer/utils/utils";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { formatStateKeyLabel } from "@/types/stateEvent";
import { tuanchat } from "../../../../../api/instance";

interface RuleTemplateLike {
  basicDefault?: Record<string, string>;
  abilityFormula?: Record<string, string>;
  skillDefault?: Record<string, string>;
}

type AbilitySection = "basic" | "ability" | "skill";

interface RawEntry {
  key: string;
  value: string;
  section: AbilitySection;
  canonicalKey: string;
}

export interface StShowDisplayEntry {
  key: string;
  label: string;
  value: string;
}

export interface StShowCardModel {
  entries: StShowDisplayEntry[];
  requestedMode: boolean;
  hiddenDefaultCount: number;
}

interface BuildStShowCardModelParams {
  ability: RoleAbility;
  template?: RuleTemplateLike | null;
  requestedKeys?: string[];
  keyAliasMap?: Record<string, string>;
}

interface OpenStShowCardWindowParams {
  ability: RoleAbility;
  roleName?: string;
  requestedKeys?: string[];
  keyAliasMap?: Record<string, string>;
}

const RULE_TEMPLATE_CACHE_TTL_MS = 5 * 60_000;
const PRIMARY_VALUE_PAIRS = [
  { currentKey: "hp", maxKey: "hpm", label: "HP" },
  { currentKey: "mp", maxKey: "mpm", label: "MP" },
  { currentKey: "san", maxKey: "sanm", label: "SAN" },
] as const;

const SPECIAL_DISPLAY_LABELS: Record<string, string> = {
  db: "DB",
  mov: "MOV",
  build: "BUILD",
};

const ruleTemplateCache = new Map<number, { expireAt: number; value: RuleTemplateLike | null }>();

function normalizeKeyToken(key: string): string {
  return key.trim().toLowerCase();
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveCanonicalKey(key: string, keyAliasMap?: Record<string, string>, ruleId?: number): string {
  const trimmedKey = key.trim();
  if (!trimmedKey) {
    return trimmedKey;
  }

  const normalizedKey = normalizeKeyToken(trimmedKey);
  const aliasResolvedKey = keyAliasMap?.[normalizedKey];
  if (aliasResolvedKey) {
    return aliasResolvedKey;
  }

  if (ruleId && ruleId > 0) {
    try {
      return UTILS.getAlias(normalizedKey, String(ruleId));
    }
    catch {
      // 单测等未初始化 AliasMap 的场景回退到原始键。
    }
  }

  return trimmedKey;
}

function readAbilityValue(ability: RoleAbility, key: string): string | undefined {
  return ability.basic?.[key] ?? ability.ability?.[key] ?? ability.skill?.[key];
}

function formatDisplayLabel(key: string): string {
  const normalizedKey = normalizeKeyToken(key);
  return SPECIAL_DISPLAY_LABELS[normalizedKey] ?? formatStateKeyLabel(key);
}

function pushSectionEntries(
  entries: RawEntry[],
  seen: Set<string>,
  section: AbilitySection,
  record: Record<string, string> | undefined,
  keyAliasMap?: Record<string, string>,
  ruleId?: number,
): void {
  if (!record) {
    return;
  }

  Object.entries(record).forEach(([key, rawValue]) => {
    const value = normalizeValue(rawValue);
    const normalizedKey = normalizeKeyToken(key);
    if (!value || seen.has(normalizedKey)) {
      return;
    }
    seen.add(normalizedKey);
    const canonicalKey = resolveCanonicalKey(key, keyAliasMap, ruleId);
    entries.push({
      key,
      value,
      section,
      canonicalKey,
    });
  });
}

function collectRawEntries(ability: RoleAbility, keyAliasMap?: Record<string, string>): RawEntry[] {
  const entries: RawEntry[] = [];
  const seen = new Set<string>();
  const ruleId = Number(ability.ruleId ?? 0);

  pushSectionEntries(entries, seen, "basic", ability.basic, keyAliasMap, ruleId);
  pushSectionEntries(entries, seen, "ability", ability.ability, keyAliasMap, ruleId);
  pushSectionEntries(entries, seen, "skill", ability.skill, keyAliasMap, ruleId);

  return entries;
}

function collectRequestedEntries(
  ability: RoleAbility,
  requestedKeys: string[],
  keyAliasMap?: Record<string, string>,
): RawEntry[] {
  const entries: RawEntry[] = [];
  const seen = new Set<string>();
  const ruleId = Number(ability.ruleId ?? 0);

  requestedKeys
    .map(key => key.trim())
    .filter(Boolean)
    .forEach((rawKey) => {
      const resolvedKey = resolveCanonicalKey(rawKey, keyAliasMap, ruleId);
      const normalizedResolvedKey = normalizeKeyToken(resolvedKey);
      if (seen.has(normalizedResolvedKey)) {
        return;
      }
      seen.add(normalizedResolvedKey);
      entries.push({
        key: resolvedKey,
        value: normalizeValue(readAbilityValue(ability, resolvedKey) ?? "0"),
        section: "skill",
        canonicalKey: resolvedKey,
      });
    });

  return entries;
}

function buildDefaultValueMap(
  ability: RoleAbility,
  template?: RuleTemplateLike | null,
  keyAliasMap?: Record<string, string>,
): Map<string, string> {
  const nextMap = new Map<string, string>();
  const ruleId = Number(ability.ruleId ?? 0);

  const appendSection = (section: Record<string, string> | undefined) => {
    if (!section) {
      return;
    }
    Object.entries(section).forEach(([key, value]) => {
      const normalizedValue = normalizeValue(value);
      if (!normalizedValue) {
        return;
      }
      const canonicalKey = resolveCanonicalKey(key, keyAliasMap, ruleId);
      nextMap.set(normalizeKeyToken(canonicalKey), normalizedValue);
    });
  };

  appendSection(template?.basicDefault);
  appendSection(template?.abilityFormula);
  appendSection(template?.skillDefault);

  return nextMap;
}

interface CanonicalEntryGroup {
  canonicalKey: string;
  representative: RawEntry;
  entries: RawEntry[];
}

function buildCanonicalEntryGroups(rawEntries: RawEntry[]): CanonicalEntryGroup[] {
  const groupMap = new Map<string, CanonicalEntryGroup>();

  rawEntries.forEach((entry) => {
    const normalizedCanonicalKey = normalizeKeyToken(entry.canonicalKey);
    const existing = groupMap.get(normalizedCanonicalKey);
    if (!existing) {
      groupMap.set(normalizedCanonicalKey, {
        canonicalKey: entry.canonicalKey,
        representative: entry,
        entries: [entry],
      });
      return;
    }

    existing.entries.push(entry);
    if (normalizeKeyToken(existing.representative.key) === normalizedCanonicalKey) {
      return;
    }
    if (normalizeKeyToken(entry.key) === normalizedCanonicalKey) {
      existing.representative = entry;
      existing.canonicalKey = entry.canonicalKey;
    }
  });

  return rawEntries.flatMap((entry) => {
    const normalizedCanonicalKey = normalizeKeyToken(entry.canonicalKey);
    const group = groupMap.get(normalizedCanonicalKey);
    if (!group) {
      return [];
    }
    groupMap.delete(normalizedCanonicalKey);
    return [group];
  });
}

function collapseEntries(
  rawEntries: RawEntry[],
  defaultValues: Map<string, string>,
  requestedMode: boolean,
): { entries: StShowDisplayEntry[]; hiddenDefaultCount: number } {
  const entries: StShowDisplayEntry[] = [];
  const entryMap = new Map<string, CanonicalEntryGroup>();
  const processedCanonicalKeys = new Set<string>();
  const visibleCanonicalKeys = new Set<string>();
  const groups = buildCanonicalEntryGroups(rawEntries);
  const pairByCurrentKey = new Map<string, (typeof PRIMARY_VALUE_PAIRS)[number]>(
    PRIMARY_VALUE_PAIRS.map(pair => [pair.currentKey, pair]),
  );
  const pairByMaxKey = new Map<string, (typeof PRIMARY_VALUE_PAIRS)[number]>(
    PRIMARY_VALUE_PAIRS.map(pair => [pair.maxKey, pair]),
  );

  groups.forEach((group) => {
    entryMap.set(normalizeKeyToken(group.canonicalKey), group);
  });

  groups.forEach((group) => {
    const normalizedCanonicalKey = normalizeKeyToken(group.canonicalKey);
    const entry = group.representative;
    if (processedCanonicalKeys.has(normalizedCanonicalKey)) {
      return;
    }

    const maxPairConfig = !requestedMode ? pairByMaxKey.get(normalizedCanonicalKey) : undefined;
    if (maxPairConfig && entryMap.has(maxPairConfig.currentKey)) {
      return;
    }

    const pairConfig = !requestedMode ? pairByCurrentKey.get(normalizedCanonicalKey) : undefined;
    if (pairConfig) {
      const maxGroup = entryMap.get(pairConfig.maxKey);
      const maxEntry = maxGroup?.representative;
      const maxCanonicalKey = maxGroup ? normalizeKeyToken(maxGroup.canonicalKey) : undefined;
      const currentMatchesDefault = defaultValues.get(normalizedCanonicalKey) === entry.value;
      const maxMatchesDefault = maxEntry
        ? defaultValues.get(pairConfig.maxKey) === maxEntry.value
        : false;

      processedCanonicalKeys.add(normalizedCanonicalKey);
      if (maxCanonicalKey) {
        processedCanonicalKeys.add(maxCanonicalKey);
      }

      if ((maxEntry && currentMatchesDefault && maxMatchesDefault) || (!maxEntry && currentMatchesDefault)) {
        return;
      }

      entries.push({
        key: entry.key,
        label: pairConfig.label,
        value: maxEntry ? `${entry.value}/${maxEntry.value}` : entry.value,
      });
      visibleCanonicalKeys.add(normalizedCanonicalKey);
      if (maxCanonicalKey) {
        visibleCanonicalKeys.add(maxCanonicalKey);
      }
      return;
    }

    processedCanonicalKeys.add(normalizedCanonicalKey);
    if (!requestedMode && defaultValues.get(normalizedCanonicalKey) === entry.value) {
      return;
    }

    entries.push({
      key: entry.key,
      label: formatDisplayLabel(entry.key),
      value: entry.value,
    });
    visibleCanonicalKeys.add(normalizedCanonicalKey);
  });

  const hiddenDefaultCount = groups.filter((group) => {
    const normalizedCanonicalKey = normalizeKeyToken(group.canonicalKey);
    return defaultValues.get(normalizedCanonicalKey) === group.representative.value
      && !visibleCanonicalKeys.has(normalizedCanonicalKey);
  }).length;

  return {
    entries,
    hiddenDefaultCount,
  };
}

export function buildStShowCardModel({
  ability,
  template,
  requestedKeys = [],
  keyAliasMap,
}: BuildStShowCardModelParams): StShowCardModel {
  const requestedMode = requestedKeys.some(key => key.trim() !== "");
  const rawEntries = requestedMode
    ? collectRequestedEntries(ability, requestedKeys, keyAliasMap)
    : collectRawEntries(ability, keyAliasMap);
  const defaultValues = requestedMode ? new Map<string, string>() : buildDefaultValueMap(ability, template, keyAliasMap);
  const { entries, hiddenDefaultCount } = collapseEntries(rawEntries, defaultValues, requestedMode);

  return {
    entries,
    requestedMode,
    hiddenDefaultCount,
  };
}

async function getRuleTemplate(ruleId: number): Promise<RuleTemplateLike | null> {
  if (!(ruleId > 0)) {
    return null;
  }

  const cached = ruleTemplateCache.get(ruleId);
  if (cached && cached.expireAt > Date.now()) {
    return cached.value;
  }

  try {
    const response = await tuanchat.ruleController.getRuleDetail(ruleId);
    const value = response.success && response.data
      ? {
          basicDefault: response.data.basicDefault ?? {},
          abilityFormula: response.data.abilityFormula ?? {},
          skillDefault: response.data.skillDefault ?? {},
        }
      : null;
    ruleTemplateCache.set(ruleId, {
      expireAt: Date.now() + RULE_TEMPLATE_CACHE_TTL_MS,
      value,
    });
    return value;
  }
  catch (error) {
    console.warn("[st-show] 获取规则模板失败", { ruleId, error });
    return null;
  }
}

function StShowCardPanel({
  roleName,
  entries,
  hiddenDefaultCount,
  requestedMode,
}: {
  roleName: string;
  entries: StShowDisplayEntry[];
  hiddenDefaultCount: number;
  requestedMode: boolean;
}) {
  const emptyText = requestedMode ? "未找到对应属性。" : "当前没有可展示的属性。";

  return (
    <div className="w-[min(92vw,46rem)] p-4">
      <div className="mb-3 text-sm font-semibold text-base-content">
        《
        {roleName}
        》的个人属性为：
      </div>
      {entries.length > 0
        ? (
            <div className="rounded-xl border border-base-300/70 bg-base-100 px-4 py-3 shadow-sm">
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {entries.map(entry => (
                  <div key={entry.key} className="break-all text-sm leading-6 text-base-content/90">
                    <span className="font-medium text-base-content">{entry.label}</span>
                    ：
                    {entry.value}
                  </div>
                ))}
              </div>
            </div>
          )
        : (
            <div className="rounded-xl border border-dashed border-base-300/80 bg-base-100/70 px-4 py-4 text-sm text-base-content/60">
              {emptyText}
            </div>
          )}
      {!requestedMode && hiddenDefaultCount > 0 && (
        <div className="mt-2 text-xs text-base-content/50">
          已隐藏
          {" "}
          {hiddenDefaultCount}
          {" "}
          项与规则默认值相同的属性。
        </div>
      )}
    </div>
  );
}

export async function openStShowCardWindow({
  ability,
  roleName,
  requestedKeys = [],
  keyAliasMap,
}: OpenStShowCardWindowParams): Promise<void> {
  const template = await getRuleTemplate(Number(ability.ruleId ?? 0));
  const model = buildStShowCardModel({
    ability,
    template,
    requestedKeys,
    keyAliasMap,
  });

  toastWindow(
    <StShowCardPanel
      roleName={roleName?.trim() || "当前角色"}
      entries={model.entries}
      hiddenDefaultCount={model.hiddenDefaultCount}
      requestedMode={model.requestedMode}
    />,
  );
}
