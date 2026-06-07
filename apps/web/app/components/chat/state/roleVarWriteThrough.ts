export {
  applyRoleVarOpsToAbility,
  cloneRoleAbilityForWriteThrough,
  collectRoleVarOps,
  mergeRoleVarOpSnapshotsIntoEvents,
  persistRoleAbilitySnapshot,
  writeRoleVarOpsThroughAbilities,
} from "@tuanchat/domain/state-runtime";

export type {
  RoleVarWriteThroughDeps,
  WriteRoleVarOpsParams,
} from "@tuanchat/domain/state-runtime";
