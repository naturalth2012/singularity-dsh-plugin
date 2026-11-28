'use strict';
/**
 * i18n-diagnose-audit.cjs — 核对 diagnose() 的全部动态诊断句模板。
 *
 * 为什么需要它：诊断句里嵌着运行时数字（引力 48%、劳动份额 20%…）。
 * TX 精确查表只能匹配当初写死的那组数字，数字一变就露中文。
 * TX_PATTERNS 用正则覆盖所有数字变体，本脚本验证：
 *   1. diagnose() 里的每条中文句都能被某条 pattern 覆盖
 *   2. 用多组不同的数字代入模板，翻译结果不含 CJK
 *
 * 用法: node scripts/i18n-diagnose-audit.cjs  （有遗漏则退出 1）
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');

const { NOUNS } = require('./translate-data.cjs');
const { BATCH2 } = require('./translate-batch2.cjs');
const { TX_PATTERNS } = require('./translate-patterns.cjs');
const TX = { ...NOUNS, ...BATCH2 };

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** 从 client.js 抽 diagnose() 区块 */
function cutFunction(name) {
  const key = 'function ' + name + '(';
  const i = src.indexOf(key);
  if (i < 0) return null;
  const brace = src.indexOf('{', i);
  let depth = 0, j = brace;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(brace, j + 1);
}

/**
 * 抽取一个函数区块里所有「含中文 + Math.round 的字段拼接式」。
 * 覆盖 text: / detail: / thesis: 等字段（diagnose 用 text，resolveOutcome 用 detail）。
 */
function extractTemplates(block) {
  const templates = [];
  // 匹配 text:/detail:/thesis: Field:'...' 后面跟着的表达式，直到行尾
  const re = /\b(text|detail|thesis):\s*([^\n]*?)(?=\s*\}\s*\)|,|$)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const expr = m[2];
    // 把 '字面量' + Math.round(X) + NAME[..] + '字面量' 解析成段落
    const parts = [];
    const segRe = /'((?:[^'\\]|\\.)*)'|Math\.round\([^)]*\)|[A-Za-z_$][\w$]*(?:\[[^\]]+\])?(?:\.[A-Za-z_$][\w$]*)*/g;
    let seg;
    let idx = 0;
    while ((seg = segRe.exec(expr)) !== null) {
      if (seg[1] !== undefined) {
        parts.push(seg[1]);
      } else {
        // Math.round(...) 或变量名（PATH_NAME[winner] / sim.outcome.name）都当占位
        parts.push('{' + (++idx) + '}');
      }
    }
    const tpl = parts.join('');
    // 只收「含中文、含 % 的动态句」，排除纯标签字段（如 tag:'引力'）
    // 注意：引力句以「开头（标点），不能只看首字符是否 CJK
    if (CJK.test(tpl) && /%/.test(tpl) && parts.some((p) => CJK.test(p) && p.length > 3)) templates.push(tpl);
  }
  return templates;
}

/** 模拟 client.js 里的 tx()：先精确查表，再跑模式匹配 */
function tx(s, recursive) {
  if (TX[s]) return TX[s];
  for (const p of TX_PATTERNS) {
    const m = new RegExp(p.re).exec(s);
    if (!m) continue;
    return p.en.replace(/\{(\d+)\}/g, (_, d) => {
      const v = m[Number(d)];
      if (v === undefined) return '';
      return p.translate && p.translate.indexOf(Number(d)) >= 0 && recursive !== false
        ? tx(v, false) : v;
    });
  }
  return s;
}

const templates = [
  ...extractTemplates(cutFunction('diagnose') || ''),
  ...extractTemplates(cutFunction('resolveOutcome') || ''),
];
console.log('diagnose() + resolveOutcome() 中的动态句模板: ' + templates.length + ' 条\n');

// 每类数字用多个不同值代入，确保不是只覆盖某一组采样数字
const NUM_SETS = [
  ['48', '20', '22'],
  ['7', '3', '91'],
  ['63', '58', '12'],
  ['0', '1', '99'],
];
// 内嵌名字变体（PATH_NAME 与 outcome.name）
const NAME_SETS = ['算力封建制', '社会民主主义', '共产主义过渡', '文明崩解', '未竟的过渡'];

let failures = 0;

for (const tpl of templates) {
  // 生成若干具体句子
  const samples = [];
  const nCount = (tpl.match(/\{\d+\}/g) || []).length;
  if (nCount === 0) {
    samples.push(tpl);
  } else {
    for (let si = 0; si < NUM_SETS.length; si++) {
      let s = tpl;
      const nums = NUM_SETS[si];
      for (let k = 1; k <= nCount; k++) {
        s = s.replace('{' + k + '}', nums[(k - 1) % nums.length]);
      }
      // 带内嵌名字的模板（形如 「{1}」引力 {2}%…）：把第一个占位换成名字
      if (/「\{1\}」/.test(tpl)) {
        for (const name of NAME_SETS) {
          let s2 = tpl.replace('{1}', name);
          for (let k = 2; k <= nCount; k++) {
            s2 = s2.replace('{' + k + '}', nums[(k - 2) % nums.length]);
          }
          samples.push(s2);
        }
      } else {
        samples.push(s);
      }
    }
  }

  let okCount = 0;
  let firstBad = null;
  for (const s of samples) {
    const out = tx(s);
    if (CJK.test(out)) {
      if (!firstBad) firstBad = s + '  =>  ' + out;
    } else {
      okCount++;
    }
  }
  const status = okCount === samples.length ? 'OK ' : 'FAIL';
  if (status === 'FAIL') failures++;
  console.log('[' + status + '] (' + okCount + '/' + samples.length + ') ' + tpl.slice(0, 70));
  if (firstBad) console.log('     首个失败: ' + firstBad.slice(0, 120));
}

console.log('\n动态诊断句模板 ' + templates.length + ' 条，失败 ' + failures + ' 条');
if (failures) process.exit(1);
console.log('所有动态诊断句的数字变体均可翻译 ✓');
