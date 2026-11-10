/**
 * 一次性配置仓库地址：把 package.json 里的 CODEOWNER 占位符替换成真实 GitHub 用户名。
 *
 * 用法:
 *   node scripts/set-repo.cjs <github 用户名>
 *   node scripts/set-repo.cjs <github 用户名> <仓库名>      # 默认仓库名 singularity-dsh-plugin
 *
 * 只改 homepage / repository / bugs 三个字段，其余原样保留。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');

const owner = process.argv[2];
const repo = process.argv[3] || 'singularity-dsh-plugin';

if (!owner) {
  console.error('用法: node scripts/set-repo.cjs <github 用户名> [仓库名]');
  process.exit(1);
}
if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) {
  console.error('GitHub 用户名不合法: ' + owner);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const base = `https://github.com/${owner}/${repo}`;

pkg.homepage = base + '#readme';
pkg.repository = { type: 'git', url: `git+${base}.git` };
pkg.bugs = { url: base + '/issues' };

fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log('已写入仓库地址:');
console.log('  homepage  : ' + pkg.homepage);
console.log('  repository: ' + pkg.repository.url);
console.log('  bugs      : ' + pkg.bugs.url);
console.log('\n下一步: node scripts/preflight.cjs');
