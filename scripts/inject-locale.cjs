/**
 * 把 locale/en.json 与 locale/zh.json 注入 client.js 的 I18N_DICTS 常量。
 *
 * 为什么必须注入：client.js 是浏览器模块，只能 require('react')，无法读取
 * JSON 文件；而面板要在运行时调用 locale.register() 把词典交给 locale 服务。
 * 不注入 = 词典永远进不了运行时 = 英文版永远回落到中文兜底（v2.2.1 的真实故障）。
 *
 * 与 inject-calibration.cjs 同一模式：源 JSON → 构建期内联 → 契约断言一致。
 *
 * 同时补齐 zh.json 缺失的 6 个键：这些键在 client.js 的 ZH_FALLBACK 里有中文，
 * 但漏在了 JSON 里（历史「补漏」注释的残留）。缺了它们，中文下靠 fallback 仍能
 * 显示，但英文下会露出 key 本身。以 ZH_FALLBACK 为准补进两个 JSON。
 *
 * 用法: node scripts/inject-locale.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const clientPath = path.join(ROOT, 'client.js');
const enPath = path.join(ROOT, 'locale', 'en.json');
const zhPath = path.join(ROOT, 'locale', 'zh.json');

const src = fs.readFileSync(clientPath, 'utf8');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

/** 从 client.js 精确抽取 ZH_FALLBACK（按大括号配平，容忍中间空行与注释）。 */
function extractFallback(text) {
  const start = text.indexOf('const ZH_FALLBACK = {');
  if (start < 0) throw new Error('client.js 找不到 ZH_FALLBACK');
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

const fb = extractFallback(src);

// meta 不是 UI 词条（由 Plugin Manager 读取），不参与对齐
const UI_FB = Object.keys(fb).filter((k) => k !== 'meta');

// 补齐 zh.json：以 ZH_FALLBACK 的中文为准
let zhFixed = 0;
for (const k of UI_FB) {
  if (!(k in zh)) { zh[k] = fb[k]; zhFixed++; }
}
// 补齐 en.json：中文有英文无 → 先沿用英文占位会在 UI 露英文，但比露 key 好；
// 这里不臆造翻译，只报告，交由人工补。
const enMissing = UI_FB.filter((k) => !(k in en));

if (zhFixed > 0) {
  fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
}

// 键集对齐检查：注册时两种语言必须键集一致，否则英文下会露 key
const enKeys = Object.keys(en).filter((k) => k !== 'meta').sort();
const zhKeys = Object.keys(zh).filter((k) => k !== 'meta').sort();
const stillMissingInEn = enMissing;

// 只注入两边都有的键，避免注册残缺词典。
// 排除 meta：它是 Plugin Manager 读取的元数据对象（title/description/detail），
// 不是 UI 词条；locale 服务的词典契约是 Record<string, string>，塞对象会污染类型。
const keys = enKeys.filter((k) => k in zh && k !== 'meta');

const dicts = { en: {}, zh: {} };
for (const k of keys) {
  dicts.en[k] = en[k];
  dicts.zh[k] = zh[k];
}

const BEGIN = '/* I18N-DICTS-BEGIN';
const END = 'I18N-DICTS-END */';
const bi = src.indexOf(BEGIN);
const ei = src.indexOf(END);
if (bi < 0 || ei < 0) {
  console.error('client.js 缺少 I18N-DICTS 标记，请先插入标记');
  process.exit(1);
}

const block = [
  BEGIN,
  '       由 scripts/inject-locale.cjs 从 locale/en.json 与 locale/zh.json 注入，勿手改。',
  '       重跑：npm run i18n',
  '       运行时由 apply() 调用 locale.register() 交给 locale 服务；不注册则英文不生效。',
  '       ' + END,
  '    const I18N_DICTS = ' + JSON.stringify(dicts) + ';',
].join('\n');

const lineStart = src.lastIndexOf('\n', bi) + 1;
const indent = src.slice(lineStart, bi);
let tail = ei + END.length;
// 幂等：吃掉 END 后所有旧声明行（占位空声明 + 上次注入的完整声明）
for (;;) {
  const m = /\n[ \t]*const I18N_DICTS = [\s\S]*?;\n/.exec(src.slice(tail));
  if (!m || m.index !== 0) break;
  tail += m[0].length - 1;
}

fs.writeFileSync(clientPath,
  src.slice(0, lineStart) + indent + block + src.slice(tail), 'utf8');

// 强制 LF 行尾：契约用 /...\});\n/ 提取数据，CRLF 会让行尾变 \r\n 而误报缺失。
const written = fs.readFileSync(clientPath, 'utf8');
if (written.includes('\r\n')) {
  fs.writeFileSync(clientPath, written.replace(/\r\n/g, '\n'), 'utf8');
  console.log('（已修正 CRLF → LF）');
}

console.log(JSON.stringify({
  zhFixed,
  injectedKeys: keys.length,
  enMissing: stillMissingInEn,
  bytes: JSON.stringify(dicts).length,
}, null, 2));
