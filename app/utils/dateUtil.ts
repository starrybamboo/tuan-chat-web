export function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // 月份从0开始，需+1
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0").slice(0, 2);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * 根据当前时间智能排版时间
 * @param time 可以是 2025-08-18 20:38:25 的格式 或者 是一个时间戳 1755519511000
 * @returns 时间字符串 要求类似qq消息时间样式。会根据当前的时间自动调整。比如今天上午的就显示 上午10:12 ，昨天的就显示 昨天 下午03:30
 */
export function formatTimeSmartly(time: string | number): string {
  // 确保输入的时间能被正确解析，特别是对于YYYY-MM-DD格式
  const inputTime = new Date(typeof time === "string" && time.includes("-") ? time.replace(/-/g, "/") : time);
  const now = new Date();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDate = now.getDate();

  const inputYear = inputTime.getFullYear();
  const inputMonth = inputTime.getMonth();
  const inputDate = inputTime.getDate();

  const isSameDay = nowYear === inputYear && nowMonth === inputMonth && nowDate === inputDate;
  const isYesterday = nowYear === inputYear && nowMonth === inputMonth && nowDate - 1 === inputDate;

  /**
   * 获取时间段 (凌晨, 上午, 下午, 晚上)
   * @param date 日期对象
   * @returns {string}
   */
  const getAmPm = (date: Date): string => {
    const hours = date.getHours();
    if (hours < 6)
      return "凌晨";
    if (hours < 12)
      return "上午";
    if (hours < 18)
      return "下午";
    return "晚上";
  };

  /**
   * 格式化小时和分钟为 12小时制 (例如: 09:30)
   * @param date 日期对象
   * @returns {string}
   */
  const formatHoursMinutes = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");

    // 转换为12小时制
    if (hours > 12) {
      hours -= 12;
    }
    else if (hours === 0) {
      hours = 12; // 午夜12点
    }

    return `${hours.toString()}:${minutes}`;
  };

  // 1. 如果是今天
  if (isSameDay) {
    return `${getAmPm(inputTime)}${formatHoursMinutes(inputTime)}`;
  }

  // 2. 如果是昨天
  if (isYesterday) {
    return `昨天 ${getAmPm(inputTime)}${formatHoursMinutes(inputTime)}`;
  }

  // 3. 如果是今年内
  if (nowYear === inputYear) {
    return `${inputMonth + 1}月${inputDate}日 ${getAmPm(inputTime)}${formatHoursMinutes(inputTime)}`;
  }

  // 4. 如果是更早
  return `${inputYear}年${inputMonth + 1}月${inputDate}日 ${getAmPm(inputTime)}${formatHoursMinutes(inputTime)}`;
}
