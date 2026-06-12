/**
 * 根据字段内容长度计算 grid span（桌面端4列）
 */
export function getGridSpan(value: string): { colSpan: number; rowSpan: number } {
  const length = value?.length || 0;

  if (length <= 10) {
    return { colSpan: 1, rowSpan: 1 }; // 极短内容：1x1
  }
  else if (length <= 60) {
    return { colSpan: 2, rowSpan: 1 }; // 短内容：2x1
  }
  else if (length <= 120) {
    return { colSpan: 2, rowSpan: 2 }; // 中等内容：2x2
  }
  else if (length <= 240) {
    return { colSpan: 3, rowSpan: 2 }; // 较长内容：3x2
  }
  else {
    return { colSpan: 4, rowSpan: 2 }; // 长内容：4x2（占满整行）
  }
}

/**
 * 根据字段内容长度计算 grid span（移动端2列）
 */
export function getGridSpanMobile(value: string): { colSpan: number; rowSpan: number } {
  const length = value?.length || 0;

  if (length <= 10) {
    return { colSpan: 1, rowSpan: 1 }; // 极短内容：1x1
  }
  else if (length <= 60) {
    return { colSpan: 2, rowSpan: 1 }; // 短内容：2x1（占满整行）
  }
  else {
    return { colSpan: 2, rowSpan: 2 }; // 中等及以上内容：2x2（占满整行）
  }
}
