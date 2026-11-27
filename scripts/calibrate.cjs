/**
 * v1.6 T5：模型校准扫描 —— 把契约 §9 的「已知非对称与局限」变成可查数据。
 *
 * 输出 docs/calibration.json（入库），由面板「模型体检」标签页只读展示。
 * 构建期生成、运行时只读：面板不做 2000 次 simulate 的重算。
 *
 * 可复现：固定种子（与 tests/adversarial.test.cjs 一致），同版本同输出。
 * 用法: node scripts/calibrate.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

/* ── 引擎装载（与测试同源的切片加载器）── */
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');
const start = src.indexOf('factory(require) {');
const bodyStart = src.indexOf('{', start) + 1;
let depth = 1, i = bodyStart;
for (; i < src.length && depth > 0; i++) {
  const ch = src[i];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
}
const body = src.slice(bodyStart, i - 1);
const patched = body.replace(/return\s*\{\s*\n\s*inject:/, 'const __exports = { inject:');
const ReactStub = {
  Component: class { constructor(p) { this.props = p || {}; this.state = {}; } setState(x) { this.state = Object.assign({}, this.state, typeof x === "function" ? x(this.state) : x); } }, createElement: () => ({}), useState: (v) => [v, () => {}], useMemo: (f) => f(), useEffect: () => {} };
const api = new Function('require', 'document', 'window',
  'return (function(){' + patched
  + '\n;return { simulate, targetOf, SCENARIOS, LEVERS, decidePath, branchScores,'
  + ' NOW, TECH_TREND, GATE_PEN, GATE_SOC, COLLAPSE_GAIN };'
  + '})();')(
  (n) => (n === 'react' ? ReactStub : {}),
  { createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }), head: { appendChild() {} } },
  { __ModuleLoader__: { load() {} } },
);

function makeRng(seedInit) {
  let seed = seedInit;
  return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
}
function randomTarget(rng) {
  const t = {};
  api.LEVERS.forEach((lv) => { t[lv.key] = rng(); });
  return t;
}
const pct = (ratio) => Math.round(ratio * 1000) / 10;   // 比例 0–1 → 百分比一位小数

/* ── 1. 结局分布 + 引力分布（2000 组均匀随机）── */
const N = 2000;
const rng = makeRng(42);
const outcomeDist = {}, winnerDist = {};
const rents = [];
for (let k = 0; k < N; k++) {
  const t = randomTarget(rng);
  const sim = api.simulate(t);
  outcomeDist[sim.outcome.name] = (outcomeDist[sim.outcome.name] || 0) + 1;
  const w = api.decidePath(sim.branchScores);
  winnerDist[w] = (winnerDist[w] || 0) + 1;
  rents.push(sim.final.rent);
}

/* ── 2. 租金分位 ── */
rents.sort((a, b) => a - b);
const quantile = (q) => rents[Math.min(rents.length - 1, Math.floor(q * rents.length))];
const rentBands = { safe: 0, watch: 0, warn: 0, formed: 0 };
rents.forEach((r) => {
  if (r >= 0.75) rentBands.formed++;
  else if (r >= 0.60) rentBands.warn++;
  else if (r >= 0.45) rentBands.watch++;
  else rentBands.safe++;
});

/* ── 3. COLLAPSE_GAIN 敏感性（回答契约 §9.1）──
   引擎里 COLLAPSE_GAIN 是 const，无法从外部改。改用等价手段：
   记录当前值下崩解在随机空间的胜率，并说明「若该系数更高，崩解胜率只会更高」
   —— 真正的系数扫描需要改源码，本脚本如实标注为不可外部扫描。 */
const collapseWinRate = pct((winnerDist.collapse || 0) / N);

/* ── 4. 社民路径依赖（回答契约 §9.2 / §9.3）── */
const rng2 = makeRng(7);
let socWin = 0, socWinLowPub = 0, socTotal = 5000;
for (let k = 0; k < socTotal; k++) {
  const t = randomTarget(rng2);
  const sim = api.simulate(t);
  if (api.decidePath(sim.branchScores) === 'social_democracy') {
    socWin++;
    if (t.public_ownership < 0.62) socWinLowPub++;
  }
}

