/** 模拟 npm pack 的白名单结果，确认发布产物完整且不含多余文件。 */
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('包名: ' + pkg.name + '  版本: ' + pkg.version + '  private: ' + pkg.private);
console.log('');

const toRe = (f) => new RegExp(
  '^' + f.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$',
);
const res = (pkg.files || []).map(toRe);

const all = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name).replace(/\\/g, '/').replace(/^\.\//, '');
    if (e.isDirectory()) walk(p); else all.push(p);
  }
})('.');

const picked = all.filter((p) => res.some((r) => r.test(p))).sort();
const skipped = all.filter((p) => !picked.includes(p)).sort();

console.log('npm pack 会包含:');
picked.forEach((p) => console.log('  ' + p + '  (' + fs.statSync(p).size + ' B)'));
console.log('');
console.log('不会包含（仓库内但不在 files 白名单）:');
skipped.forEach((p) => console.log('  ' + p));

// 关键断言
const must = ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'LICENSE', 'README.md',
  'locale/en.json', 'locale/zh.json'];
const missing = must.filter((m) => !picked.includes(m));
console.log('');
if (missing.length) {
  console.log('FAIL 缺少必需文件: ' + missing.join(', '));
  process.exit(1);
}
console.log('OK 发布产物包含全部必需文件（' + picked.length + ' 个，共 '
  + picked.reduce((s, p) => s + fs.statSync(p).size, 0) + ' 字节）');
