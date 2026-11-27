'use strict';
/**
 * i18n 静态全量核对。
 *
 * 为什么需要它：渲染态扫描（i18n-cjk-scan / i18n-full-scan）只在「当前剧本、
 * 当前年份」下渲染。带 cond 的事件（如 capture>0.55 才出现的「数据劳动化」）
 * 在默认剧本下根本不渲染，于是扫描器报 0 残留，用户却能在别的剧本里看到中文。
 *
 * 本脚本直接从 client.js 抽取所有语义数据集合里的中文串，逐一核对 TX 表，
 * 与触发条件无关。这是防止「条件触发内容漏翻」的唯一可靠方法。
 *
 * 用法: node scripts/i18n-data-audit.cjs   （有缺失则退出 1）
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');

const { NOUNS } = require('./translate-data.cjs');
const { BATCH2 } = require('./translate-batch2.cjs');
const TX = { ...NOUNS, ...BATCH2 };

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** 抽取 const NAME = [...] 或 {...} 区块（按括号配平）。 */
function cutBlock(name) {
  const key = 'const ' + name + ' = ';
  const i = src.indexOf(key);
  if (i < 0) return null;
  const openAt = i + key.length;
  const openCh = src[openAt];
  const closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, j = openAt;
  for (; j < src.length; j++) {
    if (src[j] === openCh) depth++;
    else if (src[j] === closeCh) { depth--; if (depth === 0) break; }
  }
  return src.slice(openAt, j + 1);
}

/** 区块里所有含中文的字符串字面量（单引号 + 双引号）。 */
function stringsIn(block) {
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const s = m[1] !== undefined ? m[1] : m[2];
    if (CJK.test(s)) out.push(s);
  }
  return out;
}

// 会展示给用户的所有语义数据集合。
// REBUTTALS / STAGE_LIMITS 走 t() 词条，不在这里；TX 只管引擎返回的中文语义串。
const collections = [
  'EVENTS', 'STAGES', 'EXTRA_STAGES',
  'BRANCHES', 'DYNAMICS', 'SCENARIOS', 'LEVERS',
];

const missing = new Map();
let totalStrings = 0;

for (const name of collections) {
  const block = cutBlock(name);
  if (!block) { console.error('找不到数据集合 ' + name); process.exit(2); }
  const strs = [...new Set(stringsIn(block))];
  totalStrings += strs.length;
  for (const s of strs) {
    if (!TX[s]) missing.set(s, name);
  }
  console.log(name.padEnd(14) + ' ' + String(strs.length).padStart(3) + ' 条中文串');
}

console.log('\n合计 ' + totalStrings + ' 条中文串，TX 词条 ' + Object.keys(TX).length + ' 条');

if (missing.size) {
  console.error('\n未翻译 ' + missing.size + ' 条:');
  for (const [s, from] of missing) {
    console.error('  [' + from + '] ' + (s.length > 90 ? s.slice(0, 90) + '…' : s));
  }
  process.exit(1);
}
console.log('所有语义数据串均已被 TX 覆盖 ✓');
