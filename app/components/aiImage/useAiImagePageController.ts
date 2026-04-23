// AI 闂傚倸鍊搁崐鐑芥倿閿曞倹鍎戠憸鐗堝笒閸ㄥ倸鈹戦悩瀹犲缂佹劖顨婇獮鏍垝閻熸壆鍘梺鑽ゅ枑鐎氬牓鎮㈠▽绉嗗洤鐐婇柨鏂垮⒔濞夊潡姊婚崒娆戝妽闁活亜缍婂畷纭呫亹閹烘垹鐤呴梺鐐藉劜閸撴艾霉閺嶎厽鐓忓┑鐐靛亾濞呭棝鏌ｉ幘鍗炲姕缂佺粯鐩獮瀣倷閸偄娅欏┑鐘灱椤鎽梺闈涙搐鐎氭澘顕ｉ幘顔嘉╅柕澶涘娴滆埖淇?NovelAI Image 闂傚倸鍊搁崐鐑芥倿閿曞倹鍎戠憸鐗堝笒缁€澶屸偓鍏夊亾闁逞屽墴閸┾偓妞ゆ帊绀侀崵顒勬煕濞嗗繐鏆ｅ┑鈥崇摠缁楃喖鍩€椤掑嫮宓侀悗锝庡枟閺呮粎绱掑☉姗嗗剱妞ゃ儱鐗撳缁樼瑹閳ь剙顭囪閹广垽宕奸妷銉︽К闂佸憡娲﹂崜娆擃敋闁秵鐓曠€光偓閳ь剟宕戦悙鍝勭；闁靛璐熸禍婊堟煛瀹ュ啫濮€濠㈣锕㈤弻锟犲幢濡吋鍣伴梺鍝勭焿缂嶄線銆侀弬娆惧悑闁告侗鍙庡鐣岀磽閸屾瑧顦︽い鎴濇嚇钘濆ù鍏兼綑缁犳岸鏌￠崒姘辨皑闁衡偓娴犲鐓曢柕澶嬪灥鐎氼參寮冲Ο鑽ょ瘈闁汇垽娼ф禒婊堟煟鎺抽崝搴ㄥ礆閹烘埈鍚嬮柛銉ｅ妽濞堟澘顪冮妶鍛婵☆偅鐟╅敐鐐哄即閵忕姷楠囬梺鍓插亽閸嬪嫭绂嶉弽顬＄懓顭ㄩ崘顏喰ㄩ梺鍝勭灱閸犳牠鐛崱姘兼Щ闂佸搫妫滄ご鎼佸Φ閸曨垰围闁告侗鍠栧▍锝夋煠閹稿骸濮嶉柡灞剧洴婵＄兘鏁愰崨顓х€风紓鍌欒兌婵敻鏁冮姀銈呰摕闁跨喓濮撮獮銏ょ叓閸ャ劍灏瑙勬礋濮婂宕掑▎鎺戝帯濡炪値鍘奸悧蹇涘箲閵忋倕绠涙い鏂垮⒔閻撳姊虹紒妯虹伇婵☆偄瀚板畷褰掑磼閻愬鍘遍悗鍏夊亾闁逞屽墴瀹曟垵鈽夊顓炲幑闂侀€炲苯澧存慨濠冩そ瀹曨偊宕熼鈧粣娑㈡⒑缁嬫鍎戦柛鐘崇墵楠?txt2img闂傚倸鍊搁崐鐑芥倿閿旈敮鍋撶粭娑樻噽閻瑩鏌熸潏楣冩闁搞倖鍔栭妵鍕冀椤愵澀娌梺鎼炲€栭崝娆撳蓟閿濆妫樻繛鍡欏亾閻ゅ洭姊洪幖鐐测偓鏍洪悢鐓庤摕鐎广儱鐗滃銊╂⒑閸涘﹥灏甸柛鐘查叄椤㈡岸鏁愭径濞⑩晠鏌ㄩ弬鎸庢儓濞存粍绻堝娲川婵犲倸顫庨梺绋款儐閹告悂鍩㈤幘璇参╅柍鍝勫€婚崢浠嬫⒑缂佹ɑ鐓ラ柟鑺ョ矒楠炲﹪宕橀鐣屽幗濠德板€愰崑鎾翠繆椤愶絿鈯曠紒?Inpaint闂?
import type { DragEvent, MouseEvent } from "react";

