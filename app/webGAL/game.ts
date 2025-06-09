import { terreApis } from "@/webGAL/index";

// TODO: 换个接口
export async function editScene(game: string, scene: string, content: string) {
  const path = `games/${game}/game/scene/${scene}.txt`;
  await terreApis.manageGameControllerEditTextFile({ path, textFile: content });
}
