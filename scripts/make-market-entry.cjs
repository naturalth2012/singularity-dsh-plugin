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
 * v1.4 C1：测试计数不再手写——运行 scripts/collect-counts.cjs 实测取数，
 * 套件未全绿即中止（数字永不撒谎）。
 *
 * 用法: node scripts/make-market-entry.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// ── 实测计数（C1）──
const counts = JSON.parse(execFileSync('node',
  [path.join(__dirname, 'collect-counts.cjs')], { cwd: ROOT, encoding: 'utf8' }));
const totalChecks = counts.total;

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

const en = 'An interactive foresight panel simulating social-form evolution in the AI era: '
  + 'fourteen levers (AI capability, compute, automation, energy, redistribution, public ownership, '
  + 'global coordination, labour power, meaning, education, solidarity, transition shock, '
  + 'class conflict, capital capture) drive a 2024-2060 yearly simulation, and a single decision '
  + 'function picks the outcome among compute-feudalism, social democracy, early communism and '
  + 'collapse - the panel gravity shares are that same function output, so display always matches '
  + 'result. Six preset scenarios, a draggable timeline, localStorage persistence with JSON '
  + 'export and import, a policy sandbox that '
  + 'redirects institutional levers from a chosen intervention year (with the bifurcation-window '
  + 'badge and a ghost trajectory showing the counterfactual), Monte-Carlo robustness '
  + '(240 perturbed runs with outcome distribution and agreement), a reversal read-out naming '
  + 'the smallest lever change that would flip the conclusion, a rent-pressure gauge with '
  + 'crossing years, a penetration-by-socialisation phase diagram with the feudal basin shaded, '
  + 'a rent heatmap over the ownership-by-capture plane, and an offline pure-JS engine with '
  + 'no Host RPC and no runtime dependencies, governed by a published model contract enforced '
  + 'by ' + totalChecks + ' automated checks. The whole interface is bilingual (Chinese and '
  + 'English): interface strings, model semantics, event narratives and dynamically generated '
  + 'diagnostic sentences all follow the host language, with the engine itself untouched.';

const zh = 'AI 时代社会形态演化的交互式推演面板：十四个杠杆（AI 认知、算力、自动化、能源、再分配、'
  + '公共产权、全球协同、劳动者组织度、意义供给、教育、团结度、转型冲击、阶级对抗、资本俘获）'
  + '驱动 2024-2060 逐年推演；单一裁决函数在算力封建制、社会民主主义、共产主义初级形态与文明崩解'
  + '之间选出结局，面板显示的引力占比即该函数输出，显示与结果永远一致。'
  + '六种预设情景、可拖动时间轴、本地持久化与 JSON 存档导入导出；政策沙盒（从干预年起重定向制度杠杆，'
  + '附分岔窗口徽标与无政策幽灵轨迹对照）、蒙特卡洛稳健性（240 次扰动输出结局分布与一致性）、'
  + '反方读法（给出翻转结论所需的最小杠杆干预）、租金压力仪表（含越线年份）、'
  + '渗透×社会化相图（封建稳态域阴影）与产权×捕获租金热力图；'
  + '界面中英双语：界面词条、模型语义、事件叙事与动态诊断句均跟随宿主语言，引擎本身零改动；'
  + '引擎纯 JS 离线运行，无 Host RPC、无网络请求、零运行时依赖，模型契约由 ' + totalChecks + ' 项自动化检查守护。';

// 目录规范要求 icon 为 GitHub 托管的 raster 位图（storefront tile）；
// 优先用 assets/icon-180.png，其次根 icon.svg（SVG 不符合 raster 建议但可作回退）。
const iconRel = fs.existsSync(path.join(ROOT, 'assets', 'icon-180.png'))
  ? 'assets/icon-180.png'
  : (pkg.icon || null);

