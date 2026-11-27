/**
 * 对抗性回归测试（v1.5 · T2）
 *
 * 来源：scripts/audit-probe.cjs 与 audit-probe2.cjs——两份探针自 v1.0.1 起就在仓库里，
 * 但它们只 console.log 取证、不做断言，所以任何回归都不会让 CI 变红。
 * 本文件把「已验证为真的性质」固化成断言，随 npm test 运行。
 *
 * 断言策略分两类：
 *  - 语义一致性（B/E 组）：硬断言，零容差——这些是 v1.0.1 修复的守护神
 *  - 分布（A 组）：容差断言（±6 个百分点）——抓系数剧变，但不因微小抖动变脆
 */
const fs = require('fs');
const path = require('path');

/* ── 引擎加载器（与 tests/engine.test.cjs 同源，保持独立以免相互依赖）── */
const src = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8');
const start = src.indexOf('factory(require) {');
if (start < 0) throw new Error('找不到 factory');
const bodyStart = src.indexOf('{', start) + 1;
let depth = 1, i = bodyStart;
for (; i < src.length && depth > 0; i++) {
  const ch = src[i];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
}
const body = src.slice(bodyStart, i - 1);
const EXPORT_RE = /return\s*\{\s*\n\s*inject:/;
if (!EXPORT_RE.test(body)) throw new Error('找不到工厂的导出 return');
const patched = body.replace(EXPORT_RE, 'const __exports = { inject:');

const ReactStub = {
  Component: class { constructor(p) { this.props = p || {}; this.state = {}; } setState(x) { this.state = Object.assign({}, this.state, typeof x === "function" ? x(this.state) : x); } },
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (v) => [v, () => {}],
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  useEffect: () => {},
};
const docStub = { createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }), head: { appendChild() {} } };

const api = new Function('require', 'document', 'window',
  'return (function(){' + patched
  + '\n;return { simulate, targetOf, SCENARIOS, LEVERS, diagnose, decidePath,'
  + ' branchScores, NOW, TECH_TREND, GATE_PEN, GATE_SOC };'
  + '})();')(
  (name) => (name === 'react' ? ReactStub : {}),
  docStub,
  { __ModuleLoader__: { load() {} } },
);

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS  ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};

/* ── 可复现随机（LCG，与探针同算法，保证与取证数值可比）── */
function makeRng(seedInit) {
  let seed = seedInit;
  return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
}
function randomTargets(rng, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = {};
    api.LEVERS.forEach((lv) => { t[lv.key] = rng(); });
    out.push(t);
  }
  return out;
}

/* ══ A. 分布断言（容差型）══ */
console.log('=== A. 随机参数空间的结局/引力分布 ===');
{
  const rng = makeRng(42);
  const targets = randomTargets(rng, 2000);
  const dist = {}, winner = {};
  targets.forEach((t) => {
    const sim = api.simulate(t);
    dist[sim.outcome.name] = (dist[sim.outcome.name] || 0) + 1;
    const w = api.decidePath(sim.branchScores);
    winner[w] = (winner[w] || 0) + 1;
  });
  const pct = (k) => (dist[k] || 0) / 20;       // 2000 组 → 百分比
  const wpct = (k) => (winner[k] || 0) / 20;

  // 实测锚点（v1.4.2 取证）：停滞 66.1% / 崩解 22.8% / 封建 3.8%
  check('结局分布·停滞的资本主义 在 60–72%', pct('停滞的资本主义') >= 60 && pct('停滞的资本主义') <= 72,
    pct('停滞的资本主义').toFixed(1) + '%');
  check('结局分布·文明崩解 在 17–29%', pct('文明崩解') >= 17 && pct('文明崩解') <= 29,
    pct('文明崩解').toFixed(1) + '%');
  check('结局分布·算力封建制 在 1.5–7%', pct('算力封建制') >= 1.5 && pct('算力封建制') <= 7,
    pct('算力封建制').toFixed(1) + '%');

  // 引力胜者（实测）：communism 46.1 / feudalism 24.9 / collapse 23.8 / social 5.2
  check('引力·communism 在 40–52%', wpct('communism') >= 40 && wpct('communism') <= 52,
    wpct('communism').toFixed(1) + '%');
  check('引力·collapse 在 18–30%', wpct('collapse') >= 18 && wpct('collapse') <= 30,
    wpct('collapse').toFixed(1) + '%');
  check('引力·social_democracy 在 3–8%', wpct('social_democracy') >= 3 && wpct('social_democracy') <= 8,
    wpct('social_democracy').toFixed(1) + '%');

  // 分布必须覆盖全部四引力（不得有引力永不胜出）
  check('四引力在随机空间均可达',
    ['communism', 'feudalism', 'collapse', 'social_democracy'].every((k) => (winner[k] || 0) > 0),
    Object.keys(winner).length + ' 种胜者');
}

