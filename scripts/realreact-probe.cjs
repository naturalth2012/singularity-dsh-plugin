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
// 探针钩子：__FORCE_TAB 改初始标签页；__FORCE_PICKED 让舞台弹窗在首屏就渲染。
// 弹窗与错误边界都是「平时不渲染、一出事才渲染」的分支，静态渲染默认永远走不到，
// 正是 v2.2.0 那种缺陷的藏身处——必须显式覆盖。
const patched = patched0
  .replace("React.useState('timeline')", "React.useState(window.__FORCE_TAB || 'timeline')")
  .replace('const [picked, setPicked] = React.useState(null)',
    'const [picked, setPicked] = React.useState(window.__FORCE_PICKED || null)'); // eslint-disable-line no-useless-escape

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

/** 渲染一次，返回 { ok, length | error }。 */
function renderOnce() {
  try {
    const html = renderToStaticMarkup(React.createElement(main.comp, {}));
    return { ok: true, length: html.length };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e), stack: e && e.stack };
  }
}

/** 舞台弹窗的取值：直接复用 client.js 里 STAGES 的第一项结构。 */
const PICKED_FIXTURE = {
  id: 0, key: 'mercantile', name: '商业资本主义', short: '前史',
  color: '#7b8ba3', thesis: '机器是人的延伸。', detail: '探针夹具。',
  keys: ['雇佣劳动', '商品化'],
};

const forced = process.argv[2];
if (forced) {
  windowStub.__FORCE_TAB = forced;
  if (process.argv[3] === 'picked') windowStub.__FORCE_PICKED = PICKED_FIXTURE;
  const r = renderOnce();
  if (!r.ok) {
    console.error('RENDER THREW on tab=' + forced + ': ' + r.error);
    if (r.stack) console.error(r.stack.split('\n').slice(0, 12).join('\n'));
    process.exit(2);
  }
  console.log('OK tab=' + forced + (process.argv[3] === 'picked' ? ' +picked' : '') + ' length=' + r.length);
  process.exit(0);
}

// 无参数：逐 tab 全量探测 + 两条「平时不渲染」的分支
let failed = 0;
for (const tab of TABS) {
  windowStub.__FORCE_TAB = tab;
  windowStub.__FORCE_PICKED = null;
  const r = renderOnce();
  if (r.ok) {
    console.log('OK tab=' + tab + ' length=' + r.length);
  } else {
    failed++;
    console.error('FAIL tab=' + tab + ': ' + r.error);
    if (r.stack) console.error(r.stack.split('\n').slice(0, 6).join('\n'));
  }
}

// 场景 A：舞台节点弹窗（picked 非空才渲染的分支）
windowStub.__FORCE_TAB = 'timeline';
windowStub.__FORCE_PICKED = PICKED_FIXTURE;
{
  const r = renderOnce();
  if (r.ok) console.log('OK picked-dialog length=' + r.length);
  else {
    failed++;
    console.error('FAIL picked-dialog: ' + r.error);
    if (r.stack) console.error(r.stack.split('\n').slice(0, 6).join('\n'));
  }
}

