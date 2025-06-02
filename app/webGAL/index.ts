import { Api, HttpClient } from "@/webGAL/apis";

import {
  checkGameExist,
  readTextFile,
} from "./fileOperator";
import { editScene } from "./game";
import { Renderer } from "./renderer";

export {
  checkGameExist,
  editScene,
  readTextFile,
  Renderer,
};

export const terreApis = new Api(new HttpClient({ baseURL: import.meta.env.VITE_TERRE_URL }));