/* ══ B. 语义一致性断言（硬断言 · v1.0.1 修复的守护神）══ */
console.log('\n=== B. 引力与结局的语义一致性 ===');
{
  const rng = makeRng(42);
  const targets = randomTargets(rng, 2000);
  let falseCausality = 0;      // 共产引力胜出、已过裁决线、未毁灭，却非共产谱系
  let feudalLowCapture = 0;    // 封建引力胜出但捕获极低
  targets.forEach((t) => {
    const sim = api.simulate(t);
    const w = api.decidePath(sim.branchScores);
    const m = sim.final.metrics;
    if (w === 'communism' && m.penetration >= api.GATE_PEN && m.devastation <= 0.5
      && !(sim.outcome.type === 'main' || sim.outcome.name === '过渡社会' || sim.outcome.name === '未竟的过渡')) {
      falseCausality++;
    }
    if (w === 'feudalism' && t.capture < 0.3) feudalLowCapture++;
  });
  check('零假因果：共产引力过线者必落共产谱系', falseCausality === 0, falseCausality + ' 违例');
  check('封建引力不在低捕获(<0.3)下胜出', feudalLowCapture === 0, feudalLowCapture + ' 违例');
}

/* ══ C. 稳定性断言 ══ */
console.log('\n=== C. 稳定性与确定性 ===');
{
  const rng = makeRng(42);
  const targets = randomTargets(rng, 300);
  let chattering = 0, worst = 0;
  targets.forEach((t) => {
    const sim = api.simulate(t);
    let flips = 0;
    for (let j = 1; j < sim.years.length; j++) {
      if (sim.years[j].path !== sim.years[j - 1].path) flips++;
    }
    worst = Math.max(worst, flips);
    if (flips >= 6) chattering++;
  });
  check('无路径抖动（翻转≥6次的样本为0）', chattering === 0, '最多翻转 ' + worst + ' 次');

  // 纯函数确定性：同输入两次输出逐字节相等
  const t = api.targetOf('baseline');
  const a = JSON.stringify(api.simulate(t));
  const b = JSON.stringify(api.simulate(t));
  check('simulate 纯函数确定性（同输入逐字节相等）', a === b, a.length + ' 字节');

  // 微扰不引发路径翻转风暴
  const base = api.targetOf('baseline');
  let maxFlips = 0;
  api.LEVERS.forEach((lv) => {
    const t2 = Object.assign({}, base);
    t2[lv.key] = Math.max(0, Math.min(1, (base[lv.key] !== undefined ? base[lv.key] : api.NOW[lv.key]) + 0.01));
    const s2 = api.simulate(t2);
    let flips = 0;
    for (let j = 1; j < s2.years.length; j++) if (s2.years[j].path !== s2.years[j - 1].path) flips++;
    maxFlips = Math.max(maxFlips, flips);
  });
  check('±0.01 微扰不产生路径翻转风暴（<6次）', maxFlips < 6, '最多 ' + maxFlips + ' 次');
}

/* ══ D. 窗口标记断言（P0-3 修复守护）══ */
console.log('\n=== D. 窗口标记（inWindow）===');
{
  const pd = api.simulate(api.targetOf('planned_transition'));
  const inWin = pd.years.filter((y) => y.inWindow);
  const expectLen = pd.window.end - pd.window.start + 1;
  check('planned_transition(passed) 窗口内年份全部标记',
    inWin.length === expectLen
    && inWin.every((y) => y.year >= pd.window.start && y.year <= pd.window.end),
    inWin.length + '/' + expectLen + ' 年（' + pd.window.start + '–' + pd.window.end + '）');
  check('planned_transition 窗口外年份不标记',
    pd.years.filter((y) => !y.inWindow).every((y) => y.year < pd.window.start || y.year > pd.window.end));

  const bl = api.simulate(api.targetOf('baseline'));
  const blIn = bl.years.filter((y) => y.inWindow);
  check('baseline(blocked) 窗口标记正确',
    blIn.length === bl.window.end - bl.window.start + 1,
    blIn.length + ' 年（' + bl.window.start + '–' + bl.window.end + '）');

  // 全零参数：devastation=0 不触发崩解物理入口
  const zero = {};
  api.LEVERS.forEach((lv) => { zero[lv.key] = 0; });
  const sz = api.simulate(zero);
  check('全零参数 devastation=0 且不误触崩解',
    sz.final.metrics.devastation === 0 && sz.outcome.name !== '文明崩解',
    '结局=' + sz.outcome.name);
}

