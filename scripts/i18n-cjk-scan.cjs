/**
 * i18n-cjk-scan.cjs — 找出英文渲染里残留的中文，并定位来源。
 *
 * 之前的 i18n-probe 只断言了 6 个标签词，太粗——标签翻了，正文没翻也能过。
 * 这个脚本把英文模式下的 HTML 摊开，抽出所有含 CJK 的文本片段，
 * 统计每个片段出现次数，供人工判断「哪些该翻、哪些是模型语义不该翻」。
 *
 * 用法: node scripts/i18n-cjk-scan.cjs [tab]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function resolveReactDir() {
  const candidates = [];
  if (process.env.SINGULARITY_REACT_DIR) candidates.push(process.env.SINGULARITY_REACT_DIR);
  candidates.push(path.join(ROOT, 'node_modules'));
  const root = path.join(ROOT, '..');
  for (const name of ['dsh-connect-trae', 'dsh-connect-workbuddy', '.probe4']) {
    candidates.push(path.join(root, name, 'node_modules'));
  }
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'react', 'package.json')) &&
        fs.existsSync(path.join(dir, 'react-dom', 'package.json'))) return dir;
  }
  return null;
}

const REACT_DIR = resolveReactDir();
if (!REACT_DIR) { console.error('找不到 React'); process.exit(3); }

function makeLocaleService(initialLocale) {
  const dicts = new Map();
  let active = initialLocale;
  const subs = new Set();
  let revision = 0;
  const svc = {
    getLocale() { return { active, locales: [], revision }; },
    getSnapshot() { return svc.getLocale(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    setLocale(id) { active = id; revision++; for (const fn of subs) fn(); },
    register(ns, a, b) {
      if (!dicts.has(ns)) dicts.set(ns, {});
      if (typeof a === 'string') {
        dicts.get(ns)[a] = b;
        revision++; for (const fn of subs) fn();
        return () => { delete dicts.get(ns)[a]; revision++; };
      }
      Object.assign(dicts.get(ns), a);
      revision++; for (const fn of subs) fn();
      return () => { dicts.delete(ns); revision++; };
    },
    bind(ns) {
      return (key, vars) => {
        const table = dicts.get(ns);
        if (!table) return key;
        const dict = table[active] || table.en || {};
        let text = dict[key];
        if (text === undefined) text = key;
        if (vars && typeof vars === 'object') {
          text = String(text).replace(/\{(\w+)\}/g, (m, n) =>
            (vars[n] === undefined || vars[n] === null ? m : String(vars[n])));
        }
        return text;
      };
    },
    _dicts: dicts,
  };
  return svc;
}

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

function loadModule(localeSvc, forceTab) {
  const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');
  const body = extractFactoryBody(src);
  let patched = body.replace(/return\s*\{\s*\n\s*inject:/, 'window.__spec = { inject:');
  patched = patched.replace("React.useState('timeline')",
    "React.useState(window.__FORCE_TAB || 'timeline')");
  const req = (id) => require(path.join(REACT_DIR, id));
  const storage = {};
  const windowStub = {
    __ModuleLoader__: { load() {} },
    __FORCE_TAB: forceTab,
    location: { search: '' },
    navigator: { language: localeSvc.getLocale().active },
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
  const registrations = [];
  mod.apply({
    effect(fn) { const d = fn(); return () => {}; },
    get(id) { return id === 'locale' ? localeSvc : undefined; },
    slots: {
      inject(deps, cb) { const d = cb(); return () => d && d(); },
      register(opts, comp) { registrations.push({ opts, comp }); return () => {}; },
    },
  });
  return registrations;
}

function main() {
  const React = require(path.join(REACT_DIR, 'react'));
  const { renderToStaticMarkup } = require(path.join(REACT_DIR, 'react-dom/server'));

  const tabs = process.argv[2] ? [process.argv[2]]
    : ['timeline', 'engine', 'branch', 'metrics', 'compare', 'theory', 'health'];

  const cjk = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  let totalResidual = 0;

  for (const tab of tabs) {
    const svc = makeLocaleService('en');
    const regs = loadModule(svc, tab);
    const main_ = regs.filter((r) => r.opts.name === 'main')[0];
    if (!main_) { console.error('未注册 main'); process.exit(1); }
    let html = '';
    try {
      // 必须把 locale 服务作为 prop 传入：插件从 props.locale 取语言，
      // 不传的话 activeLocaleId 会回落到 navigator.language，isEn 为假，
      // 整页按中文渲染——扫描器于是把「没传 props」误报成「翻译缺失」。
      html = renderToStaticMarkup(React.createElement(main_.comp, { locale: svc }));
    } catch (e) {
      // 渲染失败必须让整轮失败。以前这里 continue，扫描器于是把「页面崩了」
      // 报成「中文残留若干」，掩盖了 tx is not defined 这类真 bug。
      console.error('渲染失败 ' + tab + ': ' + e.message);
      process.exit(2);
    }
    // 抽出标签之间的文本
    const texts = html
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .split(/<[^>]+>/)
      .map((s) => s.replace(/&[a-z]+;/gi, ' ').trim())
      .filter((s) => s && cjk.test(s));

    const counts = new Map();
    for (const t of texts) counts.set(t, (counts.get(t) || 0) + 1);
    totalResidual += texts.length;

    console.log('=== ' + tab + ' === 含中文文本片段: ' + counts.size + ' 种 / ' + texts.length + ' 处');
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [t, n] of sorted.slice(0, 40)) {
      console.log('  [' + n + '] ' + (t.length > 70 ? t.slice(0, 70) + '…' : t));
    }
    if (sorted.length > 40) console.log('  …还有 ' + (sorted.length - 40) + ' 种');
    console.log('');
  }

  // 作为 verify 的一环时必须能失败，否则英文版回退不会被发现。
  // 只跑单个 tab（带参数）时仅打印，方便人工排查。
  if (!process.argv[2]) {
    if (totalResidual > 0) {
      console.error('英文渲染仍有 ' + totalResidual + ' 处中文残留');
      process.exit(1);
    }
    console.log('英文渲染零中文残留 ✓');
  }
}

main();
