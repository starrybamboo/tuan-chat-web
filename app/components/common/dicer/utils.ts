const UNTIL = {
  doesHaveArg: (args: string[], arg: string) => {
    // 转化为小写并去除空格
    const argsFmt = args.map(arg => arg.trim().toLowerCase());
    const res = argsFmt.includes(arg.toLowerCase());
    // 如果包含该参数，则移除该参数
    const index = argsFmt.indexOf(arg.toLowerCase());
    if (res) {
      args.splice(index, 1);
    }
    return res;
  },

  setRoleAbilityValue: (role: RoleAbility, key: string, value: string, deafult_type: "skill" | "ability" | "basic", type: "auto" | "skill" | "ability" | "basic" = "auto"): void => {
    switch (type) {
      case "basic":
        if (!role.basic) {
          role.basic = {};
        }
        role.basic[key] = value;
        break;
      case "ability":
        if (!role.ability) {
          role.ability = {};
        }
        role.ability[key] = value;
        break;
      case "skill":
        if (!role.skill) {
          role.skill = {};
        }
        role.skill[key] = value;
        break;
      default:
        // 自动设置类型
        setRoleAbilityValueAuto(role, key, value, deafult_type);
        break;
    }
  },

  getRoleAbilityValue: (role: RoleAbility, key: string, type: "auto" | "skill" | "ability" | "basic" = "auto"): string | undefined => {
    switch (type) {
      case "basic":
        if (role.basic && key in role.basic) {
          return role.basic[key];
        }
        break;
      case "ability":
        if (role.ability && key in role.ability) {
          return role.ability[key];
        }
        break;
      case "skill":
        if (role.skill && key in role.skill) {
          return role.skill[key];
        }
        break;
      default:
        // 自动获取类型
        return getRoleAbilityValueAuto(role, key);
    }
  },
};

export default UNTIL;

/**
 * 根据角色能力值自动设置角色能力，会依次遍历basic、ability、skill中的键，如果没有找到则设置到default_type中
 * @param role 原角色能力对象
 * @param key 要设置的键
 * @param value 要设置的值
 * @param default_type 默认类型
 */
function setRoleAbilityValueAuto(role: RoleAbility, key: string, value: string, default_type: string) {
  // 先尝试在basic中查找
  if (role.basic && key in role.basic) {
    role.basic[key] = value;
    return;
  }
  // 再尝试在ability中查找
  if (role.ability && key in role.ability) {
    role.ability[key] = value;
    return;
  }
  // 再尝试在skill中查找
  if (role.skill && key in role.skill) {
    role.skill[key] = value;
    return;
  }
  // 都没有找到，则设置到默认类型中
  switch (default_type) {
    case "basic":
      if (!role.basic) {
        role.basic = {};
      }
      role.basic[key] = value;
      break;
    case "ability":
      if (!role.ability) {
        role.ability = {};
      }
      role.ability[key] = value;
      break;
    case "skill":
      if (!role.skill) {
        role.skill = {};
      }
      role.skill[key] = value;
      break;
    default:
      // 默认类型不合法
      break;
  }
}

/**
 * 根据角色能力值自动获取角色能力，会依次遍历basic、ability、skill中的键，如果没有找到则返回undefined
 * @param role 原角色能力对象
 * @param key 要获取的键
 * @returns 对应的值，如果没有找到则返回undefined
 */
function getRoleAbilityValueAuto(role: RoleAbility, key: string): string | undefined {
  // 先尝试在basic中查找
  if (role.basic && key in role.basic) {
    return role.basic[key];
  }
  // 再尝试在ability中查找
  if (role.ability && key in role.ability) {
    return role.ability[key];
  }
  // 再尝试在skill中查找
  if (role.skill && key in role.skill) {
    return role.skill[key];
  }
  // 都没有找到
  return undefined;
}