const yml = [
  'url: ' + repoUrl,
  'name: ' + owner + '/' + repo,
  'category: ui',
  ...(iconRel ? ['icon: ' + repoUrl + '/raw/main/' + iconRel] : []),
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
// 两种模式：
//   - 首次投稿（条目尚不存在）：Add <owner>/<repo>
//   - 更新既有条目（条目已在目录里）：<repo>: <改动摘要>（audit follow-up）
// 目录仓库已有「audit follow-up」先例（如 PR #17979 middle-earth-atlas 计数更新），
// 沿用同样的写法：单文件修改 + 说明改动依据与来源 commit。
const pr = `# ${repo}: refresh description to v${pkg.version}

Follow-up to #18788 (merged). The entry still describes the v1.2-era feature set and
claims "173 automated checks"; the plugin has since shipped v2.x and now runs
${totalChecks} checks. This PR updates \`data/plugins/${fileName}\` in place —
\`url\`, \`name\`, \`category\` and \`icon\` are unchanged, so nothing about installation
changes.

## What changed in the two descriptions

| Field | Merged entry | This PR |
|---|---|---|
| automated checks | 173 | **${totalChecks}** |
| policy sandbox | not mentioned | mentioned (with bifurcation-window badge + counterfactual ghost trajectory) |
| Monte-Carlo robustness | not mentioned | mentioned (240 perturbed runs) |
| reversal read-out | not mentioned | mentioned |
| bilingual UI | not mentioned | mentioned |
| localStorage persistence | mentioned | kept, plus JSON export / import |
| offline pure-JS engine, no runtime deps | mentioned | kept |
| version-number phrasing | "v1.2 adds…" | dropped; describes current state only |

The only content removed is the stale "173 automated checks", replaced by the measured
${totalChecks}. Every capability the merged entry claimed is still there — nothing was
dropped.

## Source of truth

- Repo: ${repoUrl}
- Version: v${pkg.version} (commit \`${(() => {
  try {
    return require('child_process').execFileSync('git', ['rev-parse', '--short', 'HEAD'],
      { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (e) { return 'HEAD'; }
})()}\`)
- Check count comes from \`node scripts/collect-counts.cjs\` (measured, not hand-written);
  \`npm run verify\` runs all ${totalChecks} green.
- Bilingual claim: \`locale/zh.json\` + \`locale/en.json\` have ${Object.keys(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'locale', 'en.json'), 'utf8'))).length} keys each,
  plus a display-layer TX map and regex templates for dynamically generated diagnostic
  sentences (the engine itself is untouched).

## Checklist

- [x] Modifies one existing entry only — no new files, no other entries touched
- [x] No hand-written \`npm:\` field
- [x] \`description.en\` is single-line, non-empty, ends with a period
- [x] \`url\` / \`name\` / \`category\` / \`icon\` are byte-identical to the merged entry
- [x] Every capability claimed in the new text is verifiable in the source (nothing overstated)

## Links

- Repo: ${repoUrl}
- Version: v${pkg.version}
- License: ${pkg.license}
- CHANGELOG: ${repoUrl}/blob/main/CHANGELOG.md
`;
fs.writeFileSync(path.join(DIST, 'market-pr.md'), pr, 'utf8');

// 首次投稿用的说明（条目尚不存在时使用），单独存一份
const prFirst = `# Add ${owner}/${repo}

新增一个插件条目：\`data/plugins/${fileName}\`

## 插件简介

${zh}

## 要求自查

- [x] \`package.json\` 声明了 \`dsh.bundle\`（\`{ bundle: { patch: "./cordis.patch.yml" } }\`），
      同目录有 \`cordis.patch.yml\`
- [x] 真实可运行代码（客户端面板 + 纯 JS 引擎；${counts.engine} 项引擎测试、${counts.mount}
      项挂载契约测试与 ${counts.deeptab} 项深层渲染测试，合计 ${totalChecks} 项自动化检查全绿）
- [x] 仓库已有内容（非占位/纯 README）
- [x] 仅新增一个文件，未改动任何既有条目
- [x] 未在 yml 中手写 \`npm:\` 字段
- [x] 仓库建满 1 天（2026-11-10 创建）
- [ ] 已添加 \`dsh-plugin\` topic

## 链接

- 仓库：${repoUrl}
- 版本：${pkg.version}
- 许可证：${pkg.license}

## 说明

分类选 \`ui\`：插件的主要形态是一个全宽面板（侧栏图标 + 六个标签页），
引擎与图表都在面板内，不注册工具、不改会话行为。
`;
fs.writeFileSync(path.join(DIST, 'market-pr-add.md'), prFirst, 'utf8');

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
