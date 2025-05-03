import { terreApis } from "@/webGAL/index";

// TODO: 换个接口
export async function editScene(game: string, scene: string, content: string) {
  const path = `games/${game}/game/scene/${scene}.txt`;
  return (await terreApis.manageGameControllerEditTextFile({ path, textFile: content })).data;
}
