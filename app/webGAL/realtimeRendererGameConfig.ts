export type GameConfigEntry = {
  key: string;
  value: string;
};

export function sanitizeGameConfigValue(value: string): string {
  return String(value ?? "").replace(/[\r\n;]/g, " ").trim();
}

export function parseGameConfig(rawConfig: string): GameConfigEntry[] {
  return String(rawConfig ?? "")
    .replace(/\r/g, "")
    .split(";")
    .map(commandText => commandText.trim())
    .filter(commandText => commandText.length > 0)
    .map((commandText) => {
      const index = commandText.indexOf(":");
      if (index <= 0) {
        return null;
      }
      const key = commandText.slice(0, index).trim();
      const value = commandText.slice(index + 1).trim();
      if (!key) {
        return null;
      }
      return {
        key,
        value,
      } satisfies GameConfigEntry;
    })
    .filter((entry): entry is GameConfigEntry => Boolean(entry));
}

export function serializeGameConfig(entries: GameConfigEntry[]): string {
  return entries
    .map(({ key, value }) => `${key}:${sanitizeGameConfigValue(value)};`)
    .join("\n");
}

export function upsertGameConfigEntry(entries: GameConfigEntry[], key: string, value: string): void {
  const sanitizedKey = String(key ?? "").trim();
  if (!sanitizedKey) {
    return;
  }
  const sanitizedValue = sanitizeGameConfigValue(value);
  const index = entries.findIndex(entry => entry.key === sanitizedKey);
  if (index >= 0) {
    entries[index] = {
      key: sanitizedKey,
      value: sanitizedValue,
    };
    return;
  }
  entries.push({
    key: sanitizedKey,
    value: sanitizedValue,
  });
}
