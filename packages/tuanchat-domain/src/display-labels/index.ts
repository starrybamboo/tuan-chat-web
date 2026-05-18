export function getSpaceMemberTypeLabel(memberType?: number | null): string {
  switch (memberType) {
    case 1:
      return "主持";
    case 5:
      return "副主持";
    case 2:
      return "玩家";
    case 3:
      return "观战";
    case 4:
      return "骰娘";
    default:
      return "待识别";
  }
}

export function getRoomTypeLabel(roomType?: number | null): string {
  if (roomType === 2) {
    return "全员房间";
  }
  return "游戏房间";
}

export function getSpaceStatusLabel(status?: number | null): string {
  return status === 2 ? "已归档" : "活跃中";
}
