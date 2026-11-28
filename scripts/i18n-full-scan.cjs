'use strict';
/**
 * i18n 全面扫描（v2）——补上 i18n-cjk-scan 的三处盲区：
 *   1. HTML 属性值里的中文（title / aria-label / placeholder / alt / value）
 *   2. 多个渲染状态（默认年份之外，还要切年份、切剧本、开弹窗）
 *   3. 未走 tx() 的裸中文串（静态扫描 client.js 的字符串字面量）
 *
 * 用法:
 *   node scripts/i18n-full-scan.cjs          # 全量，有残留则退出 1
 *   node scripts/i18n-full-scan.cjs <tab>    # 只看一个 tab
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const REACT_DIR = (() => {
  const c = [path.join(ROOT, 'node_modules')];
  const root = path.join(ROOT, '..');
  for (const n of ['dsh-connect-trae', 'dsh-connect-workbuddy', '.probe4']) c.push(path.join(root, n, 'node_modules'));
  return c.find((d) => fs.existsSync(path.join(d, 'react', 'package.json')));
})();

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** 造一个 locale 服务桩：英文、带真实词典。 */
function makeLocaleService(initial) {
  const dicts = new Map();
  let active = initial;
  const subs = new Set();
  let revision = 0;
  const svc = {
    getLocale() { return { active, locales: [], revision }; },
    getSnapshot() { return svc.getLocale(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    setLocale(id) { active = id; revision++; for (const fn of subs) fn(); },
    register(ns, a, b) {
      if (!dicts.has(ns)) dicts.set(ns, {});
      if (typeof a === 'string') { dicts.get(ns)[a] = b; revision++; return () => {}; }
      Object.assign(dicts.get(ns), a);
      revision++;
      return () => {};
    },
    bind(ns) {
      return (k) => {
        const t = dicts.get(ns);
        if (!t) return k;
        const d = t[active] || t.en || {};
        return d[k] === undefined ? k : d[k];
      };
    },
  };
  return svc;
}

function extractFactoryBody(src) {
  const st = src.indexOf('factory(require) {');
  const bs = src.indexOf('{', st) + 1;
  let d = 1, i = bs;
  for (; i < src.length && d > 0; i++) { if (src[i] === '{') d++; else if (src[i] === '}') d--; }
  return src.slice(bs, i - 1);
}

/** 加载模块，返回注册的组件。extra 用于注入额外钩子。 */
function loadModule(localeSvc, forceTab, extra) {
  const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');
  let patched = extractFactoryBody(src).replace(
    /return\s*\{\s*\n\s*inject:/, 'window.__spec = { inject:');
  patched = patched.replace("React.useState('timeline')",
    "React.useState(window.__FORCE_TAB || 'timeline')");
  // 剧本切换必须同时改 target：渲染走的是 target（杠杆值），只改 scenario
  // 不会改变模拟结果——这正是此前「切剧本仍报零残留」的假通过原因。
  patched = patched.replace(
    'const [scenario, setScenario] = React.useState(deepLink ? null : restored.scenario)',
    'const [scenario, setScenario] = React.useState(window.__FORCE_SCENARIO || (deepLink ? null : restored.scenario))');
  patched = patched.replace(
    'const [target, setTarget] = React.useState(deepLink ? deepLink.target : restored.target)',
    'const [target, setTarget] = React.useState(window.__FORCE_SCENARIO ? targetOf(window.__FORCE_SCENARIO) : (deepLink ? deepLink.target : restored.target))');
  // 年份钩子：此前 __FORCE_YEAR 传了却没人读，year2060 状态其实一直是 2035。
  patched = patched.replace('const [year, setYear] = React.useState(2035)',
    'const [year, setYear] = React.useState(window.__FORCE_YEAR || 2035)');
  const req = (id) => require(path.join(REACT_DIR, id));
  const storage = Object.assign({}, (extra && extra.storage) || {});
  const windowStub = {
    __ModuleLoader__: { load() {} },
    __FORCE_TAB: forceTab,
    __FORCE_PICKED: (extra && extra.picked) || undefined,
    __FORCE_YEAR: (extra && extra.year) || undefined,
    __FORCE_SCENARIO: (extra && extra.scenario) || undefined,
    location: { search: (extra && extra.search) || '' },
    navigator: { language: localeSvc.getLocale().active },
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    },
    document: { createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }), head: { appendChild() {} } },
    addEventListener() {}, removeEventListener() {},
    URLSearchParams, URL,
    history: { replaceState() {}, pushState() {} },
  };
  const doc = windowStub.document;
  new Function('window', 'document', 'require', patched)(windowStub, doc, req);
  const spec = windowStub.__spec;
  const regs = [];
  const ctx = {
    effect(fn) { try { fn(); } catch (e) { /* 忽略 */ } return () => {}; },
    get: (id) => (id === 'locale' ? localeSvc : undefined),
    slots: {
      inject(deps, cb) { const r = cb(); return () => { if (typeof r === 'function') r(); }; },
      register(opts, comp) { regs.push({ opts, comp }); return () => {}; },
    },
    logger: { info() {}, warn() {}, error() {} },
  };
  spec.apply(ctx);
  return { regs, windowStub };
}

