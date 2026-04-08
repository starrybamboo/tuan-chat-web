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
};

