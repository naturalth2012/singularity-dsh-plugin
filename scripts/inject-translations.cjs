/**
 * inject-translations.cjs — 把中文→英文映射注入 client.js 的 TX 常量。
 *
 * 与 inject-locale.cjs 同一思路：浏览器模块读不了外部文件，必须构建期内联。
 *
 * 为什么用「中文原文 → 英文」做键：
 * 引擎返回中文名（契约与 772 行测试硬引用，不能改）。展示层拿到的就是中文字符串，
 * 用它做查找键可以零侵入翻译——引擎、契约、测试全部不受影响。
 *
 * 用法: node scripts/inject-translations.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const clientPath = path.join(ROOT, 'client.js');

const { NOUNS } = require('./translate-data.cjs');
const { BATCH2 } = require('./translate-batch2.cjs');
const { TX_PATTERNS } = require('./translate-patterns.cjs');

// 合并所有批次（后续批次追加到这里）
let TX = {};
for (const part of [NOUNS, BATCH2]) Object.assign(TX, part);

// 剔除空值与空键
for (const k of Object.keys(TX)) {
  if (!k || typeof TX[k] !== 'string' || !TX[k].trim()) delete TX[k];
}

const src = fs.readFileSync(clientPath, 'utf8');
const BEGIN = '/* TX-BEGIN';
const END = 'TX-END */';
const bi = src.indexOf(BEGIN);
const ei = src.indexOf(END);
if (bi < 0 || ei < 0) {
  console.error('client.js 缺少 TX 标记，请先插入标记');
  process.exit(1);
}

const block = [
  BEGIN,
  '       中文原文 → 英文 的展示层映射，由 scripts/inject-translations.cjs 注入，勿手改。',
  '       重跑：npm run i18n',
  '       引擎仍返回中文名（契约与测试硬引用），翻译只发生在展示层。',
  '       ' + END,
  '    const TX = ' + JSON.stringify(TX) + ';',
  '    const TX_PATTERNS = ' + JSON.stringify(TX_PATTERNS) + ';',
].join('\n');

const lineStart = src.lastIndexOf('\n', bi) + 1;
const indent = src.slice(lineStart, bi);
let tail = ei + END.length;

// 吃掉 END 之后紧跟的旧声明行（可能有多行：占位空声明 + 上次注入的完整声明）。
// 这是幂等的关键——否则每跑一次就多一份 const TX，导致重复声明语法错误。
for (;;) {
  const m = /\n[ \t]*const TX = [\s\S]*?;\n[ \t]*const TX_PATTERNS = [\s\S]*?;\n|\n[ \t]*const TX = [\s\S]*?;\n|\n[ \t]*const TX_PATTERNS = [\s\S]*?;\n/.exec(src.slice(tail));
  if (!m || m.index !== 0) break;
  tail += m[0].length - 1;
}

fs.writeFileSync(clientPath,
  src.slice(0, lineStart) + indent + block + src.slice(tail), 'utf8');

// 强制 LF 行尾。契约检查用 /const HEALTH_DATA = (\{[\s\S]*?\});\n/ 提取数据，
// 一旦文件变成 CRLF，行尾是 \r\n，这个正则就匹配不到，会误报「未找到 HEALTH_DATA」。
// Windows 上的编辑器与 PowerShell 的 Set-Content 都可能引入 CRLF，所以在写盘后兜底。
const written = fs.readFileSync(clientPath, 'utf8');
if (written.includes('\r\n')) {
  fs.writeFileSync(clientPath, written.replace(/\r\n/g, '\n'), 'utf8');
  console.log('（已修正 CRLF → LF）');
}

console.log(JSON.stringify({ entries: Object.keys(TX).length, patterns: TX_PATTERNS.length, bytes: JSON.stringify(TX).length + JSON.stringify(TX_PATTERNS).length }, null, 2));
