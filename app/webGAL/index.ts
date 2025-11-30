import { Api, HttpClient } from "@/webGAL/apis";

import {
  checkGameExist,
  readTextFile,
} from "./fileOperator";
import { RealtimeRenderer } from "./realtimeRenderer";
import { useRealtimeRender } from "./useRealtimeRender";

export {
  checkGameExist,
  readTextFile,
  RealtimeRenderer,
  useRealtimeRender,
};

export const terreApis = new Api(new HttpClient({ baseURL: import.meta.env.VITE_TERRE_URL }));
