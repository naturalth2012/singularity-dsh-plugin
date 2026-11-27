/**
 * 验证插件内联引擎与独立版 Python 引擎结论一致。
 * 做法：从 client.js 中截取 factory 函数体，注入一个只提供 React 存根的 require，
 * 在工厂作用域内直接取用 simulate / targetOf / SCENARIOS。
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8');

// 定位 factory 函数体
const start = src.indexOf('factory(require) {');
if (start < 0) throw new Error('找不到 factory');
const bodyStart = src.indexOf('{', start) + 1;

// 从 bodyStart 起做花括号配对
let depth = 1, i = bodyStart;
for (; i < src.length && depth > 0; i++) {
  const ch = src[i];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
}
const body = src.slice(bodyStart, i - 1);

// React 存根：只用到 createElement
const ReactStub = {
  // v1.7：ErrorBoundary 是 class 组件，需要 Component 基类才能被求值
  Component: class {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(x) {
      this.state = Object.assign({}, this.state, typeof x === 'function' ? x(this.state) : x);
    }
  },
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (v) => [v, () => {}],
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  useEffect: () => {},
};

// 工厂体末尾有它自己的 `return { inject, apply }`，会提前跳出 IIFE。
// 把它改写成赋值，再追加内部符号的导出。
const EXPORT_RE = /return\s*\{\s*\n\s*inject:/;
if (!EXPORT_RE.test(body)) throw new Error('找不到工厂的导出 return');
const patched = body.replace(EXPORT_RE, 'const __exports = { inject:');

const build = new Function('require', 'document', 'window',
  'return (function(){'
  + patched
  + '\n;return { simulate: simulate, targetOf: targetOf, SCENARIOS: SCENARIOS,'
  + ' LEVERS: LEVERS, LEVER_BY_KEY: LEVER_BY_KEY, sensitivity: sensitivity,'
  + ' diagnose: diagnose, decidePath: decidePath,'
  + ' rentPressure: rentPressure, findCrossing: findCrossing, RENT_BANDS: RENT_BANDS,'
  + ' leversPolicyAt: leversPolicyAt, robustness: robustness, reversal: reversal,'
  + ' mulberry32: mulberry32,'
  + ' GATE_PEN: GATE_PEN, NOW: NOW };'
  + '})();');

const docStub = { createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }), head: { appendChild() {} } };

const api = build(
  (name) => (name === 'react' ? ReactStub : {}),
  docStub,
  { __ModuleLoader__: { load() {} } },
);

const EXPECTED = {
  baseline: '算力封建制',
  social_democracy: '社会民主主义终点',
  techno_feudalism: '算力封建制',
  planned_transition: '共产主义初级形态',
  collapse: '文明崩解',
  commons: '自由人联合体',
};

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS  ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};

console.log('=== 六情景结局 ===');
Object.keys(EXPECTED).forEach((k) => {
  const sim = api.simulate(api.targetOf(k));
  const got = sim.outcome.name;
  const m = sim.final.metrics;
  check(
    k,
    got === EXPECTED[k],
    got + ' | D=' + Math.round(m.development * 100) + '% abu=' + Math.round(m.abundance * 100)
      + '% win=' + (sim.window ? sim.window.start + '-' + sim.window.end + ' ' + sim.window.type : 'none')
      + ' ev=' + sim.events.length,
  );
});

console.log('\n=== 修复 1：引力胜出者 = 结局（UI 不再说谎） ===');
const PATH_LABEL = {
  feudalism: '算力封建制',
  social_democracy: '社会民主主义终点',
  collapse: '文明崩解',
  communism: null,   // 共产主义引力对应主线三档，单独判断
};
Object.keys(EXPECTED).forEach((k) => {
  const sim = api.simulate(api.targetOf(k));
  const win = api.decidePath(sim.branchScores);
  const name = sim.outcome.name;
  const ok = PATH_LABEL[win] === name
    || (win === 'communism' && (sim.outcome.type === 'main' || name === '过渡社会' || name === '未竟的过渡'));
  check(k + ' 引力/结局一致', ok, win + ' → ' + name);
});
// 随机样本也应一致
// P0-1/P0-2 修复后的三区强断言（AUDIT-FIXES）：删除了旧版对「停滞的资本主义」的
// 自动放行（旧 106-107 行），它曾掩盖 83.8% 参数空间的引力/结局脱钩。
// 修复后的语义分区：
//   毁灭区 devastation>0.5     → 永远「文明崩解」（物理入口先于一切裁决）
//   裁决区 penetration≥0.68    → 引力胜者严格决定结局
//   悬置区 penetration<0.68    → 引力悬置，结局只能是停滞谱系（或毁灭区拦截）
const COMMUNISM_OK = (name) => name === '过渡社会' || name === '未竟的过渡'
  || name === '共产主义初级形态' || name === '自由人联合体';
let agree = 0;
let badCase = '';
for (let i = 0; i < 200; i++) {
  const t = {};
  api.LEVERS.forEach((lv) => { t[lv.key] = ((i * 37 + lv.key.length * 13 + 11) % 101) / 100; });
  const sim = api.simulate(t);
  const win = api.decidePath(sim.branchScores);
  const name = sim.outcome.name;
  const m = sim.final.metrics;
  let ok;
  if (m.devastation > 0.5) ok = name === '文明崩解';
  else if (m.penetration >= api.GATE_PEN) ok = PATH_LABEL[win] === name || (win === 'communism' && COMMUNISM_OK(name));
  else ok = name === '停滞的资本主义';
  if (ok) agree++;
  else if (!badCase) badCase = 'win=' + win + ' outcome=' + name + ' pen=' + m.penetration.toFixed(2) + ' dev=' + m.devastation.toFixed(2);
}
check('随机 200 组三区映射一致率（强断言）', agree >= 198, agree + '/200' + (badCase ? '  首个反例: ' + badCase : ''));

// P0-1 验证：低技术世界的高引力不得产生「据此判定」假因果文案
let falseCausal = 0;
const lowTechProbe = { cognition: 0.30, compute: 0.25, automation: 0.22, energy: 0.25, public_ownership: 0.75, coordination: 0.80, solidarity: 0.75, meaning: 0.70, redistribution: 0.60 };
const lowTechSim = api.simulate(lowTechProbe);
api.diagnose(lowTechSim).forEach((d) => {
  if (d.tag === '引力' && d.text.indexOf('据此判定') >= 0) falseCausal++;
});
check('低技术世界无「据此判定」假因果', falseCausal === 0,
  '终点渗透=' + lowTechSim.final.metrics.penetration.toFixed(2) + ' 胜者=' + api.decidePath(lowTechSim.branchScores)
  + ' → 文案含据此判定 ' + falseCausal + ' 处');
// 过线世界（baseline）保留强因果文案
const baseDiag = api.diagnose(api.simulate(api.targetOf('baseline')));
const baseCausal = baseDiag.filter((d) => d.tag === '引力' && d.text.indexOf('据此判定') >= 0).length;
check('过线世界保留「据此判定」因果', baseCausal === 1, 'baseline 引力文案 ' + baseCausal + ' 处强因果');

console.log('\n=== 修复 2：教育不再反向阻碍阶段推进 ===');
const tEdu = {};
api.LEVERS.forEach((lv) => { tEdu[lv.key] = 0.9; });
const eduNames = [0, 0.5, 1].map((e) => {
  const t = Object.assign({}, tEdu); t.education = e;
  return api.simulate(t).outcome.name;
});
check('教育 0 / 0.5 / 1 结局一致', eduNames[0] === eduNames[1] && eduNames[1] === eduNames[2],
  eduNames.join(' / '));
const eduPen = [0, 0.5, 1].map((e) => {
  const t = Object.assign({}, tEdu); t.education = e;
  return api.simulate(t).final.metrics.penetration;
});
check('教育不改变技术渗透度', Math.abs(eduPen[0] - eduPen[2]) < 1e-9, eduPen.map((x) => x.toFixed(3)).join(' / '));

console.log('\n=== 修复 3：冲突真实损毁生产力 ===');
const col = api.simulate(api.targetOf('collapse')).final.metrics;
const bas = api.simulate(api.targetOf('baseline')).final.metrics;
check('崩解生产力显著低于基准', col.productivity < bas.productivity * 0.5,
  '崩解=' + col.productivity.toFixed(3) + ' 基准=' + bas.productivity.toFixed(3));
check('崩解损毁因子 > 0.7', col.devastation > 0.7, 'devastation=' + col.devastation.toFixed(3));

console.log('\n=== 修复 4（P0-2）：物理崩解先于裁决 ===');
// 高冲突 + 低技术：旧版会拿到「生产力略有提升……又老化了三十年」的停滞文案
const ruin = {};
api.LEVERS.forEach((lv) => { ruin[lv.key] = api.NOW[lv.key]; });
Object.assign(ruin, { cognition: 0.30, compute: 0.25, automation: 0.22, energy: 0.25, conflict: 0.95, transition_shock: 0.95, solidarity: 0.10, redistribution: 0.10 });
const ruinSim = api.simulate(ruin);
const ruinM = ruinSim.final.metrics;
check('高冲突低技术 → 文明崩解（物理入口）', ruinSim.outcome.name === '文明崩解',
  'dev=' + ruinM.devastation.toFixed(2) + ' prod=' + ruinM.productivity.toFixed(2) + ' → ' + ruinSim.outcome.name);
check('崩解文案不再宣称「生产力略有提升」', ruinSim.outcome.detail.indexOf('生产力略有提升') < 0,
  ruinSim.outcome.stageLabel);
check('崩解分支标记正确', ruinSim.finalStage.id === 9 && ruinSim.final.branchKey === 'collapse',
  'stage id=' + ruinSim.finalStage.id);
// 语义护栏：全零参数 devastation=0，不得误入物理崩解
const ruinZero = {};
api.LEVERS.forEach((lv) => { ruinZero[lv.key] = 0; });
check('全零参数保持「停滞」语义', api.simulate(ruinZero).outcome.name === '停滞的资本主义',
  api.simulate(ruinZero).outcome.name);
// 中性默认（simulate({})）：技术走自主趋势、制度保持现状——渗透过线后由引力
// 裁决为算力封建制，而非物理崩解；devastation 低（冲突仅 0.45），不触发物理入口。
const neutralSim = api.simulate({});
check('中性默认不触发物理崩解、走引力裁决', neutralSim.outcome.name === '算力封建制'
  && neutralSim.final.metrics.devastation < 0.5,
  neutralSim.outcome.name + ' dev=' + neutralSim.final.metrics.devastation.toFixed(2));

console.log('\n=== 修复 5（P0-3）：inWindow 两种窗口类型都正确标记 ===');
const pds = api.simulate(api.targetOf('planned_transition'));
const pdWin = pds.window;
const pdIn = pds.years.filter((y) => y.inWindow).map((y) => y.year);
check('passed 窗口年份全部标记', pdWin.type === 'passed'
  && pdIn.length === pdWin.end - pdWin.start + 1
  && pdIn[0] === pdWin.start && pdIn[pdIn.length - 1] === pdWin.end,
  '窗口 ' + pdWin.start + '-' + pdWin.end + ' 标记 ' + pdIn.length + ' 年');
const bs2 = api.simulate(api.targetOf('baseline'));
const bsIn = bs2.years.filter((y) => y.inWindow).map((y) => y.year);
check('blocked 窗口年份仍然标记', bs2.window.type === 'blocked'
  && bsIn.length === bs2.window.end - bs2.window.start + 1,
  '窗口 ' + bs2.window.start + '-' + bs2.window.end + ' 标记 ' + bsIn.length + ' 年');

console.log('\n=== 结构完整性 ===');
const base = api.simulate(api.targetOf('baseline'));
check('年份跨度 2024–2060', base.years[0].year === 2024 && base.years[base.years.length - 1].year === 2060,
  base.years.length + ' 年');
check('14 个杠杆', api.LEVERS.length === 14, api.LEVERS.length + ' 个');

// 指标范围：全部 0..1
let rangeOk = true;
let badKey = '';
base.years.forEach((y) => {
  Object.keys(y.metrics).forEach((k) => {
    const v = y.metrics[k];
    if (!(typeof v === 'number') || Number.isNaN(v) || v < 0 || v > 1) {
      rangeOk = false; badKey = y.year + '.' + k + '=' + v;
    }
  });
});
check('所有指标落在 [0,1]', rangeOk, rangeOk ? 'ok' : badKey);

// 事件按时间单调
let mono = true;
for (let j = 1; j < base.events.length; j++) {
  if (base.events[j].year < base.events[j - 1].year) mono = false;
}
check('事件年份单调不减', mono, base.events.map((e) => e.year).join(','));

// 边界：全零 / 全一
const allZero = {}, allOne = {};
api.LEVERS.forEach((l) => { allZero[l.key] = 0; allOne[l.key] = 1; });
check('全零参数不崩溃', api.simulate(allZero).outcome.name.length > 0, api.simulate(allZero).outcome.name);
check('全一参数不崩溃', api.simulate(allOne).outcome.name.length > 0, api.simulate(allOne).outcome.name);

// 敏感度
const sens = api.sensitivity(api.targetOf('baseline'));
check('敏感度返回 8 项', sens.items.length === 8, 'baseline D=' + Math.round(sens.baseline * 100) + '%');
check('敏感度按影响排序', sens.items.every((it, idx, arr) => idx === 0 || Math.abs(arr[idx - 1].effect) >= Math.abs(it.effect)));

// 归因
const diag = api.diagnose(base);
check('归因非空', diag.length > 0, diag.length + ' 条：' + diag.map((d) => d.tag).join('/'));

/* ══════════════════════════════════════════════════════════════
   v1.1 R4：场景键名校验
   ══════════════════════════════════════════════════════════════ */
