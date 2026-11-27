/**
 * 发布前一致性校验。
 * 检查 package.json / client.js / cordis.patch.yml 三处包名完全一致，
 * 以及发布必需的字段与文件都在。任一项失败即退出码 1。
 *
 * 用法: node scripts/preflight.cjs
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

const pkg = JSON.parse(read('package.json'));
const client = read('client.js');
const patch = read('cordis.patch.yml');

console.log('=== 包名一致性 ===');
const name = pkg.name;
check('package.json name', !!name, name);
check('client.js 的 __ModuleLoader__.load id 与包名一致',
  client.includes(`id: '${name}'`), name);
check('cordis.patch.yml 的 name 与包名一致',
  patch.includes(`name: '${name}'`), name);
check('包名不再是本地占位名', !name.startsWith('@local/'), name);
check('client.js 样式表标记与包名一致',
  client.includes(`data-plugin-css', '${name}'`));

console.log('\n=== 发布必需字段 ===');
check('version 为语义化版本', /^\d+\.\d+\.\d+$/.test(pkg.version), pkg.version);
check('private 为 false（可发布）', pkg.private === false, String(pkg.private));
check('license 已声明', !!pkg.license, pkg.license);
check('description 非空', !!pkg.description && pkg.description.length > 10);
check('repository.url 已配置', !!(pkg.repository && pkg.repository.url), pkg.repository && pkg.repository.url);
check('engines.node 已声明', !!(pkg.engines && pkg.engines.node));
check('dsh.bundle.patch 已配置', !!(pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch));
check('dsh.client.platform 为 web', !!(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web'));

console.log('\n=== 仓库 URL 占位符 ===');
const urls = JSON.stringify(pkg.repository || {}) + (pkg.homepage || '') + JSON.stringify(pkg.bugs || {});
const hasPlaceholder = urls.includes('CODEOWNER');
check('仓库 URL 已替换为真实用户名', !hasPlaceholder,
  hasPlaceholder ? '仍是 CODEOWNER，发布前必须替换' : 'ok');

console.log('\n=== 必需文件 ===');
const must = ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg',
  'README.md', 'LICENSE', 'locale/en.json', 'locale/zh.json'];
must.forEach((f) => {
  check('存在 ' + f, fs.existsSync(path.join(ROOT, f)));
});
check('files 字段含 LICENSE', (pkg.files || []).includes('LICENSE'));
check('files 字段含 icon.svg', (pkg.files || []).includes('icon.svg'));

console.log('\n=== locale 元数据 ===');
['locale/en.json', 'locale/zh.json'].forEach((f) => {
  try {
    const j = JSON.parse(read(f));
    const ok = !!(j.meta && j.meta.title && j.meta.description);
    check(f + ' 含 meta.title/description', ok,
      ok ? (j.meta.title + ' — ' + j.meta.description.slice(0, 30) + '…') : '');
  } catch (e) {
    check(f + ' 是合法 JSON', false, e.message);
  }
});

/* ── v2.0 i18n：视图键 ── */
console.log('\n=== i18n 视图键（v2.0）===');
{
  let zhV = null, enV = null;
  try { zhV = JSON.parse(read('locale/zh.json')); } catch (e) { /* 上面已断言 */ }
  try { enV = JSON.parse(read('locale/en.json')); } catch (e) { /* 上面已断言 */ }
  if (zhV && enV) {
    const zk = Object.keys(zhV).filter((k) => k !== 'meta').sort();
    const ek = Object.keys(enV).filter((k) => k !== 'meta').sort();
    check('zh/en 视图键集一致', JSON.stringify(zk) === JSON.stringify(ek),
      'zh=' + zk.length + ' en=' + ek.length);
    check('视图键数量 ≥30', zk.length >= 30, zk.length + ' 个');
    check('无空视图值',
      zk.every((k) => typeof zhV[k] === 'string' && zhV[k].trim())
      && ek.every((k) => typeof enV[k] === 'string' && enV[k].trim()));
    // 英文不能只是中文的复制（抽样 5 个含中文的键即为漏译）
    const untranslated = ek.filter((k) => /[\u4e00-\u9fa5]/.test(enV[k]));
    check('英文视图无中文残留', untranslated.length === 0,
      untranslated.length ? untranslated.slice(0, 5).join(',') : 'ok');
  }
}

console.log('\n=== 文档一致性（v1.5 T3）===');
{
  const pub = read('PUBLISHING.md');
  check('PUBLISHING 路径为实际工作区', pub.includes('D:\\DeepseekAPP\\Singularity')
    && !/D:\\AIApp/.test(pub));
  check('PUBLISHING 含自动计数标记', pub.includes('<!-- counts:auto -->')
    && pub.includes('<!-- /counts:auto -->'));
  check('README 含自动计数标记', read('README.md').includes('<!-- counts:auto -->'));
}

console.log('\n=== v1.6 工具与校准（T1/T5）===');
{
  check('files 含 engine.snapshot.js', (pkg.files || []).includes('engine.snapshot.js'));
  check('index.js 声明 tools 注入', /ctx\.inject\(\['tools'\]/.test(read('index.js')));
  const calExists = (() => { try { return !!read('docs/calibration.json'); } catch (e) { return false; } })();
  check('docs/calibration.json 存在（npm run calibrate 生成）', calExists);
  check('package.json 有 calibrate 脚本', !!(pkg.scripts || {}).calibrate);
}

console.log('\n=== v1.7 插件详情与稳定性（档 A）===');
{
  let detailRel = null;
  try {
    const zh = JSON.parse(read('locale/zh.json'));
    detailRel = zh.meta && zh.meta.detail;
  } catch (e) { /* 下面断言会失败 */ }
  check('locale 声明 meta.detail', !!detailRel, detailRel || '缺失');
  let detailSize = 0;
  if (detailRel) {
    try { detailSize = read(detailRel).length; } catch (e) { detailSize = 0; }
  }
  check('详情文档存在且内容充实（>1500 字符）', detailSize > 1500, detailSize + ' 字符');
  check('files 含 docs/DETAIL.md', (pkg.files || []).indexOf('docs/DETAIL.md') >= 0);
  check('client.js 有 ErrorBoundary', /class SnErrorBoundary/.test(read('client.js')));
}

console.log('\n--- 汇总 ---');
console.log(`${pass}/${pass + fail} 通过`);
if (fail) {
  console.log('\n有 ' + fail + ' 项未通过，先修好再发布。');
}
process.exit(fail ? 1 : 0);
