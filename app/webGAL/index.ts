import { Api, HttpClient } from "@/webGAL/apis";

import {
  checkGameExist,
  readDir,
  readTextFile,
} from "./fileOperator";
import { editScene } from "./game";
import { Renderer } from "./renderer";

export {
  checkGameExist,
  editScene,
  readDir,
  readTextFile,
  Renderer,
};

export const terreApis = new Api(new HttpClient({ baseURL: "http://localhost:3001" }));
