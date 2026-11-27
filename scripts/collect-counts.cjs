/**
 * C1/C2：收集五套件的测试计数，输出 JSON（供 make-market-entry 与 README 使用）。
 * 套件失败即以非零码退出——计数永不来自失败的套件。
 * 用法: node scripts/collect-counts.cjs [--write-readme]
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SUITES = [
  { key: 'contract', cmd: 'node', args: ['scripts/contract-check.cjs'] },
  { key: 'engine', cmd: 'node', args: ['tests/engine.test.cjs'] },
  { key: 'mount', cmd: 'node', args: ['tests/mount.test.cjs'] },
  { key: 'deeptab', cmd: 'node', args: ['tests/deeptab.test.cjs'] },
  { key: 'preflight', cmd: 'node', args: ['scripts/preflight.cjs'] },
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

/* --write-readme：重写 README 自检代码块计数（C2，两端标记内自动生成） */
if (process.argv.includes('--write-readme')) {
  const readmePath = path.join(ROOT, 'README.md');
  const md = fs.readFileSync(readmePath, 'utf8');
  const BEGIN = '<!-- counts:auto -->';
  const END = '<!-- /counts:auto -->';
  const bi = md.indexOf(BEGIN), ei = md.indexOf(END);
  if (bi < 0 || ei < 0) {
    console.error('README 缺少计数标记 ' + BEGIN);
    process.exit(1);
  }
  const block = [
    BEGIN,
    '',
    '```bash',
    'npm run verify                      # 一次性跑全部四项',
    'node scripts\\contract-check.cjs     # ' + counts.contract + '/' + counts.contract + '  契约一致性',
    'node tests\\engine.test.cjs          # ' + counts.engine + '/' + counts.engine + '  模型行为',
    'node tests\\mount.test.cjs           # ' + counts.mount + '/' + counts.mount + '  插件契约与渲染',
    'node tests\\deeptab.test.cjs         # ' + counts.deeptab + '/' + counts.deeptab + '  深层渲染冒烟',
    'node scripts\\preflight.cjs          # ' + counts.preflight + '/' + counts.preflight + '  发布一致性',
    '```',
    '',
    '以上计数由 `npm run counts` 自动生成（' + counts.total + ' 项自动化检查），手工编辑无效。',
    '',
    END,
  ].join('\n');
  fs.writeFileSync(readmePath, md.slice(0, bi) + block + md.slice(ei + END.length), 'utf8');
  console.log('README 计数块已重写');
}
