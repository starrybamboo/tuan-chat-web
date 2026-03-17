const typeConfig = {
  1: { text: "GM/KP", color: "bg-red-100 text-red-800" },
  2: { text: "PL", color: "bg-blue-100 text-blue-800" },
  3: { text: "OB", color: "bg-gray-100 text-gray-800" },
  4: { text: "骰娘", color: "bg-yellow-100 text-gray-800" },
  5: { text: "副GM/KP", color: "bg-orange-100 text-orange-800" },
};

/**
 *
 * @param memberType 对应Member里面的 memberType字段
 */
export function MemberTypeTag({ memberType }: {
  memberType?: number;
}) {
  // 类型安全转换
  const validType = memberType !== undefined && [1, 2, 3, 4, 5].includes(memberType)
    ? memberType as keyof typeof typeConfig
    : null;

  if (!validType)
    return <div>未知类型</div>;

  return (
    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${typeConfig[validType].color}`}>
      {typeConfig[validType].text}
    </span>

  );
}
