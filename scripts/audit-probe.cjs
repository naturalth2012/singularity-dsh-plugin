/**
 * 对抗性审计探针：检验 singularity 引擎在极端/随机参数下的行为
 * - 结果分布是否偏差（feudalism 是否过重）
 * - 路径是否年际抖动（chattering）
 * - inWindow 标记是否正确
 * - 边界组合的语义合理性
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8');
const start = src.indexOf('factory(require) {');
const bodyStart = src.indexOf('{', start) + 1;
let depth = 1, i = bodyStart;
for (; i < src.length && depth > 0; i++) {
  const ch = src[i];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
}
const body = src.slice(bodyStart, i - 1);
const EXPORT_RE = /return\s*\{\s*\n\s*inject:/;
const patched = body.replace(EXPORT_RE, 'const __exports = { inject:');

const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (v) => [v, () => {}],
  useMemo: (fn) => fn(),
  useEffect: () => {},
};
const docStub = { createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }), head: { appendChild() {} } };

const api = new Function('require', 'document', 'window',
  'return (function(){' + patched
  + '\n;return { simulate, targetOf, SCENARIOS, LEVERS, sensitivity, diagnose, decidePath, branchScores, derive, leversAt, NOW, TECH_TREND, GATE_PEN, GATE_SOC, locateWindow };})();')(
  (name) => (name === 'react' ? ReactStub : {}),
  docStub,
  { __ModuleLoader__: { load() {} } },
);

// 简易可复现随机
let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function randTarget() {
  const t = {};
  api.LEVERS.forEach((lv) => { t[lv.key] = rnd(); });
  return t;
}

const OUTCOME_NAME = {};
let count = 0;

console.log('=== A. 均匀随机参数空间的结果分布（2000 组） ===');
const dist = {};
const winnerDist = {};
let stalledWithAbuHigh = 0, commWinButNotMain = 0, fedWinWithLowCapture = 0;
for (let k = 0; k < 2000; k++) {
  const t = randTarget();
  const sim = api.simulate(t);
  const name = sim.outcome.name;
  dist[name] = (dist[name] || 0) + 1;
  const w = api.decidePath(sim.branchScores);
  winnerDist[w] = (winnerDist[w] || 0) + 1;
  // 异常检查（v1.0.1 三区语义后更新）：只有渗透过线（裁决区）且未被毁灭
  // （devastation≤0.5，毁灭区物理入口优先）时 communism 胜出才必须落到共产主义谱系。
  if (w === 'communism' && sim.final.metrics.penetration >= api.GATE_PEN
    && sim.final.metrics.devastation <= 0.5
    && !(sim.outcome.type === 'main' || sim.outcome.name === '过渡社会' || sim.outcome.name === '未竟的过渡')) commWinButNotMain++;
  // 异常检查：封建引力胜出但 capture 很低（<0.3）
  if (w === 'feudalism' && t.capture < 0.3) fedWinWithLowCapture++;
}
console.log('结局分布:');
Object.keys(dist).sort((a, b) => dist[b] - dist[a]).forEach((n) => console.log('  ' + n + ': ' + dist[n] + ' (' + (dist[n] / 20).toFixed(1) + '%)'));
console.log('引力胜者分布:');
Object.keys(winnerDist).sort((a, b) => winnerDist[b] - winnerDist[a]).forEach((n) => console.log('  ' + n + ': ' + winnerDist[n] + ' (' + (winnerDist[n] / 20).toFixed(1) + '%)'));
console.log('异常: communism 胜出且已过裁决线但非共产主义谱系: ' + commWinButNotMain);
console.log('异常: feudalism 胜出但 capture<0.3: ' + fedWinWithLowCapture);

console.log('\n=== B. 路径年际抖动（chattering）检测 ===');
let chatterCount = 0;
const chatterCases = [];
for (let k = 0; k < 300; k++) {
  const t = randTarget();
  const sim = api.simulate(t);
  let flips = 0;
  for (let j = 1; j < sim.years.length; j++) {
    if (sim.years[j].path !== sim.years[j - 1].path) flips++;
  }
  if (flips >= 6) { chatterCount++; if (chatterCases.length < 5) chatterCases.push({ flips, outcome: sim.outcome.name }); }
}
console.log('路径翻转 >= 6 次的样本: ' + chatterCount + '/300');
chatterCases.forEach((c) => console.log('  flips=' + c.flips + ' → ' + c.outcome));

console.log('\n=== C. inWindow 标记 bug 验证 ===');
const simPD = api.simulate(api.targetOf('planned_transition'));
const inWinYears = simPD.years.filter((y) => y.inWindow).map((y) => y.year);
console.log('planned_transition 窗口 ' + simPD.window.start + '-' + simPD.window.end
  + ' (type=' + simPD.window.type + ')，但 inWindow=true 的年份: '
  + (inWinYears.length ? inWinYears.join(',') : '（无）'));

console.log('\n=== D. 2050 后默认路径一致性 ===');
// 制度保持 2024 现状（不给制度 target），看 2050 与 2060 的差距
const simDefault = api.simulate({});
const y50 = simDefault.years.filter((y) => y.year === 2050)[0];
const y60 = simDefault.years[36];
console.log('默认路径: 2050 窗口判断渗透=' + y50.metrics.penetration.toFixed(3)
  + ' 2060 渗透=' + y60.metrics.penetration.toFixed(3));
console.log('默认路径 2050 stage=' + y50.stage.name + ' → 2060 stage=' + y60.stage.name
  + (y50.stage.id !== y60.stage.id ? '  ← 2050 之后仍在演化（推演半途即下结论）' : '  （2050 已稳定）'));

console.log('\n=== E. 语义边界组合 ===');
function run(label, over) {
  const base = {};
  api.LEVERS.forEach((lv) => { base[lv.key] = api.NOW[lv.key]; });
  Object.assign(base, over);
  const sim = api.simulate(base);
  const w = api.decidePath(sim.branchScores);
  const m = sim.final.metrics;
  console.log('  ' + label.padEnd(30) + ' → ' + sim.outcome.name.padEnd(10)
    + ' | 胜者=' + w + ' D=' + Math.round(m.development * 100) + '%'
    + ' abu=' + Math.round(m.abundance * 100) + '% dev=' + (m.devastation || 0).toFixed(2));
}
run('全部中性默认', {});
run('高共产引力+低社会化', { public_ownership: 0.6, coordination: 0.9, solidarity: 0.9, meaning: 0.9, redistribution: 0.2 });
run('封建引力低但冲突爆表', { conflict: 1.0, transition_shock: 1.0, solidarity: 0.0, capture: 0.2 });
run('capture=0.55 恰好过半', { capture: 0.55 });
run('capture=0.54 未过半', { capture: 0.54 });
run('意义=0 且共产高', { public_ownership: 0.9, coordination: 0.9, redistribution: 0.9, solidarity: 0.9, meaning: 0.0 });
run('教育=0 全其他高', { education: 0.0, public_ownership: 0.9, coordination: 0.9, redistribution: 0.9, solidarity: 0.9, meaning: 0.9 });
run('技术全 0 制度全 1', { cognition: 0, compute: 0, automation: 0, energy: 0, public_ownership: 1, redistribution: 1, coordination: 1 });
run('技术全 1 制度全 0', { cognition: 1, compute: 1, automation: 1, energy: 1, public_ownership: 0, redistribution: 0, coordination: 0 });
run('capture=1 其余中性', { capture: 1.0 });

console.log('\n=== F. COLLAPSE_GAIN 敏感性 ===');
for (const t of ['baseline', 'social_democracy', 'planned_transition']) {
  const sc = api.branchScores(api.simulate(api.targetOf(t)).final.levers, api.simulate(api.targetOf(t)).final.metrics);
  console.log('  ' + t.padEnd(18) + ' collapse=' + (sc.collapse * 100).toFixed(1) + '% feudalism=' + (sc.feudalism * 100).toFixed(1) + '%'
    + ' comm=' + (sc.communism * 100).toFixed(1) + '% soc=' + (sc.social_democracy * 100).toFixed(1) + '%');
}

console.log('\n=== G. 事件触发合理性（baseline 全事件+年份漂移） ===');
const b = api.simulate(api.targetOf('baseline'));
b.events.forEach((e) => console.log('  ' + e.year + ' ' + e.title + '  (剧本年=' + (e.year - e.drift) + ', 漂移' + (e.drift >= 0 ? '+' : '') + e.drift + ')'));