import { zipSync } from "fflate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import type {
  ActivePreviewAction,
  DirectorToolId,
  GeneratedImageItem,
  HistoryRowClickMode,
  ImageImportSource,
  ImportedSourceImagePayload,
  InpaintDialogSource,
  InpaintSubmitPayload,
  InternalHistoryImageDragPayload,
  MetadataImportSelectionState,
  NovelAiEmotion,
  PendingMetadataImportState,
  PreciseReferenceRow,
  ProFeatureSectionKey,
  ResolutionSelection,
  UiMode,
  V4CharGender,
  V4CharEditorRow,
  VibeTransferReferenceRow,
} from "@/components/aiImage/types";
import type {
  AiImageHistoryMode,
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";
import type {
  NovelAiImageMetadataResult,
  NovelAiImportedSettings,
} from "@/utils/novelaiImageMetadata";
import type { NovelAiNl2TagsResult } from "@/utils/novelaiNl2Tags";

import {
  augmentNovelImageViaProxy,
  generateNovelImageViaProxy,
} from "@/components/aiImage/api";
import {
  CUSTOM_RESOLUTION_ID,
  DEFAULT_DIRECTOR_TOOL_ID,
  DEFAULT_PRO_FEATURE_SECTION_OPEN,
  DEFAULT_PRO_IMAGE_SETTINGS,
  DEFAULT_SIMPLE_IMAGE_SETTINGS,
  DIRECTOR_TOOL_OPTIONS_BY_ID,
  INTERNAL_HISTORY_IMAGE_DRAG_MIME,
  MODEL_DESCRIPTIONS,
  NOISE_SCHEDULES_NAI4,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  NOVELAI_FREE_MAX_IMAGE_AREA,
  NOVELAI_FREE_MAX_STEPS,
  PREVIEW_ACTION_LABELS,
  RESOLUTION_PRESETS,
  SAMPLERS_NAI4,
  STORAGE_UI_MODE_KEY,
  isDirectorToolDisabled,
} from "@/components/aiImage/constants";
import {
  base64DataUrl,
  base64ToBytes,
  buildDirectorToolHistoryRow,
  buildImportedSourceImagePayloadFromDataUrl,
  bytesToBase64,
  clamp01,
  clampIntRange,
  clampRange,
  cleanImportedPromptText,
  createMetadataImportSelection,
  createProFeatureSectionState,
  dataUrlToBase64,
  extensionFromDataUrl,
  extractImageFilesFromTransfer,
  extractInternalHistoryImageDragPayload,
  fileFromDataUrl,
  fitNovelAiImageSizeWithinAreaLimit,
  formatDirectorEmotionLabel,
  generatedItemKey,
  getClosestValidImageSize,
  getNovelAiImageArea,
  getNovelAiFreeGenerationViolation,
  getNovelAiFreeOnlyMessage,
  hasFileDrag,
  hasInternalHistoryImageDrag,
  hasMetadataSettingsPayload,
  hasNonEmptyText,
  historyImageDragFileName,
  historyRowKey,
  historyRowResultMatchKey,
  historyRowToGeneratedItem,
  getNextAvailableV4CharGridCell,
  makeStableId,
  mergeTagString,
  mimeFromDataUrl,
  mimeFromFilename,
  newV4CharEditorRow,
  normalizeV4CharGridRows,
  normalizeReferenceStrengthRows,
  readFileAsBytes,
  readImagePixels,
  readImageSize,
  readLocalStorageString,
  resolveFixedImageModel,
  resolveInpaintModel,
  resolveImportedValue,
  resolveSimpleGenerateMode,
  sanitizeNovelAiTagInput,
  shouldKeepSimpleTagsEditor,
  triggerBlobDownload,
  triggerBrowserDownload,
  writeLocalStorageString,
} from "@/components/aiImage/helpers";
import {
  buildInpaintDialogProps,
  buildMetadataImportDialogProps,
  buildPreviewImageDialogProps,
  buildSidebarProps,
  buildStylePickerDialogProps,
  buildWorkspaceProps,
} from "@/components/aiImage/controller/buildViewModels";
import {
  buildGenerateContext,
  buildHistoryRowsFromGenerateResult,
  buildOpenInpaintState,
  finalizeGenerateResult,
  resolveFocusedGenerateContext,
  validateGenerateContext,
} from "@/components/aiImage/controller/generateActions";
import {
  importSourceFileAction,
  importSourceImageBytesAction,
} from "@/components/aiImage/controller/importActions";
import {
  buildBaseImageInpaintStateAction,
  saveInpaintMaskAction,
} from "@/components/aiImage/controller/inpaintActions";
import {
  historyImageDragStartAction,
  pageImageDragEnterAction,
  pageImageDragLeaveAction,
  pageImageDragOverAction,
  pageImageDropAction,
  pasteSourceImageAction,
  pickSourceHistoryImageAction,
} from "@/components/aiImage/controller/dndActions";
import {
  applyHistorySettingsAction,
  applyImportedMetadataAction,
} from "@/components/aiImage/controller/metadataHistoryActions";
import {
  applyPinnedPreviewSeedAction,
  applySelectedPreviewSeedAction,
  clearPinnedPreviewAction,
  downloadCurrentAction,
  openPreviewImageAction,
  selectPinnedPreviewAction,
  togglePinnedPreviewAction,
} from "@/components/aiImage/controller/previewActions";
import {
  buildDirectorSourceItemAction,
  pickDirectorSourceHistoryImageAction,
  pickDirectorSourceImagesAction,
  runDirectorToolAction,
} from "@/components/aiImage/controller/directorActions";
import { useAiImageDimensionsState } from "@/components/aiImage/controller/useAiImageDimensionsState";
import { useAiImagePreviewState } from "@/components/aiImage/controller/useAiImagePreviewState";
import { useAiImageStyleState } from "@/components/aiImage/controller/useAiImageStyleState";
import {
  addAiImageHistoryBatch,
  clearAiImageHistory,
  deleteAiImageHistory,
  listAiImageHistory,
} from "@/utils/aiImageHistoryDb";
import {
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
} from "@/utils/novelaiImageMetadata";
import { convertNaturalLanguageToNovelAiTags } from "@/utils/novelaiNl2Tags";
import { compositeFocusedInpaintResult, prepareFocusedInpaintPayload } from "@/components/aiImage/inpaintFocusUtils";
import { buildRoundedRectMaskGrid, buildSolidInpaintMaskGrid, erodeMaskGrid, findMaskGridBounds, renderMaskGridToRgba } from "@/components/aiImage/inpaintMaskUtils";

const DEFAULT_METADATA_IMPORT_SELECTION: MetadataImportSelectionState = {
  prompt: true,
  undesiredContent: true,
  characters: true,
  appendCharacters: false,
  settings: true,
  seed: true,
  cleanImports: false,
};

const DEFAULT_INPAINT_PROMPT = "very aesthetic, masterpiece, no text";
const DEFAULT_INPAINT_NEGATIVE_PROMPT = "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";
const DEFAULT_INPAINT_STRENGTH = 1;
const DEFAULT_INPAINT_NOISE = 0;

export function useAiImagePageController() {
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const vibeReferenceInputRef = useRef<HTMLInputElement | null>(null);
  const preciseReferenceInputRef = useRef<HTMLInputElement | null>(null);

  const [uiMode, setUiMode] = useState<UiMode>(() => {
    const stored = readLocalStorageString(STORAGE_UI_MODE_KEY, "simple").trim();
    return stored === "pro" ? "pro" : "simple";
  });
  useEffect(() => {
    writeLocalStorageString(STORAGE_UI_MODE_KEY, uiMode);
  }, [uiMode]);

  const [simpleInfillPrompt, setSimpleInfillPrompt] = useState(DEFAULT_INPAINT_PROMPT);
  const [simpleInfillNegativePrompt, setSimpleInfillNegativePrompt] = useState(DEFAULT_INPAINT_NEGATIVE_PROMPT);
  const [proInfillPrompt, setProInfillPrompt] = useState(DEFAULT_INPAINT_PROMPT);
  const [proInfillNegativePrompt, setProInfillNegativePrompt] = useState(DEFAULT_INPAINT_NEGATIVE_PROMPT);

  const [simpleText, setSimpleText] = useState("");
  const [simpleConvertedFromText, setSimpleConvertedFromText] = useState("");
  const [simpleConverted, setSimpleConverted] = useState<NovelAiNl2TagsResult | null>(null);
  const [simplePrompt, setSimplePrompt] = useState("");
  const [simpleNegativePrompt, setSimpleNegativePrompt] = useState("");
  const [simpleEditorMode, setSimpleEditorMode] = useState<"text" | "tags">("text");
  const [simplePromptTab, setSimplePromptTab] = useState<"prompt" | "negative">("prompt");
  const [simpleConverting, setSimpleConverting] = useState<boolean>(false);
  const [isPageImageDragOver, setIsPageImageDragOver] = useState<boolean>(false);
  const [proPromptTab, setProPromptTab] = useState<"prompt" | "negative">("prompt");
  const [charPromptTabs, setCharPromptTabs] = useState<Record<string, "prompt" | "negative">>({});

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  const [v4UseCoords, setV4UseCoords] = useState<boolean>(false);
  const [v4UseOrder, setV4UseOrder] = useState<boolean>(true);
  const [v4Chars, setV4Chars] = useState<V4CharEditorRow[]>([]);
  const [vibeTransferReferences, setVibeTransferReferences] = useState<VibeTransferReferenceRow[]>([]);
  const [preciseReference, setPreciseReference] = useState<PreciseReferenceRow | null>(null);
  // 闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩鍐蹭画闂侀潧顦弲娑氬閻熸噴褰掓偐瀹割喖鍓伴梺?NovelAI 闂傚倸鍊搁崐鐑芥倿閿曞倹鍎戠憸鐗堝笒缁€澶屸偓鍏夊亾闁逞屽墴閸┾偓妞ゆ帊绀侀崵顒€霉濠婂懎浠ч柛鎺撳浮椤㈡﹢濮€閻樻鍟嬮梺璇叉捣閺佸摜娑甸崼鏇炲嚑闁哄诞鈧弨鑺ャ亜閺冣偓閺嬬粯绗熷☉銏＄厱闁哄啫鐗婇弫閬嶆煙瀹勭増鍤囩€规洘绮撻獮鎾诲箳閹垮啫鎮梻鍌氬€搁…顒勫磻閸曨個娲Χ閸ワ絽浜炬繛鎴炲笚濞呭﹦鈧娲﹂崜姘嚗閸曨剛绠鹃柟鐑樻⒐閸も偓濡炪値鍘归崝鎴濈暦閻旂⒈鏁冮柨鏇楀亾婵炲牊绻勭槐鎾诲磼濞嗘埈妲悷婊勬緲椤﹂潧鐣烽敓鐘茬闁伙絽鑻粊锕傛煙閸忚偐鏆橀柛銊ㄥ吹瀵囧焵椤掑嫭鈷戦柟鑲╁仜閸旀鏌￠崨顔炬创闁瑰嘲绻掗埀顒婄秵閸撴稓澹曢挊澹濆綊鏁愰崨顔藉創闂佺粯绻愮换婵嬪蓟濞戙垹绠涢柛蹇撴憸閺佹牠姊虹€圭媭娼愰柣鈺婂灠椤繘宕崝鍊熸缁辨帒螣鐞涒剝鐎奸梻鍌欑閹诧繝寮婚妸褎宕叉俊顖濇閺嗭附淇婇妶鍌氫壕濡炪値鍋呯划鎾诲春閳ь剚銇勯幒鍡椾壕闂佷紮绲介崲鏌ュ煘閹达箑骞㈤煫鍥ㄦ濞兼梹绻濋悽闈涗粶婵☆偅顨呴湁婵娉涢悞鍨亜閹哄秶鍔嶇紒鈧€ｎ喗鐓涚€光偓閳ь剟宕伴幘璇茬劦妞ゆ帊鑳堕埊鏇㈡煥濮橆兘鏀芥い鏂垮悑瀹告繈鏌熼崣澶嬪€愰柟顔ㄥ洤閱囬柕蹇曞Т缂佲晜淇婇妶鍥ラ柛瀣⊕椤ㄣ儱顫㈠畝鈧禍浠嬫⒒娴ｅ憡鍟炵紒璇插€婚埀顒佸嚬閸犳氨鍒掗弮鍫濈畾鐟滃寮ㄦ禒瀣厓闁芥ê顦伴ˉ婊堟煟韫囨梻鎳囬柡灞界Х椤т線鏌涢幘瀵哥畵闁宠绉瑰鎾閻樼绱遍梻渚€娼чˇ顐﹀疾濠婂牊鍋傞柕澶涘缁犻箖鏌熺€电鍓遍柣鎺楃畺閹顫濋銏犵ギ闂佸搫鏈惄顖炲极閹版澘閱囬柣鏇氭閸濇鈹戦悙鑼憼缂侇喖绉归獮鍐磼閻愰潧绁﹂柣搴秵閸犳寮插鍫熺厾闁诡厽甯掗崝銈嗕繆瀹割喕閭慨濠冩そ閹筹繝濡堕崨顒佸媰缂傚倷绀侀鍛崲濡櫣鏆︽繝闈涚墔濞岊亪鏌ｉ敐鍛拱婵炲牓绠栧铏圭磼濡儵鎷婚梺鍛婎焼閸ャ劉鎷诲銈嗙墬缁嬪繑绂嶅鍫㈠彄闁搞儯鍔嶇亸闈涱熆瑜嬮崹浠嬪蓟濞戞ǚ鏋庨柟鎯у閺嗩偊姊洪崫鍕潶闁告柨鐭傞崺銉﹀緞婵炪垻鍠栧畷褰掝敋閸涱剛纾鹃梻鍌氬€峰ù鍥ㄧ珶閸繄鏆﹂柣銏㈩焾缁愭鏌″畵顔兼噺濞堥箖姊虹紒妯虹伇婵☆偄瀚崕顐︽⒒娓氣偓濞佳囁囨禒瀣獥闁哄诞鈧弸鏂库攽閸屾碍鍟為柍?闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曢敃鈧壕褰掓煟閻旂厧浜伴柣鏂挎閹便劌顪冪拠韫闁荤姳璀﹂崹鍫曞蓟濞戙垹绠涢梻鍫熺⊕閻忓牏绱撴担鎻掍壕闂佸憡鍔﹂崰妤呮偂閺囩喓绠鹃柟瀛樼箓閼稿湱鈧鍣ｇ粻鏍蓟濞戙垺鍋勯梺鍨儏閺嬬娀姊洪崫鍕効缂佺粯绻傞悾宄邦潨閳ь剟宕洪埄鍐╁缂佸鏅濋敃鍌涒拻濞达綀顫夐崑鐘绘煕婵犲啰澧遍柛鎺撳浮楠炴ê鐣烽崶銊︻啎婵犵數濞€濞佳囶敄閸涱喖鍔旈梻鍌欑窔濞佳囨晬韫囨稑绀嬫い鎾跺椤掑嫭鈷戦悹鍥ㄥ絻椤掋垺銇勯弮鈧悧鐘茬暦娴兼潙绠虫俊銈傚亾缁炬儳顭烽弻鐔煎礈瑜忕敮娑㈡煕婵犲嫭鏆柡宀嬬秮婵偓闁绘ê鍚€缁敻姊洪幖鐐测偓鎰板磻閹惧墎纾介柛灞剧懇濡剧兘鏌涢弬璺ㄐч柟顕嗙節閸ㄦ儳鐣烽崶銊︻啎闂備胶绮…鍫ヮ敋瑜庣€靛ジ鎮╃紒妯煎幈闂佸搫娲㈤崝灞炬櫠椤旀祹褰掓偐閾忣偄鍞夊┑?
  const [proFeatureSections, setProFeatureSections] = useState<Record<ProFeatureSectionKey, boolean>>(() => createProFeatureSectionState());

  // 闂傚倷娴囧畷鐢稿窗閹邦喖鍨濋幖娣灪濞呯姵淇婇妶鍛櫣缂佺姳鍗抽弻娑樷槈濮楀牊鏁惧┑鐐叉噽婵炩偓闁哄矉绲借灒闁绘挸绨肩紓鎾寸箾鐎涙鐭嬬紒顔芥崌瀵鏁愭径濠庢綂闂佺粯锚閸熷潡寮抽崼婵冩斀闁斥晛鍟ㄦ禒鐘绘煕閺冣偓閸ㄥ灝顕ｇ拠娴嬫闁靛繒濮堥妸鈺傜厪濠㈣埖鐩顕€鏌涙惔銏″磳婵﹦鍎ょ€电厧鈻庨幋鐐蹭还闂備胶顭堥鍡涘箲閸ヮ剛宓侀煫鍥ㄧ☉瀹告繃銇勯弽銊р槈缁剧虎鍨跺娲濞戣京鍙氶梻鍌氬鐎氼剟鍩㈤幘璇差潊闁靛牆妫岄幏娲⒑閸涘﹦鈽夋い顓у墮閳绘捇寮撮悢铏诡啎闂佸憡鐟ラˇ顖炴倶閳哄啰纾兼い鏃囶潐濞呭﹦鈧鍠栭悥濂哥嵁婵犲倻鏆﹂柛銉戝嫮浜梻浣规偠閸斿秹宕曢幎鑺ュ仼闁绘垼妫勯悙濠囨煥濠靛棙鍣稿瑙勬礋濮婅櫣绱掑Ο铏逛紘婵犳鍠撻崐婵嗩嚕閺屻儺鏁嗛柛灞绢殔娴滈箖鏌涜箛鎿冩Ц濞存粓绠栧娲川婵犲啫顦╂繛瀛樼矌閸嬬喎危閹邦剦娼╅柤鍝ヮ暯閹疯櫣绱撴担鍓插創婵炲娲滅划濠氬箥椤斿墽锛滄繝銏ｆ硾閿曪箓宕洪敐澶嬬厵妞ゆ棁妫勯崝銈夋煃鐟欏嫬鐏╅柍褜鍓ㄧ紞鍡樼閻愭亽鈧線宕ㄧ€涙ǚ鎷洪梺鍛婄箓鐎氼厼顔忓┑瀣厱闁绘劘娉涜闂佺懓鍢查幊妯虹暦濠婂牆绠甸柟鐑樻惄閸氭瑩姊婚崒姘肩叕闁稿瀚叅闁挎梻鏅悷瑙勪繆閵堝懏鍣圭紒鐙欏洦鐓曟繝闈涙椤忔挳鏌ｉ弬鎸庮棦闁哄被鍊濆畷顐﹀Ψ閿旇姤鐦庡┑鐘媰鐏炶棄顫梺閫涚┒閸旀垿寮幇鏉垮耿婵°倐鍋撻柟浠嬫涧閳规垿鍩ラ崱妞剧暗缂備浇鍩栧畝鎼佸箖閿熺媭鏁冮柨鏃傜帛閺咃綁姊虹紒妯兼喛闁稿鎸搁湁闁绘挸瀛╂径鍕磼缂佹娲存鐐差儔閹瑧鈧稒锚閸擃喖鈹戦悙鑼憼缂侇喖閰ｅ畷鎴﹀Χ閸滀礁娈ㄥ銈嗗姧缁犳垵娲垮┑鐘灱濞夋盯鏁冮敃鍌ゆ晣婵炲樊浜濋埛鎺懨归敐鍛喐濞寸姰鍨洪妵鍕箣濠靛浂妫﹂梺杞扮劍閹瑰洦淇婇悜鑺ユ櫆闁告挆灞芥櫗婵犵數濮伴崹鐓庘枖濞戙埄鏁勯柛鈩冪懃椤ユ岸鏌ゆ慨鎰偓妤冨閸忕浜滈柡鍐ｅ亾闁稿骸鍟块弳鈺冪磽閸屾瑦绁板鏉戞憸閺侇噣鏁撻悩闈涚ウ濠碘槅鍨伴惃鐑藉磻閹剧粯鍋ㄩ柛娑橈攻閻濇娊姊洪崨濠傜仯缂侇喗鐟ラ～蹇涙惞鐟欏嫬鏋傞梺鍛婃处閸嬫帒螞閸℃稒鈷戦柛婵勫劚鏍￠梺鍦嚀濞差參鐛崘顔芥櫢闁绘娅曞▍銏ゆ⒑缂佹﹩鐒鹃悘蹇旂懇瀹曨偄螖閸涱喒鎷洪梺鍛婄☉閿曘儳浜搁锔界厽闁硅櫣鍋熼悾鍨殽閻愭煡鍙勭€规洜鍠栭、娑樷槈濮橆剙绠洪梻鍌欑窔濞佳団€﹂崼銉ョ？闂侇剙绋侀弫鍌涖亜閹惧崬鐏柣鎾冲暟閹茬顭ㄩ崼婵堫槶濠电偛妫欓幏鏌ュ炊椤掆偓缁犮儲銇勯弮鍌涘殌濞存粎鍋撻幈銊ノ熺粙鍨婵犵鈧啿鎮戦柕鍥у椤㈡洟鎮╅懠顑跨礄濠电姷顣槐鏇㈠礂濮椻偓瀹曟椽鍩勯崘顏嗩啎闂佽鍨庨崒姘兼闂傚倷绀侀幉锟犲礉閿曞倸绐楅柡宥庡墰缁?
  const model = resolveFixedImageModel();
  const isNAI3 = false;
  const isNAI4 = true;

  useEffect(() => {
    if (!v4UseCoords)
      return;
    setV4Chars((prev) => {
      const next = normalizeV4CharGridRows(prev);
      return next === prev ? prev : next;
    });
  }, [v4Chars, v4UseCoords]);

  const toggleProFeatureSection = useCallback((section: ProFeatureSectionKey) => {
    setProFeatureSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const setProFeatureSectionOpen = useCallback((section: ProFeatureSectionKey, open: boolean) => {
    setProFeatureSections((prev) => {
      if (prev[section] === open)
        return prev;
      return { ...prev, [section]: open };
    });
  }, []);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [pendingMetadataImport, setPendingMetadataImport] = useState<PendingMetadataImportState | null>(null);
  const [metadataImportSelection, setMetadataImportSelection] = useState<MetadataImportSelectionState>(DEFAULT_METADATA_IMPORT_SELECTION);
  const [isDirectorToolsOpen, setIsDirectorToolsOpen] = useState<boolean>(false);
  const [isDirectorImageDragOver, setIsDirectorImageDragOver] = useState<boolean>(false);
  const [activeDirectorTool, setActiveDirectorTool] = useState<DirectorToolId>(DEFAULT_DIRECTOR_TOOL_ID);
  const [pendingPreviewAction, setPendingPreviewAction] = useState<ActivePreviewAction>("");
  const [directorSourceItems, setDirectorSourceItems] = useState<GeneratedImageItem[]>([]);
  const [directorSourcePreview, setDirectorSourcePreview] = useState<GeneratedImageItem | null>(null);
  const [directorOutputPreview, setDirectorOutputPreview] = useState<GeneratedImageItem | null>(null);
  const [directorColorizePrompt, setDirectorColorizePrompt] = useState("");
  const [directorColorizeDefry, setDirectorColorizeDefry] = useState<number>(0);
  const [directorEmotion, setDirectorEmotion] = useState<NovelAiEmotion>("neutral");
  const [directorEmotionDefry, setDirectorEmotionDefry] = useState<number>(0);
  const [directorEmotionExtraPrompt, setDirectorEmotionExtraPrompt] = useState("");
  const [inpaintDialogSource, setInpaintDialogSource] = useState<InpaintDialogSource | null>(null);
  const [normalizeReferenceStrengths, setNormalizeReferenceStrengths] = useState<boolean>(false);

  const showSuccessToast = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const {
    isStylePickerOpen,
    setIsStylePickerOpen,
    styleSelectionMode,
    setStyleSelectionMode,
    selectedStyleIds,
    setSelectedStyleIds,
    compareStyleId,
    setCompareStyleId,
    stylePresets,
    compareStylePresets,
    activeStyleIds,
    activeStylePresets,
    activeStyleTags,
    activeStyleNegativeTags,
    handleToggleStyle,
    handleSelectCompareStyle,
    handleClearStyles,
    handleClearActiveStyles,
  } = useAiImageStyleState();
  const {
    samplerOptions,
    noiseScheduleOptions,
    simpleMode,
    proMode,
    mode,
    setModeForUi,
    simpleSourceImageDataUrl,
    simpleSourceImageBase64,
    simpleSourceImageSize,
    proSourceImageDataUrl,
    proSourceImageBase64,
    proSourceImageSize,
    sourceImageDataUrl,
    sourceImageBase64,
    sourceImageSize,
    simpleInfillMaskDataUrl,
    setSimpleInfillMaskDataUrl,
    proInfillMaskDataUrl,
    setProInfillMaskDataUrl,
    infillMaskDataUrl,
    clearInfillMaskForUi,
    width,
    height,
    widthInput,
    heightInput,
    roundedRequestedSize,
    hasCompleteDimensionInputs,
    imageCount,
    steps,
    scale,
    sampler,
    noiseSchedule,
    cfgRescale,
    ucPreset,
    qualityToggle,
    dynamicThresholding,
    smea,
    smeaDyn,
    currentImg2imgStrength,
    currentImg2imgNoise,
    currentInfillStrength,
    currentInfillNoise,
    strength,
    noise,
    seed,
    seedIsRandom,
    imageCountLimit,
    simpleWidth,
    setSimpleWidth,
    simpleHeight,
    setSimpleHeight,
    simpleSeed,
    setSimpleSeed,
    simpleResolutionSelection,
    setSimpleResolutionSelection,
    proWidth,
    setProWidth,
    proHeight,
    setProHeight,
    proResolutionSelection,
    setProResolutionSelection,
    setProImageCount,
    setProSteps,
    setProScale,
    setProSampler,
    setProNoiseSchedule,
    setProCfgRescale,
    setProUcPreset,
    setProSmea,
    setProSmeaDyn,
    setProQualityToggle,
    setProDynamicThresholding,
    setProSeed,
    setSimpleImg2imgStrength,
    setSimpleImg2imgNoise,
    setProImg2imgStrength,
    setProImg2imgNoise,
    setSimpleInfillStrength,
    setSimpleInfillNoise,
    setProInfillStrength,
    setProInfillNoise,
    inferResolutionSelection,
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    applySourceImageForUi,
    resolveInfillMaskBase64ForUi,
    resolveSeparatedInfillMaskBase64ForUi,
    resolveBlendInfillMaskDataUrlForUi,
    restoreSourceImageForUi,
    activeResolutionPreset,
    simpleResolutionArea,
    handleSelectSimpleResolutionPreset,
    handleSelectProResolutionPreset,
    handleSimpleWidthChange,
    handleProWidthChange,
    handleSimpleHeightChange,
    handleProHeightChange,
    handleSwapImageDimensions,
    handleCommitSimpleDimensions,
    handleCommitProDimensions,
    handleCropToClosestValidSize,
    handleResetCurrentImageSettings,
    handleClearSeed,
    setWidth,
    setHeight,
    setImageCount,
    setSteps,
    setScale,
    setSampler,
    setNoiseSchedule,
    setCfgRescale,
    setUcPreset,
    setQualityToggle,
    setDynamicThresholding,
    setSmea,
    setSmeaDyn,
    setStrength,
    setNoise,
    setSeed,
  } = useAiImageDimensionsState({
    uiMode,
    showSuccessToast,
    readImagePixels,
    readImageSize,
  });
  const {
    results,
    setResults,
    selectedResultIndex,
    setSelectedResultIndex,
    selectedHistoryPreviewKey,
    setSelectedHistoryPreviewKey,
    pinnedPreviewKey,
    setPinnedPreviewKey,
    isPreviewImageModalOpen,
    setIsPreviewImageModalOpen,
    history,
    setHistory,
    isHistoryExpanded,
    setIsHistoryExpanded,
    historyRowByKey,
    historyRowByResultMatchKey,
    selectedResult,
    selectedHistoryPreviewRow,
    selectedPreviewResult,
    selectedPreviewHistoryRow,
    selectedPreviewIdentityKey,
    pinnedPreviewResult,
    currentResultCards,
    archivedHistoryRows,
    isSelectedPreviewPinned,
    previewMeta,
    hasCurrentDisplayedImage,
  } = useAiImagePreviewState();
  const directorTool = DIRECTOR_TOOL_OPTIONS_BY_ID[activeDirectorTool];
  const directorInputPreview = directorSourcePreview;

  useEffect(() => {
    if (!selectedPreviewResult && isPreviewImageModalOpen)
      setIsPreviewImageModalOpen(false);
  }, [isPreviewImageModalOpen, selectedPreviewResult]);

  useEffect(() => {
    if (pinnedPreviewKey && !pinnedPreviewResult)
      setPinnedPreviewKey(null);
  }, [pinnedPreviewKey, pinnedPreviewResult]);

  useEffect(() => {
    if (simpleEditorMode !== "tags")
      return;
    if (shouldKeepSimpleTagsEditor({
      mode: simpleMode,
      prompt: simplePrompt,
      negativePrompt: simpleNegativePrompt,
      hasConvertedDraft: Boolean(simpleConverted),
    }))
      return;

    setSimpleConvertedFromText("");
    setSimpleEditorMode("text");
    setSimplePromptTab("prompt");
  }, [simpleConverted, simpleEditorMode, simpleMode, simpleNegativePrompt, simplePrompt]);

  const applyImportedMetadata = useCallback((metadata: NovelAiImageMetadataResult, selection: MetadataImportSelectionState) => {
    applyImportedMetadataAction({
      metadata,
      selection,
      uiMode,
      simpleWidth,
      simpleHeight,
      proWidth,
      proHeight,
      v4Chars,
      samplerOptions,
      noiseScheduleOptions,
      setIsPageImageDragOver,
      setSimpleConverted,
      setSimpleConvertedFromText,
      setSimplePromptTab,
      setSimpleSeed,
      setSimpleWidth,
      setSimpleHeight,
      setSimpleResolutionSelection,
      setUiMode,
      clearSourceImageForUi,
      setVibeTransferReferences,
      setPreciseReference,
      setProFeatureSectionOpen,
      setPrompt,
      setNegativePrompt,
      setProSeed,
      setProWidth,
      setProHeight,
      setProResolutionSelection,
      setProImageCount,
      setProSteps,
      setProScale,
      setProSampler,
      setProNoiseSchedule,
      setProCfgRescale,
      setProUcPreset,
      setProQualityToggle,
      setProDynamicThresholding,
      setProSmea,
      setProSmeaDyn,
      applyModeStrengthAndNoise,
      setV4UseCoords,
      setV4UseOrder,
      setV4Chars,
      setCharPromptTabs,
      inferResolutionSelection,
    });
  }, [
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    inferResolutionSelection,
    noiseScheduleOptions,
    proHeight,
    proWidth,
    samplerOptions,
    simpleHeight,
    simpleWidth,
    uiMode,
    v4Chars,
    setProFeatureSectionOpen,
  ]);

  const refreshHistory = useCallback(async () => {
    const rows = await listAiImageHistory({ limit: 30 });
    setHistory(rows);
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleImportSourceImageBytes = useCallback(async (args: {
    bytes: Uint8Array;
    mime: string;
    name: string;
    source?: ImageImportSource;
    imageCount?: number;
    target?: "img2img";
  }) => {
    await importSourceImageBytesAction({
      bytes: args.bytes,
      mime: args.mime,
      name: args.name,
      source: args.source,
      imageCount: args.imageCount,
      target: args.target,
      uiMode,
      setError,
      setIsPageImageDragOver,
      readImageSize,
      applySourceImageForUi,
      setPendingMetadataImport,
      defaultMetadataImportSelection: DEFAULT_METADATA_IMPORT_SELECTION,
      setMetadataImportSelection,
      extractNovelAiMetadataFromPngBytes,
      extractNovelAiMetadataFromStealthPixels,
      readImagePixels,
    });
  }, [applySourceImageForUi, uiMode]);
  const handlePickSourceImage = useCallback(async (
    file: File,
    options?: { source?: ImageImportSource; imageCount?: number; target?: "img2img" },
  ) => {
    await importSourceFileAction({
      file,
      options,
      importSourceImageBytes: handleImportSourceImageBytes,
    });
  }, [handleImportSourceImageBytes]);

  const buildDirectorSourceItem = useCallback(async (args: { dataUrl: string; name?: string }) => {
    return await buildDirectorSourceItemAction({
      dataUrl: args.dataUrl,
      name: args.name,
      model,
      readImageSize,
    });
  }, [model]);

  const handlePickDirectorSourceImages = useCallback(async (files: FileList | File[]) => {
    await pickDirectorSourceImagesAction({
      files,
      showErrorToast,
      model,
      readImageSize,
      setDirectorSourceItems,
      setDirectorSourcePreview,
      setDirectorOutputPreview,
    });
  }, [model, showErrorToast]);

  const handlePickDirectorSourceHistoryImage = useCallback(async (payload: InternalHistoryImageDragPayload) => {
    await pickDirectorSourceHistoryImageAction({
      payload,
      model,
      readImageSize,
      setDirectorSourceItems,
      setDirectorSourcePreview,
      setDirectorOutputPreview,
    });
  }, [model]);

  const handlePickSourceHistoryImage = useCallback(async (
    payload: InternalHistoryImageDragPayload,
    options?: { source?: ImageImportSource; imageCount?: number },
  ) => {
    await pickSourceHistoryImageAction({
      payload,
      options,
      setIsPageImageDragOver,
      showErrorToast,
      handleImportSourceImageBytes,
    });
  }, [handleImportSourceImageBytes, showErrorToast]);

  const handleHistoryImageDragStart = useCallback((
    event: DragEvent<HTMLElement>,
    payload: { dataUrl: string; seed: number; batchIndex?: number },
  ) => {
    historyImageDragStartAction({
      event: event as unknown as DragEvent,
      payload,
    });
  }, []);

  const handlePageImageDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    pageImageDragEnterAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen]);

  const handlePageImageDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    pageImageDragLeaveAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen]);

  const handlePageImageDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    pageImageDragOverAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      isPageImageDragOver,
      setIsPageImageDragOver,
    });
  }, [isDirectorToolsOpen, isPageImageDragOver]);

  const handlePageImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    void pageImageDropAction({
      event: event as unknown as DragEvent,
      isDirectorToolsOpen,
      setIsPageImageDragOver,
      showErrorToast,
      handlePickSourceHistoryImage,
      handlePickSourceImage,
    });
  }, [handlePickSourceHistoryImage, handlePickSourceImage, isDirectorToolsOpen, showErrorToast]);

  useEffect(() => {
    if (typeof document === "undefined")
      return;

    const onPaste = (event: ClipboardEvent) => {
      void pasteSourceImageAction({
        event,
        handlePickSourceImage,
      });
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePickSourceImage]);

  const handleClearSourceImage = useCallback(() => {
    clearSourceImageForUi(uiMode);
    setIsPageImageDragOver(false);
    if (uiMode === "pro")
      setProFeatureSectionOpen("baseImage", true);
  }, [clearSourceImageForUi, setProFeatureSectionOpen, uiMode]);

  const handleOpenSourceImagePicker = useCallback(() => {
    sourceFileInputRef.current?.click();
  }, []);

  const handleCloseMetadataImportDialog = useCallback(() => {
    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, []);

  const handleImportSourceImageTarget = useCallback((target: "img2img" | "vibe" | "precise") => {
    if (!pendingMetadataImport)
      return;

    if (target === "img2img") {
      applySourceImageForUi(uiMode, pendingMetadataImport.sourceImage, "Base image applied.");
    }

    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, [applySourceImageForUi, pendingMetadataImport, uiMode]);

  const handleConfirmMetadataImport = useCallback(() => {
    const pendingMetadata = pendingMetadataImport?.metadata;
    if (!pendingMetadata)
      return;

    const hasAnySelection = metadataImportSelection.prompt
      || metadataImportSelection.undesiredContent
      || metadataImportSelection.characters
      || metadataImportSelection.settings
      || metadataImportSelection.seed;
    if (!hasAnySelection)
      return;

    applyImportedMetadata(pendingMetadata, metadataImportSelection);
    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
  }, [applyImportedMetadata, metadataImportSelection, pendingMetadataImport]);

  const handlePickVibeReferences = useCallback(async (files: FileList | File[]) => {
    void files;
    showErrorToast(getNovelAiFreeOnlyMessage("Vibe Transfer is disabled."));
    setProFeatureSectionOpen("vibeTransfer", true);
  }, [setProFeatureSectionOpen, showErrorToast]);

  const handlePickPreciseReference = useCallback(async (file: File) => {
    void file;
    showErrorToast(getNovelAiFreeOnlyMessage("Precise Reference is disabled."));
    setProFeatureSectionOpen("preciseReference", true);
  }, [setProFeatureSectionOpen, showErrorToast]);

  const handleClearHistory = useCallback(async () => {
    await clearAiImageHistory();
    setSelectedHistoryPreviewKey(null);
    await refreshHistory();
  }, [refreshHistory]);

  const applySelectedPreviewAsBaseImage = useCallback((showToast = false) => {
    if (!selectedPreviewResult)
      return false;

    const sourceImage = buildImportedSourceImagePayloadFromDataUrl({
      dataUrl: selectedPreviewResult.dataUrl,
      width: selectedPreviewResult.width,
      height: selectedPreviewResult.height,
    });
    if (!sourceImage) {
      showErrorToast("Failed to read preview image as base image.");
      return false;
    }

    applySourceImageForUi(uiMode, sourceImage);
    if (showToast)
      showSuccessToast("Preview applied as base image.");
    return true;
  }, [applySourceImageForUi, selectedPreviewResult, showErrorToast, showSuccessToast, uiMode]);

  const handleUseSelectedResultAsBaseImage = useCallback(() => {
    void applySelectedPreviewAsBaseImage(true);
  }, [applySelectedPreviewAsBaseImage]);

  const handleSelectDirectorSourceItem = useCallback((item: GeneratedImageItem) => {
    setDirectorSourcePreview(item);
    setDirectorOutputPreview(null);
  }, []);

  const handleRemoveDirectorSourceItem = useCallback((item: GeneratedImageItem) => {
    const targetKey = generatedItemKey(item);
    setDirectorSourceItems((prev) => {
      const nextItems = prev.filter(entry => generatedItemKey(entry) !== targetKey);
      setDirectorSourcePreview((prevPreview) => {
        if (!prevPreview || generatedItemKey(prevPreview) !== targetKey)
          return prevPreview;
        return nextItems[0] ?? null;
      });
      return nextItems;
    });
  }, []);

  const handleDirectorImageDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    setIsDirectorImageDragOver(true);
  }, []);

  const handleDirectorImageDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setIsDirectorImageDragOver(false);
  }, []);

  const handleDirectorImageDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    const nextIsImageDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!nextIsImageDrag)
      return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!isDirectorImageDragOver)
      setIsDirectorImageDragOver(true);
  }, [isDirectorImageDragOver]);

  const handleDirectorImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    const hasImportableDrag = hasFileDrag(event.dataTransfer) || hasInternalHistoryImageDrag(event.dataTransfer);
    if (!hasImportableDrag)
      return;
    event.preventDefault();
    event.stopPropagation();

    const internalPayload = extractInternalHistoryImageDragPayload(event.dataTransfer);
    if (internalPayload) {
      setIsDirectorImageDragOver(false);
      void handlePickDirectorSourceHistoryImage(internalPayload);
      return;
    }

    const files = extractImageFilesFromTransfer(event.dataTransfer);
    if (!files.length) {
      setIsDirectorImageDragOver(false);
      showErrorToast("Drag-and-drop currently supports image files only.");
      return;
    }

    setIsDirectorImageDragOver(false);
    void handlePickDirectorSourceImages(files);
  }, [handlePickDirectorSourceHistoryImage, handlePickDirectorSourceImages, showErrorToast]);

  const handleSyncDirectorSourceFromCurrentPreview = useCallback(() => {
    if (!selectedPreviewResult)
      return;
    setDirectorSourcePreview(selectedPreviewResult);
    setDirectorOutputPreview(null);
    showSuccessToast("Synced the current preview to the director input.");
  }, [selectedPreviewResult, showSuccessToast]);

  const handleToggleDirectorTools = useCallback(() => {
    if (!isDirectorToolsOpen && selectedPreviewResult) {
      const previewKey = generatedItemKey(selectedPreviewResult);
      setDirectorSourceItems((currentItems) => {
        if (currentItems.some(item => generatedItemKey(item) === previewKey))
          return currentItems;
        return [selectedPreviewResult, ...currentItems];
      });
      setDirectorSourcePreview(selectedPreviewResult);
      setDirectorOutputPreview(selectedPreviewResult);
    }
    setIsDirectorToolsOpen(prev => !prev);
  }, [isDirectorToolsOpen, selectedPreviewResult]);

  const handleRunUpscale = useCallback(async () => {
    if (!selectedPreviewResult)
      return;

    showErrorToast(getNovelAiFreeOnlyMessage("Upscale is disabled."));
  }, [selectedPreviewResult, showErrorToast]);

  const handleRunDirectorTool = useCallback(async () => {
    await runDirectorToolAction({
      directorInputPreview,
      directorTool,
      activeDirectorTool,
      isDirectorToolDisabled,
      showErrorToast,
      setError,
      setPendingPreviewAction,
      setDirectorOutputPreview,
      augmentNovelImageViaProxy,
      directorColorizePrompt,
      directorEmotionExtraPrompt,
      directorColorizeDefry,
      directorEmotionDefry,
      directorEmotion,
      readImageSize,
      model,
      historyRowByResultMatchKey,
      setResults,
      setSelectedResultIndex,
      setSelectedHistoryPreviewKey,
      addAiImageHistoryBatch,
      refreshHistory,
      showSuccessToast,
    });
  }, [
    activeDirectorTool,
    directorColorizeDefry,
    directorColorizePrompt,
    directorEmotion,
    directorEmotionDefry,
    directorEmotionExtraPrompt,
    directorInputPreview,
    directorTool,
    historyRowByResultMatchKey,
    model,
    refreshHistory,
    setError,
    setPendingPreviewAction,
    showErrorToast,
    showSuccessToast,
  ]);

  const runGenerate = useCallback(async (args?: {
    prompt?: string;
    negativePrompt?: string;
    mode?: AiImageHistoryMode;
    sourceImageBase64?: string;
    sourceImageDataUrl?: string;
    sourceImageWidth?: number;
    sourceImageHeight?: number;
    maskBase64?: string;
    width?: number;
    height?: number;
    strength?: number;
    noise?: number;
    toolLabel?: string;
  }) => {
    const context = buildGenerateContext({
      mode: args?.mode,
      currentMode: mode,
      uiMode,
      simpleInfillPrompt,
      proInfillPrompt,
      simpleInfillNegativePrompt,
      proInfillNegativePrompt,
      prompt: args?.prompt,
      negativePrompt: args?.negativePrompt,
      simplePrompt,
      promptText: prompt,
      simpleNegativePrompt,
      negativePromptText: negativePrompt,
      activeStyleTags,
      activeStyleNegativeTags,
      width: args?.width ?? width,
      height: args?.height ?? height,
      strength: args?.strength ?? ((args?.mode ?? mode) === "infill" ? currentInfillStrength : currentImg2imgStrength),
      noise: args?.noise ?? ((args?.mode ?? mode) === "infill" ? currentInfillNoise : currentImg2imgNoise),
      sourceImageBase64: args?.sourceImageBase64 ?? sourceImageBase64,
      sourceImageDataUrl: args?.sourceImageDataUrl ?? sourceImageDataUrl,
      sourceImageWidth: args?.sourceImageWidth ?? sourceImageSize?.width,
      sourceImageHeight: args?.sourceImageHeight ?? sourceImageSize?.height,
      maskBase64: args?.maskBase64 ?? ((args?.mode ?? mode) === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined),
      isNAI4,
      v4Chars,
      v4UseCoords,
      v4UseOrder,
      normalizeReferenceStrengths,
      vibeTransferReferences,
      preciseReference,
    });

    setError("");
    setLoading(true);
    try {
      validateGenerateContext({
        context,
        steps,
      });

      const focusedContext = await resolveFocusedGenerateContext({
        context,
        maskBase64: args?.maskBase64,
        uiMode,
        resolveSeparatedInfillMaskBase64ForUi,
        resolveBlendInfillMaskDataUrlForUi,
      });

      if (context.effectiveMode === "infill" && typeof window !== "undefined" && window.electronAPI?.saveAiImageDebugBundle) {
        const requestBody = {
          mode: context.effectiveMode,
          model: resolveInpaintModel(model),
          width: focusedContext.requestWidth,
          height: focusedContext.requestHeight,
          strength: context.effectiveStrength,
          noise: context.effectiveNoise,
          prompt: context.effectivePrompt,
          negativePrompt: context.effectiveNegative,
          sampler,
          noiseSchedule,
          cfgRescale,
          ucPreset,
          qualityToggle,
          dynamicThresholding,
          sourceImageWidth: focusedContext.requestSourceImageWidth,
          sourceImageHeight: focusedContext.requestSourceImageHeight,
          focusedCropRect: focusedContext.focusedInpaint?.cropRect,
        };
        void window.electronAPI.saveAiImageDebugBundle({
          category: "infill",
          sourceDataUrl: context.effectiveSourceImageDataUrl,
          uiMaskDataUrl: context.effectiveMode === "infill" ? (uiMode === "simple" ? simpleInfillMaskDataUrl : proInfillMaskDataUrl) : undefined,
          requestMaskDataUrl: focusedContext.requestMaskDataUrl,
          requestBody,
        });
      }

      const seedInput = Number(seed);
      const seedValue = Number.isFinite(seedInput) && seedInput >= 0 ? Math.floor(seedInput) : undefined;
      const res = await generateNovelImageViaProxy({
        mode: context.effectiveMode,
        sourceImageBase64: focusedContext.requestSourceImageBase64,
        sourceImageWidth: focusedContext.requestSourceImageWidth,
        sourceImageHeight: focusedContext.requestSourceImageHeight,
        maskBase64: focusedContext.requestMaskPayloadBase64,
        strength: context.effectiveStrength,
        noise: context.effectiveNoise,
        prompt: context.effectivePrompt,
        negativePrompt: context.effectiveNegative,
        v4Chars: context.v4CharsPayload,
        v4UseCoords: context.v4UseCoordsPayload,
        v4UseOrder: context.v4UseOrderPayload,
        vibeTransferReferences: context.vibeTransferPayload,
        preciseReference: context.preciseReferencePayload,
        model,
        width: focusedContext.requestWidth,
        height: focusedContext.requestHeight,
        imageCount: context.effectiveImageCount,
        steps,
        scale,
        sampler,
        noiseSchedule,
        cfgRescale,
        ucPreset,
        smea,
        smeaDyn,
        qualityToggle,
        dynamicThresholding,
        seed: seedValue,
      });

      const finalized = await finalizeGenerateResult({
        context,
        focusedContext,
        response: res,
        toolLabel: args?.toolLabel,
        setResults,
        setSelectedResultIndex,
        setSelectedHistoryPreviewKey,
        uiMode,
        seedValue,
        setSimpleSeed,
        setProSeed,
      });

      await addAiImageHistoryBatch(buildHistoryRowsFromGenerateResult({
        generatedItems: finalized.generatedItems,
        context,
        response: res,
        resultWidth: finalized.resultWidth,
        resultHeight: finalized.resultHeight,
        steps,
        scale,
        sampler,
        noiseSchedule,
        cfgRescale,
        ucPreset,
        qualityToggle,
        dynamicThresholding,
        smea,
        smeaDyn,
        preciseReference,
        toolLabel: args?.toolLabel,
        batchId: finalized.batchId,
      }));
      await refreshHistory();
      return true;
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (context.effectiveMode === "infill")
        setError(message);
      else
        showErrorToast(message);
      return false;
    }
    finally {
      setLoading(false);
    }
  }, [
    cfgRescale,
    height,
    mode,
    model,
    dynamicThresholding,
    isNAI4,
    negativePrompt,
    noiseSchedule,
    preciseReference,
    prompt,
    qualityToggle,
    refreshHistory,
    sampler,
    scale,
    showErrorToast,
    activeStyleNegativeTags,
    activeStyleTags,
    seed,
    simpleInfillNegativePrompt,
    simpleInfillPrompt,
    simpleNegativePrompt,
    simplePrompt,
    sourceImageSize,
    smea,
    smeaDyn,
    sourceImageBase64,
    sourceImageDataUrl,
    steps,
    currentImg2imgNoise,
    currentImg2imgStrength,
    currentInfillNoise,
    currentInfillStrength,
    ucPreset,
    uiMode,
    v4Chars,
    vibeTransferReferences,
    v4UseCoords,
    v4UseOrder,
    width,
    normalizeReferenceStrengths,
    proInfillNegativePrompt,
    proInfillPrompt,
    resolveInfillMaskBase64ForUi,
    resolveSeparatedInfillMaskBase64ForUi,
    resolveBlendInfillMaskDataUrlForUi,
  ]);
  const handleOpenInpaint = useCallback(() => {
    const preview = selectedPreviewResult;
    if (!preview)
      return;

    const shouldSyncBaseImage = sourceImageDataUrl !== preview.dataUrl;
    if (shouldSyncBaseImage && !applySelectedPreviewAsBaseImage())
      return;

    const sourceImageBase64 = dataUrlToBase64(preview.dataUrl);
    if (!sourceImageBase64) {
      showErrorToast("???????????????????????Inpaint??");
      return;
    }

    setError("");
    setInpaintDialogSource(buildOpenInpaintState({
      selectedPreviewResult: preview,
      selectedPreviewHistoryRow,
      shouldSyncBaseImage,
      dataUrlToBase64,
      infillMaskDataUrl,
      uiMode,
      simpleInfillPrompt,
      proInfillPrompt,
      simpleInfillNegativePrompt,
      proInfillNegativePrompt,
      currentInfillStrength,
    }));
  }, [applySelectedPreviewAsBaseImage, currentInfillStrength, infillMaskDataUrl, proInfillNegativePrompt, proInfillPrompt, selectedPreviewHistoryRow, selectedPreviewResult, showErrorToast, simpleInfillNegativePrompt, simpleInfillPrompt, sourceImageDataUrl, uiMode]);

  const handleOpenBaseImageInpaint = useCallback(async () => {
    try {
      const nextState = await buildBaseImageInpaintStateAction({
        sourceImageDataUrl,
        readImageSize,
        history,
        uiMode,
        simpleInfillPrompt,
        proInfillPrompt,
        simpleInfillNegativePrompt,
        proInfillNegativePrompt,
        infillMaskDataUrl,
        width,
        height,
        seed,
        model,
        currentInfillStrength,
      });
      if (!nextState)
        return;
      setError("");
      setInpaintDialogSource(nextState);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showErrorToast(message);
    }
  }, [height, history, currentInfillStrength, infillMaskDataUrl, model, proInfillNegativePrompt, proInfillPrompt, seed, showErrorToast, simpleInfillNegativePrompt, simpleInfillPrompt, sourceImageDataUrl, uiMode, width]);

  const handleCloseInpaintDialog = useCallback(() => {
    if (loading)
      return;
    setError("");
    setInpaintDialogSource(null);
  }, [loading]);

  const handleSaveInpaintMask = useCallback((payload: InpaintSubmitPayload) => {
    saveInpaintMaskAction({
      inpaintDialogSource,
      payload,
      setSimpleInfillPrompt,
      setSimpleInfillNegativePrompt,
      setSimpleEditorMode,
      setSimplePromptTab,
      setSimpleInfillStrength,
      setSimpleInfillMaskDataUrl,
      setProInfillPrompt,
      setProInfillNegativePrompt,
      setProInfillStrength,
      setProInfillMaskDataUrl,
      setError,
      setModeForUi,
      setInpaintDialogSource,
    });
  }, [inpaintDialogSource, setModeForUi]);

  const handleReturnFromInfillSettings = useCallback(() => {
    setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img");
  }, [setModeForUi, sourceImageDataUrl, uiMode]);

  const handleClearInfillMask = useCallback(() => {
    clearInfillMaskForUi(uiMode);
    setModeForUi(uiMode, sourceImageDataUrl ? "img2img" : "txt2img");
  }, [clearInfillMaskForUi, setModeForUi, sourceImageDataUrl, uiMode]);

  const handleSimpleConvertToTags = useCallback(async () => {
    const trimmed = simpleText.trim();
    if (!trimmed) {
      showErrorToast("Please enter a natural-language prompt first.");
      return;
    }

    setSimpleConverting(true);
    try {
      const converted = await convertNaturalLanguageToNovelAiTags({ input: trimmed });
      setSimpleConverted(converted);
      setSimpleConvertedFromText(trimmed);
      setSimplePromptTab("prompt");
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showErrorToast(message);
    }
    finally {
      setSimpleConverting(false);
    }
  }, [
    showErrorToast,
    simpleText,
  ]);

  const handleAcceptSimpleConverted = useCallback(() => {
    if (!simpleConverted?.prompt.trim()) {
      showErrorToast("Converted result is empty. Please try again.");
      return;
    }

    setSimplePrompt(simpleConverted.prompt);
    setSimpleNegativePrompt(simpleConverted.negativePrompt);
    setSimpleConverted(null);
    setSimpleConvertedFromText(simpleText.trim());
    setSimpleEditorMode("tags");
    setSimplePromptTab("prompt");
  }, [showErrorToast, simpleConverted, simpleText]);

  const handleRejectSimpleConverted = useCallback(() => {
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
  }, []);

  const handleReturnToSimpleText = useCallback(() => {
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
    setSimpleEditorMode("text");
    setSimplePromptTab("prompt");
  }, []);

  const handleReturnToSimpleTags = useCallback(() => {
    if (!sanitizeNovelAiTagInput(simplePrompt) && !sanitizeNovelAiTagInput(simpleNegativePrompt)) {
      showErrorToast("There are no tags to return to.");
      return;
    }
    setSimpleConverted(null);
    setSimpleConvertedFromText(simpleText.trim());
    setSimpleEditorMode("tags");
    setSimplePromptTab("prompt");
  }, [showErrorToast, simpleNegativePrompt, simplePrompt, simpleText]);

  const handleSimpleGenerateFromTags = useCallback(async () => {
    const nextGenerateMode = resolveSimpleGenerateMode(mode);
    if (nextGenerateMode === "txt2img" && !sanitizeNovelAiTagInput(simplePrompt)) {
      showErrorToast("Prompt is empty. Please complete the tags first.");
      return;
    }
    await runGenerate({ mode: nextGenerateMode, prompt: simplePrompt, negativePrompt: simpleNegativePrompt });
  }, [mode, runGenerate, showErrorToast, simpleNegativePrompt, simplePrompt]);

  const handleSelectCurrentResult = useCallback((index: number) => {
    setSelectedHistoryPreviewKey(null);
    setSelectedResultIndex(index);
    if (isDirectorToolsOpen)
      setDirectorOutputPreview(null);
  }, [isDirectorToolsOpen]);

  const handlePreviewHistoryRow = useCallback((row: AiImageHistoryRow) => {
    setSelectedHistoryPreviewKey(historyRowKey(row));
    if (isDirectorToolsOpen)
      setDirectorOutputPreview(null);
  }, [isDirectorToolsOpen]);

  const handleClearCurrentDisplayedImage = useCallback(() => {
    if (!selectedPreviewResult)
      return;

    setSelectedHistoryPreviewKey(null);
    setSelectedResultIndex(-1);
    setDirectorSourcePreview(null);
    setDirectorOutputPreview(null);
    setIsPreviewImageModalOpen(false);
  }, [selectedPreviewResult]);

  const createDirectorSourceClone = useCallback((image: GeneratedImageItem) => {
    return {
      ...image,
      batchId: makeStableId(),
      batchIndex: 0,
      batchSize: 1,
    } satisfies GeneratedImageItem;
  }, []);

  const addDirectorImageToSourceRail = useCallback((image: GeneratedImageItem | null) => {
    if (!image)
      return false;
    const clone = createDirectorSourceClone(image);
    setDirectorSourceItems(prev => [clone, ...prev]);
    setDirectorSourcePreview(clone);
    setDirectorOutputPreview(null);
    return true;
  }, [createDirectorSourceClone]);

  const copyGeneratedImageToClipboard = useCallback(async (image: GeneratedImageItem | null, successMessage: string) => {
    if (!image)
      return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      showErrorToast("Clipboard image copy is not supported in this environment.");
      return;
    }

    try {
      const file = fileFromDataUrl(
        image.dataUrl,
        `nai_preview.${extensionFromDataUrl(image.dataUrl)}`,
      );
      await navigator.clipboard.write([
        new ClipboardItem({
          [file.type || "image/png"]: file,
        }),
      ]);
      showSuccessToast(successMessage);
    }
    catch {
      showErrorToast("Failed to copy image. Please try again.");
    }
  }, [showErrorToast, showSuccessToast]);

  const downloadGeneratedImage = useCallback((image: GeneratedImageItem | null, filePrefix: string) => {
    if (!image)
      return;
    triggerBrowserDownload(
      image.dataUrl,
      `${filePrefix}_${image.seed}_${image.batchIndex + 1}.${extensionFromDataUrl(image.dataUrl)}`,
    );
  }, []);

  const handleRunDirectorInputUpscale = useCallback(async () => {
    if (!directorInputPreview)
      return;
    showErrorToast(getNovelAiFreeOnlyMessage("Upscale is disabled."));
  }, [directorInputPreview, showErrorToast]);

  const handleAddDirectorDisplayedToSourceRail = useCallback(() => {
    if (addDirectorImageToSourceRail(directorOutputPreview ?? selectedPreviewResult))
      showSuccessToast("Added the current right-side image to the source rail.");
  }, [addDirectorImageToSourceRail, directorOutputPreview, selectedPreviewResult, showSuccessToast]);

  const handleCopyDirectorInputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorInputPreview, "Copied the current left image.");
  }, [copyGeneratedImageToClipboard, directorInputPreview]);

  const handleCopyDirectorOutputImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(directorOutputPreview ?? selectedPreviewResult, "Copied the current right image.");
  }, [copyGeneratedImageToClipboard, directorOutputPreview, selectedPreviewResult]);

  const handleDownloadDirectorOutputImage = useCallback(() => {
    downloadGeneratedImage(directorOutputPreview ?? selectedPreviewResult, "nai_director");
  }, [directorOutputPreview, downloadGeneratedImage, selectedPreviewResult]);


  const handleClearPinnedPreview = useCallback(() => {
    clearPinnedPreviewAction({
      pinnedPreviewKey,
      setPinnedPreviewKey,
      showSuccessToast,
    });
  }, [pinnedPreviewKey, showSuccessToast]);

  const handleSelectPinnedPreview = useCallback(() => {
    selectPinnedPreviewAction({
      pinnedPreviewKey,
      results,
      generatedItemKey,
      handleSelectCurrentResult,
      historyRowByKey,
      handlePreviewHistoryRow,
    });
  }, [handlePreviewHistoryRow, handleSelectCurrentResult, historyRowByKey, pinnedPreviewKey, results]);

  const handleApplyPinnedPreviewSeed = useCallback(() => {
    applyPinnedPreviewSeedAction({
      pinnedPreviewResult,
      uiMode,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
    });
  }, [pinnedPreviewResult, showSuccessToast, uiMode]);
  const handleOpenPreviewImage = useCallback(() => {
    openPreviewImageAction({
      selectedPreviewResult,
      setIsPreviewImageModalOpen,
    });
  }, [selectedPreviewResult]);
  const handleTogglePinnedPreview = useCallback(() => {
    togglePinnedPreviewAction({
      selectedPreviewResult,
      selectedPreviewIdentityKey,
      pinnedPreviewKey,
      setPinnedPreviewKey,
      showSuccessToast,
    });
  }, [pinnedPreviewKey, selectedPreviewIdentityKey, selectedPreviewResult, showSuccessToast]);
  const handleApplySelectedPreviewSeed = useCallback(() => {
    applySelectedPreviewSeedAction({
      selectedPreviewResult,
      uiMode,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
    });
  }, [selectedPreviewResult, showSuccessToast, uiMode]);
  const handleCopySelectedPreviewImage = useCallback(async () => {
    await copyGeneratedImageToClipboard(selectedPreviewResult, "Copied the current image.");
  }, [copyGeneratedImageToClipboard, selectedPreviewResult]);
  const handleApplyHistorySettings = useCallback((row: AiImageHistoryRow, clickMode: Exclude<HistoryRowClickMode, "preview">) => {
    applyHistorySettingsAction({
      row,
      clickMode,
      uiMode,
      samplerOptions,
      noiseScheduleOptions,
      setSelectedHistoryPreviewKey,
      setSimpleSeed,
      setProSeed,
      showSuccessToast,
      restoreSourceImageForUi,
      setSimpleText,
      setSimpleConverted,
      setSimpleConvertedFromText,
      setSimplePrompt,
      setSimpleNegativePrompt,
      setSimpleEditorMode,
      setSimplePromptTab,
      setSimpleWidth,
      setSimpleHeight,
      setSimpleResolutionSelection,
      applyModeStrengthAndNoise,
      clearSourceImageForUi,
      setPrompt,
      setNegativePrompt,
      setV4UseCoords,
      setV4UseOrder,
      setV4Chars,
      setCharPromptTabs,
      setVibeTransferReferences,
      setPreciseReference,
      setProFeatureSections,
      setProWidth,
      setProHeight,
      setProResolutionSelection,
      setProImageCount,
      setProSteps,
      setProScale,
      setProSampler,
      setProNoiseSchedule,
      setProCfgRescale,
      setProUcPreset,
      setProQualityToggle,
      setProDynamicThresholding,
      setProSmea,
      setProSmeaDyn,
      inferResolutionSelection,
    });
  }, [
    applyModeStrengthAndNoise,
    clearSourceImageForUi,
    inferResolutionSelection,
    noiseScheduleOptions,
    restoreSourceImageForUi,
    samplerOptions,
    showSuccessToast,
    uiMode,
  ]);

  const handleHistoryRowClick = useCallback((row: AiImageHistoryRow, event: MouseEvent<HTMLButtonElement>) => {
    const clickMode: HistoryRowClickMode = (event.metaKey || event.ctrlKey)
      ? (event.shiftKey ? "settings-with-seed" : "settings")
      : (event.shiftKey ? "seed" : "preview");

    if (clickMode === "preview") {
      handlePreviewHistoryRow(row);
      return;
    }

    handleApplyHistorySettings(row, clickMode);
  }, [handleApplyHistorySettings, handlePreviewHistoryRow]);

  const handleDeleteHistoryRow = useCallback(async (row: AiImageHistoryRow) => {
    if (typeof row.id !== "number")
      return;

    const rowKey = historyRowKey(row);
    const rowResultMatchKey = historyRowResultMatchKey(row);
    const rowGeneratedItemKey = generatedItemKey(historyRowToGeneratedItem(row));
    const deleteIndex = results.findIndex(item => generatedItemKey(item) === rowResultMatchKey);
    const nextResults = deleteIndex >= 0
      ? results.filter((_, index) => index !== deleteIndex)
      : results;

    await deleteAiImageHistory(row.id);
    await refreshHistory();
    if (selectedHistoryPreviewKey === rowKey)
      setSelectedHistoryPreviewKey(null);
    if (directorSourcePreview && generatedItemKey(directorSourcePreview) === rowGeneratedItemKey)
      setDirectorSourcePreview(null);
    if (directorOutputPreview && generatedItemKey(directorOutputPreview) === rowGeneratedItemKey)
      setDirectorOutputPreview(null);
    if (pinnedPreviewKey === `history:${rowKey}` || (deleteIndex >= 0 && pinnedPreviewKey === `current:${rowResultMatchKey}`))
      setPinnedPreviewKey(null);

    if (deleteIndex >= 0) {
      setResults(nextResults);
      setSelectedResultIndex((prev) => {
        if (!nextResults.length)
          return 0;
        if (prev > deleteIndex)
          return prev - 1;
        return Math.min(prev, nextResults.length - 1);
      });
    }
  }, [directorOutputPreview, directorSourcePreview, pinnedPreviewKey, refreshHistory, results, selectedHistoryPreviewKey]);

  const handleDownloadCurrent = useCallback(() => {
    downloadCurrentAction({
      selectedPreviewResult,
      downloadGeneratedImage,
    });
  }, [downloadGeneratedImage, selectedPreviewResult]);
  const handleDownloadAll = useCallback(() => {
    if (!history.length)
      return;
    const archiveEntries = history.reduce<Record<string, Uint8Array>>((acc, row, index) => {
      const entryName = `nai_${row.seed}_${(row.batchIndex ?? 0) + 1}_${row.id ?? row.createdAt ?? index + 1}.${extensionFromDataUrl(row.dataUrl)}`;
      acc[entryName] = base64ToBytes(dataUrlToBase64(row.dataUrl));
      return acc;
    }, {});
    const archive = zipSync(archiveEntries);
    triggerBlobDownload(new Blob([archive], { type: "application/zip" }), `nai_history_${Date.now()}.zip`);
  }, [history]);


  const handleClearSimpleDraft = useCallback(() => {
    clearSourceImageForUi("simple");
    setSimpleText("");
    setSimpleConverted(null);
    setSimpleConvertedFromText("");
    setSimplePrompt("");
    setSimpleNegativePrompt("");
    setSimpleEditorMode("text");
    setSimplePromptTab("prompt");
    setSimpleWidth(DEFAULT_SIMPLE_IMAGE_SETTINGS.width);
    setSimpleHeight(DEFAULT_SIMPLE_IMAGE_SETTINGS.height);
    setSimpleImg2imgStrength(DEFAULT_SIMPLE_IMAGE_SETTINGS.strength);
    setSimpleImg2imgNoise(DEFAULT_SIMPLE_IMAGE_SETTINGS.noise);
    setSimpleInfillStrength(DEFAULT_INPAINT_STRENGTH);
    setSimpleInfillNoise(DEFAULT_INPAINT_NOISE);
    setSimpleSeed(DEFAULT_SIMPLE_IMAGE_SETTINGS.seed);
    setSimpleResolutionSelection(DEFAULT_SIMPLE_IMAGE_SETTINGS.simpleResolutionSelection);
    setSelectedStyleIds([]);
    setCompareStyleId(null);
    setStyleSelectionMode("select");
    setPendingMetadataImport(null);
    setMetadataImportSelection(DEFAULT_METADATA_IMPORT_SELECTION);
    setIsPageImageDragOver(false);
    showSuccessToast("Reset simple mode to defaults.");
  }, [clearSourceImageForUi, showSuccessToast]);


  const handleAddV4Char = useCallback((options?: { defaultPrompt?: string; gender?: V4CharGender }) => {
    const row = {
      ...newV4CharEditorRow({ gender: options?.gender ?? "other" }),
      prompt: options?.defaultPrompt ?? "",
    };
    setV4Chars((prev) => {
      if (!v4UseCoords)
        return [...prev, row];
      const nextCell = getNextAvailableV4CharGridCell(prev);
      return [
        ...prev,
        {
          ...row,
          centerX: nextCell.centerX,
          centerY: nextCell.centerY,
        },
      ];
    });
    setCharPromptTabs(prev => ({ ...prev, [row.id]: "prompt" }));
    setProFeatureSectionOpen("characterPrompts", true);
  }, [setProFeatureSectionOpen, v4UseCoords]);

  const handleRemoveV4Char = useCallback((id: string) => {
    setV4Chars(prev => prev.filter(item => item.id !== id));
    setCharPromptTabs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleMoveV4Char = useCallback((id: string, direction: -1 | 1) => {
    setV4Chars((prev) => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx < 0)
        return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length)
        return prev;
      const next = prev.slice();
      const [moved] = next.splice(idx, 1);
      next.splice(nextIdx, 0, moved);
      return next;
    });
  }, []);

  const handleUpdateV4Char = useCallback((id: string, patch: Partial<V4CharEditorRow>) => {
    setV4Chars(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleSetV4UseCoords = useCallback((enabled: boolean) => {
    setV4UseCoords((prev) => {
      if (prev === enabled)
        return prev;
      return enabled;
    });
    if (!enabled)
      return;
    setV4Chars((prev) => {
      const next = normalizeV4CharGridRows(prev);
      return next === prev ? prev : next;
    });
  }, []);

  const handleUpdateVibeReference = useCallback((id: string, patch: Partial<VibeTransferReferenceRow>) => {
    setVibeTransferReferences(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleRemoveVibeReference = useCallback((id: string) => {
    setVibeTransferReferences(prev => prev.filter(item => item.id !== id));
  }, []);

  const isBusy = loading || simpleConverting || Boolean(pendingPreviewAction);
  const freeGenerationViolation = getNovelAiFreeGenerationViolation({
    mode,
    width: roundedRequestedSize.width,
    height: roundedRequestedSize.height,
    imageCount,
    steps,
    sourceImageBase64,
    sourceImageWidth: sourceImageSize?.width,
    sourceImageHeight: sourceImageSize?.height,
    maskBase64: mode === "infill" ? resolveInfillMaskBase64ForUi(uiMode) : undefined,
    vibeTransferReferenceCount: vibeTransferReferences.length,
    hasPreciseReference: Boolean(preciseReference),
  });
  const canGenerate = !isBusy && !freeGenerationViolation && hasCompleteDimensionInputs;
  const canTriggerProGenerate = canGenerate;
  const proGenerateLabel = loading || simpleConverting
    ? "Working..."
    : pendingPreviewAction
      ? `${PREVIEW_ACTION_LABELS[pendingPreviewAction]}...`
      : "Generate 1 image";
  const ucPresetEnabled = ucPreset !== 2;
  const fixedModelDescription = MODEL_DESCRIPTIONS[model] || "Image generation model";
  const hasReferenceConflict = vibeTransferReferences.length > 0 && Boolean(preciseReference);
  const canAddVibeReference = false;
  const baseImageDescription = "Base Img / img2img is disabled. Use Inpaint from the preview tools.";
  const characterPromptDescription = v4Chars.length
    ? "Click to edit a character."
    : "Customize separate characters.";
  const vibeTransferDescription = "Change the image, keep the vision.";
  const preciseReferenceDescription = "Add a reference image for a character or style.";
  const pendingMetadataSettings = pendingMetadataImport?.metadata?.settings ?? null;
  const canImportMetadataPrompt = pendingMetadataSettings ? hasNonEmptyText(pendingMetadataSettings.prompt) : false;
  const canImportMetadataNegativePrompt = pendingMetadataSettings ? hasNonEmptyText(pendingMetadataSettings.negativePrompt) : false;
  const canImportMetadataCharacters = uiMode === "pro";
  const canImportMetadataSettings = uiMode === "pro" && pendingMetadataSettings ? hasMetadataSettingsPayload(pendingMetadataSettings) : false;
  const canImportMetadataSeed = pendingMetadataSettings?.seed != null;
  const hasAnyMetadataImportSelection = metadataImportSelection.prompt
    || metadataImportSelection.undesiredContent
    || metadataImportSelection.characters
    || metadataImportSelection.settings
    || metadataImportSelection.seed;
  const canConvertSimpleText = !isBusy && Boolean(simpleText.trim());
  const simpleGenerateMode = resolveSimpleGenerateMode(mode);
  const canGenerateFromSimpleTags = canGenerate && (Boolean(sanitizeNovelAiTagInput(simplePrompt)) || simpleGenerateMode === "infill");
  const hasSimpleTagsDraft = Boolean(sanitizeNovelAiTagInput(simplePrompt) || sanitizeNovelAiTagInput(simpleNegativePrompt));
  const simpleConvertLabel = simpleConverting ? "Converting..." : loading || pendingPreviewAction ? "Processing..." : "Convert to tags";

  const sidebarProps = buildSidebarProps({
    activeResolutionPreset,
    baseImageDescription,
    canAddVibeReference,
    canConvertSimpleText,
    canGenerate,
    canGenerateFromSimpleTags,
    canTriggerProGenerate,
    cfgRescale,
    charPromptTabs,
    characterPromptDescription,
    fixedModelDescription,
    freeGenerationViolation,
    hasSimpleTagsDraft,
    isBusy,
    handleAddV4Char,
    handleClearSeed,
    handleClearCurrentDisplayedImage,
    handleOpenSourceImagePicker,
    handleClearSourceImage,
    handleClearInfillMask,
    handleClearSimpleDraft,
    handleClearStyles: handleClearActiveStyles,
    handleCropToClosestValidSize,
    handleMoveV4Char,
    handleRemoveV4Char,
    handleRemoveVibeReference,
    handleAcceptSimpleConverted,
    handleRejectSimpleConverted,
    handleCommitProDimensions,
    handleCommitSimpleDimensions,
    handleResetCurrentImageSettings,
    handleReturnToSimpleTags,
    handleReturnToSimpleText,
    handleSelectProResolutionPreset,
    handleSelectSimpleResolutionPreset,
    handleSimpleConvertToTags,
    handleSimpleGenerateFromTags,
    handleProHeightChange,
    handleProWidthChange,
    handleSimpleHeightChange,
    handleSimpleWidthChange,
    handleSwapImageDimensions,
    handleUpdateV4Char,
    handleUpdateVibeReference,
    handleOpenBaseImageInpaint,
    handleReturnFromInfillSettings,
    hasReferenceConflict,
    height,
    imageCount,
    imageCountLimit,
    infillMaskDataUrl,
    isDirectorToolsOpen,
    isNAI3,
    isNAI4,
    isPageImageDragOver,
    mode,
    model,
    negativePrompt,
    noise,
    noiseSchedule,
    noiseScheduleOptions,
    normalizeReferenceStrengths,
    preciseReference,
    preciseReferenceDescription,
    preciseReferenceInputRef,
    proFeatureSections,
    proGenerateLabel,
    proPromptTab,
    proResolutionSelection,
    prompt,
    qualityToggle,
    runGenerate,
    sampler,
    samplerOptions,
    scale,
    seed,
    seedIsRandom,
    selectedStyleIds: activeStyleIds,
    selectedStyleNegativeTags: activeStyleNegativeTags,
    selectedStylePresets: activeStylePresets,
    selectedStyleTags: activeStyleTags,
    setCfgRescale,
    setCharPromptTabs,
    setDynamicThresholding,
    setHeight,
    setImageCount,
    setIsStylePickerOpen,
    setNegativePrompt,
    setNoise,
    setNoiseSchedule,
    setNormalizeReferenceStrengths,
    setPreciseReference,
    setProFeatureSectionOpen,
    setProPromptTab,
    setPrompt,
    setQualityToggle,
    setSampler,
    setScale,
    setSeed,
    setSimpleEditorMode,
    setSimpleConverted,
    setSimpleConvertedFromText,
    setSimpleNegativePrompt,
    setSimplePromptTab,
    setSimplePrompt,
    setSimpleText,
    setSmea,
    setSmeaDyn,
    setSteps,
    setStrength,
    setUcPreset,
    setUiMode,
    setV4Chars,
    handleSetV4UseCoords,
    setV4UseOrder,
    setWidth,
    simpleConvertLabel,
    simpleConverting,
    simpleEditorMode,
    simpleConverted,
    simpleNegativePrompt,
    simplePromptTab,
    simplePrompt,
    simpleResolutionArea,
    simpleResolutionSelection,
    simpleText,
    smea,
    smeaDyn,
    sourceImageDataUrl,
    hasCurrentDisplayedImage,
    steps,
    strength,
    toggleProFeatureSection,
    ucPreset,
    ucPresetEnabled,
    uiMode,
    v4Chars,
    v4UseCoords,
    v4UseOrder,
    vibeReferenceInputRef,
    vibeTransferDescription,
    vibeTransferReferences,
    widthInput,
    heightInput,
    width,
  });

  const workspaceProps = buildWorkspaceProps({
    isDirectorToolsOpen,
    previewPaneProps: {
      isDirectorToolsOpen,
      previewMeta,
      results,
      selectedPreviewResult,
      selectedResultIndex,
      selectedHistoryPreviewKey,
      isSelectedPreviewPinned,
      isBusy,
      isGeneratingImage: loading,
      isDirectorImageDragOver,
      pendingPreviewAction,
      activeDirectorTool,
      directorTool,
      directorSourceItems,
      directorInputPreview,
      directorOutputPreview,
      directorColorizePrompt,
      directorColorizeDefry,
      directorEmotion,
      directorEmotionExtraPrompt,
      directorEmotionDefry,
      onToggleDirectorTools: handleToggleDirectorTools,
      onRunUpscale: handleRunUpscale,
      onRunDirectorInputUpscale: handleRunDirectorInputUpscale,
      onUseSelectedResultAsBaseImage: handleUseSelectedResultAsBaseImage,
      onPickDirectorSourceImages: handlePickDirectorSourceImages,
      onSelectDirectorSourceItem: handleSelectDirectorSourceItem,
      onRemoveDirectorSourceItem: handleRemoveDirectorSourceItem,
      onAddDirectorDisplayedToSourceRail: handleAddDirectorDisplayedToSourceRail,
      onDirectorImageDragEnter: handleDirectorImageDragEnter,
      onDirectorImageDragLeave: handleDirectorImageDragLeave,
      onDirectorImageDragOver: handleDirectorImageDragOver,
      onDirectorImageDrop: handleDirectorImageDrop,
      onDirectorColorizePromptChange: setDirectorColorizePrompt,
      onDirectorColorizeDefryChange: setDirectorColorizeDefry,
      onDirectorEmotionChange: setDirectorEmotion,
      onDirectorEmotionExtraPromptChange: setDirectorEmotionExtraPrompt,
      onDirectorEmotionDefryChange: setDirectorEmotionDefry,
      onActiveDirectorToolChange: setActiveDirectorTool,
      onRunDirectorTool: handleRunDirectorTool,
      onSelectCurrentResult: handleSelectCurrentResult,
      onOpenPreviewImage: handleOpenPreviewImage,
      onTogglePinnedPreview: handleTogglePinnedPreview,
      onOpenInpaint: handleOpenInpaint,
      onCopySelectedPreviewImage: handleCopySelectedPreviewImage,
      onCopyDirectorInputImage: handleCopyDirectorInputImage,
      onCopyDirectorOutputImage: handleCopyDirectorOutputImage,
      onDownloadCurrent: handleDownloadCurrent,
      onDownloadDirectorOutputImage: handleDownloadDirectorOutputImage,
      onApplySelectedPreviewSeed: handleApplySelectedPreviewSeed,
      formatDirectorEmotionLabel,
    },
    historyPaneProps: {
      history,
      mode,
      currentResultCards,
      archivedHistoryRows,
      selectedHistoryPreviewKey,
      selectedResultIndex,
      directorInputPreviewKey: directorInputPreview ? generatedItemKey(directorInputPreview) : undefined,
      isHistoryExpanded,
      onHistoryExpandedChange: setIsHistoryExpanded,
      onSelectCurrentResult: handleSelectCurrentResult,
      onHistoryRowClick: handleHistoryRowClick,
      onHistoryImageDragStart: handleHistoryImageDragStart,
      onDeleteHistoryRow: handleDeleteHistoryRow,
      onDownloadAll: handleDownloadAll,
      onClearHistory: handleClearHistory,
    },
    pinnedPreviewResult,
    onClearPinnedPreview: handleClearPinnedPreview,
    onJumpToPinnedPreview: handleSelectPinnedPreview,
    onApplyPinnedPreviewSeed: handleApplyPinnedPreviewSeed,
  });

  const metadataImportDialogProps = buildMetadataImportDialogProps({
    pendingMetadataImport,
    canImportMetadataPrompt,
    canImportMetadataNegativePrompt,
    canImportMetadataCharacters,
    canImportMetadataSettings,
    canImportMetadataSeed,
    hasAnyMetadataImportSelection,
    metadataImportSelection,
    setMetadataImportSelection,
    onClose: handleCloseMetadataImportDialog,
    onImportSourceImageTarget: handleImportSourceImageTarget,
    onConfirmMetadataImport: handleConfirmMetadataImport,
  });

  const previewImageDialogProps = buildPreviewImageDialogProps({
    isOpen: isPreviewImageModalOpen,
    selectedPreviewResult,
    selectedPreviewHistoryRow,
    onClose: () => setIsPreviewImageModalOpen(false),
    onDownloadCurrent: handleDownloadCurrent,
  });

  const inpaintDialogProps = buildInpaintDialogProps({
    isOpen: Boolean(inpaintDialogSource),
    source: inpaintDialogSource,
    isSubmitting: loading,
    error,
    onClose: handleCloseInpaintDialog,
    onSubmit: handleSaveInpaintMask,
  });

  const stylePickerDialogProps = buildStylePickerDialogProps({
    isOpen: isStylePickerOpen,
    viewMode: styleSelectionMode,
    selectedStyleIds,
    compareStyleId,
    stylePresets,
    compareStylePresets,
    onToggleStyle: handleToggleStyle,
    onSelectCompareStyle: handleSelectCompareStyle,
    onViewModeChange: setStyleSelectionMode,
    onClearStyles: handleClearStyles,
    onClose: () => setIsStylePickerOpen(false),
  });

  return {
    isPageImageDragOver,
    sourceFileInputRef,
    vibeReferenceInputRef,
    preciseReferenceInputRef,
    handlePageImageDragEnter,
    handlePageImageDragLeave,
    handlePageImageDragOver,
    handlePageImageDrop,
    handlePickSourceImage,
    handlePickVibeReferences,
    handlePickPreciseReference,
    sidebarProps,
    workspaceProps,
    metadataImportDialogProps,
    previewImageDialogProps,
    inpaintDialogProps,
    stylePickerDialogProps,
  };
}

export type AiImagePageController = ReturnType<typeof useAiImagePageController>;
