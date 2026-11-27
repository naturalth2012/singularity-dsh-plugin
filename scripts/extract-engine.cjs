/**
 * C3：提取引擎区为快照文件（engine.snapshot.js）。
 * contract-check 会断言「切片 == 快照」逐字节一致；引擎改动后必须重跑本脚本。
 * 头部 NOTICE 满足游戏仓库 docs/05 §3 的移植要求。
 *
 * 用法: node scripts/extract-engine.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');

const BEGIN = src.indexOf('ENGINE-BEGIN');
const END = src.indexOf('ENGINE-END');
if (BEGIN < 0 || END < 0 || END < BEGIN) {
  console.error('找不到 ENGINE-BEGIN/ENGINE-END 标记');
  process.exit(1);
}
const region = src.slice(BEGIN, END);

let sha = 'unknown';
try { sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* 无 git */ }

const out = [
  '/* engine.snapshot.js —— 由 scripts/extract-engine.cjs 自动生成，勿手改。',
  ' * 来源：singularity-dsh-plugin client.js ENGINE 区（ENGINE-BEGIN…ENGINE-END）',
  ' * 生成于客户端版本见 package.json；上游 commit ' + sha + '。',
  ' * 契约规范：MODEL-CONTRACT.md（含 §8b 租金压力、§8c 政策干预、§9 已知非对称）。',
  ' * 上游仓库：https://github.com/naturalth2012/singularity-dsh-plugin (MIT)',
  ' * 本文件为衍生作品，携带上游版权声明：Copyright (c) 2026 naturalth2012。',
  ' * 重新生成：node scripts/extract-engine.cjs',
  ' */',
  '/* eslint-disable */',
  'const requires = (name) => { throw new Error("engine.snapshot.js 是纯引擎切片，不允许 require: " + name); };',
  '',
  'module.exports = (factory) => factory(requires);',
  '',
  '/* ──以下为 client.js 引擎区逐字节快照' + '──*/',
  '',
  'function __engineFactory__(factoryBodyRunner) {',
  '  return factoryBodyRunner;',
  '}',
  '',
  region,
].join('\n');

fs.writeFileSync(path.join(ROOT, 'engine.snapshot.js'), out, 'utf8');
console.log('已生成 engine.snapshot.js（' + region.length + ' 字符引擎区，commit ' + sha + '）');
