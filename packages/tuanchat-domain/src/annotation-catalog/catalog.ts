import type { AnnotationDefinition } from "./types";

import { BUILTIN_ANNOTATIONS, NORMAL_MODE_HIDDEN_ANNOTATION_IDS } from "./data";

export function withNormalModeVisibilityDefaults<T extends AnnotationDefinition>(item: T): T {
  return {
    ...item,
    showInNormalMode: item.showInNormalMode ?? !NORMAL_MODE_HIDDEN_ANNOTATION_IDS.has(item.id),
  };
}

export function getAnnotationCatalog(): AnnotationDefinition[] {
  return BUILTIN_ANNOTATIONS.map(item => withNormalModeVisibilityDefaults(item));
}

export function buildAnnotationMap(catalog?: AnnotationDefinition[]): Map<string, AnnotationDefinition> {
  const items = catalog ?? getAnnotationCatalog();
  return new Map(items.map(item => [item.id, item]));
}

export function getAnnotationsByCategory(catalog: AnnotationDefinition[]): Map<string, AnnotationDefinition[]> {
  const map = new Map<string, AnnotationDefinition[]>();
  for (const item of catalog) {
    const cat = item.category ?? "其他";
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }
  return map;
}

export function normalizeAnnotations(annotations?: string[]): string[] {
  if (!Array.isArray(annotations)) return [];
  return annotations.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function toggleAnnotation(annotations: string[] | undefined, id: string): string[] {
  const list = normalizeAnnotations(annotations);
  return list.includes(id) ? list.filter(item => item !== id) : [...list, id];
}

export function getFrequentAnnotations(catalog: AnnotationDefinition[], usage: Record<string, number>, limit = 8): AnnotationDefinition[] {
  const sorted = catalog
    .map(item => ({ item, count: usage[item.id] ?? 0 }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  return sorted.slice(0, limit).map(entry => entry.item);
}

export function buildCustomAnnotationId(label: string, existingIds: Set<string>): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const fallback = `anno-${Date.now().toString(36)}`;
  const slug = base || fallback;
  let candidate = `cust:${slug}`;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `cust:${slug}-${index}`;
    index += 1;
  }
  return candidate;
}

export function isValidAnnotation(value: any): value is AnnotationDefinition {
  return value && typeof value.id === "string" && typeof value.label === "string";
}
