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
     * 地图 token 绑定的角色 ID
     */
    roleId?: number;
    /**
     * 地图 token 行坐标，仅 mapTokenUpsert 使用
     */
    rowIndex?: number;
    /**
     * 地图 token 列坐标，仅 mapTokenUpsert 使用
     */
    colIndex?: number;
    /**
     * 战斗地图图片文件 ID，仅 mapConfigUpsert 使用
     */
    mapFileId?: number;
    /**
     * 战斗地图网格行数，仅 mapConfigUpsert 使用
     */
    gridRows?: number;
    /**
     * 战斗地图网格列数，仅 mapConfigUpsert 使用
     */
    gridCols?: number;
    /**
     * 战斗地图网格颜色，仅 mapConfigUpsert 使用
     */
    gridColor?: string;
    /**
     * 是否在更新地图配置时清空 token，仅 mapConfigUpsert 使用
     */
    clearTokens?: boolean;
};
