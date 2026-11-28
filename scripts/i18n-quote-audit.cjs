'use strict';
/**
 * i18n-quote-audit.cjs — 检查英文词典里「拼接句」的引号是否配对。
 *
 * 为什么需要它：界面文案由多条词条拼接而成（如晚期反转句
 * b2b.18 + b2c.10 + b2a.115）。中文用「」，天然成对；英文若混用
 * 弯引号 “” 与直引号 "，拼出来就是 “X", ... "Y” —— 用户直接看到坏引号。
 *
 * 本脚本：
 *   1. 逐词条报告引号不平衡（作为提示，单条片段本来就可能只有半边）
 *   2. 对已知的拼接组合，检查拼起来之后是否配对（这才是会露到界面的）
 *
 * 用法: node scripts/i18n-quote-audit.cjs   （拼接句不配对则退出 1）
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'locale', 'en.json'), 'utf8'));
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, 'locale', 'zh.json'), 'utf8'));

const OPEN = /[\u201c\u300c]/g;    // “ 「
const CLOSE = /[\u201d\u300d]/g;   // ” 」
const STRAIGHT = /\x22/g;          // 直双引号

const count = (s, re) => (String(s).match(re) || []).length;

/**
 * 已知拼接组合（按 client.js 里实际拼接顺序）。
 * 反方读法实际顺序见 client.js 2099-2100 行：
 *   b2b.20 + b2a.053 + 杠杆名 + b2b.21 + b2b.22 + 结局名 + b2a.124
 * 其中 b2b.21 只负责补上「名」的右引号，b2b.22 从数值开始——
 * 曾因两者都带「」从 」导致中文出现「」从 」从 18%」的重复。
 * 新增拼接句时请在此登记，否则本脚本覆盖不到。
 */
const JOINS = [
  {
    name: '晚期反转（b2b.18 + 分支名 + b2c.10 + 分支名 + b2a.115）',
    keys: ['b2b.18', null, 'b2c.10', null, 'b2a.115'],
  },
  {
    name: '反方读法（b2b.20 + b2a.053 + 杠杆名 + b2b.21 + b2b.22 + 结局名 + b2a.124）',
    keys: ['b2b.20', 'b2a.053', null, 'b2b.21', 'b2b.22', null, 'b2a.124'],
  },
];

// 拼接时插入的占位文本（代表动态中文名被 tx() 翻成英文后的样子）
const PLACEHOLDER = 'NAME';

let failures = 0;

for (const dict of [{ label: 'en', d: en }, { label: 'zh', d: zh }]) {
  console.log('=== ' + dict.label + '.json 拼接句引号检查 ===');
  for (const join of JOINS) {
    let s = '';
    const missing = [];
    for (const k of join.keys) {
      if (k === null) { s += PLACEHOLDER; continue; }
      if (typeof dict.d[k] !== 'string') { missing.push(k); continue; }
      s += dict.d[k];
    }
    if (missing.length) {
      console.log('  [SKIP] ' + join.name + ' —— 缺键: ' + missing.join(', '));
      continue;
    }
    const o = count(s, OPEN);
    const c = count(s, CLOSE);
    const q = count(s, STRAIGHT);
    const ok = o === c && q === 0;
    if (!ok) failures++;
    console.log('  [' + (ok ? 'OK  ' : 'FAIL') + '] ' + join.name);
    console.log('         open=' + o + ' close=' + c + ' straight=' + q);
    if (!ok) {
      console.log('         拼接结果: ' + s);
    }
  }
}

// 直引号单独提示：英文里成对出现是合法的（如 "prehistory"），
// 但出现在拼接句的边界上就会破。上面 JOINS 已覆盖。
console.log('\n直引号词条（仅供人工核对，不判失败）:');
let n = 0;
for (const [k, v] of Object.entries(en)) {
  if (count(v, STRAIGHT) > 0 && String(v).length < 200) {
    n++;
    if (n <= 10) console.log('  ' + k + ': ' + JSON.stringify(v));
  }
}
console.log('  合计 ' + n + ' 条');

console.log('\n拼接句引号检查：失败 ' + failures + ' 条');

/* ── 截断安全守卫 ──
 * 阶段轨道与情景对比用短预览（clipSafe(s, 14) / clipSafe(s, 26)）。
 * 早期版本用 slice(0, N) 硬截，会把「按劳动」截成「按…，露出半对引号。
 * 这里断言：所有会显示给用户的语义串，经 clipSafe 处理后引号仍成对。 */
const CJK_OPEN = /\u300c/g;
const CJK_CLOSE = /\u300d/g;
const EN_OPEN = /\u201c/g;
const EN_CLOSE = /\u201d/g;

function clipSafe(s, max) {
  const str = typeof s === 'string' ? s : String(s == null ? '' : s);
  if (str.length <= max) return str;
  let cut = str.slice(0, max);
  for (const [open, close] of [['\u300c', '\u300d'], ['\u201c', '\u201d']]) {
    const o = cut.lastIndexOf(open);
    const c = cut.lastIndexOf(close);
    if (o > c) cut = cut.slice(0, o);
  }
  return cut.replace(/[\s，。、；：—-]+$/, '') + '…';
}

let truncIssues = 0;
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');
// 从引擎区抽出 STAGES / SCENARIOS 的 thesis 与 desc（这两处是截断预览的来源）
function grabBlock(name) {
  const i = src.indexOf('const ' + name + ' = ');
  if (i < 0) return '';
  const open = src.indexOf(name === 'STAGES' || name === 'BRANCHES' ? '[' : '{', i);
  const openCh = src[open];
  const closeCh = openCh === '[' ? ']' : '}';
  let d = 0, j = open;
  for (; j < src.length; j++) {
    if (src[j] === openCh) d++;
    else if (src[j] === closeCh) { d--; if (d === 0) break; }
  }
  return src.slice(open, j + 1);
}

const previewSources = [
  { name: 'STAGES.thesis', block: grabBlock('STAGES'), field: 'thesis', max: 14 },
  { name: 'SCENARIOS.desc', block: grabBlock('SCENARIOS'), field: 'desc', max: 26 },
];

for (const src2 of previewSources) {
  const re = new RegExp(src2.field + ": '((?:[^'\\\\]|\\\\.)*)'", 'g');
  let m;
  while ((m = re.exec(src2.block)) !== null) {
    const raw = m[1];
    const clipped = clipSafe(raw, src2.max);
    const co = (clipped.match(CJK_OPEN) || []).length;
    const cc = (clipped.match(CJK_CLOSE) || []).length;
    if (co !== cc) {
      truncIssues++;
      console.log('  [FAIL] ' + src2.name + ' 截断后引号不平衡: ' + JSON.stringify(clipped));
    }
  }
}
console.log('\n截断安全（clipSafe 后引号成对）：问题 ' + truncIssues + ' 条');
failures += truncIssues;

if (failures) process.exit(1);
console.log('所有登记拼接句的引号均配对 ✓');
console.log('所有短预览截断后引号仍成对 ✓');
