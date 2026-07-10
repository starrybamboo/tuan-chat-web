const typeConfig = {
  1: { text: "GM/KP", color: "bg-error/10 text-error" },
  2: { text: "PL", color: "bg-info/10 text-info" },
  3: { text: "OB", color: "bg-base-200 text-base-content" },
  4: { text: "骰娘", color: "bg-warning text-base-content" },
  5: { text: "副GM/KP", color: "bg-warning/10 text-warning" },
};

/**
 *
 * @param memberType 对应Member里面的 memberType字段
 */
export function MemberTypeTag({ memberType }: {
  memberType?: number;
}) {
  // 类型安全转换
  const meta = getMemberTypeTagMeta(memberType);

  if (!meta)
    return <div>未知类型</div>;

  return (
    <span className={`
      text-xs px-2 py-1 rounded-full whitespace-nowrap
      ${meta.color}
    `}>
      {meta.text}
    </span>

  );
}

export function getMemberTypeTagMeta(memberType?: number) {
  const validType = memberType !== undefined && [1, 2, 3, 4, 5].includes(memberType)
    ? memberType as keyof typeof typeConfig
    : null;

  return validType ? typeConfig[validType] : null;
}
