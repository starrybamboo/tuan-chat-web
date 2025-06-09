import type { GameInfoDto } from "@/webGAL/apis";

import { terreApis } from "@/webGAL/index";

/**
 * 从老前端继承下来的遗产，我不知道是什么。
 */
export enum DebugCommand {
  // 跳转
  JUMP,
  // 同步自客户端
  SYNCFC,
  // 同步自编辑器
  SYNCFE,
  // 执行指令
  EXE_COMMAND,
  // 重新拉取模板样式文件
  REFETCH_TEMPLATE_FILES,
}

export type IFile = {
  extName: string;
  isDir: boolean;
  name: string;
  path: string;
  pathFromBase?: string;
};

export type IDebugMessage = {
  event: string;
  data: {
    command: DebugCommand;
    sceneMsg: {
      sentence: number;
      scene: string;
    };
    message: string;
    stageSyncMsg: any;
  };
};
/**
 * 上传文件的通用函数
 * @param url 文件的url
 * @param path webgal的文件目录
 * @param fileName
 */
export async function uploadFile(url: string, path: string, fileName?: string | undefined): Promise<string> {
  // 如果未定义fileName，那就使用url中的fileName
  const newFileName = fileName || url.substring(url.lastIndexOf("/") + 1);
  const safeFileName = newFileName.replace(/\P{ASCII}/gu, char =>
    encodeURIComponent(char).replace(/%/g, ""));
  if (await checkFileExist(path, safeFileName)) {
    return safeFileName;
  }
  console.log("上传文件", url, path, safeFileName);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  const data = await response.blob();
  const blob = new Blob([data]);
  // 替换中文字符（webgal不支持）

  const file = new File([blob], safeFileName);

  const formData = new FormData();
  formData.append("files", file);
  formData.append("targetDirectory", path);

  await terreApis.uploadFile(formData);
  return safeFileName;
};

export async function readTextFile(game: string, path: string): Promise<string> {
  const url = `${import.meta.env.VITE_TERRE_URL}/games/${game}/game/${path}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to read file: ${response.statusText}`);
  return await response.text();
}

export async function checkGameExist(game: string): Promise<boolean> {
  const gameList: GameInfoDto[] = await terreApis.manageGameControllerGetGameList();
  if (!gameList)
    return false;
  return gameList.some(item => item.name === game);
}

export async function fetchFolder(folderPath: string) {
  const res = await terreApis.assetsControllerReadAssets(folderPath);
  const data = res as unknown as object;
  if ("dirInfo" in data && data.dirInfo) {
    const dirInfo = (data.dirInfo as IFile[]).map(item => ({ ...item, path: `${folderPath}/${item.name}` }));
    const dirs = dirInfo.filter(item => item.isDir);
    const files = dirInfo.filter(item => !item.isDir).filter(e => e.name !== ".gitkeep");
    return [...dirs, ...files];
  }
  else {
    return [];
  }
}

export async function checkFileExist(currentPathString: string, fileName: string): Promise<boolean> {
  const files = await fetchFolder(currentPathString);
  return files.some(item => item.name === fileName);
}

export function getAsyncMsg(sceneName: string, lineNumber: number): IDebugMessage {
  return {
    event: "message",
    data: {
      command: DebugCommand.JUMP,
      sceneMsg: {
        scene: sceneName,
        sentence: lineNumber,
      },
      stageSyncMsg: {},
      message: "Sync",
    },
  };
}
