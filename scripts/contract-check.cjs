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
const { execFileSync } = require('child_process');

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

/* ── 7d. 引擎快照同步（v1.4 C3：游戏仓库 M2 门槛的插件侧前置）── */
console.log('\n=== 7d. 引擎快照同步 ===');
const SNAP = path.join(__dirname, '..', 'engine.snapshot.js');
if (!fs.existsSync(SNAP)) {
  check('engine.snapshot.js 存在', false, '运行 node scripts/extract-engine.cjs 生成');
} else {
  const snap = fs.readFileSync(SNAP, 'utf8');
  // 边界必须与上方 engine 切片同源（含 /* 与 */），否则比对的是残缺片段
  const bi = client.lastIndexOf('/*', client.indexOf('ENGINE-BEGIN'));
  const ei = client.indexOf('*/', client.indexOf('ENGINE-END')) + 2;
  const region = bi >= 0 && ei > bi ? client.slice(bi, ei) : null;
  const snapHas = region !== null && snap.includes(region);
  check('快照与引擎区逐字节一致', snapHas,
    snapHas ? 'ok' : '漂移！运行 node scripts/extract-engine.cjs 重新生成');
  check('快照含上游 NOTICE 头', snap.includes('naturalth2012') && snap.includes('MIT'));
  // v1.4 审核加固：光有字符串包含不够——快照必须语法可解析、能装载、
  // 且算出与契约锚点一致的数值。此前快照切片漏了 /* 与 */，是废文件而
  // 「逐字节一致」自我印证通过（同一段错误切片比对自己）。
  check('快照导出 ESM createEngine', /export default function createEngine/.test(snap));
  check('快照无 CommonJS 残留', !/module\.exports/.test(snap));
  let snapOk = true, snapDetail = '';
  try {
    const out = execFileSync(process.execPath, ['--check', SNAP], { encoding: 'utf8', stdio: 'pipe' });
    void out;
  } catch (e) {
    snapOk = false;
    snapDetail = 'node --check 失败: ' + String(e.stderr || e.message).split('\n')[0];
  }
  check('快照语法可解析', snapOk, snapDetail);
  // 真实装载并核对契约锚点（baseline 终年租金 0.59）
  let loadOk = false, loadDetail = '';
  try {
    const probe = 'import c from ' + JSON.stringify('file:///' + SNAP.replace(/\\/g, '/')) + ';'
      + 'const a = c((n) => { throw new Error(n); });'
      + 'const s = a.simulate(a.targetOf("baseline"));'
      + 'if (Object.keys(a).length < 25) throw new Error("符号过少");'
      + 'if (Math.abs(s.final.rent - 0.59) > 0.005) throw new Error("baseline 租金 " + s.final.rent);'
      + 'if (a.reversal(a.targetOf("baseline")) === undefined) throw new Error("reversal 缺失");'
      + 'const r = a.mulberry32(42), q = a.mulberry32(42); if (r() !== q()) throw new Error("种子不确定");';
    const probePath = path.join(ROOT, 'scripts', '.snap-probe.mjs');
    fs.writeFileSync(probePath, probe, 'utf8');
    try {
      execFileSync(process.execPath, [probePath], { encoding: 'utf8', stdio: 'pipe' });
      loadOk = true;
    } finally {
      try { fs.unlinkSync(probePath); } catch (e) { /* 已删除 */ }
    }
  } catch (e) {
    loadDetail = String(e.stderr || e.message).split('\n')[0];
  }
  check('快照可装载且锚点正确', loadOk, loadDetail);
}
check('契约提及 mulberry32', doc.includes('mulberry32'));

/* ── 7e. v1.5 T4 诚实性声明（文档必须写明，否则 UI 的标注失去依据）── */
console.log('\n=== 7e. 诚实性声明（v1.5）===');
check('契约声明「窗口不是裁决时刻」', doc.includes('窗口不是裁决时刻'));
check('契约声明晚期反转实测样本', /578 个有窗口样本/.test(doc) && doc.includes('晚期反转'));
check('契约声明引力上限非对称', doc.includes('引力上限非对称') && doc.includes('COLLAPSE_GAIN = 1.8'));
check('契约声明社民路径依赖（255/255）', /255\/255/.test(doc) && doc.includes('public_ownership < 0.62'));

