/**
 * C1/C2：收集六套件的测试计数，输出 JSON（供 make-market-entry 与文档使用）。
 * 套件失败即以非零码退出——计数永不来自失败的套件。
 *
 * 用法: node scripts/collect-counts.cjs [--write-readme|--write-docs]
 *   --write-readme  只重写 README 自检块
 *   --write-docs    同时重写 README 与 PUBLISHING.md 的计数块（npm run counts 用这个）
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SUITES = [
  { key: 'contract', cmd: 'node', args: ['scripts/contract-check.cjs'], label: '契约一致性' },
  { key: 'engine', cmd: 'node', args: ['tests/engine.test.cjs'], label: '模型行为' },
  { key: 'adversarial', cmd: 'node', args: ['tests/adversarial.test.cjs'], label: '对抗回归' },
  { key: 'mount', cmd: 'node', args: ['tests/mount.test.cjs'], label: '插件契约与渲染' },
  { key: 'deeptab', cmd: 'node', args: ['tests/deeptab.test.cjs'], label: '深层渲染冒烟' },
  { key: 'preflight', cmd: 'node', args: ['scripts/preflight.cjs'], label: '发布一致性' },
];

const counts = {};
for (const s of SUITES) {
  const out = execFileSync(s.cmd, s.args, { cwd: ROOT, encoding: 'utf8' });
  const m = out.match(/(\d+)\/(\d+)\s*通过/);
  if (!m || m[1] !== m[2]) {
    console.error('套件未全绿或无法解析计数: ' + s.key);
    process.exit(1);
  }
  counts[s.key] = Number(m[1]);
}
counts.total = SUITES.reduce((a, s) => a + counts[s.key], 0);
console.log(JSON.stringify(counts, null, 2));

/** 重写单文件里 counts:auto 标记之间的内容；标记缺失即报错退出。 */
function rewriteBlock(file, build) {
  const p = path.join(ROOT, file);
  const md = fs.readFileSync(p, 'utf8');
  const BEGIN = '<!-- counts:auto -->';
  const END = '<!-- /counts:auto -->';
  const bi = md.indexOf(BEGIN), ei = md.indexOf(END);
  if (bi < 0 || ei < 0) {
    console.error(file + ' 缺少计数标记 ' + BEGIN + ' / ' + END);
    process.exit(1);
  }
  const block = [BEGIN, '', build(), '', END].join('\n');
  fs.writeFileSync(p, md.slice(0, bi) + block + md.slice(ei + END.length), 'utf8');
  console.log(file + ' 计数块已重写');
}

const wantReadme = process.argv.includes('--write-readme') || process.argv.includes('--write-docs');
const wantDocs = process.argv.includes('--write-docs');

if (wantReadme) {
  rewriteBlock('README.md', () => [
    '```bash',
    'npm run verify                      # 一次性跑全部六项',
    ...SUITES.map((s) => 'node ' + s.args[0].replace(/\//g, '\\').padEnd(30)
      + ' # ' + counts[s.key] + '/' + counts[s.key] + '  ' + s.label),
    '```',
    '',
    '以上计数由 `npm run counts` 自动生成（' + counts.total + ' 项自动化检查），手工编辑无效。',
  ].join('\n'));
}

if (wantDocs) {
  rewriteBlock('PUBLISHING.md', () => [
    '| 套件 | 结果 |',
    '|---|---|',
    ...SUITES.map((s) => '| ' + s.label + ' | ' + counts[s.key] + '/' + counts[s.key] + ' |'),
    '| **合计** | **' + counts.total + '/' + counts.total + '** |',
    '',
    '以上计数由 `npm run counts` 自动生成，手工编辑无效。',
  ].join('\n'));
}
