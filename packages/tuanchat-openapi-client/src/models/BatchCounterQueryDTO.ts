/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 批量计数器查询参数
 */
export type BatchCounterQueryDTO = {
    /**
     * 目标对象ID列表
     */
    targetIds: Array<number>;
    /**
     * 目标对象类型
     */
    targetType: number;
    /**
     * 计数类型
     */
    counterType: string;
};

