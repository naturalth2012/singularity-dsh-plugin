/** 校验市场条目：YAML 可解析、字段合规、描述与代码一致。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

let pass = 0, fail = 0;
const check = (n, ok, d) => {
  if (ok) { pass++; console.log('PASS  ' + n + (d ? '  — ' + d : '')); }
  else { fail++; console.log('FAIL  ' + n + (d ? '  — ' + d : '')); }
};

const files = fs.readdirSync(DIST).filter((f) => f.endsWith('.yml'));
check('恰好一个 yml 条目', files.length === 1, files.join(', '));
if (!files.length) process.exit(1);

const file = files[0];
const raw = fs.readFileSync(path.join(DIST, file), 'utf8');

console.log('=== 文件名与内容 ===');
check('文件名符合 <owner>__<repo>.yml', /^[^_]+__.+\.yml$/.test(file), file);

// 极简 YAML 解析（只覆盖本条目的结构）
const get = (key) => {
  const m = raw.match(new RegExp('^' + key + ':[ \\t]*(.+)$', 'm'));
  return m ? m[1].trim() : null;
};
const url = get('url');
const name = get('name');
const category = get('category');

check('url 指向本仓库', url === 'https://github.com/naturalth2012/singularity-dsh-plugin', url);
check('name 为 owner/repo', name === 'naturalth2012/singularity-dsh-plugin', name);
check('category 合法', ['agi', 'ui', 'usage', 'theme', 'model', 'identity', 'session', 'memory',
  'tools', 'wsl', 'browser', 'vision', 'voice', 'docs', 'skill', 'workflow', 'git', 'notify',
  'dev', 'security', 'remote', 'market', 'fun'].includes(category), category);
check('未手写 npm: 字段（规范禁止）', !/^npm:/m.test(raw));

// 描述
const en = (raw.match(/^\s+en:\s*"((?:[^"\\]|\\.)*)"\s*$/m) || [])[1];
const zh = (raw.match(/^\s+zh:\s*"((?:[^"\\]|\\.)*)"\s*$/m) || [])[1];
check('description.en 存在且已加引号', !!en, en ? en.length + ' 字符' : '');
check('description.zh 存在', !!zh, zh ? zh.length + ' 字符' : '');
check('描述以句号结尾', !!en && /\.$/.test(en), en ? en.slice(-20) : '');

// 描述与代码一致性（规范第 1 条：数字与 API 名称会被核对）
console.log('\n=== 描述与代码一致性 ===');
const client = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');

const leverCount = (client.match(/\{ key: '[a-z_]+', name: '/g) || []).length;
const realLevers = (client.match(/name: '[^']+', group: '[^']+'/g) || []).length;
check('"Fourteen levers" 与实际一致', realLevers === 14, '实际 ' + realLevers + ' 个');
check('2024-2060 区间一致', /T0 = 2024/.test(client) && /T2 = 2060/.test(client));

const scenCount = (client.match(/name: '[^']+ · /g) || []).length;
check('"Six preset scenarios" 与实际一致', scenCount === 6, '实际 ' + scenCount + ' 个');

const paths = ['算力封建制', '社会民主主义', '共产主义', '崩解']
  .filter((p) => client.includes(p));
check('四条路径名称都在代码中', paths.length === 4, paths.join('/'));

check('无 Host RPC（描述声明）', !/host\.call\(/.test(client));
check('无运行时 dependencies（描述声明）',
  !JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).dependencies);

console.log('\n--- 汇总 ---');
console.log(`${pass}/${pass + fail} 通过`);
process.exit(fail ? 1 : 0);
