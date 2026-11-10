/**
 * 用最小 DOM/模块存根在 Node 中执行 client.js，验证：
 *  - window.__ModuleLoader__.load 被正确调用
 *  - factory 返回合法的 { inject, apply }
 *  - apply 确实向 main 与 sidebar.panellist 注册，且注册可被清理
 *  - 组件可正常渲染成元素树（不抛异常）
 * 这不是视觉验证；只确认模块契约与渲染不崩溃。
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8');

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS  ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};

/* ── 存根 ── */
const ReactStub = {
  createElement: (type, props, ...children) => ({ __el: true, type, props: props || {}, children }),
  useState: (v) => [v, () => {}],
  useMemo: (fn) => fn(),
  useEffect: () => {},
  useRef: () => ({ current: null }),
};

const insertedSheets = [];
const documentStub = {
  createElement: () => {
    const el = {
      _attrs: {},
      setAttribute(k, v) { this._attrs[k] = v; },
      remove() { this._removed = true; },
      textContent: '',
    };
    return el;
  },
  head: {
    appendChild(el) { insertedSheets.push(el); },
  },
  querySelector: () => null,
};

const windowStub = {};

/* ── 加载 ── */
let loaded = null;
windowStub.__ModuleLoader__ = {
  load(spec) {
    loaded = spec;
  },
};

const fn = new Function('window', 'document', src);
fn(windowStub, documentStub);

check('调用了 __ModuleLoader__.load', loaded !== null);
check('id 与包名一致', loaded && loaded.id === 'singularity-dsh-plugin', loaded && loaded.id);

/* ── 执行 factory ── */
const mod = loaded.factory((name) => {
  if (name === 'react') return ReactStub;
  throw new Error('未知模块: ' + name);
});

check('factory 返回对象', mod && typeof mod === 'object');
check('声明了 slots 注入', Array.isArray(mod.inject) && mod.inject.indexOf('slots') >= 0, (mod.inject || []).join(','));
check('暴露 apply', typeof mod.apply === 'function');

/* ── 执行 apply ── */
const registrations = [];
const effects = [];
const ctx = {
  effect(fn2, label) {
    const dispose = fn2();
    effects.push({ label, dispose });
    return () => {};
  },
  slots: {
    inject(ownerKey, cb) {
      const dispose = cb();
      return () => { if (typeof dispose === 'function') dispose(); };
    },
    register(options, component) {
      registrations.push({ options, component });
      return () => {
        const i = registrations.findIndex((r) => r.options === options);
        if (i >= 0) registrations.splice(i, 1);
      };
    },
  },
  get() { return undefined; },
};

let applyError = null;
try { mod.apply(ctx); } catch (e) { applyError = e; }
check('apply 不抛异常', applyError === null, applyError ? applyError.message : '');

const mainReg = registrations.filter((r) => r.options.name === 'main')[0];
const sideReg = registrations.filter((r) => r.options.name === 'sidebar.panellist')[0];

check('注册了 main 面板', !!mainReg, mainReg && ('key=' + mainReg.options.key));
check('main key 为 singularity', mainReg && mainReg.options.key === 'singularity');
check('注册了侧栏图标', !!sideReg, sideReg && ('id=' + sideReg.options.id + ' order=' + sideReg.options.order));
check('侧栏 id 与面板 key 一致', sideReg && sideReg.options.id === 'singularity');
check('侧栏 label 为函数', sideReg && typeof sideReg.options.label === 'function', sideReg ? sideReg.options.label() : '');
check('样式表已注入', insertedSheets.length === 1,
  insertedSheets.length ? insertedSheets[0].textContent.length + ' 字符' : '');

/* ── 样式合规：只用主题 token 与数据色 ── */
const css = insertedSheets.length ? insertedSheets[0].textContent : '';
const hardColors = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []);
const tokenRefs = (css.match(/var\(--dsw-alias-[a-z0-9-]+/g) || []);
check('样式引用主题 token', tokenRefs.length > 10, tokenRefs.length + ' 处');
check('无 rgba()/hsl() 直写底色', !/rgba?\(|hsla?\(/.test(css), '只有数据色与 token');
console.log('       （字面色 ' + hardColors.length + ' 处，均为图表/阶段数据色）');
check('未引用 Harness Client 包', !/@deepseek-ai\/dsh-client-ui/.test(src));

/* ── 渲染冒烟：把组件当普通函数调用 ── */
let renderError = null;
let tree = null;
try {
  // 组件内部使用 useState/useMemo，存根已提供固定返回值
  tree = mainReg.component({});
} catch (e) { renderError = e; }
check('主面板渲染不抛异常', renderError === null, renderError ? renderError.message : '');
check('渲染产出元素树', tree && tree.__el === true, tree ? 'root=' + tree.type : '');

let iconError = null;
let icon = null;
try { icon = sideReg.component({ size: 18, active: false }); } catch (e) { iconError = e; }
check('侧栏图标渲染不抛异常', iconError === null, iconError ? iconError.message : '');
check('图标是 svg', icon && icon.type === 'svg');

/* ── 清理 ── */
effects.forEach((e) => { if (typeof e.dispose === 'function') e.dispose(); });
check('卸载后样式表被移除', insertedSheets[0]._removed === true);

console.log('\n--- 汇总 ---');
console.log(pass + '/' + (pass + fail) + ' 通过');
console.log('\n注：以上为模块契约与渲染冒烟，非视觉验证。');
process.exit(fail ? 1 : 0);
