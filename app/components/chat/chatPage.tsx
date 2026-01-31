import type { SpaceContextType } from "@/components/chat/core/spaceContext";
import type { MinimalDocMeta, SidebarLeafNode, SidebarTree } from "@/components/chat/room/sidebarTree";
import {
  useAddRoomMemberMutation,
  useAddSpaceMemberMutation,
  useGetSpaceInfoQuery,
  useGetSpaceMembersQuery,
  useGetUserActiveSpacesQuery,
  useGetUserRoomsQuery,
  useSetPlayerMutation,
} from "api/hooks/chatQueryHooks";
import { useGetFriendRequestPageQuery } from "api/hooks/friendQueryHooks";
import { useGetSpaceSidebarTreeQuery, useSetSpaceSidebarTreeMutation } from "api/hooks/spaceSidebarTreeHooks";
import { tuanchat } from "api/instance";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useSearchParams } from "react-router";
import type {
  ChatDiscoverMode,
  ChatPageMainView,
  DocTcHeaderPayload,
  RoomSettingState,
  RoomSettingTab,
  SpaceDetailTab,
} from "@/components/chat/chatPage.types";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ChatPageMainContent from "@/components/chat/chatPageMainContent";
import ChatPageModals from "@/components/chat/chatPageModals";
import ChatPageSidePanelContent from "@/components/chat/chatPageSidePanelContent";
import { buildSpaceDocId, parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import ChatPageContextMenu from "@/components/chat/room/contextMenu/chatPageContextMenu";
import { buildDefaultSidebarTree, extractDocMetasFromSidebarTree, parseSidebarTree } from "@/components/chat/room/sidebarTree";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import SpaceContextMenu from "@/components/chat/space/contextMenu/spaceContextMenu";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { getDefaultCreateInCategoryMode } from "@/components/chat/utils/createInCategoryMode";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { useGlobalContext } from "@/components/globalContextProvider";
import { usePrivateMessageList } from "@/components/privateChat/hooks/usePrivateMessageList";
import { useUnreadCount } from "@/components/privateChat/hooks/useUnreadCount";
import { SidebarSimpleIcon } from "@/icons";

/**
 * chat闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曚綅閸ヮ剦鏁嶉柣鎰綑閳ь剝鍩栫换婵嬫濞戞瑱绱為梺缁樺笂缁瑩寮婚妸鈺傚亜闁告繂瀚呴敐澶嬬厱閹艰揪绱曟晥闂佸搫鏈惄顖氼嚕閹绢喖惟闁靛牆娲ㄥ▔鍧楁⒒娴ｉ涓查梻鍕閸掓帗鎯旈敐鍡╂綗闂佽鍎抽悺銊﹀垔鐎靛摜纾奸悗锝庡亽閸庛儱霉閻樺灚鍤€闁?
 */
interface ChatPageProps {
  /**
   * 闂傚倸鍊搁崐鐑芥倿閿曗偓椤啴宕归鍛姺闂佺鍕垫當缂佲偓婢舵劖鍊甸柨婵嗛婢ф彃鈹戦鎸庣彧闁靛洤瀚伴獮鎺楀箣濠垫劒鐥梻浣侯焾椤戝懘顢栨径鎰畺鐎瑰嫭澹嬮弸搴ㄧ叓閸ャ劍鎯勫ù灏栧亾闂傚倷绀侀幖顐⑽涘▎寰濇椽鎮㈤悡搴ゆ憰濠电偞鍨剁划搴ㄦ偪閳ь剟鏌ｆ惔顖滅У濞存粍绮嶉幈銊︽償閵婏箑浠┑鐘诧工閹冲酣銆傛總鍛婄厽闁冲搫锕ら悘锔锯偓娈垮櫘閸嬪嫰顢橀崗鐓庣窞濠电姴娲ら弫瑙勭節閻㈤潧孝闁诲繑宀稿畷婵嬪冀椤撶偟顔?/chat/discover闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熷▎陇顕уú顓㈢嵁瀹ュ鏁婇柣鐔碱暒婢规洟姊洪崜鑼帥闁稿鎳橀幆鍐箣閿旂晫鍘撻悷婊勭矒瀹曟粌鈹戠€ｅ墎绋忔繝銏ｅ煐閸旀牠宕电仦杞挎棃鏁愰崨顓熸闂佹悶鍔岄崐鍧楀蓟濞戔懇鈧箓骞嬪┑鍛嚬闂備礁鎲￠悷銉ф崲濮椻偓楠炲啫螖閸涱喗娅滈梺绋挎湰缁嬫帡鎮甸弮鍫熲拺濞村吋鐟╁顔剧磼椤旇姤宕屾鐐插暙閻ｏ繝骞嶉搹顐も偓濠氭椤愩垺澶勬俊顐㈢箰铻為柣鎰ゴ閺€浠嬫煟閹邦垰鐨洪柟鐣屽█閺屻劑寮村Ο铏逛痪婵?
   * 濠电姷鏁告慨鐑藉极閹间礁纾绘繛鎴旀嚍閸ヮ剦鏁囬柕蹇曞Х椤︻噣鎮楅獮鍨姎妞わ富鍨崇划鍫ュ醇濠㈡繂缍婇幃鈩冩償閿濆棙鍠栭梻浣告惈閹峰宕滃璺虹疄闁靛鍎哄銊╂煕閳╁啨浠︾紒銊ヮ煼濮婄儤瀵煎▎鎾搭€嶇紓渚囧枟閹瑰洭鐛崘銊ф殝闁逛絻娅曢悗濠氭椤愩垺澶勬俊顐㈢箰铻為柣鎰ゴ閺€浠嬫煟閹邦垰鐨洪柟鐣屽█閹锋垶娼忛埡鍐紲闂佺鏈粙鎴犵箔閹烘挶浜滈柟鍓у仺閸嬨垻鈧娲滈崰鏍€侀弮鍫濆耿婵炴垶鍩冮崑鎾绘惞閸︻厾锛濋梺绋挎湰閼归箖鍩€椤掑嫷妫戠紒顔肩墛閹峰懐鎮伴垾鍏呭濠殿喗锕㈠Λ璺ㄨ姳婵犳碍鐓冮悹鍥ㄧ叀閸欏嫬鈹戦鐟颁壕闂備線娼ч悧鍡涘箠閹板叓鍥Ω閳哄倵鎷洪梺鍛婄☉閿曪箓鍩婇弴鐔虹闁稿繗鍋愰幊鍥┾偓瑙勬礃缁诲牊淇婇悜钘夌厸闁稿本绮岄獮妤佺節绾版ɑ顫婇柛銊ゅ嵆閹ê鈹戠€ｎ偄浜楅梺瑙勫婢ф鎮￠崘顏呭枑婵犲﹤鐗嗙粈鍌涚箾閹寸儑渚涙繛鎾愁煼閺岀喖鎮滃Ο鐑╂嫻闁诲孩鑹鹃…鐑藉蓟閿濆绫嶉柛灞捐壘娴犳绱撴担鎻掍壕闂佸憡娲﹂崹閬嶆偂閺囥垺鐓冮柦妯侯槹椤ユ粍顨ラ悙鎼劷缂佽鲸甯￠崺鈧い鎺戝缁€瀣亜閹邦喖鏋戞い顐㈢Ч濮婅櫣鎲撮崟顐㈠Б缂佸墽铏庨崢濂告偤椤撶偐鏀?URL 闂傚倸鍊搁崐鐑芥嚄閸洍鈧箓宕奸姀鈥冲簥闂佸壊鍋侀崕杈╃矆婢舵劖鐓欓弶鍫濆⒔閻ｉ亶姊婚崒銈呯仭缂佺粯绋戦蹇涱敊閼姐倗娉块梻浣告啞閻熴儵鏁冮鍫濊摕闁挎繂鎲橀悢鐓庡瀭妞ゆ梻鍋撻妤佺節閻㈤潧浠滈柣妤€锕獮鍐磼閻愯尪鎽曢梺闈涱焾閸庮喖危閸喐鍙忔俊銈傚亾婵☆偅鐟ㄩ崐鎾⒒?
   */
  initialMainView?: ChatPageMainView;
  discoverMode?: ChatDiscoverMode;
}

export default function ChatPage({ initialMainView, discoverMode }: ChatPageProps) {
  const { spaceId: urlSpaceId, roomId: urlRoomId, messageId: urlMessageId } = useParams();
  const activeSpaceId = Number(urlSpaceId) || null;
  const [searchParam, _] = useSearchParams();
  const navigate = useNavigate();

  const isPrivateChatMode = urlSpaceId === "private";

  const isDocRoute = !isPrivateChatMode && urlRoomId === "doc" && typeof urlMessageId === "string" && urlMessageId.length > 0;
  const activeDocId = (() => {
    if (!isDocRoute)
      return null;

    const decoded = decodeURIComponent(urlMessageId as string);

    // URL 婵犵數濮烽弫鎼佸磻閻斿澶愬箛閺夎法锛涢梺褰掑亰閸樹粙宕ｈ箛娑欑厽闁硅揪绲鹃ˉ澶岀磼閳ь剟宕熼鈧ぐ鎺撳亹鐎瑰壊鍠栭崜浼存⒑閸濆嫷鍎庣紒鑸靛哺瀵鍩勯崘銊х獮闁瑰吋鐣崹濠氬Υ婵犲洦鈷?docId闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熼悜姗嗘畷闁搞倕鑻灃闁挎繂鎳庨弳娆撴煠缁嬭法绉洪柡宀€鍠撶槐鎺楀閻樺磭浜堕梻浣虹帛鐢紕绮婚弽顓炶摕闁哄洨鍠撶弧鈧棅顐㈡处缁嬫帡顢撳澶嬪仩婵炴垶菧閸嬨垽鏌″畝瀣К缂佺姵鐩獮姗€宕滄笟鍥ф暪闂備浇顕х€涒晠宕欑憴鍕洸闁绘劕鎼粻?blocksuite docId闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熺€涙绠ラ柣鏂挎閺屾稑顓兼惔銏╂姜c:<id>:description闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熷▎陇顕уú顓€佸鈧慨鈧柣姗€娼ф慨?
    if (/^\d+$/.test(decoded)) {
      const id = Number(decoded);
      if (Number.isFinite(id) && id > 0) {
        return buildSpaceDocId({ kind: "independent", docId: id });
      }
    }

    // 婵犵數濮烽弫鎼佸磻閻愬搫鍨傞柛顐ｆ礀缁犱即鏌涘┑鍕姢闁活厽鎹囬弻鐔虹磼閵忕姵鐏堥柣鐔哥懕缁犳捇骞冨Δ鍛櫜閹肩补鈧啿绠ｉ梻浣侯焾椤戝棝骞愰幆褉妲堥柣銏㈩焾濡炶棄霉閿濆懏璐＄紒澶愭敱缁绘繄鍠婂Ο娲绘綉闂佺顑嗙敮鈥崇暦閹寸偟绡€闁搞儜鍛毎?sdoc:<id>:description闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熸潏楣冩闁稿顑夐弻娑㈠焺閸愵亝鍣繝娈垮枟婵炲﹪寮诲☉妯锋瀻闊浄绲炬晥濠电姵顔栭崹閬嶅箰閹惰棄绠栫憸鐗堝笒缁犳帡鏌熼悜妯虹仴妞ゎ剙顦靛娲传閸曨剦妫炵紓浣虹帛鐢偛危閹版澘绠抽柡鍐ㄥ€婚敍婊堟⒑闂堟稓绠冲┑顕€鏀辩粋鎺楊敇閵忊檧鎷洪梺鍛婄箓鐎氼參藟閻樼粯鐓曢柣妯挎珪瀹曞矂鏌涢埞鎯т壕?URL闂?
    const parsed = parseSpaceDocId(decoded);
    if (parsed?.kind === "independent") {
      return null;
    }

    // 闂傚倸鍊搁崐鐑芥嚄閸洍鈧箓宕奸姀鈥冲簥濠德板€愰崑鎾绘煃缂佹ɑ鐓ラ柍钘夘樀婵偓闁炽儱鍘栭幃?docId闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熸潏楣冩闁稿顑夐弻娑㈠焺閸愵亖妫ㄩ梺?udoc:<id>:description闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熷▎陇顕уú顓€佸▎鎾崇畾鐟滃秹鎮樻繝鍌楁斀闁绘劖娼欓悘鐔兼煕閵娿儲璐＄紒顔肩墦瀹曟帒袙椤撶偟绉洪柡浣瑰姍瀹曞爼鍩￠崒娑樻櫟闂傚倷绀侀幗婊堝窗鎼淬劌绠犳俊顖欒濞兼牗绻涘顔绘喚闁轰礁鍟撮弻銊モ攽閸℃浠归柣搴㈢▓閺呮繄妲?URL 闂傚倸鍊搁崐鐑芥嚄閸洖纾块柣銏㈩焾閻ょ偓绻濋棃娑氭噥濠㈣埖鍔曠粻娑㈡煛婢跺孩纭舵い?
    return decoded;
  })();

  useEffect(() => {
    if (!isDocRoute)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    try {
      const decoded = decodeURIComponent(urlMessageId as string);
      const parsed = parseSpaceDocId(decoded);
      if (parsed?.kind === "independent") {
        toast.error("闂傚倸鍊风粈渚€骞栭锕€鑸归柡灞诲劚缁€瀣亜閹烘垵鈧敻宕戦幘娲绘晩闁瑰瓨甯炵粻姘攽鎺抽崐鏇㈩敄閸モ晝鐭撴い鏇楀亾闁哄瞼鍠栭幐濠冨緞閸繀鍒掓俊銈囧Х閸嬬偟鏁埄鍐х箚闁绘垼妫勫敮闂侀潧顦崕鏌ヮ敇閻撳簶鏀介柣姗嗗枛閻忣亪鏌涙惔鈥虫倯闁靛洦妫冮獮鏍ㄦ媴閸濄儲鐓ｉ梻渚€娼чˇ顐﹀疾濠婂牆鐤炬い鎺戝€甸崑鎾诲礂婢跺﹣澹曢梻浣告啞閸旀牠宕曢崘娴嬫灁闁告瑥顦辩粻楣冨级閸繂鈷旂紒澶樺墯缁绘稒寰勭€ｎ偆顦伴悗娈垮櫘閸嬪﹥淇婇崼鏇炵倞闁冲搫鍋婄槐鈩冧繆閻愵亜鈧牠鎮уΔ鍐煓闁圭儤鍨熼弸鏃堟煕椤愶絾绀冮柛濠傜仛缁绘盯骞嬮悙鍨櫧濠电偛鐗婄划鎾诲蓟閻斿吋瀵犲璺虹墕娴狀喖螖?);
        navigate(`/chat/${activeSpaceId}`);
      }
    }
    catch {
      // ignore
    }
  }, [activeSpaceId, isDocRoute, navigate, urlMessageId]);

  const activeRoomId = isDocRoute ? null : (Number(urlRoomId) || null);
  const targetMessageId = isDocRoute ? null : (Number(urlMessageId) || null);

  const isRoomSettingRoute = !isDocRoute && urlMessageId === "setting";
  const spaceDetailRouteTab: SpaceDetailTab | null = (!isPrivateChatMode && !urlMessageId && (urlRoomId === "members" || urlRoomId === "workflow" || urlRoomId === "setting" || urlRoomId === "trpg"))
    ? urlRoomId
    : null;
  const isSpaceDetailRoute = spaceDetailRouteTab != null;

  const screenSize = useScreenSize();

  useEffect(() => {
    useEntityHeaderOverrideStore.getState().hydrateFromLocalStorage();
    useDocHeaderOverrideStore.getState().hydrateFromLocalStorage();
  }, []);

  const [isOpenLeftDrawer, setIsOpenLeftDrawer] = useState(() => {
    if (screenSize !== "sm") {
      return true;
    }
    return !(urlSpaceId && urlRoomId) || (!urlRoomId && isPrivateChatMode) || !isPrivateChatMode;
  });

  const toggleLeftDrawer = useCallback(() => {
    setIsOpenLeftDrawer(prev => !prev);
  }, []);
  const closeLeftDrawer = useCallback(() => {
    if (screenSize === "sm") {
      setIsOpenLeftDrawer(false);
    }
  }, [screenSize]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const className = "chat-lock-scroll";
    const body = document.body;
    if (screenSize === "sm") {
      body.classList.add(className);
    }
    else {
      body.classList.remove(className);
    }
    return () => {
      body.classList.remove(className);
    };
  }, [screenSize]);

  const chatLeftPanelWidth = useDrawerPreferenceStore(state => state.chatLeftPanelWidth);
  const setChatLeftPanelWidth = useDrawerPreferenceStore(state => state.setChatLeftPanelWidth);

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceId ?? -1);
  // 闂傚倷娴囧畷鐢稿窗閹邦喖鍨濋幖娣灪濞呯姵淇婇妶鍛櫣缂佺姳鍗抽弻娑樷槈濮楀牊鏁惧┑鐐叉噽婵炩偓闁哄矉绲借灒闁煎鍊戦崑鐐烘⒑鐞涒€充壕婵炲濮撮鍡涙偂閸愵亝鍠愭繝濠傜墕缁€鍫熺箾閸℃ê鐏ョ€殿喗鐓″缁樻媴閸濆嫬浠樺銈庡亝濞茬喎鐣烽幇鏉垮唨妞ゆ挾鍠庢禒濂告⒑濞茶绨奸摶娓乧e闂傚倸鍊峰ù鍥敋瑜嶉湁闁绘垼妫勯弸渚€鏌熼梻瀵割槮缂佺姷濞€閺岀喖鎮欓鈧崝璺衡攽椤旇棄鈻曢柡宀嬬磿娴狅妇鎷犻幓鎺戭潥闂備胶顭堟鍝ョ矓瑜版帒钃熸繛鎴欏灩缁犲鏌涢幇顖氱毢闁靛牜妲檓s闂?
  const rooms = useMemo(() => userRoomQuery.data?.data?.rooms ?? [], [userRoomQuery.data?.data?.rooms]);
  // 闂傚倸鍊搁崐椋庣矆娓氣偓瀹曘儳鈧綆鍠栫壕鍧楁煙閹増顥夐幖鏉戯躬閺屻倝鎳濋幍顔肩墯婵炲瓨绮岀紞濠囧蓟濞戙垹唯妞ゆ梻鍘ч～顏堟⒑缁嬫鍎嶉柛鏃€鍨垮濠氬即閻旇櫣鐦堥棅顐㈡处濞叉粓寮抽悩缁樷拺缂備焦蓱鐏忕増绻涢崣澶岀煂婵″弶鍔欓獮鎺楀棘閻愵剙濯伴梻浣虹帛閸旓箓宕楀▎鎰浄闁靛繒濮弨浠嬫煃閽樺顥滃ù婊勭矋缁绘稓浜搁弽銈呬壕鐎规洖娲﹀▓鎯р攽椤旀枻渚涢柛搴ｆ暬瀵噣宕煎┑鍫Ч闂備礁鐤囬～澶愬磿閾忣偆顩?
  const userSpacesQuery = useGetUserActiveSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  const activeSpaceInfoQuery = useGetSpaceInfoQuery(activeSpaceId ?? -1);
  const activeSpaceInfo = useMemo(() => activeSpaceInfoQuery.data?.data, [activeSpaceInfoQuery.data?.data]);

  // 闂傚倸鍊搁崐椋庣矆娓氣偓瀹曘儳鈧綆鍠栫壕鍧楁煙閹増顥夐幖鏉戯躬閺屻倝鎳濋幍顔肩墯婵炲瓨绮岀紞濠囧蓟濞戙垹唯妞ゆ棁宕甸弳妤佺箾鐎涙鐭婄紓宥咃躬瀵鎮㈤悡搴ｇ暰閻熸粌绉瑰铏綇閵婏絼绨婚梺闈涚墕閹冲繘宕甸崶顒佺厸鐎光偓鐎ｎ剛袦闂佹寧绻勯崑銈夈€佸Δ鍛劦妞ゆ帊妞掔换鍡椕归悩宸剱闁绘挻娲熼弻宥夊传閸曨偀鍋撴繝姘厐闁哄洨濮风壕鑲┾偓鍏夊亾闁告洦浜濋崰姘舵⒑缁洘娅呴悗姘緲閻ｅ嘲螣濞嗙偓鞋缂傚倷璁查崑鎾绘煃瑜滈崜鐔奉潖缂佹ɑ濯撮柣鐔煎亰閸ゅ绱撴担鍓插剱闁搞劌娼￠獮鍐樄妤犵偞锕㈤幃娆戞喆閿濆懍澹曢梺鍦劋椤ㄥ懐绮堥崼婢濆綊鏁愰崶銊ユ畬闂佸搫妫崑鍛崲濞戞瑦缍囬柛鎾楀啫鐓傞梻浣侯攰椤曟粎鎹㈠┑瀣亗妞ゆ帒瀚烽弫鍡涙煕閺囥劌澧伴柛妯哄船閳规垿顢欓弬銈勭返闂佸憡鎸诲畝鎼佺嵁閹达附鏅插璺侯儑閸?effect / memo 婵犵數濮烽弫鎼佸磻閻愬搫鍨傞柛顐ｆ礀缁犲綊鏌嶉崫鍕櫣闁稿被鍔戦弻锝夊箣閻戝棛鍔风紓浣哄█缁犳牠寮诲☉銏犖ㄦい鏃傚帶椤亪姊虹粙娆惧剭闁告柨绉规俊鐢稿礋椤栵絾鏅ｉ梺缁樻椤ユ捇顢栭崒婊呯＝濞达絾褰冩禍?
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;

  // space 闂傚倸鍊搁崐鐑芥嚄閸洖鍌ㄧ憸鏃堝Υ閸愨晜鍎熼柕蹇嬪焺濞茬鈹戦悩璇у伐闁绘锕畷鎴﹀煛閸涱喚鍘介梺閫涘嵆濞佳勬櫠娴煎瓨鐓冪紓浣股戠粈鈧銈庡弨濞夋洟骞戦崟顒傜懝妞ゆ牗鑹炬竟鍫㈢磽閸屾瑧鍔嶆い銊ユ楠炴垿宕堕鍌氱ウ闂佸搫绋侀崢鑲╃棯瑜旈弻鐔告綇閹屾喘閻庤娲︽禍鐐垫閹惧瓨濯村ù鐘差儏閹界敻姊洪懡銈呮殌闁搞儯鍔岄崜锕€顪冮妶鍛闁绘绮撳顐㈩吋閸℃瑧顔曢梺鐟邦嚟閸嬬喖骞婇崟顖涘€垫慨姗嗗幖閳绘洘鎱ㄦ繝鍐┿仢婵☆偄鍟撮崺锟犲礃椤忓懏顔忛梻浣告贡閸樠囨偤閵娧冨灊閹肩补鍨?
  // 闂傚倸鍊搁崐鐑芥倿閿曗偓椤啴宕归鍛姺闂佺鍕垫當缂佲偓婢舵劖鍊甸柨婵嗛婢т即鏌涘Δ浣稿摵闁诡喗顨呴埥澶娾枎濡厧濮洪梻浣哥－缁垰顫忚ぐ鎺懳﹂柛鏇ㄥ枤閻も偓闂佸湱鍋撻崜姘閸撗呯＝濞达綁顥撻ˇ锕傛煏閸喐鍊愭?key 婵犵數濮烽弫鎼佸磿閹寸姴绶ら柦妯侯棦濞差亝鏅滈柣鎰靛墮鎼村﹪姊虹粙璺ㄧ伇闁稿鍋ゅ畷鎴﹀Χ婢跺鍘繝鐢靛仧閸嬫挸鈻嶉崨顖滅＜闁绘﹩鍠栭崝锕傛煛鐏炵晫啸妞ぱ傜窔閺屾盯骞樼捄鐑樼€诲銈嗘穿缂嶄礁鐣疯ぐ鎺濇晝闁靛繈鍨婚悰顕€姊虹拠鑼闁稿鍠栧畷鎴﹀箻閺傘儲鐏侀梺闈涚箞閸婃牠鍩涢幋锔藉仭婵炲棗绻愰顏堟倶韫囥儵妾柕鍥у婵＄兘鏁傞挊澶岊暡闂備礁纾划顖炲箲閸ヮ剛宓侀悗锝庡枟閺呮繈鏌嶈閸撴稓鍒掓繝姘闁兼亽鍎抽崢鐢告⒑缂佹ê鐏﹂柨姘舵煟韫囧﹥娅囬柣銉邯瀵墎鎹勯妸鎰屽洦鐓涢悘鐐额嚙婵″ジ鏌嶉挊澶樻Ц閾伙綁鏌ゅù瀣珔濠殿喖宕埞鎴︽倷鐎涙绋囬梺姹囧妿閸忔ê顕ｉ弻銉﹀亹闁肩⒈鍓氬▓?useLocalStorage 婵犵數濮烽弫鎼佸磻閻愬搫鍨傞柛顐ｆ礀缁犱即鏌涘┑鍕姢闁活厽鎹囬弻锝夊閵忊晝鍔搁梺鍝勵儎閻掞箓濡甸崟顖氬嵆婵°倐鍋撳ù婊勫劤铻栭柣姗€娼ф禒锕傛煕閺冣偓閻楃娀鐛箛娑樺窛妞ゆ牗绮庨悡鎾绘⒑閸濄儱鏋庨柛鐕佸灦閵嗗啯绻濋崶褑鎽?key 闂傚倸鍊搁崐鐑芥倿閿曞倹鍎戠憸鐗堝笒缁€澶屸偓鍏夊亾闁逞屽墴閸┾偓妞ゆ帊鑳堕。鍙夌節閵忊槅鐒鹃柣蹇擃儔濮婃椽鎮℃惔銏″枑濡炪倧缍嗛崰姘ｉ幇鐗堟櫜闁糕剝娲滅粻姘渻閵堝棛澧紒顔奸叄婵″瓨绻濋崶銊у幈?
  const [spaceOrderByUser, setSpaceOrderByUser] = useLocalStorage<Record<string, number[]>>("spaceOrderByUser", {});
  // room 闂傚倸鍊搁崐鐑芥嚄閸洖鍌ㄧ憸鏃堝Υ閸愨晜鍎熼柕蹇嬪焺濞茬鈹戦悩璇у伐闁绘锕畷鎴﹀煛閸涱喚鍘介梺閫涘嵆濞佳勬櫠娴煎瓨鐓冪紓浣股戠粈鈧銈庡弨濞夋洟骞戦崟顒傜懝妞ゆ牗鑹炬竟鍫㈢磽閸屾瑧鍔嶆い銊ユ楠炴垿宕堕鍌氱ウ闂佸搫绋侀崢鑲╃棯瑜旈弻鐔告綇閹屾喘閻庤娲︽禍鐐垫閹惧瓨濯村ù鐘差儏閹界敻姊洪懡銈呮殌闁搞儯鍔岄崜锕€顪冮妶鍛闁绘绮撳顐㈩吋閸℃瑧顔曢梺鐟邦嚟閸嬬喖骞婇崟顖涘€垫慨姗嗗幖閳绘洘鎱ㄦ繝鍐┿仢婵☆偄鍟撮崺锟犲礃椤忓懏顔忛梻浣告贡閸樠囨偤閵娧冨灊閹肩补鍨?
  // key: userId -> spaceId -> roomIds
  const [roomOrderByUserAndSpace, setRoomOrderByUserAndSpace] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "roomOrderByUserAndSpace",
    {},
  );
  // 闂傚倸鍊搁崐鐑芥倿閿曗偓椤啴宕归鍛姺闂佺鍕垫當缂佲偓婢舵劖鍊甸柨婵嗛婢ф彃鈹戦鎸庣彧闁靛洤瀚伴獮鎺楀箣濠垫劒鎮ｇ紓鍌欒閸嬫捇鏌涢弴銊ョ仯闁告瑦鎹囬弻娑㈠Ψ閿濆懎顬夐柣蹇撶箰閻忔岸骞?/room/list 闂傚倸鍊搁崐鎼佸磹閻戣姤鍊块柨鏇氶檷娴滃綊鏌涢幇鍏哥敖闁活厽鎹囬弻鐔虹磼閵忕姵娈欓梺鎼炲労閸撴岸宕甸幋鐐簻闁瑰搫绉堕ˇ锕傛煟濠靛懎宓嗘慨濠勭帛閹峰懘宕妷銈堟婵＄偑鍊栭崹闈浢洪妶澶嬫櫇闁靛繈鍊曠粻缁樸亜閺冨倹娅曢柛娆忔閳规垿鎮欓弶鎴犱桓闂佽崵鍣︾粻鎾诲箚閸愵喖绠ｉ柣妯兼暩閿涙粓姊虹憴鍕祷妞ゆ垵鎳橀妴鍛搭敆閸曨剛鍘?space -> roomIds闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熸潏楣冩闁稿顑呴埞鎴︽偐閹绘帩浠遍梺?user 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁嶉崟顒佹闂佸湱鍎ら崵锕€鈽夊Ο閿嬵潔濠殿喗锕╅崜娆撴倶婵犲洦鍊垫鐐茬仢閸旀碍銇勯敂鍨祮鐎?
  const [spaceRoomIdsByUser, setSpaceRoomIdsByUser] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "spaceRoomIdsByUser",
    {},
  );
  const activeSpace = activeSpaceInfo ?? spaces.find(space => space.spaceId === activeSpaceId);
  const activeSpaceIsArchived = activeSpace?.status === 2;
  const activeSpaceHeaderOverride = useEntityHeaderOverrideStore(state => (activeSpaceId ? state.headers[`space:${activeSpaceId}`] : undefined));
  const activeSpaceNameForUi = activeSpaceHeaderOverride?.title ?? activeSpace?.name;
  const activeSpaceAvatar = activeSpace?.avatar;
  const activeDocHeaderOverride = useDocHeaderOverrideStore(state => (activeDocId ? state.headers[activeDocId] : undefined));

  useEffect(() => {
    if (typeof window === "undefined")
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    let cancelled = false;
    void (async () => {
      try {
        const [{ ensureSpaceDocMeta, getOrCreateSpaceWorkspace }, { deleteSpaceDoc }] = await Promise.all([
          import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry"),
          import("@/components/chat/infra/blocksuite/deleteSpaceDoc"),
        ]);

        if (cancelled)
          return;

        // 1) Ensure business doc metas have business titles so `@`闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熺€涙绠伴柤鐗堝閵囧嫰鏁愰崨顖滎槴ked Doc闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熷▎陇顕уú銊╁焵椤掆偓濠€杈ㄦ叏閻楀牏顩查柛锔诲幐閸嬫捇鐛崹顔煎濡炪倧瀵岄崹鍐测槈閻㈢鐒垫い鎺戝閳锋垿鏌涘┑鍡楊仾闁稿被鍔戦弻娑㈠Ω閵娿儱鎯為梺杞扮贰閸犳牠鍩ユ径鎰潊闁炽儱鍘栭崠鏍р攽閻愯埖褰х紓宥勭椤洩顦归柛鈹惧亾濡炪倖甯婇悞锔剧矆閳ь剙顪冮妶搴′簼缂佽鐗婃穱濠囧箹娴ｅ摜鍘搁梺绋挎湰绾板秹鎮鹃柆宥嗏拻濞达絿顭堥幃鎴澝瑰鈧划娆忕暦閺囥垹钃熼柕澶堝劤閸樻椽姊洪崫鍕殭闁稿﹨宕垫竟鏇熺附閸涘﹦鍘撻悷婊勭矒瀹曟粓鎮㈤悡搴ｇ暫濠电姴锕ら崥姗€鎮㈤崗鍏煎劒闂佽崵鍠愬姗€宕ｆ繝鍥ㄢ拻?缂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎殿喚鏁婚、妤呭焵椤掑嫧鈧棃宕橀钘夌檮婵犮垹鍘滈弲婊堟儎椤栨氨鏆︾紒瀣嚦閺冨牆鐒垫い鎺戝缁€鍐煃瑜滈崜鐔奉潖濞差亜绠归柣鎰絻婵爼姊洪崨濠冩儓缂佺姵鎸搁锝夊箮缁涘鏅梺缁樺姇椤曨參宕?
        if (activeSpace?.name) {
          ensureSpaceDocMeta({
            spaceId: activeSpaceId,
            docId: buildSpaceDocId({ kind: "space_description", spaceId: activeSpaceId }),
            title: activeSpace.name,
          });
        }
        for (const room of rooms) {
          const roomId = room?.roomId;
          if (typeof roomId !== "number" || !Number.isFinite(roomId) || roomId <= 0)
            continue;
          const title = String(room?.name ?? "").trim();
          if (!title)
            continue;
          ensureSpaceDocMeta({
            spaceId: activeSpaceId,
            docId: buildSpaceDocId({ kind: "room_description", roomId }),
            title,
          });
        }

        // 2) Best-effort cleanup: if local workspace still has docs for rooms that no longer exist, purge them.
        const ws = getOrCreateSpaceWorkspace(activeSpaceId) as any;
        const metas = (ws?.meta?.docMetas ?? []) as any[];
        if (!Array.isArray(metas) || metas.length === 0)
          return;

        const validRoomIds = new Set<number>();
        for (const room of rooms) {
          const roomId = room?.roomId;
          if (typeof roomId === "number" && Number.isFinite(roomId) && roomId > 0) {
            validRoomIds.add(roomId);
          }
        }

        const staleDocIds: string[] = [];
        for (const m of metas) {
          const id = String((m as any)?.id ?? "");
          if (!id)
            continue;
          const match = /^room:(\d+):description$/.exec(id);
          if (!match)
            continue;
          const roomId = Number(match[1]);
          if (!Number.isFinite(roomId) || roomId <= 0)
            continue;
          if (!validRoomIds.has(roomId)) {
            staleDocIds.push(id);
          }
        }

        if (staleDocIds.length > 0) {
          await Promise.allSettled(staleDocIds.map(docId => deleteSpaceDoc({ spaceId: activeSpaceId, docId })));
        }
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSpace?.name, activeSpaceId, rooms]);

  const spaceSidebarTreeQuery = useGetSpaceSidebarTreeQuery(activeSpaceId ?? -1);
  const setSpaceSidebarTreeMutation = useSetSpaceSidebarTreeMutation();
  const sidebarTreeVersion = spaceSidebarTreeQuery.data?.data?.version ?? 0;
  const sidebarTree = useMemo(() => {
    return parseSidebarTree(spaceSidebarTreeQuery.data?.data?.treeJson);
  }, [spaceSidebarTreeQuery.data?.data?.treeJson]);

  const handleSaveSidebarTree = useCallback((tree: SidebarTree) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(tree),
    });
  }, [activeSpaceId, setSpaceSidebarTreeMutation, sidebarTreeVersion]);

  const setActiveSpaceId = useCallback((spaceId: number | null) => {
    setStoredChatIds({ spaceId, roomId: null });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    navigate(`/chat/${spaceId ?? "private"}/${""}?${newSearchParams.toString()}`);
  }, [isOpenLeftDrawer, navigate, searchParam, setStoredChatIds, screenSize]);
  const setActiveRoomId = useCallback((roomId: number | null, options?: { replace?: boolean }) => {
    setStoredChatIds({ spaceId: activeSpaceId, roomId });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    const nextRoomId = roomId ?? "";
    navigate(`/chat/${activeSpaceId ?? "private"}/${nextRoomId}?${newSearchParams.toString()}`, { replace: options?.replace });
  }, [activeSpaceId, isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  const handleOpenPrivate = useCallback(() => {
    setActiveSpaceId(null);
    setActiveRoomId(null);
    navigate("/chat/private");
  }, [navigate, setActiveRoomId, setActiveSpaceId]);

  // 婵犵數濮烽弫鎼佸磻閻愬搫鍨傞柛顐ｆ礀缁犳彃銆掑锝呬壕濡炪們鍨烘穱娲囬弶鎳ㄧ懓顭ㄩ崟顒€鈧劖銇勯姀锛勬创闁诡喗鐟╁畷锝嗗緞鐎ｆ挻宀稿缁樻媴閾忕懓绗″┑顔硷功閹虫捇鈥旈崘顔煎瀭妞ゆ洖鎳愰崝鐑芥⒑閸︻厼鍔嬫い銊ユ閹繝寮撮姀锛勫帾婵犮垼鍩栭惄顖氼瀶椤曗偓閹顫濋鐔侯槶缂備浇椴哥敮妤€顭囪箛娑樼厸濞撴艾娲﹀В澶岀磽閸屾瑧顦︽い鎴濇嚇钘濇い鏍剱閺佸洤鈹戦崒婊庣劸鐎瑰憡绻冮妵鍕箻鐠虹儤鐎鹃梺缁樼箖鐢€愁潖?URL 缂傚倸鍊搁崐鎼佸磹閻戣姤鍤勯柤鎼佹涧閸ㄦ棃鎮楅棃娑欏暈妞ゎ偅娲熼弻锟犲炊閵夈儳浠肩紓浣哄У閻楁洟鍩為幋锔藉亹闁告瑥顦ˇ鈺呮⒑閸濆嫭濯奸柛鎾跺枛瀵鈽夐姀鈺傛櫇闂佺粯蓱瑜板啯鎱ㄥ鍥╃＝闁稿本鑹鹃埀顒佹倐钘濋柣銏㈩焾閽?URL 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画闂佹寧娲栭崐褰掑疾椤忓棛纾介柛灞剧懅閸斿秹鏌涙惔鈥虫倯闁靛洦姊荤划娆忊枎閸撗冨Ш濠电姷鏁告慨鐢告嚌妤ｅ啯鍊峰┑鐘插暔娴滄粓鏌熼崫鍕ら柛鏂跨Ч閺?闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鑼槷濠碘槅鍨跺Λ鍧楁倿婵犲啰绠鹃柛鈩兩戠亸浼存煕鐎ｎ個顏堝煘閹达附鍋愰柛娆忣槸椤︹晠姊?
  const [mainView, setMainView] = useState<ChatPageMainView>(() => initialMainView ?? "chat");
  const discoverModeForUi = discoverMode ?? "square";
  const [spaceDetailTab, setSpaceDetailTab] = useState<SpaceDetailTab>("members");
  const [roomSettingState, setRoomSettingState] = useState<RoomSettingState>(null);

  const handleSelectRoom = useCallback((roomId: number) => {
    setMainView("chat");
    setActiveRoomId(roomId);
  }, [setActiveRoomId, setMainView]);

  const handleSelectDoc = useCallback((docId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setMainView("chat");
    const parsed = parseSpaceDocId(docId);
    if (parsed?.kind === "independent") {
      navigate(`/chat/${activeSpaceId}/doc/${parsed.docId}`);
      return;
    }
    navigate(`/chat/${activeSpaceId}/doc/${encodeURIComponent(docId)}`);
  }, [activeSpaceId, navigate, setMainView]);

  const isKPInSpace = useMemo(() => {
    return Boolean(spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1));
  }, [globalContext.userId, spaceMembersQuery.data?.data]);

  const docMetasFromSidebarTree = useMemo(() => {
    // 婵犵數濮烽弫鎼佸磻閻愬搫鍨傞柛顐ｆ礀缁犱即鏌涘┑鍕姢闁活厽鎹囬幃妤€鈽夊▎妯煎姺濡炪倐鏅犻弨杈╂崲濞戙垹绠ｆ繛鍡楃箳娴犲ジ姊虹粙鑳潶闁告梹鍨垮璇测槈閵忕姷鍔撮梺鍛婂姉閸嬫捇鎮鹃崼鏇熲拺闁兼亽鍎遍悘銉︺亜閿旂偓鏆€殿喛顕ч埥澶婎煥閸涱垱婢戦梻浣告惈濞层劑宕戝☉娆戭浄婵☆垯璀﹀〒濠氭煏閸繃顥為柍閿嬪姍閺屾盯寮埀顒勬偡閳轰緡鍤曟い鎰╁焺閸氬鏌涘鈧悞锕傚磽闂堟侗娓婚柕鍫濇婵倿鏌涙繝鍐炬疁闁诡噯绻濆畷鎺戔槈濮橀硸鍟庨梻浣瑰缁诲倿骞婅箛鏂跨窞闁告洦鍘剧壕濂告偣閸ャ劌绲绘い蹇ｅ幘閳ь剚顔栭崰妤佺箾婵犲洤鏄ラ柍褜鍓氶妵鍕箳閹存繍浠鹃梺缁樻尵婵炩偓闁哄本鐩獮鍥敇閻橆喖浠﹂梻浣侯焾椤戝棝骞戦崶顒€绠栭柕蹇曞閻撱儵鏌涢弴銊ヤ簼閻犲洨鍋ら幃妤€鈻撻崹顔界亶闂佽鍠栭崐鍧楁偘椤曗偓瀹曞爼顢楁径瀣珦闂備椒绱徊浠嬪嫉椤掆偓閳绘捇骞栨担鍏夋嫽婵炶揪绲介幖顐ｇ濞差亝鐓曢幖娣€曢惃娲煕閹烘挸绗氶柟顖涙婵℃悂濡疯楠炲姊绘担鍛婃儓缂佸绶氬畷銏＄鐎ｎ亞鍘遍梺鍦劋椤ㄥ棝鎮″☉姗嗙唵閻犺桨璀﹂崕蹇涙煟韫囧鍔﹂柡灞稿墲閹峰懘宕妷銉у幗闂備礁鎼惌澶屽緤娴犲鐓濋幖绮瑰灳閻旂厧浼犻柛鏇炵仛妤犲嫰姊婚崒娆掑厡缂侇噮鍨抽幑銏ゅ礃椤旇棄鍓銈嗙墬閸戝綊宕甸弴鐔翠簻闁圭儤鍨甸鈺呮煟閹邦剨韬柡灞炬礃缁绘繆绠涢弴鐐电厳闂備胶顭堥鍡涘箲閸パ呮殾闁圭儤顨嗛崐鐑芥煠绾板崬鍘哥紒杈ㄧ矋缁绘繈鎮介棃娴躲垽鏌ｈ箛鏂垮摵妤犵偞鍔欏畷婊嗩槾闁活厼妫濋弻娑㈠箻閾忣偅鍤憃c:<docId>:description闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熷▎陇顕уú顓€佸鈧慨鈧柣姗€娼ф慨?
    return extractDocMetasFromSidebarTree(sidebarTree).filter((m) => {
      const parsed = parseSpaceDocId(m.id);
      return parsed?.kind === "independent";
    });
  }, [sidebarTree]);

  const mergeDocMetas = useCallback((...sources: Array<MinimalDocMeta[] | null | undefined>): MinimalDocMeta[] => {
    const map = new Map<string, MinimalDocMeta>();

    for (const list of sources) {
      for (const meta of list ?? []) {
        const id = typeof meta?.id === "string" ? meta.id : "";
        if (!id)
          continue;
        const title = typeof meta?.title === "string" && meta.title.trim().length > 0 ? meta.title : undefined;
        const imageUrl = typeof meta?.imageUrl === "string" && meta.imageUrl.trim().length > 0 ? meta.imageUrl : undefined;

        const existing = map.get(id);
        if (!existing) {
          map.set(id, { id, title, imageUrl });
          continue;
        }
        if (!existing.title && title) {
          existing.title = title;
        }
        if (!existing.imageUrl && imageUrl) {
          existing.imageUrl = imageUrl;
        }
      }
    }

    return [...map.values()];
  }, []);

  const [spaceDocMetas, setSpaceDocMetas] = useState<MinimalDocMeta[] | null>(null);

  // Space 闂傚倸鍊搁崐鐑芥嚄閸洍鈧箓宕奸姀鈥冲簥闂佸綊鍋婇崹顒佺閻熼偊鐔嗛柤鎼佹涧婵牊銇勯妷銉含闁哄苯绉瑰畷顐﹀礋椤掆偓濞咃絽鈹戦埥鍡椾簼闁挎洏鍨藉璇测槈閵忕姈銊╂煥濠靛棙鍣归幆鐔兼⒒娓氣偓閳ь剛鍋涢懟顖涙櫠椤曗偓閺屾稒绻濋崒娑樹淮閻庢鍣崑鍕敇閸忕厧绶炲┑鐘叉处閺嗗懘姊绘担鍦菇闁告柨鐭傚畷鏇㈡偣閻滎摜doc闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熷▎鈥崇湴閸旀垿宕洪埀顒併亜閹烘垵鈧崵澹曟總绋跨骇闁割偅纰嶅▍鍡涙煟閵堝懎鐏瓾eader 闂傚倸鍊搁崐宄懊归崶顒€违闁逞屽墴閺屾稓鈧綆鍋呭畷宀勬煛瀹€瀣М闁诡喓鍨藉畷顐﹀礋閸偅鐦旈梻鍌欒兌椤牓鏁冮妷锔剧濠电姴娲ら拑鐔兼煥閻斿搫孝缂佲偓閸愨斂浜滈柟鎹愭硾閺嬫棃鏌曢崱妯哄缂佺粯绋撻埀顒傛暩椤牊鐗庣紓鍌欑椤戝棛鏁悙闈涘灊婵炲棙鍔曠欢鐐烘煙闁箑澧伴柛鏃撶畱椤啴濡堕崱妤€娼戦梺绋款儐閹瑰洭寮诲鍥ㄥ珰闁哄被鍎卞鏉库攽閳╁啫鍔ょ€规洦鍓熷﹢浣糕攽閻樻瑥鍟版禒銏ゆ煃瑜滈崜姘辨崲閸繍鍤曢悹鍥皺閺嗗棝鏌涢幇鍏哥敖闁哄顭堥埞鎴︻敊閺傘倓绶甸梺绋块叄濞佳囧煘閹达箑鐐婇柍鍝勫枤閸熷海绱撻崒姘偓鎼佹偋韫囨梹鍙忛柣鎴濆閸ヮ剚鏅濋柛灞剧〒閸橀潧顪冮妶鍡橆梿濠殿喓鍊楁禍鎼侇敇閻旂繝绨诲銈嗗姉婵挳鎮橀幓鎺嗘斀闁挎稑瀚崢瀛樸亜閵忥紕鈽夋い顓滃姂瀹曨亝鎷呴崜鎰╁劦濮婂宕掑顑藉亾妞嬪孩顐介柨鐔哄Т缁€鍫熺箾閸℃ɑ灏伴柛濠呭煐缁绘繈妫冨☉鍗炲壈闂佺琚崝鎴﹀蓟閺囥垹閱囨繝闈涙搐閺呬粙姊洪崷顓炲妺婵炲弶绮撻幃鍧楀焵椤掑嫭鈷戦柛婵嗗閺嗙偤鏌涢妸銉т粵缂佸倹甯熼妵鎰板箳閹捐泛骞愬┑鐘灱濞夋盯鏁冮敂鑺ユ珷婵炴垯鍨洪悡娆撴煕濞戞﹫鏀婚柛濠冨姉閳ь剝顫夊ú鈺冪礊娴ｅ摜鏆﹂柛妤冨亹濡插牊绻涢崱妯虹仴濠殿喖銈稿缁樻媴缁嬫寧鍊繛瀛樼矆缁瑥鐣烽弴銏＄劶鐎广儱鎳愰崝鐢告⒑濮瑰洤鐏╅柟璇х節閹繝寮撮悢绋垮伎濠殿喗顨呭Λ妤佹櫠椤栫偞鐓欓柣褍鎽滅粙濠氭煏閸パ冾伂缂佺姵鐩弫鎰板川椤撴稒瀚繝?
  const spaceDocTitleSyncTimerRef = useRef<number | null>(null);
  const spaceDocTitleSyncPendingRef = useRef<{ docId: number; title: string } | null>(null);
  const spaceDocTitleSyncLastRef = useRef<{ docId: number; title: string } | null>(null);
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && spaceDocTitleSyncTimerRef.current != null) {
        window.clearTimeout(spaceDocTitleSyncTimerRef.current);
      }
    };
  }, []);

  const activeDocTitleForTcHeader = useMemo(() => {
    if (!activeDocId)
      return "";

    const overrideTitle = typeof activeDocHeaderOverride?.title === "string" ? activeDocHeaderOverride.title.trim() : "";
    if (overrideTitle)
      return overrideTitle;

    const fromState = (spaceDocMetas ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromState === "string" && fromState.trim().length > 0)
      return fromState.trim();

    const fromTree = (docMetasFromSidebarTree ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromTree === "string" && fromTree.trim().length > 0)
      return fromTree.trim();

    return "闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敃鈧壕鍦磼鐎ｎ偓绱╂繛宸簼閺呮繈鏌涚仦缁㈠殼?;
  }, [activeDocHeaderOverride?.title, activeDocId, docMetasFromSidebarTree, spaceDocMetas]);

  const handleDocTcHeaderChange = useCallback((payload: DocTcHeaderPayload) => {
    const docId = typeof payload?.docId === "string" ? payload.docId : "";
    if (!docId)
      return;

    const title = String(payload?.header?.title ?? "").trim();
    const imageUrl = String(payload?.header?.imageUrl ?? "").trim();
    useDocHeaderOverrideStore.getState().setHeader({ docId, header: { title, imageUrl } });

    if (!title)
      return;

    setSpaceDocMetas((prev) => {
      if (!Array.isArray(prev) || prev.length === 0)
        return prev;

      const idx = prev.findIndex(m => m?.id === docId);
      if (idx < 0)
        return prev;

      const currentTitle = typeof prev[idx]?.title === "string" ? prev[idx]!.title!.trim() : "";
      if (currentTitle === title)
        return prev;

      const next = [...prev];
      next[idx] = { ...next[idx], title };
      return next;
    });

    // space_doc闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熼悜妯荤叆闁哄鐗忛埀顒€绠嶉崕鍗炍涢弮鍌涘床闁糕剝绋掗悡娆撴⒒閸屾凹鍤熸い锔肩畵閺屾盯骞囬妸銉ゅ闂傚倸鍊烽悞锕傚箖閸洖纾挎繛宸簻缁€鍫ユ煥閺囩偛鈧效閸欏浜滈柡宥庡亜娴狅箓鏌ｉ幘瀛樼闁逛究鍔岄～婊堝幢濡も偓椤亜鈹戦悩顐壕闂佺粯顨呴悧鍕濠婂牊鐓欓柣鎴炆戦悡銉ッ归悩杞板惈闁逞屽墲椤煤濡櫣鏆嗙紒瀣儥閸ゆ洟鏌涢锝嗙缂佺姳鍗抽獮鏍垝鐟欏嫷鈧棝鏌涚€ｎ偅宕岄柟顔荤矙閹粙鎮界喊澶屽簥闂傚倷绀侀幖顐﹀疮椤栫偛鍨傞柣銏犳啞閸婂爼鏌ょ喊鍗炲缁炬儳銈稿鍫曞醇濞戞ê顬嬮梺鐟板暱濞差參寮婚悢椋庢殾闁搞儜鍌涱潟闁诲氦顫夊ú妯兼暜閹烘鐓″璺侯煬濞尖晠鏌曟径鍫濆姍闁哥姴锕濠氬磼濞嗘垵濡介柣搴ｇ懗閸涱垳鐓撻梺瑙勵偧鐠囧弶鍠樻い銏★耿婵偓闁绘﹢娼ф慨?
    if (typeof window !== "undefined") {
      try {
        void (async () => {
          const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
          const key = parseDescriptionDocId(docId);
          if (!key || key.entityType !== "space_doc")
            return;

          spaceDocTitleSyncPendingRef.current = { docId: key.entityId, title };
          if (spaceDocTitleSyncTimerRef.current != null) {
            window.clearTimeout(spaceDocTitleSyncTimerRef.current);
          }
          spaceDocTitleSyncTimerRef.current = window.setTimeout(() => {
            const pending = spaceDocTitleSyncPendingRef.current;
            if (!pending)
              return;
            const last = spaceDocTitleSyncLastRef.current;
            if (last && last.docId === pending.docId && last.title === pending.title)
              return;

            void tuanchat.request.request<any>({
              method: "PUT",
              url: "/space/doc/title",
              body: { docId: pending.docId, title: pending.title },
              mediaType: "application/json",
            }).then(() => {
              spaceDocTitleSyncLastRef.current = pending;
            }).catch(() => {
              // ignore
            });
          }, 800);
        })();
      }
      catch {
        // ignore
      }
    }
  }, []);

  const loadSpaceDocMetas = useCallback(async (): Promise<MinimalDocMeta[]> => {
    if (typeof window === "undefined")
      return [];
    if (!activeSpaceId || activeSpaceId <= 0)
      return [];

    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      const ws = registry.getOrCreateSpaceWorkspace(activeSpaceId) as any;
      const metas = (ws?.meta?.docMetas ?? []) as any[];
      const headerOverrides = useDocHeaderOverrideStore.getState().headers;
      const list = metas
        .filter(m => typeof m?.id === "string" && m.id.length > 0)
        .map((m) => {
          const id = String(m.id);
          const title = typeof m?.title === "string" ? m.title : undefined;
          const imageUrl = typeof headerOverrides?.[id]?.imageUrl === "string" ? headerOverrides[id]!.imageUrl : undefined;
          return { id, title, imageUrl } satisfies MinimalDocMeta;
        });
      return list;
    }
    catch {
      return [];
    }
  }, [activeSpaceId]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      setSpaceDocMetas(null);
      return;
    }
    if (!isKPInSpace) {
      setSpaceDocMetas([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const fromWorkspace = await loadSpaceDocMetas();
      const merged = mergeDocMetas(fromWorkspace, docMetasFromSidebarTree);
      if (cancelled)
        return;
      setSpaceDocMetas(merged);

      // workspace meta 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画濡炪倖鐗滈崑娑㈠垂閸岀偞鐓熼柕蹇嬪焺閻掑墽绱掗埀顒勫磼濞戞瑥寮垮┑锛勫仩椤曆勭妤ｅ啯鍊甸悷娆忓缁€鍫ユ煕韫囨枏鎴炵┍婵犲洤绠瑰ù锝堝€介妸鈺傜厪濠㈣鍨伴崯顐ょ不閻愮儤鈷掗柛灞剧懅椤︼箓鏌熺喊鍗炰喊鐎规洘鍔欓幃鐑芥焽閿旀儳鏁告繝娈垮枟閵囨盯宕戦幘鎼闁绘劖褰冮弳娆撴懚閺嶎灐褰掓晲閸稈鍋撻埀顒勬煛鐎ｎ偆澧垫慨濠冩そ楠炲棜顦寸紒鐘卞嵆閺屾稑螣閼姐倗鐓夐悗娈垮櫘閸嬪﹤鐣烽悢纰辨晬婵炴垶鑹惧铏節閻㈤潧浠﹂柛銊ョ埣閹兘鏁冮崒娑樺壄闂佺鎻梽鍕偂?sidebarTree 婵犵數濮烽弫鎼佸磻閻愬搫鍨傞柛顐ｆ礀缁犲綊鏌嶉崫鍕櫣闁稿被鍔戦弻鐔碱敍閸″繐浜鹃梺?doc 闂傚倸鍊搁崐鐑芥嚄閸洖鍌ㄧ憸鏃堢嵁閺嶎収鏁冮柨鏇楀亾缁惧墽鎳撻埞鎴︽偐鐎圭姴顥濈紒鐐劤椤兘寮婚妸銉㈡斀闁糕檧鏅滅瑧闂備胶绮崝鏇㈡晝椤忓牆钃熼柨婵嗩槸缁犳稒銇勯弴鐐村櫢缂佽鲸鎸荤换婵嬪閿濆懐鍘梺鍛婃⒐閻楃姴顕ｉ弻銉晢闁稿本顨呮禍楣冩煕韫囨搩妲稿ù婊堢畺濮婃椽鏌呴悙鑼跺濠⒀勬尦閺屾盯濡搁敃鈧崝銈夋懚閿濆鐓犲┑顔藉姇閳ь剚鍔欏銊╁礃濞村鏂€闂佺粯顭囩划顖氣槈瑜庢穱濠囶敃閿濆孩鐣奸梺鐟板槻椤戝顕ｆ繝姘ㄩ柨鏇楀亾濞?闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画濡炪倖鐗滈崑娑㈠垂閸岀偛绾ч柛顐ｇ☉婵¤姤绻涢崨顖氣枅闁哄被鍔戝鏉懳旈埀顒佺閹屾富闁靛牆妫欑粚璺ㄧ磽瀹ュ嫮绐旂€规洘妞介崺鈧い鎺嶉檷娴滄粓鏌熼悜妯虹仴妞ゅ繆鏅滃?
      try {
        const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
        for (const m of docMetasFromSidebarTree) {
          if (typeof m?.id !== "string" || !m.id)
            continue;
          registry.ensureSpaceDocMeta({ spaceId: activeSpaceId, docId: m.id, title: m.title });
        }
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, docMetasFromSidebarTree, isKPInSpace, loadSpaceDocMetas, mergeDocMetas]);

  const buildTreeBaseForWrite = useCallback((docMetas: MinimalDocMeta[]): SidebarTree => {
    return sidebarTree ?? buildDefaultSidebarTree({
      roomsInSpace: rooms.filter(r => r.spaceId === activeSpaceId),
      docMetas,
      includeDocs: true,
    });
  }, [activeSpaceId, rooms, sidebarTree]);

  const resetSidebarTreeToDefault = useCallback(async () => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    const docMetas = isKPInSpace
      ? mergeDocMetas(
          spaceDocMetas ?? [],
          docMetasFromSidebarTree,
          await loadSpaceDocMetas(),
        )
      : [];

    if (isKPInSpace) {
      setSpaceDocMetas(docMetas);
    }

    const defaultTree = buildDefaultSidebarTree({
      roomsInSpace: rooms.filter(r => r.spaceId === activeSpaceId),
      docMetas,
      includeDocs: isKPInSpace,
    });

    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(defaultTree),
    });
  }, [activeSpaceId, docMetasFromSidebarTree, isKPInSpace, loadSpaceDocMetas, mergeDocMetas, rooms, setSpaceDocMetas, setSpaceSidebarTreeMutation, sidebarTreeVersion, spaceDocMetas]);

  const appendNodeToCategory = useCallback((params: {
    tree: SidebarTree;
    categoryId: string;
    node: SidebarLeafNode;
  }): SidebarTree => {
    const next = JSON.parse(JSON.stringify(params.tree)) as SidebarTree;
    const categories = Array.isArray(next.categories) ? next.categories : [];
    const target = categories.find(c => c?.categoryId === params.categoryId) ?? categories[0];
    if (!target)
      return next;
    target.items = Array.isArray(target.items) ? target.items : [];
    if (target.items.some(i => i?.nodeId === params.node.nodeId))
      return next;
    target.items.push(params.node);
    return next;
  }, []);

  const requestCreateDocInCategory = useCallback(async (categoryId: string, titleOverride?: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    if (!isKPInSpace)
      return;
    const title = (titleOverride ?? "闂傚倸鍊风粈渚€骞栭锕€纾圭紓浣股戝▍鐘充繆閵堝懏鍣归柛鎴犲█閺屾盯骞囬悽闈涘弗濠?).trim() || "闂傚倸鍊风粈渚€骞栭锕€纾圭紓浣股戝▍鐘充繆閵堝懏鍣归柛鎴犲█閺屾盯骞囬悽闈涘弗濠?;
    let createdDocId: number | null = null;
    try {
      const resp = await tuanchat.request.request<any>({
        method: "POST",
        url: "/space/doc",
        body: { spaceId: activeSpaceId, title },
        mediaType: "application/json",
      });
      const id = Number((resp as any)?.data?.docId);
      if (Number.isFinite(id) && id > 0) {
        createdDocId = id;
      }
    }
    catch (err) {
      console.error("[SpaceDoc] create failed", err);
    }

    if (!createdDocId) {
      toast.error("闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁嶉崟顒佹濠德板€曢崯浼存儗濞嗘挻鐓欓悗鐢殿焾鍟哥紒鎯у綖缁瑩寮婚悢鐓庣闁逛即娼у▓顓炩攽閳藉棗浜濋柨鏇樺灲瀵鈽夐姀鐘栥劑鏌ㄥ┑鍡樺櫣閹喖姊绘笟鈧埀顒傚仜閼活垱鏅堕鈧弻娑欑節閸曨剙娈屽銈嗘磸閸庨潧鐣烽悢纰辨晢濞达綀娅ｈ倴濠碉紕鍋戦崐鏍礉閹达箑纾?);
      return;
    }

    const docId = buildSpaceDocId({ kind: "independent", docId: createdDocId });

    const baseDocMetas = mergeDocMetas(
      spaceDocMetas ?? [],
      docMetasFromSidebarTree,
      await loadSpaceDocMetas(),
    );
    const nextDocMetas = baseDocMetas.some(m => m.id === docId)
      ? baseDocMetas
      : [...baseDocMetas, { id: docId, title }];

    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      registry.ensureSpaceDocMeta({ spaceId: activeSpaceId, docId, title });
      setSpaceDocMetas(nextDocMetas);
    }
    catch {
      // ignore
    }

    const base = buildTreeBaseForWrite(nextDocMetas);
    const next = appendNodeToCategory({
      tree: base,
      categoryId,
      node: { nodeId: `doc:${docId}`, type: "doc", targetId: docId, fallbackTitle: title },
    });
    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(next),
    });

    setMainView("chat");
    navigate(`/chat/${activeSpaceId}/doc/${createdDocId}`);
  }, [activeSpaceId, appendNodeToCategory, buildTreeBaseForWrite, docMetasFromSidebarTree, isKPInSpace, loadSpaceDocMetas, mergeDocMetas, navigate, setMainView, setSpaceDocMetas, setSpaceSidebarTreeMutation, sidebarTreeVersion, spaceDocMetas]);

  const openRoomSettingPage = useCallback((roomId: number | null, tab?: RoomSettingTab) => {
    if (roomId == null)
      return;

    if (activeSpaceId == null)
      return;

    const nextTab: RoomSettingTab = tab ?? "setting";
    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${roomId}/setting${qs ? `?${qs}` : ""}`);

    setRoomSettingState({ roomId, tab: nextTab });
    setMainView("roomSetting");
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [activeSpaceId, navigate, searchParam]);

  const closeRoomSettingPage = useCallback(() => {
    setRoomSettingState(null);
    setMainView("chat");

    if (activeSpaceId == null || activeRoomId == null)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${activeRoomId}${qs ? `?${qs}` : ""}`);
  }, [activeRoomId, activeSpaceId, navigate, searchParam]);

  const urlDrivenRoomSettingRef = useRef(false);
  useEffect(() => {
    if (isPrivateChatMode)
      return;

    if (isRoomSettingRoute) {
      urlDrivenRoomSettingRef.current = true;
      if (activeSpaceId == null || activeRoomId == null)
        return;

      const urlTab = searchParam.get("tab");
      const nextTab: RoomSettingTab = urlTab === "role" || urlTab === "setting" ? urlTab : "setting";
      setRoomSettingState({ roomId: activeRoomId, tab: nextTab });
      setMainView("roomSetting");
      return;
    }

    if (urlDrivenRoomSettingRef.current) {
      urlDrivenRoomSettingRef.current = false;
      setRoomSettingState(null);
      setMainView("chat");
    }
  }, [activeRoomId, activeSpaceId, isPrivateChatMode, isRoomSettingRoute, searchParam]);

  const urlDrivenSpaceDetailRef = useRef(false);
  useEffect(() => {
    if (isPrivateChatMode)
      return;

    if (isSpaceDetailRoute) {
      urlDrivenSpaceDetailRef.current = true;
      setRoomSettingState(null);

      setSpaceDetailTab(spaceDetailRouteTab ?? "setting");
      setMainView("spaceDetail");
      return;
    }

    if (urlDrivenSpaceDetailRef.current) {
      urlDrivenSpaceDetailRef.current = false;
      // 婵?spaceDetail 闂傚倸鍊峰ù鍥х暦閸偅鍙忕€规洖娲︽刊浼存煥閺囩偛鈧悂宕归崒鐐寸厵闁诡垳澧楅ˉ澶愭煛鐎ｂ晝绐旂€殿喖鐖煎畷鐓庮潩椤撶喓褰嗛柣搴ゎ潐濞叉牠藝閻㈢钃熸繛鎴欏灩缁犳稒銇勯幘璺轰户缂佷胶鍏樺?room setting 闂傚倸鍊峰ù鍥х暦閸偅鍙忕€规洖娲︽刊浼存煥閺囩偛鈧悂宕归崒鐐寸厵闁诡垳澧楅ˉ澶愭煛鐎ｂ晝绐旀慨濠冩そ椤㈡鍩€椤掑倻鐭撻悗闈涙憸鐏忕數鈧箍鍎遍ˇ浼村磻閿濆悿褰掓晲閸涱喖鏆堥柣鐘冲姧缁辨洜妲愰幒妤€鐒垫い鎺嶇缁剁偤鏌熼柇锕€骞愰柟宄版惈椤啴濡堕崱妤€娼戦梺绋款儐閹瑰洭寮婚敐鍫㈢杸闁哄啫鍊婚悿鍕倵鐟欏嫭纾搁柛銊ㄥГ娣囧﹪宕奸弴鐐靛€為梺闈涱焾閸庢彃袙閸ヮ剚鈷掑ù锝堟閵嗗﹪鏌涢幘瀵哥疄闁诡喚鍏橀弫鍌炲箚瑜滃Λ?roomSetting 闂?mainView闂?
      if (isRoomSettingRoute)
        return;
      setMainView("chat");
    }
  }, [isPrivateChatMode, isRoomSettingRoute, isSpaceDetailRoute, spaceDetailRouteTab]);

  const hasInitPrivateChatRef = useRef(false);
  useEffect(() => {
    if (hasInitPrivateChatRef.current)
      return;
    if (!isPrivateChatMode)
      return;
    hasInitPrivateChatRef.current = true;

    // 闂傚倸鍊搁崐宄懊归崶顒夋晪闁哄稁鍘奸崒銊ф喐閻楀牆绗掗柛銊ュ€婚幉鎼佹偋閸繂鎯為梺鎼炲労閸撴瑩鎯屽Δ鈧…璺ㄦ崉閸濆嫷妲甸梺鍝勵儐閻楁鎹㈠┑瀣仺闂傚牊鍒€閵忋倖鐓曢柣妯哄暱閸濊櫣鈧娲橀崹濂杆囪ぐ鎺撶厸鐎光偓鐎ｎ剛袦婵犵鍓濋幃鍌涗繆閻戣棄唯妞ゆ棁宕靛Λ顖滅磽閸屾艾鈧绮堟笟鈧獮鏍敃閿曗偓缁犺銇勯幇鈺佲偓鏇烆嚕閺屻儲鈷掑ù锝呮惈鐢埖銇勯锝嗙鐎规洘鍔欓獮鍥级閹稿海鈧剟姊洪崨濠冨闁搞劑浜堕崺娑㈠箳濡や胶鍘遍柣蹇曞仜婢т粙鍩婇弴鐘电＝鐎广儱妫楅悘鎾煛瀹€鈧崰鏍箺鎼淬劌纾兼慨姗嗗墰閵堫喗淇婇妶鍥ラ柛瀣洴椤㈡牗寰勬繝鍕缂備礁顑堥鎶藉籍閳ь剛绮悢鍝ョ瘈闁告洦鍋呴崕?闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭簻濡炪倖甯掗崐缁樼▔瀹ュ鐓欓弶鍫濆⒔閻ｉ亶鏌涢妸銉モ偓褰掑Φ閸曨垰鍐€妞ゆ劦婢€缁墎绱撴担鍝勑ｉ悽顖ょ節瀵寮撮敍鍕澑闂佸搫娲ㄩ崕鎰板焵椤掆偓閺堫剚绌辨繝鍥ㄥ殤閻犲搫鎼幆鐐电磽娴ｄ粙鍝洪悽顖涘笩閻忓啯绻濋悽闈浶㈤柛濠冩倐閻涱噣骞囬鍓э紳婵炶揪缍€椤鎮￠妷鈺傜厽閹烘娊宕濇惔锝呭灊婵炲棙鍔曠欢鐐烘煙閺夎法浠涢柡鍛矒濮婃椽宕ㄦ繝浣虹箒闂佸憡锕㈢粻鏍х暦閿濆绀嬫い鏍ㄧ▓閹?
    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, [isPrivateChatMode, rooms, setActiveRoomId, setActiveSpaceId, storedIds.roomId, storedIds.spaceId]);

  // 闂傚倷娴囧畷鐢稿窗閹邦喖鍨濋幖娣灪濞呯姵淇婇妶鍛櫣缂佺姳鍗抽弻娑樷槈濮楀牊鏁惧┑?space 闂?rooms 闂傚倸鍊搁崐鐑芥嚄閸洖绠犻柟鎹愵嚙鎼村﹪鏌＄仦璇插壐闁搞儺鍓﹂弫宥嗙節闂堟稑顏ф慨瑙勵殜濮婃椽骞栭悙鎻掑Ф闂佸憡鎸婚悷褔骞夐幘顔芥櫇闁稿本姘ㄩ鎰版⒑閸︻厸鎷￠柛妯恒偢閹﹢鏁愰崶鈺冿紲闂侀€炲苯澧€垫澘瀚伴獮鍥敇閻樻彃绠伴梻鍌欑劍閹爼宕曞鍫濆窛妞ゆ棁妫勯弸娑㈡⒒閸屾瑧顦﹂柟纰卞亰閹崇喖顢涢悙瀛樻珖濡炪倕绻愮€氱兘宕甸弴銏＄厽闁靛繒濮撮ˉ蹇涙煛娴ｅ憡顥㈤柡灞界Х椤т線鏌涢幘瀵告噰闁?space->roomIds 闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢妶鍌氫壕婵鍘ч弸鐔兼煙娓氬灝濮傛鐐达耿椤㈡瑩鎸婃径濠傤棄闂傚倷鑳剁划顖炩€﹂崶鈺佸灊妞ゆ牜鍋涢悿鐐亜閹烘垵鈧敻宕戦幘璇茬濠㈣泛锕ｆ竟鏇㈡⒒娴ｅ憡鍟炴繛璇ч檮缁傚秹鎮欓崹顐綗濠殿喗顭堥崺鏍煕閹寸姷纾奸悗锝庡幗绾墎绱掗悩鍐差棆缂佽鲸甯楀鍕節閸曞墎绀婇梻浣烘嚀閸㈣尙绱炴繝鍥х畺闁靛繈鍊曟导鐘绘煏婢舵ê鏋熼梺?space 闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敂钘変罕濠电姴锕ょ€氼噣銆呴弻銉︾叆婵犻潧妫Ο鍫ユ煛娴ｅ壊鍎忛棁澶愭煕韫囨挸鎮戠紓宥嗗灴閺岋紕鈧絺鏅濈粣鏃堟煛瀹€鈧崰搴ㄥ煝閹捐鍨傛い鏃傛櫕娴滈箖姊绘担鍛婅础闁告鍥х紒瀣儥濞兼牕鈹戦悩瀹犲闁绘劕锕弻銊モ攽閸℃ê娅㈡繝銏ｎ潐濞叉鎹㈠┑鍡忔灁闁割煈鍠楅悘鎾绘⒑绾懏鐝柟鐟版搐閻ｇ兘骞囬悧鍫濅患闁诲繒鍋為崕铏償婵犲倵鏀介柍钘夋閻忕娀鏌涘顒夊剶鐎规洘鍨甸～婊堝焵椤掑嫬绠栨慨妞诲亾闁诡喗鐟╁鍫曞箣濠靛柊鎴炰繆閻愵亜鈧垿宕曢弻銉ｂ偓鍐╃節閸屻倖缍庡┑鐐叉▕娴滄粎绮婚悽鍛婄厵闁绘垶蓱閳锋帗銇勯弮鈧崹鐢糕€旈崘顔嘉ч柛鈩兠ˇ鈺呮⒑閸涘﹥灏伴柣鐕傜畵瀵煡濡烽埡鍌楁嫼缂備礁顑嗙€笛冿耿娴煎瓨鍤曢柕鍫濐槹閻?
  useEffect(() => {
    if (isPrivateChatMode)
      return;
    if (activeSpaceId == null)
      return;
    const roomIds = (rooms ?? [])
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    const userKey = String(userId);
    const spaceKey = String(activeSpaceId);
    setSpaceRoomIdsByUser((prev) => {
      const prevUserMap = prev[userKey] ?? {};
      const prevRoomIds = prevUserMap[spaceKey] ?? [];
      if (prevRoomIds.length === roomIds.length && prevRoomIds.every((v, i) => v === roomIds[i])) {
        return prev;
      }
      return {
        ...prev,
        [userKey]: {
          ...prevUserMap,
          [spaceKey]: roomIds,
        },
      };
    });
  }, [activeSpaceId, isPrivateChatMode, rooms, setSpaceRoomIdsByUser, userId]);

  // 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁嶉崟顒佹濠德板€曢崯浼存儗濞嗘挻鐓欓悗鐢殿焾鍟哥紒鎯у綖缁瑩寮婚悢鐓庣畾鐟滃秹銆傞幎鑺ョ厽妞ゆ挾鍠撻。鑼磼缂佹鈽夋い鏂跨箻椤㈡瑩鎳￠妶鍛瘓闂傚倷鐒︾€笛呯矙閹捐绐楅柟鎹愵嚙閻掑灚銇勯幒宥囪窗闁哥喎绻橀弻娑㈡偐瀹曞洤鈪归梺鎸庢磸閸ㄤ粙寮婚崱妤婂悑闁糕剝銇炵划褔姊绘笟鈧褔藝椤愶箑鐤炬繛鎴欏灩閻鈹戦悩鎻掓殧濞存粍绮撻弻鈥愁吋閸愩劌顬嬪銈忕稻閻擄繝寮诲☉娆愬劅闁宠棄鎳撻崥顐︽⒑閸濆嫮鐏遍柛鐘崇墪閻ｇ柉銇愰幒婵囨櫇闂佹寧绻傞幊鎰般€傞懠顒傜＝?
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
  const [isCreateInCategoryOpen, setIsCreateInCategoryOpen] = useSearchParamsState<boolean>("createInCategoryPop", false);

  const [pendingCreateInCategoryId, setPendingCreateInCategoryId] = useState<string | null>(null);
  const [createInCategoryMode, setCreateInCategoryMode] = useState<"room" | "doc">("room");
  const [createDocTitle, setCreateDocTitle] = useState("闂傚倸鍊风粈渚€骞栭锕€纾圭紓浣股戝▍鐘充繆閵堝懏鍣归柛鎴犲█閺屾盯骞囬悽闈涘弗濠?);
  const openCreateInCategory = useCallback((categoryId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setPendingCreateInCategoryId(categoryId);
    setCreateInCategoryMode(getDefaultCreateInCategoryMode({ categoryId, isKPInSpace }));
    setCreateDocTitle("闂傚倸鍊风粈渚€骞栭锕€纾圭紓浣股戝▍鐘充繆閵堝懏鍣归柛鎴犲█閺屾盯骞囬悽闈涘弗濠?);
    setIsCreateInCategoryOpen(true);
  }, [activeSpaceId, isKPInSpace, setIsCreateInCategoryOpen]);

  const closeCreateInCategory = useCallback(() => {
    setIsCreateInCategoryOpen(false);
    setPendingCreateInCategoryId(null);
  }, [setIsCreateInCategoryOpen]);

  const createDocInSelectedCategory = useCallback(async () => {
    const categoryId = pendingCreateInCategoryId;
    if (!categoryId)
      return;
    if (!isKPInSpace)
      return;
    await requestCreateDocInCategory(categoryId, createDocTitle);
    closeCreateInCategory();
  }, [closeCreateInCategory, createDocTitle, isKPInSpace, pendingCreateInCategoryId, requestCreateDocInCategory]);

  const handleRoomCreated = useCallback((roomId?: number) => {
    const categoryId = pendingCreateInCategoryId;
    setPendingCreateInCategoryId(null);

    if (roomId) {
      setMainView("chat");
      setActiveRoomId(roomId);
    }

    if (roomId && categoryId && activeSpaceId && activeSpaceId > 0) {
      const base = buildTreeBaseForWrite(spaceDocMetas ?? []);
      const next = appendNodeToCategory({
        tree: base,
        categoryId,
        node: { nodeId: `room:${roomId}`, type: "room", targetId: roomId },
      });
      setSpaceSidebarTreeMutation.mutate({
        spaceId: activeSpaceId,
        expectedVersion: sidebarTreeVersion,
        treeJson: JSON.stringify(next),
      });
    }

    setIsCreateInCategoryOpen(false);
  }, [activeSpaceId, appendNodeToCategory, buildTreeBaseForWrite, pendingCreateInCategoryId, setActiveRoomId, setIsCreateInCategoryOpen, setMainView, setSpaceSidebarTreeMutation, sidebarTreeVersion, spaceDocMetas]);

  const openSpaceDetailPanel = useCallback((tab: SpaceDetailTab) => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${tab}${qs ? `?${qs}` : ""}`);

    setSpaceDetailTab(tab);
    setRoomSettingState(null);
    setMainView("spaceDetail");
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [activeSpaceId, isPrivateChatMode, navigate, searchParam]);

  const closeSpaceDetailPanel = useCallback(() => {
    setMainView("chat");

    if (activeSpaceId == null || isPrivateChatMode)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();

    const fallbackRoomId = storedIds.spaceId === activeSpaceId ? storedIds.roomId : null;
    const nextRoomId = (typeof fallbackRoomId === "number" && Number.isFinite(fallbackRoomId)) ? fallbackRoomId : "";
    navigate(`/chat/${activeSpaceId}/${nextRoomId}${qs ? `?${qs}` : ""}`);
  }, [activeSpaceId, isPrivateChatMode, navigate, searchParam, storedIds.roomId, storedIds.spaceId]);
  // 缂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎殿喚鏁婚、妤呭焵椤掑嫧鈧棃宕橀钘夌檮婵犮垹鍘滈弲婊堟儎椤栨氨鏆︾紒瀣嚦閺冨牆鐒垫い鎺戝€绘稉宥夋煥濠靛棭妲归柣鎾寸懇濮婃椽顢橀妸褏鏆犳繝鈷€灞界仸闁哄本鐩幃鈺呭矗婢跺﹥鐣绘繝娈垮枛閿曘儱顪冩禒瀣ㄢ偓浣肝熺悰鈩冾潔濠碘槅鍨抽幊鎾凰夊鑸碘拻濞达綀妫勯崥鐟扳攽椤旇姤缍戦悡銈嗐亜閹绢垱鍤嶅鑸靛姇缁犺崵绱撴担濮戭亝绂掗幒妤佲拺闂傚牊渚楀Σ鎾煛閸涱喚娲撮柟顖氳嫰铻栭柛娑卞枤閸欏棗鈹戦悩缁樻锭婵☆偅鐟╅獮鏍箛椤斿墽鐣堕梺纭呮彧闂勫嫰鍩?
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
  // 闂傚倸鍊搁崐宄懊归崶顒婄稏濠㈣泛顭悞鑺ョ箾閸℃绂嬮柣鎺嶇矙閺屽秹濡烽敂鍓х嵁濠电偞鍨崹褰掓煥閵堝棔绻嗛柕鍫濆閸忓矂鏌涢弮鍌氬幋婵﹥妞介弻鍛存倷閼艰泛顏繝鈷€鍌氬祮闁哄瞼鍠愰ˇ鐗堟償閳辨帪绲鹃妵鍕晜閹屾毉闂佽鍨卞Λ鍐极閹版澘宸濇い鏍ㄥ焹閸嬫捇鎮欓悜妯锋嫽婵炶揪绲介幉锟犲疮閻愮儤鐓熼柣鏃囶唺閸氼偆鈧灚婢橀敃顏堢嵁閹邦厽鍎熼柕蹇曞Т娴煎酣姊绘担鍝ョШ婵☆偉娉曠划鍫熸媴閾忛€涚瑝?
  const [inviteRoomId, setInviteRoomId] = useState<number | null>(null);
  const [_sideDrawerState, _setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

  const spaceOrder = useMemo(() => {
    return spaceOrderByUser[String(userId)] ?? [];
  }, [spaceOrderByUser, userId]);

  const orderedSpaces = useMemo(() => {
    if (!Array.isArray(spaces) || spaces.length <= 1) {
      return spaces;
    }

    const orderIndex = new Map<number, number>();
    for (let i = 0; i < spaceOrder.length; i++) {
      orderIndex.set(spaceOrder[i]!, i);
    }

    return [...spaces]
      .map((space, originalIndex) => {
        const sid = space.spaceId ?? -1;
        const order = orderIndex.get(sid);
        return { space, originalIndex, order };
      })
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo)
          return ao - bo;
        return a.originalIndex - b.originalIndex;
      })
      .map(x => x.space);
  }, [spaces, spaceOrder]);

  const orderedSpaceIds = useMemo(() => {
    return orderedSpaces
      .map(s => s.spaceId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [orderedSpaces]);

  const setUserSpaceOrder = useCallback((nextOrder: number[]) => {
    setSpaceOrderByUser(prev => ({
      ...prev,
      [String(userId)]: nextOrder,
    }));
  }, [setSpaceOrderByUser, userId]);

  const roomOrder = useMemo(() => {
    if (activeSpaceId == null || isPrivateChatMode)
      return [];
    return roomOrderByUserAndSpace[String(userId)]?.[String(activeSpaceId)] ?? [];
  }, [activeSpaceId, isPrivateChatMode, roomOrderByUserAndSpace, userId]);

  const orderedRooms = useMemo(() => {
    if (!Array.isArray(rooms) || rooms.length <= 1) {
      return rooms;
    }

    const orderIndex = new Map<number, number>();
    for (let i = 0; i < roomOrder.length; i++) {
      orderIndex.set(roomOrder[i]!, i);
    }

    return [...rooms]
      .map((room, originalIndex) => {
        const rid = room.roomId ?? -1;
        const order = orderIndex.get(rid);
        return { room, originalIndex, order };
      })
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo)
          return ao - bo;
        return a.originalIndex - b.originalIndex;
      })
      .map(x => x.room);
  }, [rooms, roomOrder]);

  useLayoutEffect(() => {
    if (isPrivateChatMode)
      return;
    if (activeSpaceId == null)
      return;

    const isRoomIdMissingInUrl = !urlRoomId || urlRoomId === "null";
    if (!isRoomIdMissingInUrl)
      return;

    const firstRoomId = orderedRooms[0]?.roomId;
    if (typeof firstRoomId !== "number" || !Number.isFinite(firstRoomId))
      return;

    // 闂傚倸鍊搁崐椋庢濮橆剦鐒介柤濮愬€栫€氬鏌ｉ弮鍌氬付缂佲偓婢舵劕绠规繛锝庡墮婵″ジ鏌ｉ幘杈捐€块柡灞糕偓鎰佸悑閹肩补鈧磭顔戦梻浣瑰▕閺€杈╂暜閿熺姴绠栨俊銈傚亾闁宠棄顦埢搴ｄ沪閹惧懐绀嗘繝鐢靛仩閹活亞寰婇懞銉х彾濠电姴娲ら崥褰掓煛閸ャ儱鐏柛娆愭崌閺屾盯濡烽幋婵嗩仾鐎规洘濞婂娲嚒閵堝懏鐎鹃梺鍦嚀濞差厼顕ｆ繝姘╅柕澶堝灪椤秴鈹戦绛嬫當婵☆偅顨嗛幈銊р偓娑氭灝 roomId 缂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缂佺姾顫夐妵鍕箛閸撲胶鏆犳俊妤€鎳樺铏规兜閸涱喖娑х紓浣哄У閸ㄥ綊鎮幆褜鍚嬪璺侯儏娴狀垱绻涙潏鍓у埌闁硅绱曢幏褰掓晬閸曨厾锛滈梺閫炲苯澧€垫澘瀚伴獮鍥敇閻樻彃绠ラ梻鍌欑閹碱偊藝娴兼潙鍨傞柛顐ｆ礀绾惧鏌曟径娑氱窗缂佽妫欓妵鍕箛閳轰胶浠鹃梺绋款儍閸庢娊鍩€椤掑喚娼愭繛鍙夛耿閹虫繈骞戦幇顔荤胺闂傚倷绀侀幉鈥趁哄澶婃濞撴埃鍋撶€规洘鍨块獮妯兼嫚閼碱剦妲版俊鐐€栧Λ渚€宕戦幇鍏洭顢氶埀顒€顫忛搹鍦＜婵妫涢崝鐑芥⒑缁嬭法鏄傞柛濠冾殘閸掓帗绻濋崘顭戝殼闁诲孩绋掗敋闁逞屽墰閺佸寮婚敐澶嬪亜闁告繂瀚烽弳顓炩攽閻橆偄浜炬繛瀵稿帶閻°劑鎮￠弴銏＄厪濠电姴绻掗悾閬嶆煕濠靛﹥顏犻柍褜鍓濋～澶娒鸿箛娑樼？闁哄被鍎辩粻姘舵煛閸愩劎澧曢幆鐔兼偡濠婂啰肖缂侇噮鍙冮弫鎾绘偐瀹曞洤骞楅梻浣虹帛閿曘垺绂嶇捄渚€堕柣鎴ｅГ閻撴洖鈹戦悩鎻掓殶缂佺姷鍋ら弻娑㈠煘閹傚濠碉紕鍋戦崐鏍ь啅婵犳艾纾婚柟鐐暘娴滄粓鏌ㄩ弮鍥跺殭婵炲懎绉归弻鐔兼惞椤愩倖鍣板Δ鐘靛仜椤戝寮崒鐐村癄濠㈣泛顑囬弶鐟扳攽閿涘嫬浜奸柛濠冩礈閹广垽骞囬鐟颁壕婵鍘у▍宥団偓娈垮枟婵炲﹤顕ｉ懜鍨劅闁圭偓鎯屽鏃堟⒒娴ｅ憡鎯堥柛濠傜秺椤㈡牕鈻庡顐秬閵囨劙骞掗幘鍏呯紦婵＄偑鍊栭悧妤冪矙閹烘柧鐒婂ù鐓庣摠閻撴瑦銇勯弽銊р姇妞ゃ儱妫涚槐鎺楁偐瀹曞洦鍒涢悗娈垮枟閹告娊骞冮姀銈嗗€绘俊顖涙た閸熷懐绱撻崒姘偓鎼佸磹閻戣姤鍊块柨鏇炲€堕埀顒€鍟崇粻娑樷槈濡⒈妲繝鐢靛仦閸ㄨ泛顫濋妸鈺佺婵鍩栭崐鍨箾閹寸偟鎳愰柣鎺嶇矙閺屽秶绱掑Ο鐑╂嫻闂侀潧娲ょ€氼垳绮诲☉銏犵闁哄鍨堕鐘绘⒒娴ｈ櫣甯涢柟纰卞亞缁辩偞鎷呴崜鍙夌稁?
    setActiveRoomId(firstRoomId, { replace: true });
  }, [activeSpaceId, isPrivateChatMode, orderedRooms, setActiveRoomId, urlRoomId]);

  const orderedRoomIds = useMemo(() => {
    return orderedRooms
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [orderedRooms]);

  const setUserRoomOrder = useCallback((nextOrder: number[]) => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;
    const userKey = String(userId);
    const spaceKey = String(activeSpaceId);
    setRoomOrderByUserAndSpace(prev => ({
      ...prev,
      [userKey]: {
        ...(prev[userKey] ?? {}),
        [spaceKey]: nextOrder,
      },
    }));
  }, [activeSpaceId, isPrivateChatMode, setRoomOrderByUserAndSpace, userId]);

  // 缂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾閽樻繃銇勯弮鈧粊纭呫亹閹烘垹鍊為梺闈浤涚仦楣冩暅婵犵數鍋炲娆撳触鐎ｎ亶鐒芥繛鍡樺灍閸嬫挸顫濋澶嬓ч梺闈涙搐鐎氼垳绮诲☉銏犵閻庡灚鎮堕崑鎰版⒒娴ｈ鍋犻柛濠冨灴瀹曞綊鎼圭憴鍕簥濠电偞鍨崹鍦不閿濆棛绡€闂傚牊绋撴晶鏇熴亜閵堝倸浜惧┑鐘垫暩閸嬫盯顢氶銏犲偍鐟滄棃鐛繝鍌ゆ建闁逞屽墮椤曪綁顢曢姀鈺佹倯闂佸憡绮堥悞锕傚磽闂堟侗娓婚柕鍫濇缁楁帗銇勯敃鍌ゆ殥缂併劍妞藉濠氬磼濞嗘垵濡藉┑锛勫仜閻忔繈鈥﹂崶顒€閿ゆ俊銈傚亾缂佲偓婢舵劕绠归柟纰卞幘閸樻粎绱撳鍡欏⒌闁哄本鐩崺鍕礃椤忎礁顫岄梻浣规偠閸婃洟宕愰幖浣哥厴闁硅揪闄勯崑鎰版煙缂佹ê鍧婇柛瀣崌楠炴牗鎷呴悷鎵冲亾閼哥數绠鹃柛鈩兩戠亸浼存煕鐎ｎ剙校缂佺粯鐩獮瀣倷闂堟稈鍚傚┑鐘殿暯閸撴繄鈧瑳鍥モ偓鍐Ψ閳哄倸鈧兘鏌涘▎蹇ｆЦ闁哄濞€閹鈻撻崹顔界亪闂佽绻戦懝楣冾敋閵夆晛绀嬫い鎺嶇閸斿懎顪冮妶鍡樼叆闁告艾顑夊畷鎰償閿濆洨锛濋梺绋挎湰閻熴劑宕楃仦瑙ｆ斀妞ゆ梻鍋撻弳顒勬煏閸℃鏆炵紒缁樼箞瀹曟儼顦撮柛鏃撶畱椤啴濡堕崱妤冪憪闂佺粯甯粻鎾绘晲閻愬弬鏃堝礃椤忓棴绱插┑鈽嗗亞婢ф鎹㈤崒娑氼洸濞寸厧鐡ㄩ悡娑樏归敐鍛喐閺佸牓鎮楃憴鍕闁靛牆鎲￠幈銊╁焵椤掑嫭鐓冮柍杞扮閺嗙偞銇勯幘鑸靛殌闁宠鍨块幃娆撴嚑椤掍焦鍠栫紓鍌欑贰閸犳牠寮甸鍕┾偓鍐Ψ閳轰礁绐涙繝鐢靛Т鐎氀囧几濞嗘挻顥婃い鎰╁灪婢跺嫭鎱ㄦ繝鍌ょ吋闁诡喚鍏樺畷鐑筋敇閻旈攱鐎惧┑鐘灱閸╂牠宕濋弴銏″€块柛顭戝亖娴滄粓鏌熼崫鍕ラ柛蹇撶焸閺岋綁顢橀悙瀛樻嫳闂侀潧娲ょ€氫即銆侀弴銏狀潊闁宠棄妫欓敍浣虹磽閸屾瑧顦﹂柣顓炲€圭粋宥夊醇閺囩偛鐎俊銈忕到閸燁偆绮堥崘顔界厵缂備焦锚缁楁岸寮堕崼婵堝ⅵ婵﹦绮幏鍛村川婵犲倹娈橀梻浣藉吹閸犳洘绂嶉鈧銉︾節閸嬵垱妞介、鏃堝礋椤撶偛袝濠碉紕鍋戦崐鏍暜婵犲洦鍤勯柛鎾茶兌娑撳秵鎱ㄥ鍡楀箲濞存粍绮嶉妵鍕箛閸撲胶校濠电偛鐗婄划搴ㄥ焵椤掍緡鍟忛柛鐘虫礈閸掓帒鈻庤箛鏇熸闂佺厧鎲￠鏍ｈぐ鎺戠閺夊牆澧界粔鍨繆?
  const privateMessageList = usePrivateMessageList({ globalContext, userId });
  const { unreadMessageNumbers: privateUnreadMessageNumbers } = useUnreadCount({
    realTimeContacts: privateMessageList.realTimeContacts,
    sortedRealTimeMessages: privateMessageList.sortedRealTimeMessages,
    userId,
    urlRoomId: isPrivateChatMode ? urlRoomId : undefined,
  });
  const privateTotalUnreadMessages = useMemo(() => {
    return privateMessageList.realTimeContacts.reduce((sum, contactId) => {
      // 闂傚倷娴囧畷鐢稿窗閹邦喖鍨濋幖娣灪濞呯姵淇婇妶鍛櫣缂佺姳鍗抽弻娑樷槈濮楀牊鏁惧┑鐐叉噽婵炩偓闁哄矉绲借灒闁绘垶菤閺嬫瑥鈹戦悙鐑橈紵闁告濞婂濠氬Ω閵夈垺鏂€闂佺硶鍓濋敋婵炲懌鍊濆缁樼節鎼粹€斥拻闂佸憡鎸鹃崰鏍ь嚕婵犳碍鏅插鑸瞪戦弲婊堟⒑閸涘﹥绀嬫繛浣冲洤绀堥柛鎰ゴ閺€浠嬫煟閹邦垰鐨哄褎鐩弻娑㈠Ω閵夛箒纭€闂佸憡甯楃敮鈥愁嚕椤曗偓閸┾偓妞ゆ帒瀚粻顖炴煕濞戞瑦缍戠紒鐙呯秮閺岀喖鎮滃Ο铏逛桓闂佽楠搁崯鍧楀煘閹达附鍊烽柡澶嬪灩娴犳悂姊洪崷顓х劸闁硅姤绮庨崚鎺楀籍閸繄顔掑銈嗘閸嬫劙寮婚崼銉︹拺闂侇偆鍋涢懟顖涙櫠閹绢喗鐓涚€光偓鐎ｎ剛鐦堥悗瑙勬礈閸犳牠銆侀弴銏犵厬闁冲搫鍊搁惁閬嶆⒒閸屾瑧绐旀繛浣冲厾娲晝閳ь剟鎮惧┑鍫㈢煓婵炲棙鍎冲▓銊╂⒑濮瑰洤鐏╁鐟帮躬瀵偊宕掗悙瀵稿幈闂侀潧顦崝宥囨兜閻愵剛绠鹃柛顐ゅ枑閵囨繃鎱ㄦ繝鍐┿仢妤犵偞鍔栭幆鏃堟晲閸屾侗娼旈梻鍌欒兌缁垶銆冮崨鏉戠疇闁归偊鍠栭崹?ChatItem 闂傚倸鍊搁崐鎼佸磹妞嬪孩顐介柨鐔哄Т绾惧鏌涘☉鍗炲福闁挎繂顦粻鎶芥煛閸愶絽浜惧銈嗗姌婵倝濡甸崟顖氱疀闁告挷鐒﹂崑褔姊哄畷鍥╁笡婵☆偄鍟村璇差吋閸偅顎囬梻浣告啞閹搁箖宕伴弽顓犲祦濠电姴鍊靛Σ鍫熺箾閸℃ê濮夌紒澶婄埣濮婃椽宕ㄦ繝鍐ㄧ樂闂佸憡绮堥悞锕€鐡?
      if (isPrivateChatMode && activeRoomId === contactId) {
        return sum;
      }
      return sum + (privateUnreadMessageNumbers[contactId] ?? 0);
    }, 0);
  }, [activeRoomId, isPrivateChatMode, privateMessageList.realTimeContacts, privateUnreadMessageNumbers]);

  // 闂傚倷娴囬褎顨ラ幖浣瑰€舵慨姗嗗墻閻斿棙鎱ㄥ璇蹭壕濡ょ姷鍋涢敃銉╁箚閺冨牆惟閻庯綆浜濋崰姗€鏌涢埡瀣瘈鐎规洏鍔戦、娆撴⒒閺夋垶鎲㈤梻鍌氬€烽懗鍓佹兜閸洖绀堟繝闈涱儏妗呭┑鐘诧工閻楀棛澹曟繝姘厪濠电偟鍋撳▍鍡涙煟閹惧瓨绀冪紒缁樼洴瀹曞崬螖娴ｄ警娲堕梻浣侯焾鐎涒晠宕归崸妤€钃熼柍鈺佸暞婵挳鏌ｉ幋鐐嗘垵袙閸曨垱鈷戠憸鐗堝俯濡垵鈹戦悙鈺佷壕闂備礁鎼悮顐﹀礉鎼淬劌鐒垫い鎺戯功缁夌敻鏌涚€ｎ亝鍤囨い銏＄懃椤撳吋寰勭€Ｑ勫闂備礁婀遍…鍫澝归悜钘夌厐闁哄洢鍨洪悡鐘垫喐閻楀牆绗ч柣锝囧劋椤ㄣ儵鎮欓幓鎺撴闂佽鍨卞Λ鍐╀繆濮濆矈妲荤紓浣风筏缁犳捇寮婚敐澶嬪亹闁告瑥顦伴崕鎾绘⒑閸︻厸鎷￠柛瀣躬楠炲啴鏁撻悩鑼紲濠电姴锕ら幊鎰版晬濠婂嫮绡€闁靛骏绲剧涵鐐亜閿斿灝宓嗛挊婵堚偓鐟板婢с儲鎯旈妸銉у€為悷婊勭箞閻擃剟顢楅崒妤€浜鹃悷娆忓缁€鍐┿亜閵娿儻鏀诲ǎ鍥э躬閹粓鎸婃竟鈹垮姂閺屾洘绔熼姘櫝闁哄鐗犲缁樻媴閽樺鎯為梺鍝ュУ閸旀瑩骞冮悜鑺ユ櫆闁绘劦鍓氬▓鏉库攽鎺抽崐鏇㈠箠韫囨稑纾?
  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingFriendRequestCount = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list ?? [];
    if (!Array.isArray(list))
      return 0;
    return list.filter((r: any) => r?.type === "received" && r?.status === 1).length;
  }, [friendRequestPageQuery.data?.data?.list]);

  const privateEntryBadgeCount = useMemo(() => {
    return privateTotalUnreadMessages + pendingFriendRequestCount;
  }, [pendingFriendRequestCount, privateTotalUnreadMessages]);

  // 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画闂佹寧姊婚弲顐ょ不閹€鏀介柣妯哄级閹兼劙鏌＄€ｂ晝鍔嶉柕鍥у楠炴﹢宕￠悙鍏哥棯闂備焦鎮堕崐鏍哄Ο鍏煎床婵犻潧娲ㄧ弧鈧梺绋挎湰绾板秴鈻撻鐘电＝濞达絾褰冩禍?
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: number } | null>(null);
  // 缂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎殿喚鏁婚、妤呭焵椤掑嫧鈧棃宕橀钘夌檮婵犮垹鍘滈弲婊堟儎椤栨氨鏆︾紒瀣嚦閺冨牆鐒垫い鎺戝閸庢淇婇妶鍛櫤闁绘挻鐟╅弻鐔碱敍濞戞瑧鍑￠悶姘哺濮婃椽宕崟顒夋！闂佺儵鏅╅崹璺侯嚕婵犳艾围濠㈣泛锕﹂鍥煙閼圭増褰х紒鎻掓健閹繝鍩€椤掑嫭鐓?
  const [spaceContextMenu, setSpaceContextMenu] = useState<{ x: number; y: number; spaceId: number } | null>(null);

  // 闂傚倸鍊搁崐鐑芥嚄閸洍鈧箓宕奸姀鈥冲簥闂佺懓顕崑鐔虹不閹€鏀介柣妯垮紦鏉╄绻涢幋娆忕仼缂佺姷绮妵鍕籍閸パ傛睏闂佺粯鎸婚崹鍨潖閾忚鍠嗛柛鏇ㄥ亜婵憡绻濆▓鍨灁闁稿﹥绻傞锝夊礃濞村顫嶉梺闈涢獜缁辨洟宕㈡ィ鍐┾拺闁革富鍙庨悞鐐箾鐎电鍘撮柟顖氭湰缁绘繈宕熼妸銉ゅ?
  function closeContextMenu() {
    setContextMenu(null);
  }

  // 闂傚倸鍊搁崐鐑芥嚄閸洍鈧箓宕奸姀鈥冲簥闂佺懓顕崑鐔虹不閹€鏀介柣妯垮紦鏉╄绻涢幋鐐茬劰闁稿鎹囧Λ鍐ㄢ槈濞嗘劕鏋戦梻浣规た閸樼晫鍠婂鍥ㄥ床婵炴垶锕╅崯鍛亜閺冨洤鍚归柛鎴濈秺濮婃椽骞愭惔锝冣偓鎺楁煕閻樺磭澧电€殿喛顕ч埥澶娢熼柨瀣偓濠氭⒑瑜版帒浜伴柛蹇旓耿瀵鈻庨幘绮规嫼闁哄鍋炴竟鍡欐嫻娴煎瓨鐓曟繛鍡楃箰閺嗭絾顨ラ悙璇ц含闁轰焦鍔欏畷顏呮媴閸濆嫬姹查梻鍌欑閹诧繝宕濋幋锕€绀夐幖娣壂?
  function closeSpaceContextMenu() {
    setSpaceContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁嶉崟顐ｇ€抽悗骞垮劚椤︻垶宕归崒婧惧亾鐟欏嫭绀€婵炲眰鍔庣划濠氬籍閸喓鍘遍悗鍏夊亾闁逞屽墴瀹曟垵鈽夐姀鈥崇彅闂佺粯鏌ㄩ崥瀣偂韫囨搩鐔嗛柤鍝ユ暩閵嗘帡鏌ｉ敐鍫ュ摵闁靛洤瀚版俊鐑芥晜閸撗呮澖闂備礁鎼張顒勬儎椤栨凹鍤曢柛濠勫櫏濡插ジ姊洪棃鈺冨埌缂傚秴锕濠氭偄绾拌鲸鏅┑顔斤供閸樺墽绮旂粚濉糰-room-id闂傚倸鍊峰ù鍥敋瑜忛幑銏ゅ箳濡も偓绾惧鏌ｉ弮鍌氬付缁炬儳顭烽弻锝夊箛椤掍焦鍎撻梺缁樺笒閻忔岸濡甸崟顖氱妞ゆ挾鍋涢～鈺呮⒑閻熸澘鏆辩紒缁橈耿楠炲啯銈ｉ崘鈺冨姸閻庡箍鍎卞Λ娑㈠储娴犲鈷戦柛婵嗗閳诲鏌涢幘瀛樼殤婵炴垵鐏氶妶锝夊礃閳哄啫骞堟繝纰樻閸ㄥ磭鍒掗婊€鐒婇柛顭戝亗缁?
    const messageElement = target.closest("[data-room-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: Number(messageElement?.getAttribute("data-room-id")) });
  }

  function handleSpaceContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁嶉崟顐ｇ€抽悗骞垮劚椤︻垶宕归崒婧惧亾鐟欏嫭绀€婵炲眰鍔庣划濠氬籍閸喓鍘遍悗鍏夊亾闁逞屽墴瀹曟垵鈽夐姀鈥崇彅闂佺粯鏌ㄩ崥瀣偂韫囨搩鐔嗛柤鍝ユ暩閵嗘帡鏌ｉ敐鍫ュ摵闁靛洤瀚版俊鐑芥晜閸撗呮澖闂備礁鎼張顒勬儎椤栨凹鍤曢柛濠勫櫏濡插ジ姊洪棃鈺冨埌缂傚秴锕濠氭偄绾拌鲸鏅┑顔斤供閸樺墽绮旂粚濉糰-space-id闂傚倸鍊峰ù鍥敋瑜忛幑銏ゅ箳濡も偓绾惧鏌ｉ弮鍌氬付缁炬儳顭烽弻锝夊箛椤掍焦鍎撻梺缁樺笒閻忔岸濡甸崟顖氱妞ゆ挾鍋涢～鈺呮⒑閻熸澘鏆辩紒缁橈耿楠炲啯銈ｉ崘鈺冨姸閻庡箍鍎卞Λ娑㈠储娴犲鈷戦柛婵嗗閳诲鏌涢幘瀛樼殤婵炴垵鐏氶妶锝夊礃閳哄啫骞堟繝纰樻閸ㄥ磭鍒掗婊€鐒婇柛顭戝亗缁?
    const spaceElement = target.closest("[data-space-id]");
    const rawSpaceId = spaceElement?.getAttribute("data-space-id");
    if (!rawSpaceId)
      return;
    setSpaceContextMenu({ x: e.clientX, y: e.clientY, spaceId: Number(rawSpaceId) });
  }

  // 婵犵數濮烽弫鍛婃叏娴兼潙鍨傞柣鎾崇岸閺嬫牗绻涢幋鐐茬劰闁稿鎸搁～婵嬫偂鎼淬垻褰庢俊銈囧Х閸嬫盯宕婊勫床婵犻潧顑呴悙濠囨煏婵炲灝鍔楅柛瀣崌閹粓鎳為妷褍骞楅梻浣虹帛閺屻劑骞夐敍鍕偨闁告瑥顦伴崣蹇涙煥濠靛棙瀚呯€规悶鍎查妵鍕敇閻愭潙浠撮梺纭呮珪缁捇骞冩禒瀣棃婵炴垶甯楃€氭煡姊婚崒娆掑厡妞ゎ厼鐗忛埀顒佺▓閺呯娀鐛幇鏉跨闁肩⒈鍓氬▓鎯р攽鎺抽崐鏇㈠箠鎼达絿涓嶆い鏇楀亾闁哄被鍊濋獮渚€骞掗幋婵喰ョ紓鍌欐缁屽爼宕濋幋婵愭綎闁惧繗顫夐崰鍡涙煕閺囥劌澧扮紒瀣搐閳规垿鎮欓懠顒佺檨闂侀€炲苯澧紒鍓佸仜閳藉濮€閻樼粯鏆呮繝寰锋澘鈧劙宕戦幘缁樼厽妞ゆ挾鍣ュ▓婊堟煛瀹€鈧崰鏍嵁閸℃稑绾ч柛鐔峰暞閹瑰洭寮婚敓鐘插耿婵☆垰鍚嬮崚娑㈡⒑閸濆嫯顫﹂柛濠冪箞閻涱噣骞囬鐔峰妳闂佹寧绻傚ú銊╁储閹扮増鐓熼幖娣€ゅ鎰箾閸欏鐭掔€规洑鍗冲浠嬵敇閻愮數鏆伴梻浣告啞閸旓箓宕伴弽顐ょ焼閻庯綆鍋佹禍婊堟煛瀹ュ海鍘涙繛鍫熸煥闇夋繝濠傜墢閻ｆ椽鏌″畝瀣瘈鐎规洜鍠栭、鏇㈠Χ閸ヨ泛鏁介梻?
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [contextMenu]); // 婵犵數濮烽弫鎼佸磻閻愬搫绠伴柤濮愬€曢弸鍫⑩偓骞垮劚濞诧箑鐣烽弻銉︾厱闁斥晛鍟伴幊鍛存煟椤撶儐妯€闁哄本鐩崺鍕礃閸撗冨Ш婵＄偑鍊愰弲鐐典焊濞嗘挸鐒垫い鎺嗗亾婵犫偓闁秮鈧箓宕奸妷銉у摋缂備礁鏈灒extMenu闂傚倸鍊搁崐鐑芥嚄閸撲礁鍨濇い鏍亹閳ь剨绠撳畷濂稿Ψ閵夛附袣闂備礁鎼粙渚€宕㈡總鍛婂€?

  // 婵犵數濮烽弫鍛婃叏娴兼潙鍨傞柣鎾崇岸閺嬫牗绻涢幋鐐茬劰闁稿鎸搁～婵嬫偂鎼淬垻褰庢俊銈囧Х閸嬫盯宕婊勫床婵犻潧顑呴悙濠囨煏婵炲灝鍔楅柛瀣崌閹粓鎳為妷褍骞楅梻浣虹帛閺屻劑骞夐敍鍕偨闁告瑥顦伴崣蹇涙煥濠靛棙瀚呯€规悶鍎查妵鍕敇閻愭潙浠撮梺纭呮珪缁捇骞冩禒瀣棃婵炴垶甯楃€氭煡姊婚崒娆掑厡妞ゎ厼鐗忛埀顒佺▓閺呯娀鐛幇鏉跨闁肩⒈鍓氬▓鎯р攽鎺抽崐鏇㈠箠鎼达絿涓嶆い鏇楀亾闁哄被鍊濋獮渚€骞掗幋婵喰ョ紓鍌欐缁屽爼宕濇惔锝嗩潟闁规儳鐡ㄦ刊鎾煕濞戞﹫鏀婚柟宄板船閳规垿鏁嶉崟顐″摋濠碘槅鍋勭€氼垶鎮樼€ｎ喗鈷戠紒澶婃鐎氬嘲鈻撻弮鍫熺厽妞ゆ挾鍣ュ▓婊堟煛瀹€鈧崰鏍嵁閸℃稑绾ч柛鐔峰暞閹瑰洭寮婚敓鐘插耿婵☆垰鍚嬮崚娑㈡⒑閸濆嫯顫﹂柛濠冪箞閻涱噣骞囬鐔峰妳闂佹寧绻傚ú銊╁储閹扮増鐓熼幖娣€ゅ鎰箾閸欏鐭掔€规洑鍗冲浠嬵敇閻愮數鏆伴梻浣告啞閸旓箓宕伴弽顐ょ焼閻庯綆鍋佹禍婊堟煛瀹ュ海鍘涙繛鍫熸煥闇夋繝濠傜墢閻ｆ椽鏌″畝瀣瘈鐎规洜鍠栭、鏇㈠Χ閸ヨ泛鏁介梻?
  useEffect(() => {
    if (spaceContextMenu) {
      window.addEventListener("click", closeSpaceContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeSpaceContextMenu);
    };
  }, [spaceContextMenu]);

  // websocket闂傚倸鍊峰ù鍥敋瑜忛幑銏ゅ箛椤旇棄搴婇柣搴秵閳ь兙鍨圭紞濠傜暦閸洦鏁? 闂傚倸鍊搁崐鐑芥倿閿曗偓椤啴宕归鍛姺闂佺鍕垫當缂佲偓婢舵劖鍊甸柨婵嗛婢ф彃鈹戦鎸庣彧闁靛洤瀚伴獮鎺楀箣濠垫劒鎮ｉ梻浣规た閸樹粙銆冩繝鍥ц摕闁绘柨鎲＄紞鍥煙鐟欏嫬濮囬柟顔兼嚇濮婅櫣绮欏▎鎯у壉闂佸湱顭堥…鐑界嵁韫囨稑宸濋悗娑櫭禒顓㈡⒑閸濆嫷妲规い鎴炵懃鍗卞┑鐘崇閳锋帒霉閿濆懏鍟為柛鐔哄仱閺岋綁鎮ら崒婊呮殼闂侀潧妫楅崯鏉戠暦閸楃偐鏋庨柟瀵稿Х閸樼娀姊绘担铏瑰笡闁搞劎鍘ц灋闁告洦鍘炬稉?
  const websocketUtils = useGlobalContext().websocketUtils;
  // 濠电姷鏁告慨鐑藉极閹间礁纾婚柣鎰惈閸ㄥ倿鏌ｉ姀鐘冲暈闁稿顑呴埞鎴︽偐閹绘帗娈銈嗘礋娴滃爼寮诲☉妯锋婵炲棙鍔楃粙鍥╃磽娴ｅ搫啸闁轰礁顭峰濠氭偄閸忕厧浜遍梺鍓插亞閸犳捇宕欓敓鐘斥拺闁告繂瀚刊鐓幟瑰搴濋偗鐎殿喖顭烽弫鎰緞婵犲嫬骞愰梻浣告啞閸旀洘鏅舵禒瀣闁归棿鐒﹂埛?
  const unreadMessagesNumber = websocketUtils.unreadMessagesNumber;
  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadMessagesNumber).reduce((sum, count) => sum + count, 0);
  }, [unreadMessagesNumber]);
  const unreadDebugEnabled = typeof window !== "undefined" && localStorage.getItem("tc:unread:debug") === "1";
  const unreadDebugSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    if (!unreadDebugEnabled) {
      unreadDebugSnapshotRef.current = null;
      return;
    }

    const path = `${window.location.pathname}${window.location.search}`;
    const groupDetails = Object.entries(unreadMessagesNumber)
      .map(([roomId, unread]) => ({
        roomId: Number(roomId),
        unread: unread ?? 0,
      }))
      .sort((a, b) => a.roomId - b.roomId);
    const privateDetails = privateMessageList.realTimeContacts
      .map(contactId => ({
        contactId,
        unread: privateUnreadMessageNumbers[contactId] ?? 0,
        isActive: isPrivateChatMode && activeRoomId === contactId,
      }))
      .sort((a, b) => a.contactId - b.contactId);

    const snapshot = {
      path,
      isPrivateChatMode,
      activeRoomId,
      totalUnreadMessages,
      privateTotalUnreadMessages,
      pendingFriendRequestCount,
      privateEntryBadgeCount,
      groupUnreadTotal: totalUnreadMessages,
      groupDetails,
      privateDetails,
    };
    const nextSnapshot = JSON.stringify(snapshot);
    if (unreadDebugSnapshotRef.current === nextSnapshot) {
      return;
    }
    unreadDebugSnapshotRef.current = nextSnapshot;
    console.warn(`[tc:unread] ${path}`, snapshot);
  }, [
    activeRoomId,
    isPrivateChatMode,
    pendingFriendRequestCount,
    privateEntryBadgeCount,
    privateMessageList.realTimeContacts,
    privateTotalUnreadMessages,
    privateUnreadMessageNumbers,
    totalUnreadMessages,
    unreadDebugEnabled,
    unreadMessagesNumber,
  ]);
  // 闂傚倸鍊搁崐椋庢濮橆剦鐒介柤濮愬€栫€氬鏌ｉ弮鍌氬付缂佲偓婢跺备鍋撻獮鍨姎妞わ缚鍗冲畷鎴炲緞閹邦厾鍙嗗┑鐘绘涧濡瑥顔忓┑鍡╂富闁荤喐婢橀弳閬嶆懚閺嶎厽鐓ユ繝闈涙閸ｅ綊鏌￠崱妯活棃闁哄苯绉烽¨渚€鏌涢幘瀵告噰閽樻繈鏌熷▓鍨灓闁活厽鐟ラ…鍧楁嚋闂堟稑袝闂佽桨绀佸ú顓㈠蓟閿濆绫嶉柛灞惧殠閳ь剙锕弻锛勨偓锝庡亞婢ц京绱掓潏銊﹀鞍闁瑰嘲鎳橀獮鎾诲箳瀹ュ拋妫滈梻鍌氬€烽懗鍓佸垝椤栫偛鍨傞柟顖滃閹冲矂鏌ｆ惔銏╁晱闁哥姵顨婇獮鎴﹀炊椤掆偓缁犳牜鎲搁悧鍫濈瑨闁绘劕锕弻宥夊传閸曨偅娈紓浣诡殣缁辨洜妲愰幘瀛樺闁告挸寮舵闂備胶顭堢换鎴︽晝閵忋倖鍋?
  useEffect(() => {
    const originalTitle = document.title.replace(/^\d+闂傚倸鍊风粈渚€骞栭位鍥敃閿曗偓缁€鍫熺節闂堟侗鍎忛柦鍐枎閳规垿鎮╅幓鎺嗗亾闂堟党锝夊醇閵夛妇鍘卞銈嗗姂閸婃洟寮稿鍥╃＜?/, ""); // 婵犵數濮烽弫鎼佸磻閻愬搫绠伴柟闂寸缁犵姵淇婇婵勨偓鈧柡瀣Ч楠炴牜鍒掔憴鍕垫綉闂佸摜鍠庨幊姗€寮诲☉妯锋瀻闊浄绲炬晥缂傚倷鑳舵慨鐢垫暜閿熺姴钃熸繛鎴欏灩缁犺崵鈧娲栧▔锕傚Χ閸モ晝锛?
    if (totalUnreadMessages > 0) {
      document.title = `${totalUnreadMessages}闂傚倸鍊风粈渚€骞栭位鍥敃閿曗偓缁€鍫熺節闂堟侗鍎忛柦鍐枎閳规垿鎮╅幓鎺嗗亾闂堟党锝夊醇閵夛妇鍘卞銈嗗姂閸婃洟寮稿鍥╃＜?${originalTitle}`;
    }
    else {
      document.title = originalTitle;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [totalUnreadMessages]);

  // spaceContext
  const spaceContext: SpaceContextType = useMemo((): SpaceContextType => {
    return {
      spaceId: activeSpaceId ?? -1,
      isSpaceOwner: !!spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1),
      setActiveSpaceId,
      setActiveRoomId,
      toggleLeftDrawer,
      ruleId: spaces.find(space => space.spaceId === activeSpaceId)?.ruleId,
      spaceMembers: spaceMembersQuery.data?.data ?? [],
    };
  }, [activeSpaceId, globalContext.userId, setActiveRoomId, setActiveSpaceId, spaceMembersQuery.data?.data, spaces, toggleLeftDrawer]);

  const isSpaceOwner = Boolean(spaceContext.isSpaceOwner);

  const getSpaceUnreadMessagesNumber = (spaceId: number) => {
    const roomIds = spaceRoomIdsByUser[String(userId)]?.[String(spaceId)] ?? [];
    let result = 0;
    for (const roomId of roomIds) {
      if (activeRoomId !== roomId)
        result += unreadMessagesNumber[roomId] ?? 0;
    }
    return result;
  };

  // 濠电姷鏁告慨鐑藉极閹间礁纾块柟瀵稿Х缁€濠囨煃瑜滈崜姘跺Φ閸曨垰鍗抽柛鈩冾殔椤忣亪鏌涘▎蹇曠闁哄矉缍侀獮鍥敆娴ｇ懓鍓电紓鍌欒兌婵绱炴笟鈧璇测槈濠婂孩歇婵＄偑鍊戦崝灞轿涘┑瀣瀬鐎广儱顦伴崑鍕煕韫囨艾浜归柛妯兼暬閺岋絾鎯旈姀鈶╁闂佹寧鑹鹃埞鎴︻敊閸忕厧鏋犻梺鍝勭灱閸犳牕鐣烽敐鍡楃窞濠电偟鍋撻悘鍡涙⒒娴ｇ瓔鍤冮柛銊ゅ嵆瀹曨垶寮堕幋鐘虫濠殿喗锚瀹曨剟藟濮橆厽鍙忔繝闈涚墑娴滅磪ion
  const addRoomMemberMutation = useAddRoomMemberMutation();
  // 濠电姷鏁告慨鐑藉极閹间礁纾块柟瀵稿Х缁€濠囨煃瑜滈崜姘跺Φ閸曨垰鍗抽柛鈩冾殔椤忣亪鏌涘▎蹇曠闁哄矉缍侀獮鍥敊閼恒儲鐦庨梻浣规た閸樼晫鍠婂鍥ㄥ床婵炴垶锕╅崯鍛亜閺冨洤鍚归柛鎴濈秺濮婃椽骞愭惔锝冣偓鎺楁煕閻樺磭澧电€殿喖顭烽幃銏㈡偘閳ュ厖澹曞┑鐐村灦椤忣亪顢旈崨顔煎伎闂佹悶鍎洪崜姘舵偂濞嗘挻鐓曟繛鍡楁禋濡叉悂鏌嶇紒妯荤闁哄瞼鍠栭、娑橆潩椤掍焦顔掗柣搴ゎ潐濞叉ê顫濋妸锔剧彾闁哄洨鍎愬鎵磼閳ь剟鎯囧▽鐞絥
  const addSpaceMemberMutation = useAddSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();

  // 婵犵數濮烽弫鍛婃叏娴兼潙鍨傞柣鎾崇岸閺嬫牗绻涢幋鐐茬劰闁稿鎸搁～婵嬫偂鎼淬垻褰庢俊銈囧Х閸嬫盯宕婊勫床婵犻潧顑呴悙濠囨煏婵炑冨暙妤旈梻鍌氬€风欢姘跺焵椤掑倸浠滈柤娲诲灡閺呰埖瀵肩€涙鍘垫俊鐐差儏妤犲憡鐗庢俊鐐€ф俊鍥ㄦ櫠濡ゅ懎绠氶柡鍐ㄧ墛椤庢劗绱撴担鎻掍壕闁诲函缍嗛崰妤呮偂?
  const handleInvitePlayer = (roomId: number) => {
    setInviteRoomId(roomId);
  };

  // 婵犵數濮烽弫鍛婃叏娴兼潙鍨傞柣鎾崇岸閺嬫牗绻涢幋鐐茬劰闁稿鎸搁～婵嬫偂鎼淬垻褰庢俊銈囧Х閸嬫盯宕婊勫床婵犻潧顑呯壕濠氭煕閹邦剙绾ч柟鐧哥秮閺岀喐顦版惔鈾€鏋呭Δ鐘靛仦閹瑰洭鐛幒鎴旀斀闁搞儜灞绢唵闂傚倸鍊搁崐宄懊归崶顒婄稏濠㈣泛顭悞鑺ョ箾閸℃绂嬮柣鎺嶇矙閺屽秹濡烽敂鍓х嵁濠电偞鍨崹褰掓煥閵堝棔绻嗛柕鍫濆€告禍鍓х磽娴ｅ搫顎撶紓宥勭窔瀵鎮㈤崗鑲╁姺闂佹寧娲嶉崑鎾愁熆瑜滈崹鍫曞蓟?
  const handleAddRoomMember = (userId: number) => {
    if (inviteRoomId) {
      addRoomMemberMutation.mutate({
        roomId: inviteRoomId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setInviteRoomId(null);
        },
      });
    }
  };

  // 婵犵數濮烽弫鍛婃叏娴兼潙鍨傞柣鎾崇岸閺嬫牗绻涢幋鐐茬劰闁稿鎸搁～婵嬫偂鎼淬垻褰庢俊銈囧Х閸嬫盯宕婊勫床婵犻潧顑呯壕濠氭煕閹邦剙绾ч柟鐧哥秮閺岀喐顦版惔鈾€鏋呭Δ鐘靛仦閹瑰洭鐛幒鎴旀斀闁搞儜灞绢唵缂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎殿喚鏁婚、妤呭焵椤掑嫧鈧棃宕橀钘夌檮婵犮垹鍘滈弲婊堟儎椤栨氨鏆︾紒瀣嚦閺冨牆鐒垫い鎺戝€绘稉宥夋煥濠靛棭妲归柣鎾寸懇濮婃椽顢橀妸褏鏆犳繝鈷€灞界仸闁?
  const handleAddSpaceMember = (userId: number) => {
    if (activeSpaceId) {
      addSpaceMemberMutation.mutate({
        spaceId: activeSpaceId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setIsMemberHandleOpen(false);
        },
      });
    }
  };

  const handleAddSpacePlayer = (userId: number) => {
    if (!activeSpaceId)
      return;

    const isAlreadyMember = (spaceMembersQuery.data?.data ?? []).some(m => m.userId === userId);

    const grantPlayer = () => {
      setPlayerMutation.mutate({
        spaceId: activeSpaceId,
        uidList: [userId],
      }, {
        onSettled: () => {
          setIsMemberHandleOpen(false);
        },
      });
    };

    if (isAlreadyMember) {
      grantPlayer();
      return;
    }

    addSpaceMemberMutation.mutate({
      spaceId: activeSpaceId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        grantPlayer();
      },
      onError: () => {
        grantPlayer();
      },
    });
  };

  const mainContent = (
    <ChatPageMainContent
      isPrivateChatMode={isPrivateChatMode}
      activeRoomId={activeRoomId}
      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
      mainView={mainView}
      discoverMode={discoverModeForUi}
      activeSpaceId={activeSpaceId}
      spaceDetailTab={spaceDetailTab}
      onCloseSpaceDetail={closeSpaceDetailPanel}
      roomSettingState={roomSettingState}
      onCloseRoomSetting={closeRoomSettingPage}
      activeDocId={activeDocId}
      isKPInSpace={isKPInSpace}
      activeDocTitleForTcHeader={activeDocTitleForTcHeader}
      onDocTcHeaderChange={handleDocTcHeaderChange}
      targetMessageId={targetMessageId}
    />
  );
  const sidePanelContent = (
    <ChatPageSidePanelContent
      isPrivateChatMode={isPrivateChatMode}
      mainView={mainView}
      discoverMode={discoverModeForUi}
      onCloseLeftDrawer={closeLeftDrawer}
      onToggleLeftDrawer={toggleLeftDrawer}
      isLeftDrawerOpen={isOpenLeftDrawer}
      currentUserId={userId}
      activeSpaceId={activeSpaceId}
      activeSpaceName={activeSpaceNameForUi}
      activeSpaceIsArchived={activeSpaceIsArchived}
      isSpaceOwner={isSpaceOwner}
      isKPInSpace={isKPInSpace}
      rooms={orderedRooms}
      roomOrderIds={orderedRoomIds}
      onReorderRoomIds={setUserRoomOrder}
      sidebarTree={sidebarTree}
      onSaveSidebarTree={handleSaveSidebarTree}
      onResetSidebarTreeToDefault={resetSidebarTreeToDefault}
      docMetas={spaceDocMetas ?? []}
      onSelectDoc={handleSelectDoc}
      activeRoomId={activeRoomId}
      activeDocId={activeDocId}
      unreadMessagesNumber={unreadMessagesNumber}
      onContextMenu={handleContextMenu}
      onInviteMember={() => setIsMemberHandleOpen(true)}
      onOpenSpaceDetailPanel={openSpaceDetailPanel}
      onSelectRoom={handleSelectRoom}
      onOpenRoomSetting={openRoomSettingPage}
      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
      onOpenCreateInCategory={openCreateInCategory}
    />
  );
  const leftDrawerToggleLabel = isOpenLeftDrawer ? "闂傚倸鍊峰ù鍥Υ閳ь剟鏌涚€ｎ偅宕岄柡宀€鍠栭、娑橆煥閸愮偓姣夐柣搴ゎ潐濞叉牠宕崸妤€违闁圭儤鍩堝鈺呮煃瑜滈崜鐔风暦閸楃偐鏋庨柟瀛樼箞閻涘酣姊? : "闂傚倷娴囬褏鎹㈤幒妤€纾婚柣鎰梿濞差亜鍐€妞ゆ劧缍嗗鐔兼⒑閻熼偊鍤熼柛瀣枛閹兘宕烽鐔锋瀾闂佺懓顕慨鐑藉础濮樿埖鐓熼柡鍐ㄥ€哥敮鍫曟煕閹般劌浜?;
  const shouldShowLeftDrawerToggle = screenSize === "sm" && !isOpenLeftDrawer;

  return (
    <SpaceContext value={spaceContext}>
      <div className={`flex flex-row flex-1 h-full min-h-0 min-w-0 relative overflow-x-hidden overflow-y-hidden ${screenSize === "sm" ? "bg-base-100" : "bg-base-200"}`}>
        {shouldShowLeftDrawerToggle && (
          <div className="tooltip tooltip-right absolute left-2 top-2 z-50" data-tip={leftDrawerToggleLabel}>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square bg-base-100/80"
              onClick={toggleLeftDrawer}
              aria-label={leftDrawerToggleLabel}
              aria-pressed={Boolean(isOpenLeftDrawer)}
            >
              <SidebarSimpleIcon />
            </button>
          </div>
        )}
        {screenSize === "sm"
          ? (
              <>
                {/* 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画濡炪倖鐗楃粙鎾汇€呴崣澶岀瘈闂傚牊绋掗敍鏃堟煠閺夎法浠㈤棁澶愭煥濠靛棛澧涢柕鍡楀暣閺岋綁骞掗幋顖濆惈闂佺粯鎼╅崑濠傜暦閸洖惟闁挎洍鍋撻柡鍡橆殔閳规垿鎮欓棃娑樹粯闂佹椿鍘奸崐鍨嚕婵犳碍鍋勯柛蹇曗拡濡啫鈹戦悙鏉戠仸妞ゆ洘鎸虫慨鈧柕鍫濇閸樺崬鈹戦埥鍡楃仴妞ゆ泦鍥ㄥ€堕柍鍝勬噺閻撴瑧鈧懓瀚伴崑濠囧磿閺冨倵鍋撶憴鍕８闁告柨绉堕幑銏犫攽鐎ｎ亞顦ㄩ梺鍐叉惈閸婅危閺囥垺鈷掑ù锝堟閸氱懓鈹戦鑲┬х€规洖宕灒闁割煈鍠楅崐鏇㈡⒒閸屾瑧顦﹂柟纰卞亰楠炲﹪骞樼拠鍙夋К闂佸搫璇炲畝鈧崝鐑芥椤愩垺澶勬繛鍙夛耿瀹曚即宕卞☉娆戝幈闂佸搫娲㈤崝宀勭嵁閺嶎厽鐓?*/}
                <OpenAbleDrawer
                  isOpen={isOpenLeftDrawer}
                  className="h-full z-10 w-full bg-base-200"
                  initialWidth={chatLeftPanelWidth}
                  minWidth={200}
                  maxWidth={700}
                  onWidthChange={setChatLeftPanelWidth}
                  handlePosition="right"
                >
                  <div className="h-full flex flex-col w-full min-w-0 relative">
                    <div className="flex flex-row w-full min-w-0 flex-1 min-h-0">
                      {/* 缂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎殿喚鏁婚、妤呭焵椤掑嫧鈧棃宕橀钘夌檮婵犮垹鍘滈弲婊堟儎椤栨氨鏆︾紒瀣嚦閺冨牆鐒垫い鎺戝€婚惌鍡涙煕閳╁厾鑲╂崲閸℃稒鐓忛柛顐ｇ箖閸ｈ銇勮箛瀣姦闁?*/}
                      <ChatSpaceSidebar
                        isPrivateChatMode={isPrivateChatMode}
                        spaces={orderedSpaces}
                        spaceOrderIds={orderedSpaceIds}
                        onReorderSpaceIds={setUserSpaceOrder}
                        activeSpaceId={activeSpaceId}
                        getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
                        privateUnreadMessagesNumber={privateEntryBadgeCount}
                        onOpenPrivate={handleOpenPrivate}
                        onToggleLeftDrawer={toggleLeftDrawer}
                        isLeftDrawerOpen={isOpenLeftDrawer}
                        onSelectSpace={setActiveSpaceId}
                        onCreateSpace={() => {
                          setIsSpaceHandleOpen(true);
                        }}
                        onSpaceContextMenu={handleSpaceContextMenu}
                      />
                      {/* <div className="w-px bg-base-300"></div> */}
                      {/* 闂傚倸鍊搁崐宄懊归崶顒婄稏濠㈣泛顭悞鑺ョ箾閸℃绂嬮柣鎺嶇矙閺屽秹濡烽敂鍓х嵁濠电偞鍨崹褰掓煥閵堝棔绻嗛柕鍫濆€告禍鍓х磽娴ｆ彃浜鹃梺绯曞墲鐪夌紒璇叉閺屾洟宕煎┑鍥ф濡炪倕绻堥崕鐢稿蓟?*/}
                      {sidePanelContent}
                    </div>
                    <div
                      id="chat-sidebar-user-card"
                      className="absolute left-2 right-2 bottom-2 z-20 pointer-events-auto"
                    />
                  </div>
                </OpenAbleDrawer>
                {/* 闂傚倸鍊搁崐鐑芥嚄閸洖鍌ㄧ憸宥夋偩閻戠瓔鏁嗛柛鏇ㄥ墯濞呭洭姊洪棃娑氬妞わ富鍨遍、濠傗攽閻橆喖鐏辨繛澶嬬洴瀵敻顢楁担绋跨亖婵犻潧鍊搁幉锟犳偂濞戞﹩鐔嗛悹鍝勬惈椤掋垻鐥鐐差暢缂佽鲸甯楀鍕償閵忣潿鈧﹦绱撴担浠嬪摵閻㈩垽绻濋悰顕€宕堕澶嬫櫍閻熸粌閰ｉ幃楣冨醇閺囩喎浠┑鐘诧工閹冲酣銆傛總鍛婄厽闁冲搫锕ら悘锔锯偓娈垮櫘閸嬪嫰顢樻總绋垮窛妞ゆ牗绋掗悾鐑芥⒒娴ｅ憡鍟為柛鏃撻檮缁傚秹鎮欓悜妯衡偓鐑芥煛閸ャ儱鐏柍閿嬪灩缁辨帞鈧綆鍘界涵鍓佺磼閻橀潧浠遍柡灞剧⊕閹棃濮€閻橆偅鐏嗛梻浣筋嚃閸犳洟宕￠搹顐＄箚闁绘垼妫勯悡娑樏归敐鍫燁仩闁告﹩鍓熷缁樻媴閻熼偊鍤嬬紓浣筋嚙閸婂骞戦姀銈呯闁哄啫鍊婚悞鍏肩節閵忥絾纭炬い顓炵墦閸┾偓妞ゆ帊绀佺粭鎺撱亜椤愶絿绠為柛鈹惧亾濡炪倖甯掔€氼剟鐛姀锛勭闁糕剝锚閻忋儱螖閻樻彃顏慨? */}
                <div
                  className={`flex-1 min-h-0 min-w-0 transition-opacity ${isOpenLeftDrawer ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                  aria-hidden={isOpenLeftDrawer}
                >
                  {mainContent}
                </div>
              </>
            )
          : (
              <>
                {/* 濠电姷鏁告慨鐑姐€傛禒瀣婵犻潧顑冮埀顒€鍟村畷銊р偓娑櫭崜褰掓⒑缁嬫寧婀伴柛鎴濈秺閹偞绂掔€ｎ偆鍘靛┑鐐茬墕閻忔繈寮搁妶澶嬬厱婵°倓鑳堕。鏌ユ煏閸パ冾伃鐎殿喕绮欐俊鐑藉Ψ閵忕姳澹曞┑掳鍊曢崯浼存偝缂佹ü绻嗛柕鍫濇噺閸ｆ椽鏌ｉ幘瀵告噰闁哄备鍓濆鍕偓锝庝簽娴犳悂姊虹粙娆惧剭闁稿骸寮剁粚杈ㄧ節閸ヨ埖鏅濋梺闈涚箚閳ь剙鍘栧ǎ顕€鏌ｆ惔銈庢綈婵炲弶锕㈤幊婵嬪箲閹邦喕绨烽梻鍌欑閹测€趁哄澶婃濞撴埃鍋撶€?+ 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画闂侀潧顦弲娑㈠磼閵娾晜鐓涚€广儱楠搁獮鏍煟閵堝鐣洪柡灞剧洴楠炴﹢鎳犻鈧俊浠嬫⒑閸濄儱孝婵☆偅绻堝璇测槈閵忕姷鍔撮梺鍛婂姉閸嬫捇鎮炬搴ｇ＝濞达絿顭堥埀顒佹倐閹囧箻鐠囪尪鎽曢梺璺ㄥ枔婵挳鎮為崹顐犱簻闁圭儤鍨甸鈺冪磼閻樿櫕鐨戦柟鎻掓啞閹棃濡歌瑜板棗顪冮妶鍡楃瑨閻庢凹鍙冮幃锟犲即閻旂寮垮┑顔筋殔濡鏅堕濮愪簻闁靛濡囬幊鍛磼鏉堛劌娴€殿噮鍓欓埢搴ㄥ箚瑜庨宥夋⒒娓氣偓閳ь剛鍋涢懟顖涙櫠椤旂晫绡€闁逞屽墴閺屽棗顓奸崨顖滄瀮闂備礁婀遍崑鎾诲几婵傜鍑犵€广儱顦伴悡蹇涚叓閸パ屽剰闁逞屽墯閻楃姴顕ｉ弻銉晢闁告洦鍓欓埀顒€鐖奸弻锝夊箛椤撶姰鍋為梺绋款儐閹瑰洭骞冮姀鈽嗘Ч閹肩话銈庡敼闂傚倸鍊搁崐鐑芥嚄閸洍鈧箓宕奸妷顔芥櫈闂佺硶鍓濈粙鎺楀吹瀹€鍕厽闁逛即娼ф晶浼存煃缂佹ɑ绀嬮柣鎿冨亰瀹曞爼濡搁敂瑙勫闂備礁纾划顖炲蓟閵娾晛鐓橀柟杈鹃檮閸嬫劙鏌ｉ幋鐑嗙劷鐟滄妸鍕瘈缁剧増菤閸嬫捇鎼归銏＄亷闂? */}
                <div className="flex flex-row flex-1 h-full min-w-0 overflow-visible bg-base-200 rounded-tl-xl">
                  <div className="flex flex-col bg-base-200 h-full relative">
                    <div className="flex flex-row flex-1 min-h-0">
                      {/* 濠电姷鏁告慨鐑姐€傛禒瀣婵犻潧顑冮埀顒€鍟村畷銊р偓娑櫭崜褰掓⒑缁嬫寧婀伴柛鎴濈秺閹偞绂掔€ｎ偆鍘靛┑鐐茬墕閻忔繈寮搁妶澶嬬厱婵°倓鑳堕。鏌ユ煏閸パ冾伃鐎殿喕绮欐俊鐑藉Ψ閵忕姳澹曢悷婊冪箰鍗遍柟鐗堟緲缁犮儲銇勯弬鍨挃闁挎稒绮撻弻锝堢疀閺囩偘鎴烽梺绋款儐閹瑰洦淇婇棃娑掓斀闁搞儻濡囩粻姘渻閵堝棗濮傞柛銊︽そ瀹曟垿濡疯閸嬫挾鎲撮崟顒傤槰闂佽壈顫夊畷姗€鎮橀崘顔解拺闁告稑锕ョ壕鐢告煛閸屾瑧绐旂€规洘鍨块獮妯兼嫚閼碱剦妲伴梻浣稿暱閹碱偊宕悩璇插嚑闁哄稁鍘介崐鍨殽閻愯尙浠㈤柛鏃€宀搁弻鐔煎礃閼碱剛顔掗梺缁樻惄閸撶喖銆佸Δ鍛妞ゆ帒鍊搁獮鍫ユ⒒娴ｇ懓顕滄繛鎻掔Ч瀹曟垿骞樼紙鐘电畾濡炪倖鍔х徊鍧楁儗閹烘鐓ユ繝闈涚墕娴犳粓鎽堕弽顓熺厱闁规澘澧庨崚鏉棵瑰鍫㈢暫闁哄本鐩弫鍌滄嫚閹绘帞顔戦梻浣规偠閸婃劙宕戦幘瀵哥瘈闁汇垽娼ф禒婊堟煙閸愯尙鐒哥€规洖缍婇幐濠冨緞鐏炵偓顔? */}
                      <div className="bg-base-200 h-full">
                        <ChatSpaceSidebar
                          isPrivateChatMode={isPrivateChatMode}
                          spaces={orderedSpaces}
                          spaceOrderIds={orderedSpaceIds}
                          onReorderSpaceIds={setUserSpaceOrder}
                          activeSpaceId={activeSpaceId}
                          getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
                          privateUnreadMessagesNumber={privateEntryBadgeCount}
                        onOpenPrivate={handleOpenPrivate}
                          onToggleLeftDrawer={toggleLeftDrawer}
                          isLeftDrawerOpen={isOpenLeftDrawer}
                        onSelectSpace={setActiveSpaceId}
                          onCreateSpace={() => {
                            setIsSpaceHandleOpen(true);
                          }}
                          onSpaceContextMenu={handleSpaceContextMenu}
                        />
                      </div>

                      <OpenAbleDrawer
                        isOpen={isOpenLeftDrawer}
                        className="h-full z-10 w-full bg-base-200"
                        initialWidth={chatLeftPanelWidth}
                        minWidth={200}
                        maxWidth={700}
                        onWidthChange={setChatLeftPanelWidth}
                        handlePosition="right"
                      >
                        <div className="h-full flex flex-row w-full min-w-0 rounded-tl-xl">
                          {/* 闂傚倸鍊搁崐宄懊归崶顒婄稏濠㈣泛顭悞鑺ョ箾閸℃绂嬮柣鎺嶇矙閺屽秹濡烽敂鍓х嵁濠电偞鍨崹褰掓煥閵堝棔绻嗛柕鍫濆€告禍鍓х磽娴ｆ彃浜鹃梺绯曞墲鐪夌紒璇叉閺屾洟宕煎┑鍥ф濡炪倕绻堥崕鐢稿蓟?*/}
                          {sidePanelContent}
                        </div>
                      </OpenAbleDrawer>
                    </div>
                    <div
                      id="chat-sidebar-user-card"
                      className="absolute left-2 right-2 bottom-2 z-20 pointer-events-auto"
                    />
                  </div>
                  {mainContent}
                </div>
              </>
            )}

        {/* 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁嶉崟顒佹濠德板€曢崯浼存儗濞嗘挻鐓欓悗鐢殿焾鍟哥紒鎯у綖缁瑩寮婚悢鐓庣畾鐟滃秹銆傞幎鑺ョ厽妞ゆ挾鍠撻。鑼磼缂佹鈽夋い鏂跨箻椤㈡瑩鎳￠妶鍛瘓闂傚倷鐒︾€笛呯矙閹捐绐楅柟鎹愵嚙閻掑灚銇勯幒宥囪窗闁哥喎绻橀弻娑㈡偐閸愭彃鎽靛Δ鐘靛仜閿曨亪鐛Ο鍏煎珰闁圭粯甯楅崕顏呬繆閻愵亜鈧牠骞愰悙顒佸弿闁绘垼濮ら崑婵堢磽娴ｅ鑲╂崲閸℃稒鐓忛柛顐ｇ箓閳ь剙鎲＄粋宥嗐偅閸愨晛浠?*/}        <ChatPageModals
          isSpaceHandleOpen={isSpaceHandleOpen}
          setIsSpaceHandleOpen={setIsSpaceHandleOpen}
          isCreateInCategoryOpen={isCreateInCategoryOpen}
          closeCreateInCategory={closeCreateInCategory}
          createInCategoryMode={createInCategoryMode}
          setCreateInCategoryMode={setCreateInCategoryMode}
          isKPInSpace={isKPInSpace}
          createDocTitle={createDocTitle}
          setCreateDocTitle={setCreateDocTitle}
          pendingCreateInCategoryId={pendingCreateInCategoryId}
          createDocInSelectedCategory={createDocInSelectedCategory}
          activeSpaceId={activeSpaceId}
          activeSpaceAvatar={activeSpaceAvatar}
          onRoomCreated={handleRoomCreated}
          inviteRoomId={inviteRoomId}
          setInviteRoomId={setInviteRoomId}
          onAddRoomMember={handleAddRoomMember}
          isMemberHandleOpen={isMemberHandleOpen}
          setIsMemberHandleOpen={setIsMemberHandleOpen}
          onAddSpaceMember={handleAddSpaceMember}
          onAddSpacePlayer={handleAddSpacePlayer}
        />
      </div>

      <ChatPageContextMenu
        contextMenu={contextMenu}
        unreadMessagesNumber={unreadMessagesNumber}
        activeRoomId={activeRoomId}
        onClose={closeContextMenu}
        onInvitePlayer={handleInvitePlayer}
        onOpenRoomSetting={openRoomSettingPage}
      />

      <SpaceContextMenu
        contextMenu={spaceContextMenu}
        isSpaceOwner={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.userId === globalContext.userId
            : false
        }
        isArchived={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.status === 2
            : false
        }
        onClose={closeSpaceContextMenu}
      />
    </SpaceContext>
  );
}
