/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UploadUrlRequest = {
    /**
     * 文件名（带后缀）
     */
    fileName: string;
    /**
     * 上传场景1.聊天室,2.表情包，3.角色差分 4.模组图片
     */
    scene: number;
    /**
     * 去重预检：若对象已存在则返回 downloadUrl 且 uploadUrl 为空，前端可跳过实际上传
     */
    dedupCheck?: boolean;
};

