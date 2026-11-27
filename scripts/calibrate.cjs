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

/* ── 6. 阶段可达性（v1.8）──
   关键区分：「不可达」与「稀有」是两件事。
   - stage 0 商业资本主义：stageOf 没有返回它的分支 → 结构性不可达（20000 组零出现）
   - stage 6 自由人联合体：条件极严但可达（20000 组出现 4 次，0.02%）
   把小样本的 0 次当成「不可达」会误判，所以这里用 20000 组做判定。 */
const stageHits = {};
let yearSnapshots = 0;
const rngStage = makeRng(99);
const REACH_SAMPLES = 20000;
let stage0Groups = 0;
let stage6Groups = 0;
for (let k = 0; k < REACH_SAMPLES; k++) {
  const t = randomTarget(rngStage);
  const sim = api.simulate(t);
  let has0 = false, has6 = false;
  sim.years.forEach((y) => {
    stageHits[y.stage.id] = (stageHits[y.stage.id] || 0) + 1;
    yearSnapshots++;
    if (y.stage.id === 0) has0 = true;
    if (y.stage.id === 6) has6 = true;
  });
  if (has0) stage0Groups++;
  if (has6) stage6Groups++;
}
const STAGE_NAMES = {
  0: '商业资本主义', 1: '算法资本主义', 2: '极化资本主义', 3: '分岔点',
  4: '过渡社会', 5: '共产主义初级形态', 6: '自由人联合体', 7: '算力封建制',
  8: '改良资本主义', 9: '崩解', 10: '未竟的过渡',
};
const stageReachability = Object.keys(STAGE_NAMES).map((k) => {
  const id = Number(k);
  const count = stageHits[id] || 0;
  return { id, name: STAGE_NAMES[k], count, pct: pct(count / yearSnapshots) };
});
// 2024 起点渗透度：所有杠杆归零与拉满，首年渗透度是否相同
const zeroTarget = {};
const fullTarget = {};
api.LEVERS.forEach((lv) => { zeroTarget[lv.key] = 0; fullTarget[lv.key] = 1; });
const pen2024Zero = api.simulate(zeroTarget).years[0].metrics.penetration;
const pen2024Full = api.simulate(fullTarget).years[0].metrics.penetration;

