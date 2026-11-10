/**
 * 生成 awesome-dsh-plugin 的投稿条目（按官方 contributing.md 规范）。
 *
 * 规范要点（https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md）：
 *  - 只加一个文件: data/plugins/<owner>__<repo>.yml
 *  - 两个 README 由脚本生成，不要手工编辑
 *  - description.en 必填；含 ": " 时必须给整个值加引号
 *  - 不要在 yml 里手写 npm: 字段（会被校验拒绝，映射从 registry 自动采集）
 *  - 仓库需声明 dsh.bundle（本插件已满足）、建满 1 天、加 dsh-plugin topic
 *
 * 用法: node scripts/make-market-entry.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const repoUrl = (pkg.repository && pkg.repository.url || '')
  .replace(/^git\+/, '').replace(/\.git$/, '');

if (!repoUrl || repoUrl.includes('CODEOWNER')) {
  console.error('仓库地址未配置。先运行: node scripts/set-repo.cjs <你的 GitHub 用户名>');
  process.exit(1);
}

const parts = repoUrl.replace('https://github.com/', '').split('/');
const owner = parts[0];
const repo = parts[1];

// YAML 双引号字符串里需要转义的只有双引号和反斜杠；换行不会出现。
const q = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

const en = 'An interactive simulator of how AI might end capitalism and open the road to communism, '
  + 'mounted as a full-width panel. Fourteen levers (AI capability, compute, automation, energy, '
  + 'redistribution, public ownership, global coordination, labour power, meaning, education, '
  + 'solidarity, transition shock, class conflict, capital capture) drive a 2024-2060 yearly '
  + 'simulation; a single decision function picks the winning path among feudalism, social '
  + 'democracy, communism, and collapse, and the same function feeds the panel, so the displayed '
  + 'gravity shares always match the resulting outcome. Six preset scenarios, adjustable timeline, '
  + 'and an offline pure-JS engine with no Host RPC, no network requests and no runtime dependencies.';

const zh = '一个交互式历史推演器，模拟 AI 如何让资本主义陨落、通往共产主义，以全宽面板挂载。'
  + '十四个杠杆（AI 认知、算力、自动化、能源、再分配、公共产权、全球协同、劳动者组织度、'
  + '意义供给、教育、团结度、转型冲击、阶级对抗、资本俘获）驱动 2024-2060 逐年推演；'
  + '单一裁决函数在算力封建制、社会民主主义、共产主义与文明崩解之间选出胜出路径，'
  + '面板显示的引力占比即该函数输出，因此始终与实际结局一致。'
  + '含六种预设情景、可拖动时间轴，引擎为纯 JS 离线运行，无 Host RPC、无网络请求、无运行时依赖。';

const yml = [
  'url: ' + repoUrl,
  'name: ' + owner + '/' + repo,
  'category: ui',
  'description:',
  '  en: ' + q(en),
  '  zh: ' + q(zh),
  '',
].join('\n');

fs.mkdirSync(DIST, { recursive: true });
const fileName = owner + '__' + repo + '.yml';
const outPath = path.join(DIST, fileName);
fs.writeFileSync(outPath, yml, 'utf8');

// PR 说明
const pr = `# Add ${owner}/${repo}

新增一个插件条目：\`data/plugins/${fileName}\`

## 插件简介

${zh}

## 要求自查

- [x] \`package.json\` 声明了 \`dsh.bundle\`（\`{ bundle: { patch: "./cordis.patch.yml" } }\`），
      同目录有 \`cordis.patch.yml\`
- [x] 真实可运行代码（客户端面板 + 纯 JS 引擎；含 26 项引擎测试与 20 项挂载契约测试）
- [x] 仓库已有内容（非占位/纯 README）
- [x] 仅新增一个文件，未改动任何既有条目
- [x] 未在 yml 中手写 \`npm:\` 字段
- [ ] 仓库建满 1 天（CI 自动检查；新仓库需等待）
- [ ] 已添加 \`dsh-plugin\` topic

## 链接

- 仓库：${repoUrl}
- 版本：${pkg.version}
- 许可证：${pkg.license}

## 说明

分类选 \`ui\`：插件的主要形态是一个全宽面板（侧栏图标 + 六个标签页），
引擎与图表都在面板内，不注册工具、不改会话行为。
`;
fs.writeFileSync(path.join(DIST, 'market-pr.md'), pr, 'utf8');

// 清理旧的错误产物
['market-entry.json', 'market-row.md'].forEach((f) => {
  const p = path.join(DIST, f);
  if (fs.existsSync(p)) { fs.unlinkSync(p); }
});

console.log('已生成条目（按官方规范）:');
console.log('  dist/' + fileName);
console.log('  dist/market-pr.md');
console.log('');
console.log('提交步骤:');
console.log('  1. 在 GitHub 上 fork awesome-dsh-plugin/awesome-dsh-plugin');
console.log('  2. 把 dist/' + fileName + ' 放到该仓库的 data/plugins/ 下');
console.log('  3. 提 PR，描述用 dist/market-pr.md');
console.log('');
console.log('提醒: 仓库需建满 1 天、并添加 dsh-plugin topic，否则 CI 会拦。');
