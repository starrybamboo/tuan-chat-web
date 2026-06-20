import fs from 'node:fs';

const file = 'D:/gululu-cache/output/opus-88-owner-only-refetch-v3/text-classification-manual-v1/part-0023.classification.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const byFloor = new Map(data.floors.map((floor) => [floor.floor, floor]));
const ev = (kind, performanceUse, summary, textRef, extra = {}) => ({ kind, performanceUse, summary, textRef, ...extra });
const battle = (kind, phase, summary, textRef, performanceUse = kind === 'role_card' ? 'reference' : 'perform') =>
  ev(kind, performanceUse, summary, textRef, { battleId: 'battle-021-nue', battlePhase: phase });

byFloor.get(1105).events = [
  ev('dialog', 'perform', '永琳解释纯狐、羿、嫦娥仇怨的起点。', '师匠：纯狐与嫦娥都曾是羿的妻子；纯狐的丈夫杀死了她的儿子；之后，纯狐为了复仇杀掉了羿；唯一残留的只有纯粹的仇恨和愤怒'),
];

byFloor.get(1106).events = [
  ev('dialog', 'perform', '烈询问赫卡提亚与此事的关系，永琳引出射日传说。', '烈：那赫卡提亚跟这件事又有什么关系？；师匠：地狱的女神会参合进来则是由于另一件事'),
  ev('dice', 'perform', '烈察觉射日传说与地狱关联。', '烈的察觉【1d70：48+30=75】'),
  ev('dialog', 'perform', '永琳说明羿击落阿波罗削弱地狱力量，赫卡提亚因此怨恨羿。', '师匠：羿击落了太阳，也就是阿波罗；地狱的黑暗也因之减弱了；赫卡提亚作为掌管地狱的女神也因此怨恨上了羿'),
];

byFloor.get(1107).events = [
  ev('dialog', 'perform', '永琳说明赫卡提亚在纯狐影响下将对羿的怨恨转向嫦娥。', '赫卡提亚本应无理由复仇了；但是她认识了一位名叫纯狐的朋友；她对羿的怨恨转移到了嫦娥身上'),
  ev('dialog', 'perform', '早苗困惑中国、希腊、日本神话混杂，灵梦与永琳回应。', '早苗：他们到底是怎么掺和到一块去的啊？！；灵梦：也许是他们那个时代还没有所谓的地区之分吧？；师匠：这就不在我的讲解范围内了'),
];

byFloor.get(1108).events = [
  ev('dialog', 'perform', '辉夜说明赫卡提亚才是本次计划核心，地狱妖精由她派出。', '辉夜：她在本次计划中才是真正意义上的核心；现在看来她就是赫卡提亚的部下'),
  ev('dice', 'perform', '烈对赫卡提亚战略压制的震惊判定。', '烈的震惊【1d100：90】'),
  ev('dialog', 'perform', '永琳说明本次作战真意只是提醒复仇者幻想乡与地球被卷入。', '师匠：本次作战的真意，其实只是提醒她们“幻想乡与地球被卷入你们的复仇计划了”这样一个简单的事实而已'),
];

byFloor.get(1115).events = [
  ev('scene', 'perform', '第219天结束，月之都异变与永恒复仇结束，都市传说异变尚未结束。', '~第219天结束~；——月之都异变结束——；——永恒的复仇结束——；——都市传说异变尚未结束——'),
  ev('role_card', 'reference', '烈获得月之都异变相关成就与能力提升。', '成就：解决月之都异变 达成！Atk+1；成就：无名仙灵的认可 达成！Atk+3；现在的Atk：245（129）；成就：直面伟大存在 达成！意志力相关判定基础值+30；成就：幻想乡联合军 达成！'),
];

byFloor.get(1125).events = [
  ev('dice', 'perform', '纯狐教学内容双重大成功，9 小时后传授无色意志。', '纯狐教了烈什么招式？【1d10：10】；大成功是什么？【1d10:1】；【1d24:9】小时后'),
  ev('dialog', 'perform', '纯狐向烈传授无色意志。', '纯狐：所谓纯化，就是将不需要的事物全部舍弃；你要做的，是把武术之外的一切全部抛开'),
  ev('role_card', 'reference', '武之怀升级为纯粹武道。', '纯粹武道（CT5）：身怀纯粹的武术，心存无色的执着'),
];

byFloor.get(1139).events = [
  ev('dice', 'perform', '烈战意判定，决定应战。', '烈的战意【1d90：41+10=51】（40以下尝试和解）'),
  ev('dialog', 'perform', '鵺因计划被破坏狂怒，烈与鵺互相宣战。', '鵺：谁想看你这种肌肉佬的娘化啊？！；烈：想打架我随时奉陪！；鵺：就让不明真相的飞行物体吓死你吧！！'),
  battle('scene', 'start', '封兽鵺战开幕。', '想打架我随时奉陪；就让不明真相的飞行物体吓死你吧'),
];

byFloor.get(1140).events = [
  battle('role_card', 'card', '变性后烈海王战斗卡。', '烈海王；Atk：230；Hp：19；尚未适应的身躯；烈 海 王；完全消力；Flower star；假腿【The World】；急救拳；纯粹武道；超人烈海王；秘术【天文密葬法】'),
  battle('role_card', 'card', '封兽鵺战斗卡。', '封兽鵺；Atk 270；Hp 24；不明幻想飞行少女；妖云【平安时代的黑云】；鵺符【鵺的蛇行表演】；鵺符【弹幕奇美拉】；真相不明【紫镜】；鵺符【UndefinedDarkness】；真相不明【恐怖的虹色 UFO袭来】'),
];

for (const floor of data.floors) {
  for (const event of floor.events ?? []) {
    if (event.kind === 'role_card' && event.performanceUse === 'metadata') event.performanceUse = 'reference';
  }
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
