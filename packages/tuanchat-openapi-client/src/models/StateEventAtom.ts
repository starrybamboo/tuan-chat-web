/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StateEventScope } from './StateEventScope';
/**
 * 状态原子事件列表
 */
export type StateEventAtom = {
    /**
     * 事件类型
     */
    type?: string;
    scope?: StateEventScope;
    /**
     * 变量名，仅 varOp 使用
     */
    key?: string;
    /**
     * 变量操作，仅 varOp 使用
     */
    op?: string;
    /**
     * 变量操作值，仅 varOp 使用
     */
    value?: number;
    /**
     * 状态定义 ID，仅 statusApply 使用
     */
    statusId?: string;
    /**
     * 状态持续回合数覆盖，仅 statusApply 使用
     */
    durationTurns?: number;
    /**
     * 状态名称，仅 statusRemove 使用
     */
    statusName?: string;
    /**
     * 战斗参与者稳定 ID，仅 combatParticipant* / combatActiveParticipantSet 使用
     */
    participantId?: string;
    /**
     * 战斗参与者或地图 token 绑定的角色 ID
     */
    roleId?: number;
    /**
     * 战斗参与者显示名，仅 combatParticipantUpsert 使用
     */
    name?: string;
    /**
     * 战斗参与者先攻值，仅 combatParticipantUpsert 使用
     */
    initiative?: number;
    /**
     * 战斗参与者手动列值，仅 combatParticipantUpsert 使用
     */
    values?: Record<string, Record<string, any>>;
    /**
     * 地图 token 行坐标，仅 combatMapTokenUpsert 使用
     */
    rowIndex?: number;
    /**
     * 地图 token 列坐标，仅 combatMapTokenUpsert 使用
     */
    colIndex?: number;
    /**
     * 战斗参与者顺序，仅 combatOrderSet 使用
     */
    participantIds?: Array<string>;
    /**
     * 战斗列来源，仅 combatColumnUpsert 使用
     */
    source?: string;
    /**
     * 战斗列显示名，仅 combatColumnUpsert 使用
     */
    label?: string;
    /**
     * 角色属性键，仅 roleAttr 战斗列使用
     */
    attrKey?: string;
    /**
     * 状态变量键，仅 stateKey 战斗列使用
     */
    stateKey?: string;
};

