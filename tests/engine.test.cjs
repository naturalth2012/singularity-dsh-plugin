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
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (v) => [v, () => {}],
  useMemo: (fn) => fn(),
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
  + ' LEVERS: LEVERS, sensitivity: sensitivity, diagnose: diagnose, decidePath: decidePath,'
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

console.log('\n--- 汇总 ---');
console.log(pass + '/' + (pass + fail) + ' 通过');
process.exit(fail ? 1 : 0);