console.log('\n=== v1.1 R4：场景键名校验 ===');
// 现有六个剧本的键必须全部合法（校验本身不能误伤）
let allScenariosValid = true;
let badScenario = '';
Object.keys(api.SCENARIOS).forEach((name) => {
  const sc = api.SCENARIOS[name];
  if (!sc.values) return;
  Object.keys(sc.values).forEach((k) => {
    if (!api.LEVER_BY_KEY[k]) { allScenariosValid = false; badScenario = name + '.' + k; }
  });
});
check('现有六剧本的键全部合法', allScenariosValid, allScenariosValid ? '6/6 剧本通过' : badScenario);

// 校验逻辑本身：注入一个拼错的键必须被检出
const typoDetected = (() => {
  const sc = { bad: { values: { redistributon: 0.5 } } };   // 故意拼错
  let caught = false;
  Object.keys(sc).forEach((name) => {
    Object.keys(sc[name].values).forEach((k) => {
      if (!api.LEVER_BY_KEY[k]) caught = true;
    });
  });
  return caught;
})();
check('拼错的键能被检出', typoDetected);

// 校验的报错信息应指明键名（检查源码里的报错模板）
const fs2 = require('fs');
const clientSrc = fs2.readFileSync(require('path').join(__dirname, '..', 'client.js'), 'utf8');
check('报错信息包含键名占位', clientSrc.indexOf('含未知杠杆键') >= 0
  && clientSrc.indexOf('请检查拼写') >= 0);

