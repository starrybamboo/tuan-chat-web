/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DiceTurnReply = {
    /**
     * 骰娘回复内容
     */
    content: string;
    /**
     * 是否隐藏该条回复
     */
    hidden?: boolean | null;
    /**
     * 回复显示身份的角色 ID
     */
    roleId?: number | null;
    /**
     * 回复显示身份的立绘 ID
     */
    avatarId?: number | null;
    /**
     * 回复显示身份的自定义角色名
     */
    customRoleName?: string | null;
};