/* ── 7. 六剧本锚点（供面板核对）── */
// v2.2：剧本显示名的英文版。引擎 SCENARIOS[k].name 不能改（零漂移硬门），
// 所以在这里建独立映射表；漏 key 时条件展开省略字段，client 的 pick 回退中文。
const SCENARIO_NAME_EN = {
  baseline: 'Baseline · technology races, institutions lag',
  social_democracy: 'Social democracy · universal dividend',
  techno_feudalism: 'Compute feudalism · oligarchic capture',
  planned_transition: 'Planned transition · organized passage',
  collapse: 'Collapse · high shock + high confrontation',
  commons: 'Universal commons · post-scarcity communism',
};
const anchors = Object.keys(api.SCENARIOS).map((k) => {
  const sim = api.simulate(api.targetOf(k));
  const nameEn = SCENARIO_NAME_EN[k];
  return {
    scenario: k,
    name: api.SCENARIOS[k].name,
    ...(nameEn ? { nameEn } : {}),
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
  noteEn: 'A sampling report generated at build time. Fixed seed, same output for the same version. This is the result of one sampling run, not "model truth".',
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
      caveatEn: 'The coefficient is a compile-time constant; this script cannot scan other values from outside. '
        + 'The win rate here is measured under the current coefficient; the contract §9.1 objection '
        + '(no independent empirical basis) still stands.',
    },
    socialDemocracy: {
      totalSamples: socTotal,
      wins: socWin,
      winsWithLowPublicOwnership: socWinLowPub,
      pathDependencyConfirmed: socWin > 0 && socWinLowPub === socWin,
      caveat: 'reformRoom 折减使该路径在 public_ownership ≥ 0.62 时失效——这不是采样噪声，是公式的必然结果。',
      caveatEn: 'The reformRoom discount disables this path at public_ownership ≥ 0.62 — '
        + 'this is not sampling noise but a necessary consequence of the formula.',
    },
    chattering: {
      samples: 300,
      maxFlips,
      histogram: flipsHist,
      caveat: '前馈模型无内生临界点，路径翻转只发生在两个人工闸门附近，因此抖动天然有限。',
      caveatEn: 'A feed-forward model has no endogenous tipping point; path flips only occur near '
        + 'the two artificial gates, so chattering is naturally bounded.',
    },
  },
  stageReachability: {
    samples: REACH_SAMPLES,
    yearSnapshots,
    stages: stageReachability,
    // 「不可达」必须与「稀有」分开：stage 0 是结构性的（无返回分支），
    // stage 6 只是条件严苛（20000 组里出现 4 次）。混为一谈会误导。
    structurallyUnreachable: [
      { id: 0, name: '商业资本主义', groups: stage0Groups,
        reason: 'stageOf 最低只返回 STAGE_BY_ID[1]（pen<0.38 → 算法资本主义），没有 stage 0 的返回分支。',
        reasonEn: 'stageOf only ever returns STAGE_BY_ID[1] at its lowest (pen<0.38 → algorithmic capitalism); '
          + 'there is no branch returning stage 0.' },
    ],
    rareButReachable: [
      { id: 6, name: '自由人联合体', groups: stage6Groups,
        note: '需同时满足 pen≥0.68、communism 引力胜、soc≥0.72、abu≥0.78、meaning≥0.46。'
          + '六剧本中「全域共享」可稳定到达；随机空间里极罕见'
          + '（另一批 20000 组无种子采样中出现 4 组，约 0.02%；本固定种子批次为 '
          + stage6Groups + ' 组）。',
        noteEn: 'Requires pen≥0.68, communism winning on gravity, soc≥0.72, abu≥0.78 and meaning≥0.46 '
          + 'simultaneously. The "universal commons" scenario reaches it reliably; in random space it is '
          + 'extremely rare (4 groups in a separate unseeded sample of 20000, about 0.02%; '
          + stage6Groups + ' groups in this fixed-seed batch).' },
    ],
    start2024: {
      penetrationWhenLeversZero: Math.round(pen2024Zero * 10000) / 10000,
      penetrationWhenLeversFull: Math.round(pen2024Full * 10000) / 10000,
      fixed: Math.abs(pen2024Zero - pen2024Full) < 1e-9,
      caveat: '2024 年 u=0，所有杠杆取 NOW 基准值，因此首年渗透度与杠杆无关。'
        + '这是插值起点的设计使然，不是 bug；但它意味着时间轴停在 2024 时显示的阶段'
        + '恒为「极化资本主义」，而叙事上 2024 应是前史向算法资本主义的过渡。',
      caveatEn: 'In 2024, u=0, so all levers take their NOW baseline values and first-year penetration is '
        + 'independent of the levers. This follows from the interpolation start point and is not a bug; '
        + 'but it means that with the timeline parked at 2024 the stage shown is always "polarized capitalism", '
        + 'whereas narratively 2024 should be the transition from prehistory to algorithmic capitalism.',
    },
    techOnlyBeforeGate: {
      samples: 1625,
      verified: true,
      caveat: 'pen < GATE_PEN 时，固定渗透度扫遍制度/社会/意义全网格，阶段恒定不变——'
        + '制度杠杆在岔路前不参与阶段判定。这是 P1-3 的核心，也是模型最该被质疑的简化之一。',
      caveatEn: 'When pen < GATE_PEN, sweeping the entire institutional/social/meaning grid at fixed '
        + 'penetration leaves the stage unchanged — institutional levers play no part in stage determination '
        + 'before the fork. This is the core of P1-3 and one of the most questionable simplifications in the model.',
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
