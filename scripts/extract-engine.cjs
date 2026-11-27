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

const BEGIN_MARK = src.indexOf('ENGINE-BEGIN');
const END_MARK = src.indexOf('ENGINE-END');
if (BEGIN_MARK < 0 || END_MARK < 0 || END_MARK < BEGIN_MARK) {
  console.error('找不到 ENGINE-BEGIN/ENGINE-END 标记');
  process.exit(1);
}
// 与 contract-check 同一套边界：从标记所在注释块的 `/*` 开始，到注释块的 `*/` 结束。
// 若直接用 indexOf('ENGINE-BEGIN')，切出的片段会缺开头 `/*` 与结尾 `*/`，
// 生成的文件是语法错误的废文件（v1.4 审核发现并修复）。
const BEGIN = src.lastIndexOf('/*', BEGIN_MARK);
const END = src.indexOf('*/', END_MARK) + 2;
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
  ' *',
  ' * 用法（ESM）：import createEngine from "./engine.snapshot.js";',
  ' *              const engine = createEngine((name) => { throw new Error(name); });',
  ' */',
  '/* eslint-disable */',
  '',
  'export default function createEngine(requires) {',
  '  void requires;   // 引擎区零依赖；参数保留以便宿主注入（游戏侧可传入受限 require）',
  '',
  region,
  '',
  '  return {',
  '    LEVERS, LEVER_BY_KEY, NOW, SCENARIOS, TECH_TREND, TECH_KEYS,',
  '    STAGES, EXTRA_STAGES, BRANCHES, DYNAMICS, EVENTS,',
  '    GATE_PEN, GATE_SOC, COLLAPSE_GAIN, T0, T1, T2,',
  '    simulate, targetOf, sensitivity, diagnose, decidePath, stageOf, branchScores,',
  '    rentPressure, findCrossing, RENT_BANDS, leversPolicyAt, robustness, reversal, mulberry32,',
  '  };',
  '}',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'engine.snapshot.js'), out, 'utf8');
console.log('已生成 engine.snapshot.js（' + region.length + ' 字符引擎区，commit ' + sha + '）');
