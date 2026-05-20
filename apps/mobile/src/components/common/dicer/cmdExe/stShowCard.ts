import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

export type StShowCardProps = {
  ability: RoleAbility;
  requestedKeys?: string[];
  roleName: string;
};

export type StShowCardRow = {
  key: string;
  value: string;
};

export type StShowCardSection = {
  rows: StShowCardRow[];
  title: string;
};

export type StShowCardModel = {
  roleName: string;
  sections: StShowCardSection[];
};

export function buildStShowCardModel(props: StShowCardProps): StShowCardModel {
  const sections = [
    ["基础", props.ability.basic],
    ["能力", props.ability.ability],
    ["技能", props.ability.skill],
    ["记录", props.ability.record],
  ] as const;
  const requested = new Set((props.requestedKeys ?? []).map(key => key.trim()).filter(Boolean));

  return {
    roleName: props.roleName,
    sections: sections
      .map(([title, values]) => ({
        title,
        rows: Object.entries(values ?? {})
          .filter(([key]) => requested.size === 0 || requested.has(key))
          .map(([key, value]) => ({ key, value })),
      }))
      .filter(section => section.rows.length > 0),
  };
}

export async function openStShowCardWindow(props: StShowCardProps): Promise<void> {
  void props;
}
