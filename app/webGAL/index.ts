import { Api, HttpClient } from "@/webGAL/apis";

import {
  checkGameExist,
  readDir,
  readTextFile,
} from "./fileOperator";
import { createPreview, editScene } from "./game";
import { Renderer } from "./renderer";

export {
  checkGameExist,
  createPreview,
  editScene,
  readDir,
  readTextFile,
  Renderer,
};

export const terreApis = new Api(new HttpClient({ baseURL: "http://localhost:3001" }));
