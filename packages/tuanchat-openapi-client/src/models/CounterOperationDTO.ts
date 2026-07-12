/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 计数器操作参数
 */
export type CounterOperationDTO = {
    /**
     * 目标对象ID
     */
    targetId: number;
    /**
     * 目标对象类型
     */
    targetType: number;
    /**
     * 计数类型
     */
    counterType?: string;
    /**
     * 增量值或设置值，增加计数时默认为1
     */
    value?: number;
};

