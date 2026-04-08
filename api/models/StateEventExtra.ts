/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StateEventAtom } from './StateEventAtom';
import type { StateEventSource } from './StateEventSource';
export type StateEventExtra = {
    source: StateEventSource;
    /**
     * 状态原子事件列表
     */
    events: Array<StateEventAtom>;
};

