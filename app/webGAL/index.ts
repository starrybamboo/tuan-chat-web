import { Api, HttpClient } from "@/webGAL/apis";

import {
  checkGameExist,
  readTextFile,
} from "./fileOperator";

export {
  checkGameExist,
  readTextFile,
};

export const terreApis = new Api(new HttpClient({ baseURL: import.meta.env.VITE_TERRE_URL }));
