/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type StageEntityResponse = {
    /**
     * 以name唯一标识一个实体，就像文件名标识一个文件
     */
    name?: string;
    /**
     * 实体类型(item, role, scene)
     */
    entityType?: string;
    /**
     * 变更内容的JSON数据
     */
    entityInfo?: Record<string, any>;
    /**
     * 操作类型(0:添加或修改, 1:删除)
     */
    operationType?: number;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

