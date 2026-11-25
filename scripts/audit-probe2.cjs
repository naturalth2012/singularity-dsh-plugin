/** 第二轮确认探针：窗口叙事 vs 机制、inWindow、diagnose 自相矛盾引证 */
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
const patched = body.replace(/return\s*\{\s*\n\s*inject:/, 'const __exports = { inject:');
const ReactStub = { createElement: (t, p, ...c) => ({ type: t, props: p, children: c }), useState: (v) => [v, () => {}], useMemo: (fn) => fn(), useEffect: () => {} };
const docStub = { createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }), head: { appendChild() {} } };
const api = new Function('require', 'document', 'window',
  'return (function(){' + patched
  + '\n;return { simulate, targetOf, SCENARIOS, LEVERS, diagnose, decidePath, branchScores, NOW, TECH_TREND, GATE_PEN };})();')(
  (n) => (n === 'react' ? ReactStub : {}), docStub, { __ModuleLoader__: { load() {} } });

console.log('=== 1. baseline 的 inWindow 年份（blocked 型） ===');
const b = api.simulate(api.targetOf('baseline'));
console.log('窗口: ' + b.window.start + '-' + b.window.end + ' type=' + b.window.type);
console.log('inWindow=true: ' + b.years.filter((y) => y.inWindow).map((y) => y.year).join(',') || '（无）');

console.log('\n=== 2. diagnose() 自相矛盾引证（技术压低 + 制度偏共产） ===');
const t2 = { cognition: 0.30, compute: 0.25, automation: 0.22, energy: 0.25, public_ownership: 0.75, coordination: 0.80, solidarity: 0.75, meaning: 0.70, redistribution: 0.60 };
const s2 = api.simulate(t2);
console.log('结局: ' + s2.outcome.name + ' | 终点渗透=' + s2.final.metrics.penetration.toFixed(3) + ' (GATE=' + api.GATE_PEN + ')');
console.log('引力胜者: ' + api.decidePath(s2.branchScores) + ' communism=' + Math.round(s2.branchScores.communism * 100) + '%');
api.diagnose(s2).forEach((d) => console.log('  [' + d.tag + '] ' + d.text));

console.log('\n=== 3. 窗口叙事 vs 机制：终年胜者 vs 窗口内胜者 ===');
// 制度高但爬升慢（u^1.9），看看路径是否在窗口后才翻转
const t3 = { public_ownership: 0.70, coordination: 0.65, redistribution: 0.55, solidarity: 0.70, meaning: 0.60 };
const s3 = api.simulate(t3);
const win3 = s3.window;
const yCross = s3.years.filter((y) => y.year === win3.end)[0];
const yFinal = s3.final;
console.log('窗口 ' + win3.start + '-' + win3.end + ' type=' + win3.type + ' gate_year=' + win3.gate_year);
console.log('窗口末年 ' + win3.end + ' 胜者=' + yCross.path + ' → 终年 2060 胜者=' + yFinal.path + ' → 结局=' + s3.outcome.name);
console.log('逐年 path: ' + s3.years.map((y) => y.year + ':' + y.path.slice(0, 4)).join(' '));

console.log('\n=== 4. 高冲突低技术世界：结局文案 vs 实际指标 ===');
const t4 = { cognition: 0.30, compute: 0.25, automation: 0.22, energy: 0.25, conflict: 0.95, transition_shock: 0.95, solidarity: 0.10, redistribution: 0.10 };
const s4 = api.simulate(t4);
const f4 = s4.final.metrics;
console.log('结局: ' + s4.outcome.name);
console.log('  损毁=' + Math.round(f4.devastation * 100) + '% 生产力=' + Math.round(f4.productivity * 100) + '% 丰裕=' + Math.round(f4.abundance * 100) + '%');
console.log('  结局文案: ' + s4.outcome.detail);

console.log('\n=== 5. 社会民主引力结构性上限验证 ===');
// 理论最大 social = 0.70；验证是否存在 social 胜出需要 pub < 0.62 的窄带
let socWin = 0, socWinLowPub = 0;
let seed2 = 7;
function rnd2() { seed2 = (seed2 * 1103515245 + 12345) % 2147483648; return seed2 / 2147483648; }
for (let k = 0; k < 5000; k++) {
  const t = {};
  api.LEVERS.forEach((lv) => { t[lv.key] = rnd2(); });
  const s = api.simulate(t);
  if (api.decidePath(s.branchScores) === 'social_democracy') {
    socWin++;
    if (t.public_ownership < 0.62) socWinLowPub++;
  }
}
console.log('social_democracy 引力胜出: ' + socWin + '/5000，其中 pub_ownership<0.62 的: ' + socWinLowPub);
