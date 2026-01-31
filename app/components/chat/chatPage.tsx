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
 * chat闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偞鐗犻、鏇氱秴闁搞儺鍓﹂弫宥夋煟閹邦厽缍戦柍褜鍓濋崺鏍崲濠靛顥堟繛鎴炵懕缁辩偤姊虹紒妯虹瑐缂侇喗鐟╁濠氬Ω閳哄倸浜滈梺鍛婄箓鐎氬懘鏁愭径瀣幈闁硅壈鎻槐鏇熸櫏闂備礁鎼張顒勬儎椤栨凹鍤曢柟缁㈠枛鎯熼梺闈涚墕濞层劌鈻旈崸妤佲拻濞达綁顥撴稉鏌ユ⒒閸曨偄顏柛鎺撳笚閹棃鏁愰崱鈺傜稐闂備浇顫夐崕鎶芥偤閵婏箑鍨旈悗闈涙憸绾惧ジ鎮楅敐搴′航闁稿簺鍎遍湁闁绘ê鐏氶崵鈧梺?
 */
interface ChatPageProps {
  /**
   * 闂傚倸鍊搁崐鎼佸磹閻戣姤鍊块柨鏇楀亾妞ゎ亜鍟村畷褰掝敋閸涱垰濮洪梻浣侯潒閸曞灚鐣剁紓浣插亾濠㈣埖鍔栭崐鐢告煥濠靛棝顎楀褎褰冮埞鎴︻敊閹稿海褰ч梺闈涙搐鐎氫即鐛幒妤€绠ｆ繝鍨姃閻ヮ亪姊绘担渚劸妞ゆ垵鎳橀、鏍ㄥ緞閹邦剛鐣洪悗鐟板婢瑰寮告惔銊у彄闁搞儯鍔嶉幆鍕圭亸鏍т壕闂傚倸鍊风粈渚€骞栭鈶芥稑鈻庡婵囨そ閹垽鎮℃惔銈嗘啺婵犵數鍋為崹鍓佸垝鎼淬劍鍋柍褜鍓熼弻锝嗘償椤栨粎校婵炲瓨绮嶇划宥夊箞閵婏附鍎熼柕濠忕畱娴狀厼鈹戦悩璇у伐闁瑰啿閰ｉ妴鍌涚附閸涘﹦鍘介梺鍐叉惈閿曘倝鎮橀敂閿亾濞堝灝娅橀柛瀣椤㈡﹢宕楅悡搴ｇ獮婵犵數濮村ú銈夊极鐟欏嫮绡€闁汇垽娼у瓭闂佽绻戝畝绋跨暦濠靛鍐€妞ゆ挾鍋熼?/chat/discover闂傚倸鍊搁崐鎼佸磹閻戣姤鍊块柨鏃堟暜閸嬫挾绮☉妯诲櫧闁活厽鐟╅弻鐔封枎闄囬褍煤椤撱垻宓佺€广儱顦介弫濠囨煟閻旂⒈鏆掑瑙勬礋濮婃椽宕滈懠顒€甯ラ梺绋款儏閹虫﹢骞嗛崘顔肩闁挎梻鏅崢鎾绘偡濠婂嫮鐭掔€规洘绮岄埞鎴犫偓锝呭缁嬪繑绻濋姀锝呯厫闁告梹鐗犲畷鐢典沪鏉炴寧妫冮弫鎰板川椤撶喐顔勯梻浣规偠閸斿矂宕愰崸妤€钃熸繛鎴旀噰閳ь剨绠撻獮瀣攽閸涱垰鍤梻鍌欑閹诧繝鎮烽妷褎宕叉慨妞诲亾妤犵偛鍟灃闁告侗鍠楀▍婊堟⒑缁嬫寧婀扮紒瀣浮閹敻寮崼鐔叉嫼婵炴潙鍚嬮悷鈺侇瀶椤斿墽纾兼い鏃囧Г瀹曞本顨ラ悙鎻掓殭闁伙綇绻濋獮宥夋惞椤愩倐鍋撴繝姘棅妞ゆ劑鍨烘径鍕繆椤愩垻绠伴摶鐐烘煟閹邦厾銈撮柡鈧禒瀣厽闁归偊鍨伴惃娲煙閻ｅ苯鈻堥柡灞诲姂瀵潙螣閾忛€涚棯濠?
   * 婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柟闂寸绾剧粯绻涢幋鏃€鍤嶉柛銉墻閺佸洭鏌曡箛鏇炐ユい锔诲櫍閹鐛崹顔煎濡炪倧瀵岄崹宕囧垝閸儱閱囨繝銏＄箓缂嶅﹪骞冮埄鍐╁劅闁挎繂妫欓崰鏍⒒娴ｅ憡鎯堥柟宄邦儔瀹曟粌顫濈捄铏圭杽闂侀潧顭堥崕鍝勵焽閵娾晜鐓曢柍鈺佸暔娴狅妇绱掗妸銉吋婵﹦鍎ょ€电厧鈻庨幘鎼偓宥囩磽娓氬洤鏋熼柟鐟版喘閻涱噣宕橀妸褎娈濋梺閫涚祷濞呮洟鎮楁繝姘棅妞ゆ劑鍨烘径鍕繆椤愩垻绠伴摶鐐烘煟閹邦厾銈撮柡鈧禒瀣厽闁归偊鍨伴惃娲煙閻ｅ苯鈻堥柟閿嬪灦濞煎繘鍩￠崘顏庣床闂備胶顭堥張顒傜矙閹寸姷绠旈柟鐑樻尪娴滄粓鏌熼崜褍浠洪柛瀣ㄥ灮閳ь剝顫夊ú婊堝窗閺嶎厹鈧線寮崼婵嗚€垮┑鐐村灦閸╁啴宕戦幘缁樻優闁革富鍘鹃敍婵嬫⒑缁嬫寧婀伴柤褰掔畺閸┾偓妞ゆ帒瀚峰Λ鎴犵磼椤旇偐澧涢柟宄版噽閹即鍨鹃崗鍛棜婵犳鍠楅敃銏犖涚捄銊ㄥС濠电姵纰嶉悡鍐偣閸ャ劎鍙€闁告瑥瀚埞鎴︻敊閻熼澹曢梻鍌欑窔濞佳囨偋閸℃稑绠犻柟鏉垮彄閸ヮ剙惟闁冲搫鍊甸幏娲⒑閸涘﹦鈽夐柨鏇畵閸╁﹪寮撮悢铏诡啎闂佺绻楅崑鎰板箠閸モ斁鍋撶憴鍕缂佽鐗婃穱濠囨倻閽樺鍘搁梺绋挎湰缁矂鐛Δ浣虹瘈缁剧増蓱椤﹪鏌涢妸銈呭祮闁诡喗锚閳规垹鈧綆鍋勬禍妤呮⒑鐟欏嫬顥嬪褎顨婇幃锟犲礃椤忓懎鏋戝┑鐘诧工閻楀棛绮堥崒娑氱闁瑰鍎戞笟娑欑箾閹炬剚鐓奸柡宀€鍠栭幃婊兾熼悜鈺傚闂佽瀛╅懝楣冣€﹂悜钘夎摕闁挎繂顦猾宥夋煕鐏炴崘澹樺ù鐘愁焽缁辨挻鎷呴幓鎺嶅闂備礁鎲″ú锕傚垂闁秵鍋傞柡鍥ュ灪閻撳啴鏌﹀Ο渚Ч妞ゃ儲绮嶉〃銉╂倷閹碱厾鍔风紓浣介哺鐢繝宕洪埀顒併亜閹烘垵顏╃紒鈧€ｎ偁浜滈柟閭﹀枛閺嬫垶銇勯銏⑿ф慨濠呮閹叉挳宕熼銏犘戠紓浣稿⒔閾忓酣宕㈡總鍛婂仱妞ゆ挾鍋愰弨?URL 闂傚倸鍊搁崐鎼佸磹閻戣姤鍤勯柛顐ｆ磵閳ь剨绠撳畷濂稿閳ュ啿绨ラ梻浣稿閸嬩線宕曟潏鈺冪焼濠㈣埖鍔栭悡娆撳级閸繂鈷旈柣锝変憾濮婂宕掗妶鍛画缂備胶绮粙鎴︻敊韫囨侗鏁婇柤濮愬€楀▔鍧楁⒒娴ｅ憡鍟為柣鐔村劦閺佸啴顢旈崼婵婃憰闂佹寧绻傞幉姗€鎮㈤悡搴＄€銈嗘⒒閸嬫捇顢氬Δ浣虹瘈闁汇垽娼ф禒婊堟煟濡も偓閿曨亪鐛崘顔肩＜闁绘劘灏幗鏇㈡⒑闂堟侗鐒鹃柛搴枛鍗遍柛顐ゅ枑閸欏繑淇婇妶鍌氫壕濠碘槅鍋呴悷銊╁磹閹绢喗鈷?
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

    if (/^\d+$/.test(decoded)) {
      const id = Number(decoded);
      if (Number.isFinite(id) && id > 0) {
        return buildSpaceDocId({ kind: "independent", docId: id });
      }
    }

    const parsed = parseSpaceDocId(decoded);
    if (parsed?.kind === "independent") {
      return null;
    }

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
        toast.error("闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敃鈧懜褰掓煛鐏炶鍔氱紒鈧€ｎ偁浜滈柟鐑樺灥閳ь剛鏁诲畷鎴﹀箻濞茬粯鏅╅梺鐟扮摠鐢偟绮诲顑芥斀閹烘娊宕愰弴銏╂晞闁搞儮鏅濋惌鎾淬亜閺囨浜鹃梺鍝勭灱閸犳牠骞愭繝鍐ㄧ窞闁割偅绻€閸掓帗淇婇妶鍥ラ柛瀣仧閺侇噣鍩勯崘褏绠氶梺缁樺灱濡嫬鏁梻渚€娼чˇ顓㈠磿閺屻儺鏁囬柣鎾崇岸閺€浠嬫煟濮楀棗鏋涢柣蹇ｄ邯閺屾稒鎯旈垾铏€梺闈涙处濡啴鐛弽銊﹀闁告縿鍎查悡锝夋⒒娓氣偓濞佳囁囬锕€鐤炬繝濠傜墕閻ょ偓銇勯幒鎴濃偓鐢稿磻閹捐绀傚璺猴梗婢规洟姊绘担鍛婂暈闁告梹鐗犲畷鏇㈠礃濞村鐏侀梺鍛婄懃椤﹁京绮绘ィ鍐ㄧ骇闁割偅绻傞埛鏃傜磼婢舵ê澧紒缁樼⊕瀵板嫮鈧綆鍋嗛ˇ浼存倵濞堝灝娅橀柛瀣攻娣囧﹪宕奸弴鐐靛€為梺鍐叉惈閸嬪﹦妲愰埄鍐х箚闁绘劦浜滈埀顒佺墵閹兾旈崘顏嗙厯闂佸湱鍎ら崹鐔煎几閺冨牊鐓曟い鎰剁稻缁€鍐煕婵犲倻浠涚紒缁樼洴楠炲鎮欓崹顐㈡婵犵數鍋涢悧濠勫垝閹捐钃熼柣鏂垮悑鐎电姴顭跨捄铏瑰濞寸媭鍠栬灃?);
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
  const rooms = useMemo(() => userRoomQuery.data?.data?.rooms ?? [], [userRoomQuery.data?.data?.rooms]);
  const userSpacesQuery = useGetUserActiveSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  const activeSpaceInfoQuery = useGetSpaceInfoQuery(activeSpaceId ?? -1);
  const activeSpaceInfo = useMemo(() => activeSpaceInfoQuery.data?.data, [activeSpaceInfoQuery.data?.data]);

  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;

  const [spaceOrderByUser, setSpaceOrderByUser] = useLocalStorage<Record<string, number[]>>("spaceOrderByUser", {});
  // key: userId -> spaceId -> roomIds
  const [roomOrderByUserAndSpace, setRoomOrderByUserAndSpace] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "roomOrderByUserAndSpace",
    {},
  );
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

    return "闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偞鐗犻、鏇㈡晝閳ь剛澹曢崷顓犵＜閻庯綆鍋撶槐鈺傜箾瀹割喕绨奸柡鍛箞閺屾稓浠︾紒銏犳?;
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
    const title = (titleOverride ?? "闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敃鈧壕鍦磽娴ｈ偂鎴濃枍閻樺厖绻嗛柕鍫濇噺閸ｅ綊鏌涢幋鐘测枅闁哄本鐩獮鍥偨闂堟稑寮楁繝?).trim() || "闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敃鈧壕鍦磽娴ｈ偂鎴濃枍閻樺厖绻嗛柕鍫濇噺閸ｅ綊鏌涢幋鐘测枅闁哄本鐩獮鍥偨闂堟稑寮楁繝?;
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
      toast.error("闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫宥夊礋椤掍焦顔囨繝寰锋澘鈧洟宕导瀛樺剹婵炲棙鎸婚悡娆撴倵閻㈡鐒鹃崯鍝ョ磼閹冪稏缂侇喗鐟╁濠氭偄閻撳海顔夐梺閫涘嵆濞佳冣枔椤撶偐鏀介柍钘夋娴滄繈鏌ㄩ弴妯虹伈鐎殿喛顕ч埥澶愬閻樻牓鍔戦弻銊モ攽閸℃ê娅ｉ柟顖滃枛濮婄粯绗熼埀顒勫焵椤掑倸浠滈柤娲诲灡閺呭爼顢氶埀顒勫蓟濞戞瑧绡€闁告洦鍓欏▓灞筋渻閵堝棙纾搁柛搴ㄦ涧閻ｇ兘鎮㈢喊杈ㄦ櫌婵炶揪缍€濞咃綀鍊存繝纰夌磿閸嬫垿宕愰弽顓炵闁硅揪绠戠壕?);
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

    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, [isPrivateChatMode, rooms, setActiveRoomId, setActiveSpaceId, storedIds.roomId, storedIds.spaceId]);

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

  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
  const [isCreateInCategoryOpen, setIsCreateInCategoryOpen] = useSearchParamsState<boolean>("createInCategoryPop", false);

  const [pendingCreateInCategoryId, setPendingCreateInCategoryId] = useState<string | null>(null);
  const [createInCategoryMode, setCreateInCategoryMode] = useState<"room" | "doc">("room");
  const [createDocTitle, setCreateDocTitle] = useState("闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敃鈧壕鍦磽娴ｈ偂鎴濃枍閻樺厖绻嗛柕鍫濇噺閸ｅ綊鏌涢幋鐘测枅闁哄本鐩獮鍥偨闂堟稑寮楁繝?);
  const openCreateInCategory = useCallback((categoryId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setPendingCreateInCategoryId(categoryId);
    setCreateInCategoryMode(getDefaultCreateInCategoryMode({ categoryId, isKPInSpace }));
    setCreateDocTitle("闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敃鈧壕鍦磽娴ｈ偂鎴濃枍閻樺厖绻嗛柕鍫濇噺閸ｅ綊鏌涢幋鐘测枅闁哄本鐩獮鍥偨闂堟稑寮楁繝?);
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
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
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

  const privateMessageList = usePrivateMessageList({ globalContext, userId });
  const { unreadMessageNumbers: privateUnreadMessageNumbers } = useUnreadCount({
    realTimeContacts: privateMessageList.realTimeContacts,
    sortedRealTimeMessages: privateMessageList.sortedRealTimeMessages,
    userId,
    urlRoomId: isPrivateChatMode ? urlRoomId : undefined,
  });
  const privateTotalUnreadMessages = useMemo(() => {
    return privateMessageList.realTimeContacts.reduce((sum, contactId) => {
      if (isPrivateChatMode && activeRoomId === contactId) {
        return sum;
      }
      return sum + (privateUnreadMessageNumbers[contactId] ?? 0);
    }, 0);
  }, [activeRoomId, isPrivateChatMode, privateMessageList.realTimeContacts, privateUnreadMessageNumbers]);

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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: number } | null>(null);
  const [spaceContextMenu, setSpaceContextMenu] = useState<{ x: number; y: number; spaceId: number } | null>(null);

  function closeContextMenu() {
    setContextMenu(null);
  }

  function closeSpaceContextMenu() {
    setSpaceContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const messageElement = target.closest("[data-room-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: Number(messageElement?.getAttribute("data-room-id")) });
  }

  function handleSpaceContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const spaceElement = target.closest("[data-space-id]");
    const rawSpaceId = spaceElement?.getAttribute("data-space-id");
    if (!rawSpaceId)
      return;
    setSpaceContextMenu({ x: e.clientX, y: e.clientY, spaceId: Number(rawSpaceId) });
  }

  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [contextMenu]); // 濠电姷鏁告慨鐑藉极閹间礁纾婚柣鎰惈缁犱即鏌ゆ慨鎰偓鏇㈠几閸懇鍋撻獮鍨姎婵炶绠戦悾鐑藉蓟閵夛妇鍘遍梺鏂ユ櫅閸熶即骞婇崨瀛樼厽妞ゆ挾鍎愬Ο鈧梺鍝勬湰閻╊垶宕洪崟顖氱闁告挆鍐ㄐㄥ┑锛勫亼閸婃劙寮查悙鍏哥剨婵炲棙鎸搁悞鍨亜閹哄棗浜惧┑鐘亾闂侇剙绉埀顒婄畵瀹曞ジ濡烽妷褍鎽嬬紓鍌欑閺堫剝鐏抏xtMenu闂傚倸鍊搁崐鎼佸磹閻戣姤鍤勯柛鎾茬閸ㄦ繃銇勯弽顐汗闁逞屽墾缁犳挸鐣锋總绋课ㄩ柕澶涢檮琚ｉ梻鍌欑閹碱偆绮欐笟鈧畷銏＄附閸涘﹤鈧?

  useEffect(() => {
    if (spaceContextMenu) {
      window.addEventListener("click", closeSpaceContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeSpaceContextMenu);
    };
  }, [spaceContextMenu]);

  const websocketUtils = useGlobalContext().websocketUtils;
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
  useEffect(() => {
    const originalTitle = document.title.replace(/^\d+闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曚綅閸ヮ剦鏁冮柨鏇楀亾缂佲偓閸喓绡€闂傚牊渚楅崕蹇涙煢閸愵亜鏋庨柍瑙勫灴閹晠骞撻幒鍡椾壕闂傚牊鍏氶敐澶婇唶闁靛濡囬崢鍗烆渻閵堝棗濮傞柛濠冩礋瀵顓奸崶鈺冿紲?/, ""); // 濠电姷鏁告慨鐑藉极閹间礁纾婚柣鎰惈缁犱即鏌熼梻瀵割槮缂佺姷濮垫穱濠囶敍濠靛嫧鍋撻埀顒勬煛鐎ｎ亞效妤犵偞鐗滈崚鎺旀喆閸曞灚缍夐梻浣告憸閸犲酣骞婂鈧璇测槈濡攱鐎婚棅顐㈡祫缁茬偓鏅ョ紓鍌氬€烽懗鑸垫叏閻㈠灚鏆滈柨鐔哄Т閽冪喐绻涢幋娆忕仼缂佺姾宕甸埀顒冾潐濞叉牕鈻旈敃鍌毼ч柛銉㈡櫇閿?
    if (totalUnreadMessages > 0) {
      document.title = `${totalUnreadMessages}闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曚綅閸ヮ剦鏁冮柨鏇楀亾缂佲偓閸喓绡€闂傚牊渚楅崕蹇涙煢閸愵亜鏋庨柍瑙勫灴閹晠骞撻幒鍡椾壕闂傚牊鍏氶敐澶婇唶闁靛濡囬崢鍗烆渻閵堝棗濮傞柛濠冩礋瀵顓奸崶鈺冿紲?${originalTitle}`;
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

  const addRoomMemberMutation = useAddRoomMemberMutation();
  const addSpaceMemberMutation = useAddSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();

  const handleInvitePlayer = (roomId: number) => {
    setInviteRoomId(roomId);
  };

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
  const leftDrawerToggleLabel = isOpenLeftDrawer ? "闂傚倸鍊搁崐宄懊归崶顒€违闁逞屽墴閺屾稓鈧綆鍋呭畷宀勬煛瀹€鈧崰鏍€佸☉姗嗙叆闁告劗鍋撳В澶愭煟鎼淬値娼愭繛鍙夌墵瀹曨垶宕稿Δ鈧繚闂佸湱鍎ら崺鍫濐焽閳哄懏鐓冪憸婊堝礈閻旈鏆﹂柛妤冨亹閺嬪酣鏌熺€涙绠為柣娑橀叄濮? : "闂傚倸鍊峰ù鍥敋瑜忛幑銏ゅ箳濡も偓绾惧鏌ｉ幇顖ｆ⒖婵炲樊浜滈崘鈧銈嗗姧缂嶅棗顭囬悢鍏尖拺闁荤喖鍋婇崵鐔兼煕鐎ｎ剙鏋涢柟顔惧厴瀹曠兘顢橀悢閿嬬€鹃梻浣烘嚀椤曨厽鎱ㄩ悜钘夌婵鍩栭悡鐔兼煛閸愩劌鈧摜鏁崼鏇熺厱闁硅埇鍔屾禍?;
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
                      
                      
                      {sidePanelContent}
                    </div>
                    <div
                      id="chat-sidebar-user-card"
                      className="absolute left-2 right-2 bottom-2 z-20 pointer-events-auto"
                    />
                  </div>
                </OpenAbleDrawer>
                
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
                
                <div className="flex flex-row flex-1 h-full min-w-0 overflow-visible bg-base-200 rounded-tl-xl">
                  <div className="flex flex-col bg-base-200 h-full relative">
                    <div className="flex flex-row flex-1 min-h-0">
                      
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

                <ChatPageModals
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