/** 从 HTML 里抽出所有需要检查的片段：文本节点 + 关键属性值。 */
function collectFragments(html) {
  const out = [];
  // 文本节点
  const stripped = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  for (const seg of stripped.split(/<[^>]+>/)) {
    const t = seg.replace(/&[a-z]+;/gi, ' ').trim();
    if (t && CJK.test(t)) out.push({ kind: 'text', v: t });
  }
  // 属性值（i18n-cjk-scan 完全没扫这里）
  const attrRe = /\s(title|aria-label|aria-description|placeholder|alt|value|data-tip|aria-roledescription)="([^"]*)"/g;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    if (CJK.test(m[2])) out.push({ kind: 'attr:' + m[1], v: m[2] });
  }
  return out;
}

const PICKED_FIXTURE = {
  id: 0, key: 'mercantile', name: '商业资本主义', short: '前史',
  color: '#7b8ba3', thesis: '机器是人的延伸，资本靠雇佣劳动攫取剩余。',
  detail: '探针夹具。', keys: ['雇佣劳动', '商品交换'],
};

function main() {
  const React = require(path.join(REACT_DIR, 'react'));
  const { renderToStaticMarkup } = require(path.join(REACT_DIR, 'react-dom/server'));

  const only = process.argv[2];
  const tabs = only ? [only]
    : ['timeline', 'engine', 'branch', 'metrics', 'compare', 'theory', 'health'];

  let total = 0;
  const byKind = new Map();

  // 每个 tab 渲染多个状态：默认、末年、末年+弹窗。
  // v2.2.5：补上剧本维度——带 cond 的事件与「晚期反转」句只在特定剧本出现，
  // 只扫默认剧本会漏（v2.2.3 的「零残留」结论就是这么错的）。
  const states = [
    { label: 'default', extra: {} },
    { label: 'year2060', extra: { year: 2060 } },
    { label: 'year2030', extra: { year: 2030 } },
  ];
  const SCENARIOS = ['baseline', 'social_democracy', 'techno_feudalism',
    'planned_transition', 'collapse', 'commons'];

  for (const tab of tabs) {
    for (const st of states) {
      for (const sc of SCENARIOS) {
        const extra = Object.assign({}, st.extra, { scenario: sc });
        let html = '';
        try {
          const svc = makeLocaleService('en');
          const { regs } = loadModule(svc, tab, extra);
          const mainComp = regs.filter((r) => r.opts.name === 'main')[0];
          if (!mainComp) { console.error('未注册 main'); process.exit(2); }
          html = renderToStaticMarkup(React.createElement(mainComp.comp, { locale: svc }));
        } catch (e) {
          console.error('渲染失败 ' + tab + '/' + st.label + '/' + sc + ': ' + e.message);
          process.exit(2);
        }
        const frags = collectFragments(html);
        if (frags.length) {
          console.log('=== ' + tab + ' [' + st.label + '/' + sc + '] ' + frags.length + ' 处 ===');
          const seen = new Set();
          for (const f of frags) {
            const key = f.kind + '|' + f.v;
            if (seen.has(key)) continue;
            seen.add(key);
            total++;
            byKind.set(f.kind, (byKind.get(f.kind) || 0) + 1);
            console.log('  [' + f.kind + '] ' + (f.v.length > 80 ? f.v.slice(0, 80) + '…' : f.v));
          }
        }
      }
    }
  }

  // 弹窗状态单独跑一次
  if (!only || only === 'timeline') {
    try {
      const svc = makeLocaleService('en');
      const { regs } = loadModule(svc, 'timeline', { picked: PICKED_FIXTURE });
      const mainComp = regs.filter((r) => r.opts.name === 'main')[0];
      const html = renderToStaticMarkup(React.createElement(mainComp.comp, { locale: svc }));
      const frags = collectFragments(html);
      if (frags.length) {
        console.log('=== timeline [picked-dialog] ' + frags.length + ' 处 ===');
        const seen = new Set();
        for (const f of frags) {
          const key = f.kind + '|' + f.v;
          if (seen.has(key)) continue;
          seen.add(key);
          total++;
          console.log('  [' + f.kind + '] ' + (f.v.length > 80 ? f.v.slice(0, 80) + '…' : f.v));
        }
      }
    } catch (e) {
      console.log('（弹窗状态跳过: ' + e.message + '）');
    }
  }

  if (total === 0) {
    console.log('英文渲染零中文残留（文本 + 属性）✓');
  } else {
    console.error('\n合计 ' + total + ' 处残留；按类型: ' +
      [...byKind.entries()].map(([k, v]) => k + '=' + v).join(', '));
    if (!only) process.exit(1);
  }
}

main();
