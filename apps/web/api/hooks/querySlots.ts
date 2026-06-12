export type UniqueQuerySlot<TItem> = {
  item: TItem;
  originalIndex: number;
};

export type UniqueQuerySlots<TItem> = {
  queryItems: UniqueQuerySlot<TItem>[];
  resultIndexes: number[];
};

export function createUniqueQuerySlots<TItem>(
  items: readonly TItem[],
  getSlotKey: (item: TItem, originalIndex: number) => string,
): UniqueQuerySlots<TItem> {
  const keyToQueryIndex = new Map<string, number>();
  const queryItems: UniqueQuerySlot<TItem>[] = [];
  const resultIndexes: number[] = [];

  items.forEach((item, originalIndex) => {
    const slotKey = getSlotKey(item, originalIndex);
    const existingQueryIndex = keyToQueryIndex.get(slotKey);
    if (existingQueryIndex !== undefined) {
      resultIndexes.push(existingQueryIndex);
      return;
    }

    const queryIndex = queryItems.length;
    keyToQueryIndex.set(slotKey, queryIndex);
    queryItems.push({ item, originalIndex });
    resultIndexes.push(queryIndex);
  });

  return { queryItems, resultIndexes };
}

export function mapUniqueQueryResults<TResult>(
  results: readonly TResult[],
  resultIndexes: readonly number[],
): TResult[] {
  return resultIndexes.map((queryIndex) => {
    const result = results[queryIndex];
    if (result === undefined) {
      throw new Error(`Missing useQueries result for slot ${queryIndex}`);
    }
    return result;
  });
}
