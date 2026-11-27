/**
 * 模型契约自检：断言 MODEL-CONTRACT.md 与 client.js 引擎区一致。
 *
 * Singularity 是预测模型，其价值在于假设可被核对。本文档与代码一旦漂移，
 * 读者据以质疑的就不再是模型本身。本脚本在常规回归中拦截这种漂移。
 *
 * 检查项：
 *   1. 四个闸门常数与文档声明一致
 *   2. 杠杆数量 14，且每个 key 在文档中出现
 *   3. 主轨阶段 7 个、旁支 4 个
 *   4. 三区语义的分支条件在源码中存在
 *   5. 引擎区（ENGINE-BEGIN…ENGINE-END）不含 React / DOM / localStorage
 *   6. 四条引力函数与文档公式的系数一致
 *
 * 用法: node scripts/contract-check.cjs
 * 失败退出码 1。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS  ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};

const client = read('client.js');
const doc = read('MODEL-CONTRACT.md');

/* ── 提取引擎区 ── */
// 注意：切片必须从标记所在注释块的 `/*` 开始，否则注释开头被截掉，
// 后续剥离块注释时会因找不到闭合而把说明文字当成代码。
const eBeginMark = client.indexOf('ENGINE-BEGIN');
const eEndMark = client.indexOf('ENGINE-END');
if (eBeginMark < 0 || eEndMark < 0) {
  console.log('FAIL  引擎区标记缺失  — 需要 ENGINE-BEGIN / ENGINE-END 注释');
  process.exit(1);
}
const eBegin = client.lastIndexOf('/*', eBeginMark);
const eEnd = client.indexOf('*/', eEndMark) + 2;
const engine = client.slice(eBegin, eEnd);

/* ── 1. 闸门常数 ── */
console.log('=== 1. 闸门常数 ===');
const consts = [
  ['GATE_PEN', 0.68],
  ['GATE_SOC', 0.48],
  ['COLLAPSE_GAIN', 1.8],
];
consts.forEach(([name, expected]) => {
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*([\\d.]+)');
  const m = engine.match(re);
  const codeVal = m ? parseFloat(m[1]) : NaN;
  check(name + ' 代码值', codeVal === expected, String(codeVal));
  // 文档必须声明同一个值（允许 0.68 / 1.8 形式）
  check(name + ' 文档声明', doc.includes(String(expected)),
    doc.includes(String(expected)) ? 'found ' + expected : '未在文档中找到 ' + expected);
});

