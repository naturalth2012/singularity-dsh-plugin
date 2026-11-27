#!/usr/bin/env node
/**
 * realreact-probe.cjs — 用真实 React 渲染 SingularityApp，复现浏览器里才有的
 * 渲染崩溃（未定义变量、hooks 顺序违规等）。
 *
 * 为什么需要它（v2.2.1）：render-probe.cjs 与 mount.test.cjs 用的是 React 桩，
 * 只遍历元素树、从不调用函数型子组件，因此「模块级组件引用了 App 作用域符号」
 * 这类错误它们永远看不见。v2.2.0 的 StageTrack 就是这样把 main 条目炸掉、
 * 被 SlotCore 退位（active:false）的——侧栏图标还在，点开却永远空白。
 *
 * React 解析顺序：$SINGULARITY_REACT_DIR → 本包 node_modules → 同盘相邻项目。
 * 都找不到时退出码 3 并打印安装指引（不静默跳过：这是唯一能抓住渲染崩溃的检查）。
 *
 * 用法：
 *   node scripts/realreact-probe.cjs          → 逐 tab 探测全部七页
 *   node scripts/realreact-probe.cjs timeline → 只探某一页
 */
'use strict';
const fs = require('fs');
const path = require('path');

/** 按候选顺序找一个能 require('react') 的目录。 */
function resolveReactDir() {
  const candidates = [];
  if (process.env.SINGULARITY_REACT_DIR) candidates.push(process.env.SINGULARITY_REACT_DIR);
  candidates.push(path.join(__dirname, '..', 'node_modules'));
  // 相邻项目（开发者常在同一盘里已有 react）
  const siblings = ['dsh-connect-trae', 'dsh-connect-workbuddy', '.probe4'];
  const root = path.join(__dirname, '..', '..');
  for (const name of siblings) candidates.push(path.join(root, name, 'node_modules'));

  for (const dir of candidates) {
    const reactPkg = path.join(dir, 'react', 'package.json');
    const serverPkg = path.join(dir, 'react-dom', 'package.json');
    if (fs.existsSync(reactPkg) && fs.existsSync(serverPkg)) return dir;
  }
  return null;
}

const REACT_DIR = resolveReactDir();
if (!REACT_DIR) {
  console.error(
    'realreact-probe: 找不到 react / react-dom。\n'
    + '这个探针需要真实 React 才能抓住渲染崩溃（桩探针测不出来）。\n'
    + '请任选其一：\n'
    + '  1) npm install --no-save react@18 react-dom@18\n'
    + '  2) set SINGULARITY_REACT_DIR=<含 react 的 node_modules 目录>\n'
  );
  process.exit(3);
}
const req = (name) => require(path.join(REACT_DIR, name));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');

const src = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8');

// 抽出 factory 函数体（与 render-probe 相同的括号平衡法）
function extractFactoryBody(s) {
  const start = s.indexOf('factory(require) {');
  const bodyStart = s.indexOf('{', start) + 1;
  let depth = 1, i = bodyStart;
  for (; i < s.length && depth > 0; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') depth--;
  }
  return s.slice(bodyStart, i - 1);
}
const body = extractFactoryBody(src);
// 强制初始标签页（探测所有 tab），默认 timeline
const patched0 = body.replace(/return\s*\{\s*\n\s*inject:/, 'window.__spec = { inject:');
const patched = patched0.replace("React.useState('timeline')", "React.useState(window.__FORCE_TAB || 'timeline')"); // eslint-disable-line no-useless-escape

// 环境桩
const storage = {};
const windowStub = {
  __ModuleLoader__: { load(spec) { windowStub.__spec = spec; } },
  location: { search: '' },
  navigator: { language: 'zh-CN' },
  localStorage: {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
  },
};
const documentStub = {
  createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }),
  head: { appendChild() {} },
};
new Function('window', 'document', 'require', patched)(windowStub, documentStub, req);
const mod = windowStub.__spec;
if (!mod) { console.error('module not registered'); process.exit(1); }
if (typeof mod !== 'object' || typeof mod.apply !== 'function') {
  console.error('unexpected exports: ' + typeof mod); process.exit(1);
}

const registrations = [];
const ctx = {
  effect(fn) { fn(); return () => {}; },
  get() { return undefined; },
  slots: {
    inject(deps, cb) { const d = cb(); return () => d && d(); },
    register(opts, comp) { registrations.push({ opts, comp }); return () => {}; },
  },
};
mod.apply(ctx);

const main = registrations.filter((r) => r.opts.name === 'main')[0];
if (!main) { console.error('main slot not registered'); process.exit(1); }

// 渲染（真实 hooks 语义）。React 18 的静态渲染若 hooks 顺序违规则会 throw。
const TABS = ['timeline', 'engine', 'branch', 'metrics', 'compare', 'theory', 'health'];
const forced = process.argv[2];
if (forced) {
  windowStub.__FORCE_TAB = forced;
  try {
    const html = renderToStaticMarkup(React.createElement(main.comp, {}));
    console.log('OK tab=' + forced + ' length=' + html.length);
  } catch (e) {
    console.error('RENDER THREW on tab=' + forced + ': ' + (e && e.message));
    console.error(e && e.stack ? e.stack.split('\n').slice(0, 12).join('\n') : '');
    process.exit(2);
  }
  process.exit(0);
}

// 无参数：逐 tab 全量探测
let failed = 0;
for (const tab of TABS) {
  windowStub.__FORCE_TAB = tab;
  try {
    const html = renderToStaticMarkup(React.createElement(main.comp, {}));
    console.log('OK tab=' + tab + ' length=' + html.length);
  } catch (e) {
    failed++;
    console.error('FAIL tab=' + tab + ': ' + (e && e.message));
    if (e && e.stack) console.error(e.stack.split('\n').slice(0, 6).join('\n'));
  }
}
process.exit(failed ? 2 : 0);

