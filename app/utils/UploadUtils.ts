import { Md5 } from "ts-md5";

import { compressImage } from "@/utils/imgCompressUtils";

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

    // 1. 计算文件内容的 SHA-256 哈希值
    const hash = await this.calculateFileHash(new_file);

    // 2. 获取文件大小
    const fileSize = new_file.size;

    // 3. 安全地获取文件扩展名
    const extension = new_file.name.split(".").pop() || "bin"; // 使用 'bin' 作为无扩展名时的备用

    // 4. 构造新的唯一文件名：hash_size.extension
    const newFileName = `${hash}_${fileSize}.${extension}`;

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
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

  /**
   * 使用 ts-md5 计算文件的 MD5 哈希值。
   * 这个库是使用 TypeScript 编写的，所以不需要额外的类型定义文件。
   * @param file 文件对象
   * @returns 返回一个 Promise，解析为文件的 MD5 哈希字符串
   */
  private calculateFileHash(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      // 文件读取成功时的回调
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          const hash = new Md5()
            .appendStr(e.target.result as string) // Use appendStr for string result
            .end();
          if (hash) {
            resolve(hash as string);
          }
        }
      };

      // 以字符串形式读取文件以配合 appendStr
      reader.readAsBinaryString(file);
    });
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