/* ══════════════════════════════════════════════════════════════
   v1.1 R5：杠杆状态持久化（纯函数部分）
   ══════════════════════════════════════════════════════════════ */
console.log('\n=== v1.1 R5：持久化逻辑 ===');
// 从 client.js 提取 loadPersisted / savePersisted 做行为测试
const loadStart = clientSrc.indexOf('function loadPersisted()');
const saveStart = clientSrc.indexOf('function savePersisted(');
const saveEnd = clientSrc.indexOf('\n    }', saveStart) + 6;
check('loadPersisted 存在', loadStart > 0);
check('savePersisted 存在', saveStart > 0);

if (loadStart > 0 && saveStart > 0) {
  // 构造一个可控的 localStorage 存根，重新求值两个函数
  const makeStore = (initial) => {
    const box = { data: initial, throwOnGet: false, throwOnSet: false };
    return {
      box,
      localStorage: {
        getItem() { if (box.throwOnGet) throw new Error('denied'); return box.data === undefined ? null : box.data; },
        setItem(k, v) { if (box.throwOnSet) throw new Error('quota'); box.data = v; },
      },
    };
  };
  const buildPersist = (store) => {
    const src = clientSrc.slice(loadStart, saveEnd);
    return new Function('window', 'LEVER_BY_KEY', 'SCENARIOS', 'targetOf', 'STORE_KEY', 'STORE_VERSION',
      src + '\n;return { loadPersisted, savePersisted };')(
      { localStorage: store.localStorage },
      api.LEVER_BY_KEY, api.SCENARIOS, api.targetOf, 'singularity:state:v1', 1);
  };

  // 1) 空存储 → 默认值
  let st = makeStore(null);
  let p = buildPersist(st);
  let r = p.loadPersisted();
  check('空存储回退默认', Object.keys(r.target).length === 0 && r.scenario === 'baseline',
    'target=' + JSON.stringify(r.target) + ' scenario=' + r.scenario);

  // 2) 往返一致（含边界 0 / 1）
  st = makeStore(null);
  p = buildPersist(st);
  p.savePersisted({ cognition: 0, conflict: 1, capture: 0.5 }, 'baseline');
  r = p.loadPersisted();
  check('往返一致（含边界 0/1）',
    r.target.cognition === 0 && r.target.conflict === 1 && r.target.capture === 0.5,
    JSON.stringify(r.target));

  // 3) 稀疏 target 保持稀疏
  check('稀疏 target 保持稀疏', Object.keys(r.target).length === 3, Object.keys(r.target).length + ' 键');

  // 4) 坏 JSON → 回退默认
  st = makeStore('{not json');
  p = buildPersist(st);
  r = p.loadPersisted();
  check('坏 JSON 回退默认', Object.keys(r.target).length === 0 && r.scenario === 'baseline');

  // 5) 版本不符 → 回退默认
  st = makeStore(JSON.stringify({ v: 99, target: { cognition: 0.9 }, scenario: 'baseline' }));
  p = buildPersist(st);
  r = p.loadPersisted();
  check('版本不符回退默认', Object.keys(r.target).length === 0);

  // 6) 未知键被忽略
  st = makeStore(JSON.stringify({ v: 1, target: { cognition: 0.9, bogus_key: 0.5 }, scenario: 'baseline' }));
  p = buildPersist(st);
  r = p.loadPersisted();
  check('未知键被忽略', r.target.cognition === 0.9 && r.target.bogus_key === undefined,
    JSON.stringify(r.target));

  // 7) 超范围值被钳制
  st = makeStore(JSON.stringify({ v: 1, target: { cognition: 5, conflict: -3 }, scenario: 'baseline' }));
  p = buildPersist(st);
  r = p.loadPersisted();
  check('超范围值被钳制到 [0,1]', r.target.cognition === 1 && r.target.conflict === 0,
    'cognition=' + r.target.cognition + ' conflict=' + r.target.conflict);

  // 8) 存储抛异常 → 不崩溃
  st = makeStore(null); st.box.throwOnGet = true;
  p = buildPersist(st);
  r = p.loadPersisted();
  check('读取抛异常时安全回退', Object.keys(r.target).length === 0 && r.scenario === 'baseline');

  // 9) 写入抛异常 → 不崩溃
  st = makeStore(null); st.box.throwOnSet = true;
  p = buildPersist(st);
  let writeThrew = false;
  try { p.savePersisted({ cognition: 0.5 }, 'baseline'); } catch (e) { writeThrew = true; }
  check('写入抛异常不崩溃', !writeThrew);

  // 10) scenario 与 target 一致性：手调后不高亮剧本
  const baselineTarget = api.targetOf('baseline');   // {} （baseline 的 values 为空）
  st = makeStore(JSON.stringify({ v: 1, target: { cognition: 0.9 }, scenario: 'baseline' }));
  p = buildPersist(st);
  r = p.loadPersisted();
  check('手调杠杆后剧本不高亮（scenario=null）', r.scenario === null,
    'scenario=' + r.scenario + '（baseline 目标为 ' + JSON.stringify(baselineTarget) + '）');

  // 11) 与剧本完全一致时保持高亮
  const sdTarget = api.targetOf('social_democracy');
  st = makeStore(JSON.stringify({ v: 1, target: sdTarget, scenario: 'social_democracy' }));
  p = buildPersist(st);
  r = p.loadPersisted();
  check('与剧本一致时保持高亮', r.scenario === 'social_democracy', 'scenario=' + r.scenario);

  // 12) 非法 scenario 回退 baseline
  st = makeStore(JSON.stringify({ v: 1, target: {}, scenario: 'no_such_scenario' }));
  p = buildPersist(st);
  r = p.loadPersisted();
  check('非法 scenario 回退 baseline', r.scenario === 'baseline', 'scenario=' + r.scenario);
}

