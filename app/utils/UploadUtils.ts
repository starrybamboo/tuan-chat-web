// upload-utils.ts
import { tuanchat } from "../../api/instance";

export class UploadUtils {
  constructor(private readonly scene: number = 2) {}

  async upload(file: File): Promise<string> {
    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: file.name,
      scene: this.scene,
    });

    if (!ossData.data?.uploadUrl) {
      throw new Error("获取上传地址失败");
    }

    await this.executeUpload(ossData.data.uploadUrl, file);

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
