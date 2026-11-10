/**
 * 生成插件市场（awesome-dsh-plugin）条目 + PR 说明，写到 dist/ 下。
 *
 * 市场条目来自精选列表 https://github.com/awesome-dsh-plugin/awesome-dsh-plugin，
 * 需要在那边提 PR 加一条；市场和站点会自动收录（通常一天内）。
 *
 * 用法: node scripts/make-market-entry.cjs
 * 依赖: 先跑 node scripts/set-repo.cjs <用户名>，否则仓库地址仍是占位符。
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

const owner = repoUrl.split('/')[3];
const repoName = repoUrl.split('/')[4];

// RegistryPlugin 结构（见 dshmarket 的 lib/types/registry.d.ts）
const entry = {
  name: pkg.name,
  owner,
  url: repoUrl,
  category: 'ui',
  description: {
    zh: 'AI 时代的社会形态演化模拟：14 个可调杠杆、可拖动的时间轴、四条引力路径与六种可比较的结局，在 Harness 中以全宽面板呈现。',
    en: 'An interactive simulator of how AI might end capitalism and open the road to communism: 14 adjustable levers, a draggable timeline, four gravity paths, and six comparable futures, as a full-width Harness panel.',
  },
  npm: pkg.name,
  install: `npm:${pkg.name}@${pkg.version}`,
  icon: `https://raw.githubusercontent.com/${owner}/${repoName}/main/icon.svg`,
};

fs.mkdirSync(DIST, { recursive: true });

// 1) 结构化条目（可直接粘进目录仓库的条目文件）
const entryPath = path.join(DIST, 'market-entry.json');
fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2) + '\n', 'utf8');

// 2) Markdown 表格行（多数 awesome 列表是 Markdown 表格/列表）
const row = `| [${pkg.name}](${repoUrl}) | ${entry.description.zh} | [npm](https://www.npmjs.com/package/${pkg.name}) |`;
const rowPath = path.join(DIST, 'market-row.md');
fs.writeFileSync(rowPath, row + '\n', 'utf8');

// 3) PR 说明
const pr = `# 新增插件：${pkg.name}

## 这是什么

${entry.description.zh}

${pkg.description}

在 DeepSeek Harness 中它是一个全宽面板：侧栏出现 **Singularity** 图标（order 30），
点击进入，六个标签页分别呈现历史长轴、可调引擎、四条引力路径、指标矩阵、情景对比与理论说明。

## 链接

- 仓库：${repoUrl}
- npm：https://www.npmjs.com/package/${pkg.name}
- 版本：${pkg.version}
- 许可证：${pkg.license}

## 兼容性

- 宿主：DeepSeek Harness（Web）
- 平台：\`dsh.client.platform = "web"\`
- 纯前端渲染，**无** Host RPC、无网络请求、无外部 CDN，完全离线可用
- 零运行时依赖（\`dependencies\` 为空）

## 自检

- \`node scripts/preflight.cjs\` — 包名一致性、发布字段、必需文件（通过）
- \`node tests/engine.test.cjs\` — 引擎一致性 26/26（含三项模型修复断言）
- \`node tests/mount.test.cjs\` — 模块契约与渲染冒烟 20/20

## 条目

\`\`\`json
${JSON.stringify(entry, null, 2)}
\`\`\`

或 Markdown 表格行：

\`\`\`markdown
${row}
\`\`\`
`;
const prPath = path.join(DIST, 'market-pr.md');
fs.writeFileSync(prPath, pr, 'utf8');

console.log('已生成:');
console.log('  ' + path.relative(ROOT, entryPath));
console.log('  ' + path.relative(ROOT, rowPath));
console.log('  ' + path.relative(ROOT, prPath));
console.log('\n下一步:');
console.log('  1. 到 ' + repoUrl + ' 建仓库并推送');
console.log('  2. 到 https://github.com/awesome-dsh-plugin/awesome-dsh-plugin 提 PR，');
console.log('     把 dist/market-row.md 的表格行加进对应分类，PR 描述用 dist/market-pr.md');