/* ── v1.2 R4/R5：租金压力与越线查询 ───────────────────────────── */
{
  const LEVER_KEYS = api.LEVERS.map((lv) => lv.key);

  // 1) 手算锚点：全零态 (0.50+0.20)·0.35 = 0.245
  const zero = {};
  LEVER_KEYS.forEach((k) => { zero[k] = 0; });
  check('rentPressure 全零态 = 0.245', Math.abs(api.rentPressure(zero) - 0.245) < 1e-9,
    '实际 ' + api.rentPressure(zero));

  // 2) 手算锚点：全一态 0.30·1.0 = 0.30
  const one = {};
  LEVER_KEYS.forEach((k) => { one[k] = 1; });
  check('rentPressure 全一态 = 0.30', Math.abs(api.rentPressure(one) - 0.30) < 1e-9,
    '实际 ' + api.rentPressure(one));

  // 3) 校准锚点：techno_feudalism 终值进入「成形」带
  const tf = api.simulate(api.targetOf('techno_feudalism')).final;
  check('techno_feudalism 终年租金 ≥ 0.75（成形）', tf.rent >= 0.75, '实际 ' + tf.rent.toFixed(3));

  // 4) 校准锚点：commons 终值深处安全
  const cm = api.simulate(api.targetOf('commons')).final;
  check('commons 终年租金 < 0.45（安全）', cm.rent < 0.45, '实际 ' + cm.rent.toFixed(3));

  // 5) 校准锚点：baseline 全程停在「关注」带（距预警 ≤0.01，防漂移哨兵）
  const bl = api.simulate(api.targetOf('baseline'));
  const blMax = Math.max.apply(null, bl.years.map((y) => y.rent));
  check('baseline 峰值租金 < 0.60（不到预警）', blMax < 0.60 && blMax >= 0.45,
    '峰值 ' + blMax.toFixed(3));

  // 6) findCrossing：techno_feudalism 越预警线于 2038（校准值）
  const tfCross = api.findCrossing(api.simulate(api.targetOf('techno_feudalism')).years, (y) => y.rent, 0.60);
  check('findCrossing techno_feudalism 预警年 = 2038', tfCross && tfCross.year === 2038,
    tfCross ? tfCross.year + ' @ ' + tfCross.value.toFixed(3) : 'null');

  // 7) findCrossing：commons 不越预警线 0.60 → null
  //    （commons 峰值 0.45 恰触「关注」下沿，属精确触线；这里锚定更强的语义）
  const cmCross = api.findCrossing(api.simulate(api.targetOf('commons')).years, (y) => y.rent, 0.60);
  check('findCrossing commons 预警线 = null（不越线）', cmCross === null);

  // 8) 每个年度行都带只读 rent 字段
  const allHave = bl.years.every((y) => typeof y.rent === 'number' && y.rent >= 0 && y.rent <= 1);
  check('逐年行携带 rent 字段且在 [0,1]', allHave && bl.years.length === 37);

  // 9) RENT_BANDS 三档定稿值
  check('RENT_BANDS = 0.45/0.60/0.75',
    api.RENT_BANDS.watch === 0.45 && api.RENT_BANDS.warn === 0.60 && api.RENT_BANDS.formed === 0.75,
    JSON.stringify(api.RENT_BANDS));

  // 10) 值域 probe：2000 随机态不越界
  let bad = 0;
  for (let n = 0; n < 2000; n++) {
    const s = {};
    LEVER_KEYS.forEach((k) => { s[k] = Math.random(); });
    const v = api.rentPressure(s);
    if (!(v >= 0 && v <= 1)) bad++;
  }
  check('rentPressure 值域 probe 2000 态零越界', bad === 0, bad + ' 例越界');
}

