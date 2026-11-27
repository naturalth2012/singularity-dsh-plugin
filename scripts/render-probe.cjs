#!/usr/bin/env node
/**
 * 渲染探针（v2.0 审计报告 §7.3）
 * ------------------------------------------------------------------
 * 为什么需要它：`node --check` 只能发现语法错误，发现不了「括号错位导致
 * 某几张卡片被吞进兄弟节点」——那种情况语法完全合法，但渲染树里少了内容。
 * v1.8 开发时曾因此吞掉体检页 4 张卡，只靠人工探针才发现。
 *
 * 做法：用 React stub 真实渲染七个标签页，数出每页的文本片段数，
 * 输出 JSON 供 contract-check 断言下界。
 *
 * 用法：node scripts/render-probe.cjs   → 打印一行 JSON
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TABS = ['timeline', 'engine', 'branch', 'metrics', 'compare', 'theory', 'health'];

/** 从 client.js 抽出 factory 函数体，替换 return 为可导出形式。 */
function extractFactoryBody(src) {
  const start = src.indexOf('factory(require) {');
  if (start < 0) throw new Error('找不到 factory(require)');
  const bodyStart = src.indexOf('{', start) + 1;
  let depth = 1;
  let i = bodyStart;
  for (; i < src.length && depth > 0; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  if (depth !== 0) throw new Error('factory 括号不平衡');
  return src.slice(bodyStart, i - 1);
}

/** 渲染一个标签页，返回文本片段数组。 */
function renderTab(src, body, tab) {
  class Component {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(x) {
      this.state = Object.assign({}, this.state,
        typeof x === 'function' ? x(this.state) : x);
    }
  }
  const ReactStub = {
    Component,
    createElement: (type, props, ...children) => ({
      __el: true, type, props: props || {}, children,
    }),
    useState: (init) => {
      // 让初始 tab 就是目标标签页
      if (init === 'timeline') return [tab, () => {}];
      return [typeof init === 'function' ? init() : init, () => {}];
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: () => {},
    useRef: () => ({ current: null }),
  };

  const patched = body.replace(/return\s*\{\s*\n\s*inject:/, 'const __exports = { inject:');
  const windowStub = {
    __ModuleLoader__: { load(spec) { windowStub.__spec = spec; } },
    location: { search: '' },
    navigator: { language: 'zh-CN' },
  };
  const documentStub = {
    createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }),
    head: { appendChild() {} },
  };

  // eslint-disable-next-line no-new-func
  new Function('window', 'document', src)(windowStub, documentStub);
  const spec = windowStub.__spec;
  if (!spec) throw new Error('模块未注册');

  const mod = spec.factory((name) => (name === 'react' ? ReactStub : {}));
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
  if (!main) throw new Error('main 槽位未注册');
  const tree = main.comp({});

  const texts = [];
  (function walk(node, depth) {
    if (depth > 90) return;
    if (Array.isArray(node)) { node.forEach((x) => walk(x, depth + 1)); return; }
    if (!node || !node.__el) return;
    const kids = node.children;
    if (Array.isArray(kids)) {
      kids.forEach((c) => {
        if (typeof c === 'string') texts.push(c);
        else walk(c, depth + 1);
      });
    } else if (typeof kids === 'string') texts.push(kids);
    else walk(kids, depth + 1);
  })(tree, 0);

  return texts;
}

function main() {
  const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');
  const body = extractFactoryBody(src);
  const counts = {};
  for (const tab of TABS) {
    try {
      counts[tab] = renderTab(src, body, tab).length;
    } catch (e) {
      counts[tab] = 0;
      counts[tab + '_error'] = e.message.slice(0, 80);
    }
  }
  process.stdout.write(JSON.stringify(counts) + '\n');
}

main();
