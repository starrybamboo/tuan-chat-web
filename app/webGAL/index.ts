import { Api, HttpClient } from "@/webGAL/apis";

import { getTerreBaseUrl } from "./terreConfig";

export { checkGameExist } from "./fileOperator";

let _terreApis: Api | null = null;
let _terreApisBaseUrl: string | null = null;
export function getTerreApis(): Api {
  const baseUrl = getTerreBaseUrl();
  if (!_terreApis || _terreApisBaseUrl !== baseUrl) {
    _terreApisBaseUrl = baseUrl;
    _terreApis = new Api(new HttpClient({ baseURL: baseUrl }));
  }
  return _terreApis;
}
