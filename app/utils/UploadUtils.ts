import { compressImage } from "@/utils/imgCompressUtils";

// upload-utils.ts
import { tuanchat } from "../../api/instance";

export class UploadUtils {
  /**
   * 上传图片
   * @param file img文件
   * @param scene 上传场景1.聊天室,2.表情包，3.角色差分 4.模组图片
   * @param quality 质量
   * @param maxSize 最大的宽高（px）
   */
  async uploadImg(file: File, scene: 1 | 2 | 3 | 4 = 1, quality = 0.7, maxSize = 2560): Promise<string> {
    let new_file = file;
    if (file.type.startsWith("image/")) {
      new_file = await compressImage(file, quality, maxSize);
    }
    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: new_file.name,
      scene,
    });

    if (!ossData.data?.uploadUrl) {
      throw new Error("获取上传地址失败");
    }

    await this.executeUpload(ossData.data.uploadUrl, new_file);

    if (!ossData.data.downloadUrl) {
      throw new Error("获取下载地址失败");
    }
    return ossData.data.downloadUrl;
  }

  private async executeUpload(url: string, file: File): Promise<void> {
    const response = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "x-oss-acl": "public-read",
      },
    });

    if (!response.ok) {
      throw new Error(`文件传输失败: ${response.status}`);
    }
  }
}
