/**
 * i18n-probe.cjs — 验证英文版是否真的生效。
 *
 * 做法：造一个符合 Locale 服务契约的桩（register / bind / getLocale），
 * 加载真实 client.js，走真实 apply()，然后用真实 React 渲染面板，
 * 断言渲染出的 HTML 里出现英文、且不出现中文标签。
 *
 * 为什么必须这样测：v2.2.1 之前所有测试都绿，但英文界面全是中文——
 * 因为没人验证过「注册 → 绑定 → 渲染」这条端到端链路。
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
if (!REACT_DIR) {
  console.error('找不到 React，设置 SINGULARITY_REACT_DIR 后重试');
  process.exit(3);
}

/** 一个最小但契约正确的 locale 服务桩。 */
function makeLocaleService(initialLocale) {
  const dicts = new Map();          // ns -> { locale -> dict }
  let active = initialLocale;
  const subs = new Set();
  let revision = 0;

  const svc = {
    getLocale() { return { active, locales: [], revision }; },
    getSnapshot() { return svc.getLocale(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    setLocale(id) {
      active = id; revision++;
      for (const fn of subs) fn();
    },
    register(ns, a, b) {
      if (typeof a === 'string') {
        // register(ns, locale, dict)
        if (!dicts.has(ns)) dicts.set(ns, {});
        dicts.get(ns)[a] = b;
        revision++;
        for (const fn of subs) fn();
        return () => { delete dicts.get(ns)[a]; revision++; };
      }
      // register(ns, { en, zh })
      if (!dicts.has(ns)) dicts.set(ns, {});
      Object.assign(dicts.get(ns), a);
      revision++;
      for (const fn of subs) fn();
      return () => { dicts.delete(ns); revision++; };
    },
    bind(ns) {
      return (key, vars) => {
        const table = dicts.get(ns);
        if (!table) return key;                    // 未注册 → 返回 key 本身
        const dict = table[active] || table.en || {};
        let text = dict[key];
        if (text === undefined) text = key;        // 缺词条 → 返回 key
        if (vars && typeof vars === 'object') {
          text = String(text).replace(/\{(\w+)\}/g, (m, n) =>
            (vars[n] === undefined || vars[n] === null ? m : String(vars[n])));
        }
        return text;
      };
    },
    // 供探针断言用
    _dicts: dicts,
  };
  return svc;
}

/** 从 client.js 抽出 factory 函数体（模块真正的内容在 factory 里）。 */
function extractFactoryBody(s) {
  const start = s.indexOf('factory(require) {');
  if (start < 0) throw new Error('找不到 factory(require)');
  const bodyStart = s.indexOf('{', start) + 1;
  let depth = 1, i = bodyStart;
  for (; i < s.length && depth > 0; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') depth--;
  }
  return s.slice(bodyStart, i - 1);
}

/** 加载 client.js，返回注册项。 */
function loadModule(localeSvc) {
  const src = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8');
  const body = extractFactoryBody(src);
  // factory 用 return {...} 交出模块；改成赋值到 window.__spec 以便取出
  const patched = body.replace(/return\s*\{\s*\n\s*inject:/, 'window.__spec = { inject:');
  const req = (id) => require(path.join(REACT_DIR, id));
  const storage = {};
  const windowStub = {
    __ModuleLoader__: { load() {} },
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
  if (!mod || typeof mod.apply !== 'function') throw new Error('模块未正确注册');

  const registrations = [];
  const cleanups = [];
  mod.apply({
    effect(fn) { const d = fn(); if (typeof d === 'function') cleanups.push(d); return () => {}; },
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

  const results = [];
  let failed = 0;

  for (const loc of ['zh', 'en']) {
    const svc = makeLocaleService(loc);
    let regs;
    try {
      regs = loadModule(svc);
    } catch (e) {
      console.error('FAIL 加载模块(' + loc + '): ' + e.message);
      failed++;
      continue;
    }

    // 1) 词典是否真的注册进去了
    const ns = 'singularity-dsh-plugin';
    const table = svc._dicts.get(ns);
    if (!table || !table.zh || !table.en) {
      console.error('FAIL 词典未注册(' + loc + '): ' + (table ? Object.keys(table).join(',') : '无'));
      failed++;
      continue;
    }

    // 2) 渲染并检查文案
    const main_ = regs.filter((r) => r.opts.name === 'main')[0];
    if (!main_) { console.error('FAIL 未注册 main 槽位(' + loc + ')'); failed++; continue; }
    let html = '';
    try {
      html = renderToStaticMarkup(React.createElement(main_.comp, {}));
    } catch (e) {
      console.error('FAIL 渲染(' + loc + '): ' + e.message);
      failed++;
      continue;
    }

    // 3) 断言：英文下应有英文标签、不应残留中文标签
    const checks = [];
    if (loc === 'en') {
      const mustHave = ['Timeline', 'Engine', 'Branches', 'Metrics', 'Compare', 'Theory'];
      const missing = mustHave.filter((s) => html.indexOf(s) < 0);
      checks.push({ name: '含英文标签', ok: missing.length === 0, detail: missing.join(',') });
      // 不应出现的标签级中文（正文数据本身是中文模型语义，允许存在）
      const forbidden = ['历史长河', '演化引擎', '三岔路口', '指标矩阵', '情景对比', '理论底座'];
      const leaked = forbidden.filter((s) => html.indexOf(s) >= 0);
      checks.push({ name: '无中文标签泄漏', ok: leaked.length === 0, detail: leaked.join(',') });
    } else {
      const mustHave = ['历史长河', '演化引擎', '三岔路口', '指标矩阵'];
      const missing = mustHave.filter((s) => html.indexOf(s) < 0);
      checks.push({ name: '含中文标签', ok: missing.length === 0, detail: missing.join(',') });
    }

    for (const c of checks) {
      if (c.ok) console.log('OK  [' + loc + '] ' + c.name);
      else { console.error('FAIL [' + loc + '] ' + c.name + (c.detail ? ' → 缺/泄漏: ' + c.detail : '')); failed++; }
    }
    results.push({ loc, length: html.length });
  }

  console.log(JSON.stringify({ rendered: results }, null, 2));
  process.exit(failed ? 2 : 0);
}

main();
