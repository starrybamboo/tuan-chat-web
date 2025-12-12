/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Space对象
 */
export type Space = {
    /**
     * 空间id
     */
    spaceId?: number;
    /**
     * 空间名称
     */
    name?: string;
    /**
     * 空间头像
     */
    avatar?: string;
    /**
     * 空间描述
     */
    description?: string;
    /**
     * 空间规则
     */
    ruleId?: number;
    /**
     * 空间所有者id
     */
    userId?: number;
    /**
     * 状态 0正常 1删除 2归档
     */
    status?: number;
    moduleId?: number;
    stageId?: number;
    /**
     * 骰子角色id
     */
    dicerRoleId?: number;
    roomMap?: Record<string, Array<string>>;
    /**
     * 其他信息
     */
    extra?: string;
    createTime?: string;
    updateTime?: string;
};