/* ══ E. 诚实性断言（与 v1.5 T4 呼应）══ */
console.log('\n=== E. 文案与结构的诚实性 ===');
{
  // 高冲突低技术：必须先崩解，且文案不得称「生产力略有提升」
  const t = { cognition: 0.30, compute: 0.25, automation: 0.22, energy: 0.25,
    conflict: 0.95, transition_shock: 0.95, solidarity: 0.10, redistribution: 0.10 };
  const s = api.simulate(t);
  const m = s.final.metrics;
  check('高冲突低技术 → 文明崩解', s.outcome.name === '文明崩解',
    '损毁=' + Math.round(m.devastation * 100) + '% 生产力=' + Math.round(m.productivity * 100) + '%');
  check('崩解文案不称「生产力略有提升」',
    !/生产力略有提升/.test(s.outcome.detail), s.outcome.detail.slice(0, 24) + '…');

  // 渗透未过线时，diagnose 不得声称「据此判定」
  const t2 = { cognition: 0.30, compute: 0.25, automation: 0.22, energy: 0.25,
    public_ownership: 0.75, coordination: 0.80, solidarity: 0.75, meaning: 0.70, redistribution: 0.60 };
  const s2 = api.simulate(t2);
  const texts = api.diagnose(s2).map((d) => d.text).join(' ');
  check('渗透未过线时 diagnose 不断言「据此判定」',
    s2.final.metrics.penetration < api.GATE_PEN && !/据此判定/.test(texts),
    '渗透=' + s2.final.metrics.penetration.toFixed(3));

  // 社民路径依赖：胜出样本必须全部 pub<0.62（reformRoom 折减的必然结果）
  const rng = makeRng(7);
  let socWin = 0, socWinLowPub = 0;
  for (let k = 0; k < 5000; k++) {
    const tt = {};
    api.LEVERS.forEach((lv) => { tt[lv.key] = rng(); });
    const ss = api.simulate(tt);
    if (api.decidePath(ss.branchScores) === 'social_democracy') {
      socWin++;
      if (tt.public_ownership < 0.62) socWinLowPub++;
    }
  }
  check('社民路径依赖：胜出者全部 pub_ownership<0.62',
    socWin > 0 && socWinLowPub === socWin, socWinLowPub + '/' + socWin + '（5000 组）');
}

/* ══ F. 校准报告一致性（v1.6 T5）══ */
console.log('\n=== F. 校准报告与实测一致 ===');
{
  const calPath = path.join(__dirname, '..', 'docs', 'calibration.json');
  let cal = null;
  try { cal = JSON.parse(fs.readFileSync(calPath, 'utf8')); } catch (e) { /* 缺失 */ }
  check('docs/calibration.json 可读', !!cal, cal ? 'ok' : '运行 node scripts/calibrate.cjs');

  if (cal) {
    // 用同一批随机参数重算，与报告比对应在容差内
    const rng = makeRng(cal.seed);
    const dist = {};
    for (let k = 0; k < cal.samples; k++) {
      const t = {};
      api.LEVERS.forEach((lv) => { t[lv.key] = rng(); });
      const sim = api.simulate(t);
      dist[sim.outcome.name] = (dist[sim.outcome.name] || 0) + 1;
    }
    const drifted = cal.outcomeDistribution.filter((o) => {
      const now = dist[o.name] || 0;
      return Math.abs(now - o.count) > 0;   // 同种子必须逐组相同
    });
    check('校准报告与同种子重算逐组一致', drifted.length === 0,
      drifted.length === 0 ? cal.samples + ' 组全等'
        : drifted.map((o) => o.name + ' ' + o.count + '→' + (dist[o.name] || 0)).join(', '));

    // 社民路径依赖必须在报告里如实记录
    check('校准报告记录社民路径依赖结论',
      cal.asymmetries.socialDemocracy.wins > 0
      && cal.asymmetries.socialDemocracy.winsWithLowPublicOwnership
        === cal.asymmetries.socialDemocracy.wins,
      cal.asymmetries.socialDemocracy.winsWithLowPublicOwnership + '/'
      + cal.asymmetries.socialDemocracy.wins);

    // 锚点必须与当前引擎一致（防止报告过期）
    const anchorBad = cal.anchors.filter((a) => {
      const sim = api.simulate(api.targetOf(a.scenario));
      return sim.outcome.name !== a.outcome
        || Math.abs(sim.final.rent - a.rent) > 0.001;
    });
    check('校准报告六剧本锚点与当前引擎一致', anchorBad.length === 0,
      anchorBad.length ? '过期: ' + anchorBad.map((a) => a.scenario).join(',') : '6/6 一致');
  }
}

console.log('\n--- 汇总 ---');
console.log(pass + '/' + (pass + fail) + ' 通过');
process.exit(fail ? 1 : 0);