/* ── 2. 杠杆 ── */
console.log('\n=== 2. 十四个杠杆 ===');
const leverKeys = [];
const leverRe = /\{\s*key:\s*'([a-z_]+)',\s*name:/g;
let lm;
// 只在 LEVERS 数组范围内匹配
const leversStart = engine.indexOf('const LEVERS = [');
const leversEnd = engine.indexOf('];', leversStart);
const leversBlock = engine.slice(leversStart, leversEnd);
while ((lm = leverRe.exec(leversBlock)) !== null) leverKeys.push(lm[1]);

check('杠杆数量为 14', leverKeys.length === 14, '实际 ' + leverKeys.length + ' 个');
const missing = leverKeys.filter((k) => !doc.includes('`' + k + '`'));
check('每个杠杆 key 在文档中被提及', missing.length === 0,
  missing.length ? '缺失: ' + missing.join(', ') : '14/14 全部覆盖');

// 分组数量
const techCount = (leversBlock.match(/group:\s*'技术'/g) || []).length;
const instCount = (leversBlock.match(/group:\s*'制度'/g) || []).length;
const socialCount = (leversBlock.match(/group:\s*'社会'/g) || []).length;
const frictionCount = (leversBlock.match(/group:\s*'摩擦'/g) || []).length;
check('分组为 技术4 / 制度4 / 社会3 / 摩擦3',
  techCount === 4 && instCount === 4 && socialCount === 3 && frictionCount === 3,
  techCount + '/' + instCount + '/' + socialCount + '/' + frictionCount);

/* ── 3. 阶段 ── */
console.log('\n=== 3. 阶段轨道 ===');
const stagesStart = engine.indexOf('const STAGES = [');
const stagesEnd = engine.indexOf('];', stagesStart);
const stagesBlock = engine.slice(stagesStart, stagesEnd);
const stageCount = (stagesBlock.match(/\{\s*id:\s*\d+,\s*key:/g) || []).length;
check('主轨阶段为 7 个', stageCount === 7, '实际 ' + stageCount + ' 个');

const extraStart = engine.indexOf('const EXTRA_STAGES = {');
const extraEnd = engine.indexOf('};', extraStart);
const extraBlock = engine.slice(extraStart, extraEnd);
const extraCount = (extraBlock.match(/id:\s*\d+,/g) || []).length;
check('旁支阶段为 4 个', extraCount === 4, '实际 ' + extraCount + ' 个');

/* ── 4. 三区语义 ── */
console.log('\n=== 4. 三区裁决语义 ===');
check('毁灭区阈值 devastation > 0.5 存在',
  /m\.devastation\s*>\s*0\.5/.test(engine));
check('裁决区 penetration >= GATE_PEN 存在',
  /pen\s*<\s*GATE_PEN/.test(engine));
check('带伤停滞阈值 0.25 存在',
  /devastation\s*>\s*0\.25/.test(engine));
check('社会化闸门 GATE_SOC 用于共产主义内部分档',
  /soc\s*<\s*GATE_SOC/.test(engine));

/* ── 5. 引擎区纯净性 ── */
console.log('\n=== 5. 引擎区纯净性 ===');
// 逐行剥离注释与字符串字面量后再检查：引擎区的文档性注释里会出现
// 「不得引用 React / document」这类说明文字，那不是真实依赖。
const stripCode = (src) => src
  // 先剥跨行块注释（含 ══ 装饰的说明块）——必须在逐行处理之前，
  // 否则块注释的中间行会被当作代码行残留下来。
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((line) => {
    let s = line;
    s = s.replace(/\/\/.*$/, ' ');            // 行注释
    s = s.replace(/'(?:[^'\\]|\\.)*'/g, "''"); // 单引号字符串
    return s;
  }).join('\n');

const engineNoComments = stripCode(engine);
// 只禁「全局环境访问」形式，不禁属性名。例如 simulate() 返回 { window: win }
// 是数据结构字段（分岔窗口），不是 DOM 访问，不应误判。
const forbidden = [
  ['React', /\bReact\b/],
  ['document', /\bdocument\s*\./],
  ['window', /\bwindow\s*\./],
  ['globalThis', /\bglobalThis\b/],
  ['localStorage', /\blocalStorage\b/],
];
forbidden.forEach(([name, re]) => {
  const m = engineNoComments.match(re);
  let where = '';
  if (m) {
    const idx = engineNoComments.indexOf(m[0]);
    const lineNo = engineNoComments.slice(0, idx).split('\n').length;
    where = '引擎区第 ' + lineNo + ' 行（区内相对）';
  }
  check('引擎区不引用 ' + name, !m, where);
});

/* ── 6. 引力公式系数 ── */
console.log('\n=== 6. 引力公式系数 ===');
check('feudalism 捕获折减系数 0.55 / 0.20 / 0.15 / 0.10',
  /0\.55\s*\+\s*0\.20\s*\*\s*\(1\s*-\s*s\.public_ownership\)/.test(engine)
  && /0\.15\s*\*\s*\(1\s*-\s*s\.coordination\)/.test(engine)
  && /0\.10\s*\*\s*\(1\s*-\s*s\.redistribution\)/.test(engine));
check('social_democracy 权重 0.34 / 0.24 / 0.12',
  /0\.34\s*\*\s*s\.redistribution/.test(engine)
  && /0\.24\s*\*\s*s\.labor_power/.test(engine)
  && /0\.12\s*\*\s*\(1\s*-\s*s\.capture\)/.test(engine));
check('communism 权重 0.42 / 0.24 / 0.16 / 0.18',
  /0\.42\s*\*\s*s\.public_ownership/.test(engine)
  && /0\.24\s*\*\s*s\.coordination/.test(engine)
  && /0\.16\s*\*\s*s\.solidarity/.test(engine)
  && /0\.18\s*\*\s*s\.meaning/.test(engine));
check('collapse 权重 0.45 / 0.25 / 0.30',
  /0\.45\s*\*\s*clamp\(\(s\.conflict\s*-\s*0\.45\)/.test(engine)
  && /0\.25\s*\*\s*clamp\(\(shock\s*-\s*0\.45\)/.test(engine)
  && /0\.30\s*\*\s*clamp\(\(0\.55\s*-\s*cohesion\)/.test(engine));
check('reformRoom 折减上限 0.62',
  /clamp\(\(0\.62\s*-\s*s\.public_ownership\)\s*\/\s*0\.62\)/.test(engine));

/* ── 7. 派生指标权重 ── */
console.log('\n=== 7. 派生指标关键权重 ===');
check('tech 权重 0.30 / 0.25 / 0.25 / 0.20',
  /0\.30\s*\*\s*s\.cognition\s*\+\s*0\.25\s*\*\s*s\.compute/.test(engine));
check('socialization 权重 0.45 / 0.35 / 0.20',
  /0\.45\s*\*\s*s\.public_ownership\s*\+\s*0\.35\s*\*\s*s\.redistribution/.test(engine));
check('penetration 权重 0.60 / 0.40',
  /0\.60\s*\*\s*gross\s*\+\s*0\.40\s*\*\s*clamp/.test(engine));
check('replacement 教育折减 0.30',
  /gross\s*\*\s*\(1\s*-\s*0\.30\s*\*\s*s\.education\)/.test(engine));

/* ── 7b. 租金压力（v1.2 R4/R5）── */
console.log('\n=== 7b. 租金压力（只读指标）===');
check('引擎定义 rentPressure 函数', /function\s+rentPressure\s*\(/.test(engine));
check('rentPressure 公式：占有 0.50 / 能源 0.20 / 捕获 0.30',
  /0\.50\s*\*\s*\(1\s*-\s*s\.public_ownership\)/.test(engine)
  && /0\.20\s*\*\s*\(1\s*-\s*s\.energy\)/.test(engine)
  && /0\.30\s*\*\s*s\.capture/.test(engine));
check('rentPressure 认知放大 0.35 / 0.65',
  /\(0\.35\s*\+\s*0\.65\s*\*\s*s\.cognition\)/.test(engine));
check('RENT_BANDS 三档 0.45 / 0.60 / 0.75',
  /RENT_BANDS\s*=\s*\{\s*watch:\s*0\.45,\s*warn:\s*0\.60,\s*formed:\s*0\.75\s*\}/.test(engine));
check('simulate 逐年行携带只读 rent 字段', /rent:\s*rentPressure\(s\)/.test(engine));
check('引擎定义 findCrossing 纯查询函数', /function\s+findCrossing\s*\(/.test(engine));

// 单一裁决函数承诺（机器强制）：decidePath 函数体内不得出现 rentPressure。
const extractFn = (src, name) => {
  const head = src.indexOf('function ' + name + '(');
  if (head < 0) return null;
  const open = src.indexOf('{', head);
  let d = 1, j = open + 1;
  for (; j < src.length && d > 0; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') d--;
  }
  return src.slice(open, j);
};
const decidePathBody = extractFn(engine, 'decidePath');
check('单一裁决函数：decidePath 体不引用 rentPressure',
  decidePathBody !== null && !decidePathBody.includes('rentPressure'));

// v1.3：政策符号也不得进入裁决链
const polTaint = ['policy', 'robustness', 'reversal', 'leversPolicyAt']
  .filter((t) => decidePathBody.includes(t));
check('单一裁决函数：decidePath 体不引用政策符号', polTaint.length === 0,
  polTaint.length ? '含 ' + polTaint.join(',') : '');

// 文档侧：公式、阈值、校准结论与新非对称声明都在契约中
check('契约含租金压力节（公式/RENT_BANDS/findCrossing）',
  doc.includes('rentPressure') && doc.includes('RENT_BANDS') && doc.includes('findCrossing'));
check('契约载明校准阈值 0.45 / 0.60 / 0.75',
  doc.includes('| 关注 watch | ≥ 0.45')
  && doc.includes('| 预警 warn | ≥ 0.60')
  && doc.includes('| 成形 formed | ≥ 0.75'));
check('契约含 2038/2039 校准锚点', doc.includes('2038') && doc.includes('2039'));
check('契约 §9 补生态天花板与租金静态性声明',
  doc.includes('生态天花板不在模型域内') && doc.includes('租金压力是静态函数，非动力学反馈'));

/* ── 7c. 政策干预与稳健性（v1.3）── */
console.log('\n=== 7c. 政策干预与稳健性 ===');
check('引擎定义 leversPolicyAt（分段插值）', /function\s+leversPolicyAt\s*\(/.test(engine));
check('引擎定义 validatePolicy（键校验）', /function\s+validatePolicy\s*\(/.test(engine));
check('simulate 含第二可选参 policy', /function\s+simulate\s*\(\s*target\s*,\s*policy\s*\)/.test(engine));
check('引擎定义 robustness / reversal',
  /function\s+robustness\s*\(/.test(engine) && /function\s+reversal\s*\(/.test(engine));
check('逐年行携带 policyActive 标记', /policyActive:\s*!!\(/.test(engine));
check('契约含 §8c 与政策不持久化声明',
  doc.includes('8c. 政策干预与稳健性') && doc.includes('政策不持久化'));
check('契约 §9 含政策重定向前馈声明', doc.includes('政策重定向仍是前馈插值'));

/* ── 8. 文档结构完整性 ── */
console.log('\n=== 8. 文档结构 ===');
const requiredSections = [
  '时间轴与插值', '十四个杠杆', '派生指标', '三区裁决语义',
  '四条引力', '闸门常数', '阶段轨道', '结局文案分桶', '已知非对称与局限',
];
requiredSections.forEach((s) => {
  check('文档含章节「' + s + '」', doc.includes(s));
});

/* ── 汇总 ── */
console.log('\n--- 汇总 ---');
console.log(pass + '/' + (pass + fail) + ' 通过');
if (fail > 0) {
  console.log('\n契约已漂移：请同步 MODEL-CONTRACT.md 与 client.js 引擎区。');
  process.exit(1);
}
