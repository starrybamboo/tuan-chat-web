import { compressImage } from "@/utils/imgCompressUtils";

// upload-utils.ts
import { tuanchat } from "../../api/instance";

// TODO 把这个之后改成一个纯函数的类
export class UploadUtils {
  constructor(private readonly scene: number = 2) {}

  async uploadImg(file: File, quality = 0.7, maxSize = 2560): Promise<string> {
    let new_file = file;
    if (file.type.startsWith("image/")) {
      new_file = await compressImage(file, quality, maxSize);
    }
    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: new_file.name,
      scene: 2,
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