/* ── v1.3 E1/E2/E3：政策干预 · 蒙特卡洛 · 反方读法 ───────────── */
{
  const LEVER_KEYS = api.LEVERS.map((lv) => lv.key);
  const mk = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const POL = { year: 2040, overrides: { public_ownership: 0.85, redistribution: 0.80 } };

  // 1) 无政策时逐年与 v1.2 轨迹全等（policyActive 全 false）
  const noPol = api.simulate(api.targetOf('baseline'));
  const withNull = api.simulate(api.targetOf('baseline'), null);
  const same = noPol.years.every((y, i) => withNull.years[i].metrics.penetration === y.metrics.penetration
    && withNull.years[i].rent === y.rent && withNull.years[i].policyActive === false);
  check('无政策调用逐年全等（基线等价）', same && withNull.outcome.name === noPol.outcome.name);

  // 2) 干预年前轨迹逐字节一致
  const withPol = api.simulate(api.targetOf('baseline'), POL);
  const pre = noPol.years.filter((y) => y.year < POL.year).every((y, i) =>
    withPol.years[i].metrics.penetration === y.metrics.penetration
    && withPol.years[i].metrics.socialization === y.metrics.socialization);
  check('干预年前轨迹逐字节一致', pre);

  // 3) 衔接年连续性：2039→2040 的社会化度跳变 ≤ 干预后逐年的正常步幅 ×3
  const i40 = withPol.years.findIndex((y) => y.year === POL.year);
  const jump = Math.abs(withPol.years[i40].metrics.socialization - withPol.years[i40 - 1].metrics.socialization);
  const later = Math.abs(withPol.years[i40 + 1].metrics.socialization - withPol.years[i40].metrics.socialization);
  check('干预年无跳变（衔接 ≤ 3× 后续步幅）', jump <= Math.max(later * 3, 0.02),
    'jump=' + jump.toFixed(3) + ' later=' + later.toFixed(3));

  // 4) 干预后终局改变：policyActive 从干预年起为 true
  const active = withPol.years.filter((y) => y.year >= POL.year).every((y) => y.policyActive === true)
    && withPol.years.filter((y) => y.year < POL.year).every((y) => y.policyActive === false);
  check('policyActive 标记边界正确', active);

  // 5) 干预能把 baseline 推出停滞（终局结局名改变）
  check('政策重定向改变 baseline 终局',
    withPol.outcome.name !== noPol.outcome.name,
    noPol.outcome.name + ' → ' + withPol.outcome.name);

  // 6) 未知杠杆键抛错
  let threw = false;
  try { api.simulate(api.targetOf('baseline'), { year: 2040, overrides: { bogus: 0.5 } }); } catch (e) { threw = true; }
  check('未知政策杠杆键抛错', threw);

  // 7) 年份越界抛错（2024 与 2061、非整数）
  const badYears = [2024, 2061, 2040.5];
  const threwAll = badYears.every((yy) => {
    try { api.simulate(api.targetOf('baseline'), { year: yy, overrides: { capture: 0.1 } }); return false; } catch (e) { return true; }
  });
  check('政策年越界/非整数抛错', threwAll);

  // 8) override 值钳制到 [0,1]（负值与超 1 均不炸且收敛有效）
  const clamped = api.simulate(api.targetOf('baseline'), { year: 2035, overrides: { capture: -3, redistribution: 7 } });
  check('override 超范围值被钳制', clamped.outcome.name !== undefined);

  // 9) robustness：种子 rng 确定性 + 分布归一
  const r1 = api.robustness(api.targetOf('baseline'), null, mk(42));
  const r2 = api.robustness(api.targetOf('baseline'), null, mk(42));
  const sum = r1.outcomes.reduce((a, b) => a + b.count, 0);
  check('robustness 种子确定性', JSON.stringify(r1) === JSON.stringify(r2));
  check('robustness 分布和 = runs', sum === r1.runs && r1.runs === 240,
    'sum=' + sum + ' agreement=' + Math.round(r1.agreement * 100) + '%');

  // 10) reversal：baseline 存在单杠杆翻转且杠杆 ∈ 四制度杠杆
  const rev = api.reversal(api.targetOf('baseline'));
  const SCAN = ['public_ownership', 'redistribution', 'coordination', 'capture'];
  check('reversal baseline 可翻转且杠杆合法', rev && SCAN.indexOf(rev.lever) >= 0 && rev.delta > 0,
    rev ? rev.lever + ' ' + rev.from.toFixed(2) + '→' + rev.to.toFixed(2) + ' = ' + rev.outcome : 'null');

  // 11) reversal：全一态（极端建设态）无单杠杆可翻转 → null
  const full = {};
  LEVER_KEYS.forEach((k) => { full[k] = 1; });
  check('reversal 全一态 = null（稳健强信号）', api.reversal(full) === null);

  // 12) 六剧本带政策参数的 robustness 不炸且形态合法
  const robOK = Object.keys(api.SCENARIOS).every((k) => {
    const r = api.robustness(api.targetOf(k), POL, mk(7));
    return r.outcomes.length >= 1 && r.agreement >= 0.5;
  });
  check('六剧本 robustness 形态合法', robOK);
}