// 场景 B：错误边界崩溃 UI。这是「只有出事才渲染」的分支——v2.2.0 里
// SnErrorBoundary 自己有 12 处裸 t(...)，平时永远不执行，一旦任何标签页崩溃
// 就会二次崩溃（边界套边界 → 白屏），「复制错误」按钮也不工作。
//
// 必须用 jsdom + react-dom/client 测：React 18 的 SSR 路径（renderToStaticMarkup
// 与 renderToPipeableStream）都不执行 getDerivedStateFromError，边界在服务端
// 是无效的。这一点已实证——SSR 下异常直接穿透 finishClassComponent。
{
  const jsdomDir = path.join(REACT_DIR, 'jsdom');
  if (!fs.existsSync(path.join(jsdomDir, 'package.json'))) {
    console.log('SKIP error-boundary (未找到 jsdom；该场景需真实 DOM 才能触发边界)');
  } else {
    const { JSDOM } = require(jsdomDir);
    // 让 timelineTab 返回一个「自己会抛」的组件：异常必须发生在边界子组件的
    // render 内，边界才接得住。若在 h(...) 实参位置求值，异常会跑到边界外面。
    const boundarySrc = patched.replace(
      /const timelineTab = \(\) => \{/,
      "const BoomProbe = () => { throw new Error('probe: intentional tab crash'); };\n      const timelineTab = () => h(BoomProbe, null);\n      const __unusedTimeline = () => {"
    );

    const dom = new JSDOM('<!doctype html><html><head></head><body><div id="probe-root"></div></body></html>');
    const probeWindow = {
      ...windowStub,
      __ModuleLoader__: { load(spec) { probeWindow.__spec = spec; } },
      __FORCE_TAB: 'timeline',
      __FORCE_PICKED: null,
      document: dom.window.document,
      navigator: dom.window.navigator,
      HTMLElement: dom.window.HTMLElement,
    };
    const probeDocument = {
      // 必须返回真正的 jsdom 元素：client.js 的 apply() 会 document.createElement('style')
      // 再 head.appendChild，桩对象过不了 jsdom 的 Node 类型检查。
      createElement: (tag) => dom.window.document.createElement(tag),
      head: dom.window.document.head,
      querySelector: () => null,
    };

    let boomMod = null;
    try {
      new Function('window', 'document', 'require', boundarySrc)(probeWindow, probeDocument, req);
      boomMod = probeWindow.__spec;
    } catch (e) { boomMod = null; }

    if (!boomMod || typeof boomMod.apply !== 'function') {
      failed++;
      console.error('FAIL error-boundary: 无法加载改造后的模块');
    } else {
      const regs = [];
      boomMod.apply({
        effect(fn) { fn(); return () => {}; },
        get() { return undefined; },
        slots: {
          inject(deps, cb) { const d = cb(); return () => d && d(); },
          register(opts, comp) { regs.push({ opts, comp }); return () => {}; },
        },
      });
      const bm = regs.filter((r) => r.opts.name === 'main')[0];
      if (!bm) {
        failed++;
        console.error('FAIL error-boundary: 未取到 main 注册');
      } else {
        const ReactDOMClient = req('react-dom/client');
        // react-dom 直接读全局 window/document/navigator，不是参数传入的。
        // 临时装到 globalThis，测完立刻还原，避免污染其他场景。
        // navigator 在 Node 21+ 是只读 getter，必须用 defineProperty 覆盖。
        const savedNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
        const saved = {
          window: globalThis.window, document: globalThis.document,
          HTMLElement: globalThis.HTMLElement,
        };
        const install = () => {
          globalThis.window = dom.window;
          globalThis.document = dom.window.document;
          globalThis.HTMLElement = dom.window.HTMLElement;
          Object.defineProperty(globalThis, 'navigator', {
            value: dom.window.navigator, configurable: true, writable: true,
          });
        };
        const restore = () => {
          globalThis.window = saved.window;
          globalThis.document = saved.document;
          globalThis.HTMLElement = saved.HTMLElement;
          if (savedNavDesc) Object.defineProperty(globalThis, 'navigator', savedNavDesc);
        };
        install();
        const origError = console.error;
        console.error = () => {};      // React 会打印被捕获的组件栈，静音
        let html = null, err = null;
        try {
          const mount = dom.window.document.getElementById('probe-root');
          const root = ReactDOMClient.createRoot(mount);
          // react-dom/client 的 render 是异步的，用 flushSync 逼同步落地
          const { flushSync } = req('react-dom');
          flushSync(() => { root.render(React.createElement(bm.comp, {})); });
          html = mount.innerHTML;
        } catch (e) {
          err = e;
        } finally {
          console.error = origError;
          restore();
        }
        if (err) {
          failed++;
          console.error('FAIL error-boundary: ' + ((err && err.message) || err));
          if (err && err.stack) console.error(err.stack.split('\n').slice(0, 8).join('\n'));
        } else if (html && html.indexOf('sn-card-head') >= 0) {
          console.log('OK error-boundary length=' + html.length + ' (兜底 UI 渲染成功)');
        } else {
          failed++;
          console.error('FAIL error-boundary: 未渲染出兜底 UI；实际 HTML 片段=' + String(html).slice(0, 200));
        }
      }
    }
  }
}

process.exit(failed ? 2 : 0);

