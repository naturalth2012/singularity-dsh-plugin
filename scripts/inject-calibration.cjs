/**
 * v1.6 T5：把 docs/calibration.json 注入 client.js 的 HEALTH_DATA 常量。
 *
 * 为什么要注入而不是运行时 fetch：面板是单文件插件，无网络请求、无资源路由；
 * 而 2000 次 simulate 若在 tab 切换时重算会卡。构建期注入 = 只读且零运行时成本。
 *
 * contract-check 断言「client.js 里的 HEALTH_DATA 与 docs/calibration.json 一致」，
 * 所以注入后忘记重跑脚本会被测试抓到。
 *
 * 用法: node scripts/inject-calibration.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const jsonPath = path.join(ROOT, 'docs', 'calibration.json');
const clientPath = path.join(ROOT, 'client.js');

if (!fs.existsSync(jsonPath)) {
  console.error('缺少 docs/calibration.json —— 先运行 node scripts/calibrate.cjs');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const src = fs.readFileSync(clientPath, 'utf8');

const BEGIN = '/* HEALTH-DATA-BEGIN';
const END = 'HEALTH-DATA-END */';

const bi = src.indexOf(BEGIN);
const ei = src.indexOf(END);
if (bi < 0 || ei < 0) {
  console.error('client.js 缺少 HEALTH-DATA 标记');
  process.exit(1);
}

// 只保留面板要用的字段（体积与可读性），完整报告仍在 docs/calibration.json
const slim = {
  generatedAt: report.generatedAt,
  version: report.version,
  commit: report.commit,
  seed: report.seed,
  samples: report.samples,
  note: report.note,
  outcomeDistribution: report.outcomeDistribution,
  winnerDistribution: report.winnerDistribution,
  rentQuantiles: report.rentQuantiles,
  asymmetries: {
    collapseGain: report.asymmetries.collapseGain,
    socialDemocracy: report.asymmetries.socialDemocracy,
    chattering: report.asymmetries.chattering,
  },
  stageReachability: report.stageReachability,
  anchors: report.anchors,
};

const block = [
  BEGIN,
  '       v1.6 T5：模型体检数据 —— 由 scripts/inject-calibration.cjs 从',
  '       docs/calibration.json 注入，勿手改。重跑：npm run calibrate',
  '       （生成 → 注入 → 契约断言三者一致）',
  '       ' + END,
  '    const HEALTH_DATA = ' + JSON.stringify(slim) + ';',
].join('\n');

// 从 BEGIN 所在的缩进开始替换，保留原有前导空白。
// END 之后原有的 `const HEALTH_DATA = ...;` 行也必须吃掉，否则重复声明。
const lineStart = src.lastIndexOf('\n', bi) + 1;
const indent = src.slice(lineStart, bi);
let tail = ei + END.length;
const oldDecl = /\n[ \t]*const HEALTH_DATA = [\s\S]*?;\n/.exec(src.slice(tail));
if (oldDecl && oldDecl.index === 0) tail += oldDecl[0].length - 1;
fs.writeFileSync(clientPath,
  src.slice(0, lineStart) + indent + block + src.slice(tail), 'utf8');
console.log('已注入 HEALTH_DATA（' + JSON.stringify(slim).length + ' 字符）');
