const DM_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
});

export function formatDmTime(date: Date): string {
  return DM_TIME_FORMATTER.format(date);
}
