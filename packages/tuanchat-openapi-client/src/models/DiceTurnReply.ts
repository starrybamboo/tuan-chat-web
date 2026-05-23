/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 骰娘回复列表
 */
export type DiceTurnReply = {
    /**
     * 骰娘回复内容
     */
    content: string;
    /**
     * 是否隐藏该条回复
     */
    hidden?: boolean;
    /**
     * 回复显示身份的角色 ID
     */
    roleId?: number;
    /**
     * 回复显示身份的立绘 ID
     */
    avatarId?: number;
    /**
     * 回复显示身份的自定义角色名
     */
    customRoleName?: string;
};

