/* Custom (not generated) */

/**
 * 将角色添加到 space（前端占位请求体）。
 * 注意：当前 OpenAPI 中未提供对应的后端接口（仅有 GET /capi/space/module/role）。
 */
export type SpaceRoleAddRequest = {
  spaceId: number;
  roleIdList: Array<number>;
};