/* ── 7f. 文档计数自动化（v1.5 T3）── */
console.log('\n=== 7f. 文档计数自动化 ===');
const readmeSrc = read('README.md');
const publishingSrc = read('PUBLISHING.md');
check('README 有 counts:auto 标记对',
  readmeSrc.includes('<!-- counts:auto -->') && readmeSrc.includes('<!-- /counts:auto -->'));
check('PUBLISHING 有 counts:auto 标记对',
  publishingSrc.includes('<!-- counts:auto -->') && publishingSrc.includes('<!-- /counts:auto -->'));
check('PUBLISHING 无过时路径 D:\\AIApp',
  !/D:\\AIApp/.test(publishingSrc), /D:\\AIApp/.test(publishingSrc) ? '仍含旧路径' : 'ok');
check('PUBLISHING 无过时计数 26/26',
  !/26\/26/.test(publishingSrc), /26\/26/.test(publishingSrc) ? '仍含旧计数' : 'ok');
check('README 链接 CHANGELOG', /\[CHANGELOG\]\(CHANGELOG\.md\)|CHANGELOG\.md/.test(readmeSrc));

/* ── 7g. v1.6 T1：agent 工具（真实装载 index.js 并调用）── */
console.log('\n=== 7g. agent 工具（T1）===');
{
  const idxSrc = read('index.js');
  check('index.js 从快照装载引擎', /import createEngine from '\.\/engine\.snapshot\.js'/.test(idxSrc));
  check('index.js 不做第二份切片', !/ENGINE-BEGIN/.test(idxSrc) && !/factory\(require\)/.test(idxSrc));
  check('index.js 声明 tools 注入', /ctx\.inject\(\['tools'\]/.test(idxSrc));

  // 真实装载：写临时 mjs，import apply，配 stub ctx，断言三工具注册且可执行
  const probePath = path.join(ROOT, 'scripts', '.tools-probe.mjs');
  const probe = [
    'import { apply } from ' + JSON.stringify('file:///' + path.join(ROOT, 'index.js').replace(/\\/g, '/')) + ';',
    'const regs = [];',
    'apply({ inject(d, cb) { cb({ effect(fn) { fn(); return () => {}; },',
    '  tools: { register(def) { regs.push(def); return () => {}; } } }); } });',
    'const names = regs.map((r) => r.name).sort().join(",");',
    'if (names !== "singularity_compare,singularity_sensitivity,singularity_simulate") throw new Error("工具名不符: " + names);',
    'for (const r of regs) {',
    '  if (!r.description || r.description.length < 40) throw new Error(r.name + " 描述过短");',
    '  if (!r.parameters || r.parameters.type !== "object") throw new Error(r.name + " 参数 schema 缺失");',
    '  if (!r.output || typeof r.output.render !== "function") throw new Error(r.name + " output.render 缺失");',
    '}',
    'const sim = regs.filter((r) => r.name === "singularity_simulate")[0];',
    'const out = await sim.execute({ scenario: "baseline" });',
    'if (out.outcome !== "算力封建制") throw new Error("simulate 结果不符: " + out.outcome);',
    'if (Math.abs(out.rent - 0.59) > 0.005) throw new Error("rent 不符: " + out.rent);',
    'if (typeof out.text !== "string" || out.text.length < 100) throw new Error("text 缺失");',
    'const rendered = sim.output.render({}, out);',
    'if (!Array.isArray(rendered) || rendered[0].type !== "text") throw new Error("render 输出不符");',
    'const sens = regs.filter((r) => r.name === "singularity_sensitivity")[0];',
    'const s2 = await sens.execute({ scenario: "commons" });',
    'if (!Array.isArray(s2.items) || s2.items.length < 10) throw new Error("sensitivity items 过少: " + (s2.items || []).length);',
    'const cmp = regs.filter((r) => r.name === "singularity_compare")[0];',
    'const c2 = await cmp.execute({});',
    'if (!Array.isArray(c2.rows) || c2.rows.length !== 6) throw new Error("compare rows 应为 6");',
    'console.log("TOOLS OK");',
  ].join('\n');
  fs.writeFileSync(probePath, probe, 'utf8');
  let toolsOk = false, toolsDetail = '';
  try {
    const out = execFileSync(process.execPath, [probePath], { encoding: 'utf8', stdio: 'pipe' });
    toolsOk = /TOOLS OK/.test(out);
    toolsDetail = toolsOk ? '三工具注册并执行通过' : '未打印 TOOLS OK';
  } catch (e) {
    toolsDetail = String(e.stderr || e.message).split('\n')[0];
  } finally {
    try { fs.unlinkSync(probePath); } catch (e) { /* 已删除 */ }
  }
  check('三工具可装载、注册、执行且结果正确', toolsOk, toolsDetail);
  check('工具描述声明边界（非预言/非因果）',
    /不回答哪一年会发生什么|条件推演而非预言/.test(idxSrc)
    && /不是社会对政策的反应|前馈插值/.test(idxSrc));
}

/* ── 7h. v1.6 T5：校准报告与面板数据一致 ── */
console.log('\n=== 7h. 校准报告（T5）===');
{
  const calPath = path.join(ROOT, 'docs', 'calibration.json');
  if (!fs.existsSync(calPath)) {
    check('docs/calibration.json 存在', false, '运行 node scripts/calibrate.cjs');
  } else {
    const cal = JSON.parse(fs.readFileSync(calPath, 'utf8'));
    check('校准报告含必需字段',
      cal.outcomeDistribution && cal.winnerDistribution && cal.rentQuantiles
      && cal.asymmetries && cal.anchors && typeof cal.seed === 'number');
    check('校准报告记录生成时间/版本/种子',
      /^\d{4}-\d{2}-\d{2}T/.test(cal.generatedAt) && !!cal.version && typeof cal.seed === 'number');
    check('校准报告结局分布覆盖七种结局', cal.outcomeDistribution.length === 7,
      cal.outcomeDistribution.length + ' 种');
    check('校准报告六剧本锚点完整', cal.anchors.length === 6);
    // 面板内联数据必须与报告一致（防止注入后忘记重跑脚本）
    const m = /const HEALTH_DATA = (\{[\s\S]*?\});\n/.exec(client);
    let inlineOk = false, inlineDetail = '';
    if (!m) inlineDetail = '未找到 HEALTH_DATA';
    else {
      try {
        const inline = JSON.parse(m[1]);
        inlineOk = inline.outcomeDistribution.length === cal.outcomeDistribution.length
          && inline.winnerDistribution.length === cal.winnerDistribution.length
          && inline.seed === cal.seed
          && inline.samples === cal.samples
          && inline.anchors.length === cal.anchors.length
          && inline.rentQuantiles.p50 === cal.rentQuantiles.p50;
        inlineDetail = inlineOk ? '面板内联 == 报告' : '漂移！重跑 node scripts/inject-calibration.cjs';
      } catch (e) { inlineDetail = 'HEALTH_DATA 解析失败: ' + e.message; }
    }
    check('面板内联校准数据与报告一致', inlineOk, inlineDetail);
    check('校准报告含契约 §9 三条非对称', !!cal.asymmetries.collapseGain
      && !!cal.asymmetries.socialDemocracy && !!cal.asymmetries.chattering);
  }
}

/* ── 7i. v1.6 文档：接口与校准章节 ── */
console.log('\n=== 7i. 契约 v1.6 章节 ===');
check('契约 §11 列三个工具', doc.includes('singularity_simulate')
  && doc.includes('singularity_sensitivity') && doc.includes('singularity_compare'));
check('契约声明工具边界（非预言/非因果）', doc.includes('条件推演而非预言'));
check('契约 §12 声明校准一致性约束', doc.includes('docs/calibration.json')
  && doc.includes('逐组相同'));
check('契约核对方式含 adversarial', doc.includes('tests/adversarial.test.cjs'));
check('契约核对方式含 deeptab', doc.includes('tests/deeptab.test.cjs'));

/* ── 7j. v1.7 稳定性与发布质量（档 A）── */
console.log('\n=== 7j. 稳定性与发布质量（v1.7）===');
check('client.js 有 ErrorBoundary', /class SnErrorBoundary extends React\.Component/.test(client)
  && /static getDerivedStateFromError/.test(client));
check('ErrorBoundary 只包内容区而非整棵树',
  /className: 'sn-body' \},\s*\n\s*h\(SnErrorBoundary/.test(client));
check('降级 UI 提供重试与复制', /'重试'/.test(client) && /'复制错误详情'/.test(client));
check('有恢复默认入口', /const resetTarget = React\.useCallback/.test(client)
  && /onClick: resetTarget/.test(client));

{
  // 插件详情文档：locale 声明 meta.detail 且文件真实存在非空
  let detailOk = false, detailMsg = '';
  try {
    const zh = JSON.parse(read('locale/zh.json'));
    const en = JSON.parse(read('locale/en.json'));
    const rel = zh.meta && zh.meta.detail;
    detailOk = !!rel && !!en.meta && en.meta.detail === rel;
    if (!detailOk) detailMsg = 'locale 未声明 meta.detail 或中英不一致';
    else {
      const p = path.join(ROOT, rel);
      const exists = fs.existsSync(p);
      const size = exists ? fs.statSync(p).size : 0;
      detailOk = exists && size > 1500;
      detailMsg = exists ? size + ' 字节' : '文件不存在: ' + rel;
    }
  } catch (e) { detailMsg = e.message; }
  check('插件详情文档 meta.detail 指向真实非空文件', detailOk, detailMsg);
}

{
  const pkg = JSON.parse(read('package.json'));
  check('files 含 docs/DETAIL.md', (pkg.files || []).indexOf('docs/DETAIL.md') >= 0);
  check('files 含 engine.snapshot.js（工具运行时依赖）',
    (pkg.files || []).indexOf('engine.snapshot.js') >= 0);
}

{
  // AUDIT-FIXES 状态已校准：不应再有已完成的项标「待做」
  const af = read('AUDIT-FIXES.md');
  const stale = [];
  if (/P1-1[^\n]*\[~\]/.test(af)) stale.push('P1-1');
  if (/P1-2[^\n]*\[~\]/.test(af)) stale.push('P1-2');
  if (/转正为 `tests\/adversarial\.test\.cjs`[^\n]*\[ \]/.test(af)) stale.push('探针转正');
  check('AUDIT-FIXES 无过期状态标记', stale.length === 0,
    stale.length ? '仍标待做: ' + stale.join(', ') : 'ok');
}

/* ── 7k. v1.8 阶段可达性披露（P1-3）── */
console.log('\n=== 7k. 阶段可达性披露（v1.8）===');
check('契约声明 stage 0 不可达', doc.includes('不会返回 id 0') || doc.includes('stage 0 出现 0 次'));
check('契约声明 2024 起点固定', doc.includes('2024 年技术渗透度恒为 0.4008'));
check('契约声明岔路前技术单变量', doc.includes('制度、社会、意义杠杆在此阶段**完全不参与阶段判定**'));
check('契约区分不可达与稀有', doc.includes('「不可达」与「稀有」是两件事'));
check('阶段轨道标注前史', /前史标注：引擎不返回此阶段/.test(client) && /'前史'/.test(client));
check('理论页含阶段局限三条',
  /STAGE_LIMITS/.test(client) && /阶段 0 不可达/.test(client)
  && /岔路前阶段由技术单变量决定/.test(client));
check('体检页含阶段可达性', /阶段可达性/.test(client) && /结构性不可达/.test(client));

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
