/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommandRequestExtra = {
    /**
     * 要执行的指令文本（包含前缀，如 .r3d6*5）
     */
    command: string;
    /**
     * 是否允许所有成员点击执行
     */
    allowAll?: boolean;
    /**
     * 允许点击执行的角色ID列表（可选；为空时表示不限制）
     */
    allowedRoleIds?: Array<number>;
};

