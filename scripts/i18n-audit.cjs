'use strict';
/**
 * i18n-audit.cjs — 审计翻译链路的静态完整性（不渲染，只看数据与代码）。
 *
 * 背景：v2.2.1 英文版不生效，根因是 client.js 只 bind() 不 register()。
 * bind() 只提供「按当前语言查词」的入口，词条必须先注册进 locale 服务。
 * 本脚本断言这条链路的三段都在：
 *   1. 代码确实调用了 locale.register（否则英文永远回落到中文兜底）
 *   2. 注入的 I18N_DICTS 与 locale/*.json 一致
 *   3. 代码调用的 t() 键都有中文兜底、且两种语言键集一致
 *
 * 端到端渲染验证见 scripts/i18n-probe.cjs。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, 'locale/zh.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'locale/en.json'), 'utf8'));

/** 精确抽取 ZH_FALLBACK：按大括号配平，容忍中间空行与注释。 */
function extractFallback(text) {
  const start = text.indexOf('const ZH_FALLBACK = {');
  if (start < 0) throw new Error('找不到 ZH_FALLBACK');
  let i = text.indexOf('{', start), depth = 0, end = -1;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = text.slice(text.indexOf('{', start) + 1, end);
  const dict = {};
  const re = /'([^']+)':\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  let m;
  while ((m = re.exec(body)) !== null) dict[m[1]] = m[2] !== undefined ? m[2] : m[3];
  return dict;
}

/** 抽取注入的 I18N_DICTS。 */
function extractDicts(text) {
  const m = /const I18N_DICTS = (\{[\s\S]*?\});\n/.exec(text);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

const fb = extractFallback(src);
const dicts = extractDicts(src);

/** 代码里 t('xxx') 的静态键（排除 'metric.' + k 这类拼接）。 */
const used = new Set();
const reCall = /\bt\('([^']+)'(?!\s*\+)/g;
let c;
while ((c = reCall.exec(src)) !== null) used.add(c[1]);

const problems = [];
const notes = [];

// 1) 运行时是否注册词典
if (!/localeSvc\.register\s*\(/.test(src) && !/locale\.register\s*\(/.test(src)) {
  problems.push('client.js 从未调用 locale.register() —— 英文版不会生效');
}

// 2) 注入的词典是否与 JSON 一致（排除 meta：它是 Plugin Manager 的元数据对象，
//    不是 UI 词条，不该进运行时词典）
if (!dicts) {
  problems.push('client.js 缺少注入的 I18N_DICTS（先运行 npm run i18n）');
} else {
  for (const loc of ['en', 'zh']) {
    const src2 = loc === 'en' ? en : zh;
    const a = Object.keys(src2).filter((k) => k !== 'meta').sort();
    const b = Object.keys(dicts[loc] || {}).sort();
    if (a.length !== b.length || a.some((k, i) => k !== b[i])) {
      problems.push('I18N_DICTS.' + loc + ' 与 locale/' + loc + '.json 键集不一致（重跑 npm run i18n）');
    }
    if (dicts[loc] && 'meta' in dicts[loc]) {
      problems.push('I18N_DICTS.' + loc + ' 误含 meta（元数据对象不该进 UI 词典）');
    }
  }
}

// 3) 键覆盖
const missingFb = [...used].filter((k) => !(k in fb));
if (missingFb.length) problems.push('缺中文兜底的 t() 键: ' + missingFb.join(', '));

const onlyZh = Object.keys(zh).filter((k) => !(k in en) && k !== 'meta');
const onlyEn = Object.keys(en).filter((k) => !(k in zh) && k !== 'meta');
if (onlyZh.length) problems.push('zh.json 独有键（英文会露 key）: ' + onlyZh.join(', '));
if (onlyEn.length) notes.push('en.json 独有键（中文会露 key）: ' + onlyEn.join(', '));

const report = {
  ok: problems.length === 0,
  '代码调用键数': used.size,
  'ZH_FALLBACK 键数': Object.keys(fb).length,
  'zh.json 键数': Object.keys(zh).length,
  'en.json 键数': Object.keys(en).length,
  '已注册 register': /localeSvc\.register\s*\(/.test(src),
  problems,
  notes,
};
console.log(JSON.stringify(report, null, 2));
process.exit(problems.length ? 1 : 0);