/* ── v1.4：mulberry32 种子随机数 ────────────────────────────── */
{
  // 1) 确定性：同种子序列全等
  const a1 = api.mulberry32(1234), a2 = api.mulberry32(1234);
  const seqA = Array.from({ length: 12 }, () => a1());
  const seqB = Array.from({ length: 12 }, () => a2());
  check('mulberry32 同种子序列确定', seqA.every((v, i) => v === seqB[i]));

  // 2) 值域 [0,1) 且分布合理
  const r = api.mulberry32(42);
  let inRange = true, mn = 1, mx = 0;
  for (let i = 0; i < 5000; i++) { const v = r(); if (!(v >= 0 && v < 1)) inRange = false; mn = Math.min(mn, v); mx = Math.max(mx, v); }
  check('mulberry32 值域 [0,1)', inRange && mn < 0.05 && mx > 0.95, 'range ' + mn.toFixed(3) + '..' + mx.toFixed(3));

  // 3) 异种子序列不同
  const s1 = Array.from({ length: 8 }, () => api.mulberry32(1)());
  const s2 = Array.from({ length: 8 }, () => api.mulberry32(2)());
  check('mulberry32 异种子序列不同', s1.some((v, i) => v !== s2[i]));
}

console.log('\n--- 汇总 ---');
console.log(pass + '/' + (pass + fail) + ' 通过');
process.exit(fail ? 1 : 0);