/* ── 5. 抖动统计（回答契约 §9.4 前馈稳定性）── */
const rng3 = makeRng(42);
const flipsHist = {};
let maxFlips = 0;
for (let k = 0; k < 300; k++) {
  const t = randomTarget(rng3);
  const sim = api.simulate(t);
  let flips = 0;
  for (let j = 1; j < sim.years.length; j++) {
    if (sim.years[j].path !== sim.years[j - 1].path) flips++;
  }
  flipsHist[flips] = (flipsHist[flips] || 0) + 1;
  maxFlips = Math.max(maxFlips, flips);
}

/* ── 6. 六剧本锚点（供面板核对）── */
const anchors = Object.keys(api.SCENARIOS).map((k) => {
  const sim = api.simulate(api.targetOf(k));
  return {
    scenario: k,
    name: api.SCENARIOS[k].name,
    outcome: sim.outcome.name,
    rent: Math.round(sim.final.rent * 1000) / 1000,
    development: Math.round(sim.final.metrics.development * 1000) / 1000,
  };
});

let version = 'unknown', commit = 'unknown';
try { version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; } catch (e) { /* 忽略 */ }
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* 忽略 */ }

const report = {
  generatedAt: new Date().toISOString(),
  version,
  commit,
  seed: 42,
  samples: N,
  note: '构建期生成的采样报告。固定种子，同版本同输出。这是某次采样的结果，不是「模型真理」。',
  outcomeDistribution: Object.keys(outcomeDist)
    .sort((a, b) => outcomeDist[b] - outcomeDist[a])
    .map((k) => ({ name: k, count: outcomeDist[k], pct: pct(outcomeDist[k] / N) })),
  winnerDistribution: Object.keys(winnerDist)
    .sort((a, b) => winnerDist[b] - winnerDist[a])
    .map((k) => ({ key: k, count: winnerDist[k], pct: pct(winnerDist[k] / N) })),
  rentQuantiles: {
    p10: Math.round(quantile(0.10) * 1000) / 1000,
    p25: Math.round(quantile(0.25) * 1000) / 1000,
    p50: Math.round(quantile(0.50) * 1000) / 1000,
    p75: Math.round(quantile(0.75) * 1000) / 1000,
    p90: Math.round(quantile(0.90) * 1000) / 1000,
    bands: {
      safe: pct(rentBands.safe / N),
      watch: pct(rentBands.watch / N),
      warn: pct(rentBands.warn / N),
      formed: pct(rentBands.formed / N),
    },
  },
  asymmetries: {
    collapseGain: {
      value: api.COLLAPSE_GAIN,
      winRatePct: collapseWinRate,
      caveat: '该系数是编译期常量，本脚本无法从外部扫描不同取值。'
        + '此处的胜率是「当前系数下」的实测值；契约 §9.1 的质疑（系数无独立实证依据）依然成立。',
    },
    socialDemocracy: {
      totalSamples: socTotal,
      wins: socWin,
      winsWithLowPublicOwnership: socWinLowPub,
      pathDependencyConfirmed: socWin > 0 && socWinLowPub === socWin,
      caveat: 'reformRoom 折减使该路径在 public_ownership ≥ 0.62 时失效——这不是采样噪声，是公式的必然结果。',
    },
    chattering: {
      samples: 300,
      maxFlips,
      histogram: flipsHist,
      caveat: '前馈模型无内生临界点，路径翻转只发生在两个人工闸门附近，因此抖动天然有限。',
    },
  },
  anchors,
};

const outPath = path.join(ROOT, 'docs', 'calibration.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log('已生成 docs/calibration.json');
console.log('  结局分布: ' + report.outcomeDistribution.map((o) => o.name + ' ' + o.pct + '%').join(' / '));
console.log('  引力分布: ' + report.winnerDistribution.map((o) => o.key + ' ' + o.pct + '%').join(' / '));
console.log('  租金中位: ' + report.rentQuantiles.p50 + ' | 社民路径依赖: ' + socWinLowPub + '/' + socWin);
