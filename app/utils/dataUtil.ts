export function formatToLocalISO(date: Date) {
  // 创建无毫秒的日期副本
  const normalizedDate = new Date(date);
  normalizedDate.setMilliseconds(0);
  return `${[
    normalizedDate.getFullYear(),
    (normalizedDate.getMonth() + 1).toString().padStart(2, "0"),
    normalizedDate.getDate().toString().padStart(2, "0"),
  ].join("-")}T${[
    normalizedDate.getHours().toString().padStart(2, "0"),
    normalizedDate.getMinutes().toString().padStart(2, "0"),
    normalizedDate.getSeconds().toString().padStart(2, "0"),
  ].join(":")}`;
}
