/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 回退文件信息请求
 */
export type StageRollbackRequest = {
    /**
     * ID
     */
    moduleId: number;
    /**
     * 以name唯一标识一个实体，就像文件名标识一个文件
     */
    name: string;
    /**
     * 实体类型(item, role, scene)
     */
    entityType: string;
};

