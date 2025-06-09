export function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // 月份从0开始，需+1
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0").slice(0, 2);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function getCurTimeStamp() {
  return (new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }).replace(/[/\s,:]/g, "-");
}
