export function buildRoleAvatarGridRows<T>(items: readonly T[], columns: number): T[][] {
  const columnCount = Math.max(1, Math.floor(columns));
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columnCount) {
    rows.push(items.slice(index, index + columnCount));
  }
  return rows;
}
