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
// useState 必须与真实 React 语义一致：传函数时惰性调用（init function）。
// 早期存根直接返回 v，会让 `useState(loadPersisted)` 拿到函数本身而非其结果。
const ReactStub = {
  Component: class { constructor(p) { this.props = p || {}; this.state = {}; } setState(x) { this.state = Object.assign({}, this.state, typeof x === "function" ? x(this.state) : x); } },
  createElement: (type, props, ...children) => ({ __el: true, type, props: props || {}, children }),
  useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
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

/* ── v1.2：新 UI 节渲染（默认 timeline 标签下深层结构存在）── */
// 渲染树走查：根 → sn-body → 第一个标签内容（timelineTab）。新节都在
// metricsTab / theoryTab 中，组件函数未直接导出，因此以「渲染不崩 + 源码
// 静态存在」双保险断言；函数级视觉验证依赖挂载后人工检查。
const treeText = JSON.stringify(tree);
check('v1.2 渲染树可序列化（无循环引用）', treeText.length > 1000, treeText.length + ' 字符');
check('v1.2 相图与热力图源码存在', /phaseSvg/.test(src) && /heatSvg/.test(src)
  && /封建稳态域/.test(src) && /点击格子载入该组合/.test(src));
check('v1.2 合取命题与反驳卡源码存在', /合取命题 · 两个闸门缺一不可/.test(src)
  && /技术封建化/.test(src) && /生态天花板/.test(src) && /计算问题/.test(src));
check('v1.2 页脚声明与租金条源码存在', /不构成任何现实预测/.test(src)
  && /租金压力/.test(src) && /RENT_COLORS/.test(src));

/* ── v1.3：政策沙盒 / 稳健性 / 幽灵轨迹源码存在 ── */
check('v1.3 政策沙盒卡源码存在', /政策沙盒/.test(src)
  && /干预年/.test(src) && /清除干预/.test(src) && /validatePolicy|leversPolicyAt/.test(src));
check('v1.3 窗口徽标源码存在', /winBadge/.test(src)
  && /干预在分岔窗口内 · 决定性/.test(src) && /sn-policy-mark/.test(src));
check('v1.3 稳健性卡与反方读法源码存在', /稳健性 · 蒙特卡洛/.test(src)
  && /反方读法/.test(src) && /branchTabWithRobust/.test(src));
check('v1.3 相图幽灵轨迹源码存在', /ghostSim/.test(src)
  && /无政策幽灵轨迹/.test(src) && /robustness\(|reversal\(/.test(src));

/* ── v1.4：显示层红利与分享存档 ── */
check('v1.4 LineChart get 访问器与租金曲线', /const get = s\.get \|\|/.test(src)
  && /label: '租金压力', get: \(row\) => row\.rent/.test(src));
check('v1.4 年表租金列与对比页新列', /'不等', '自由', '租金'\]/.test(src)
  && /'租金', '一致性', '窗口'/.test(src) && /compareStats/.test(src));
check('v1.4 热力图基准切换', /heatMode === 'neighborhood'/.test(src)
  && /setHeatMode\('neighborhood'\)/.test(src) && /邻域 ±0\.5/.test(src));
check('v1.4 分享深链（编码/解析/按钮）', /b64urlEncode/.test(src)
  && /parseShareUrl/.test(src) && /shareLink/.test(src));
check('v1.4 JSON 导出导入', /exportJson/.test(src)
  && /importJson/.test(src) && /singularity-state-/.test(src));

/* ── v1.4 审核回归（三处已修缺陷，防止回潮）── */
// 1) 热力图行序：构造轴与显示轴必须同源（否则颜色与点击目标上下颠倒）
check('审核: 热力图构造与显示轴同源同序', /poAxis = DESC, capAxis = ASC/.test(src)
  && /po: DESC, cap: ASC/.test(src) && /const heatAxis = React.useMemo/.test(src));
check('审核: 热力图无残留局部 poSteps 变量', !/const poSteps = \[/.test(src));
// 2) 深链会话不得静默覆盖用户存档
check('审核: 深链会话不写回 localStorage', /deepLinkLocked/.test(src)
  && /if \(deepLinkLocked\) return;/.test(src));
check('审核: 用户主动操作解除深链锁定', (src.match(/setDeepLinkLocked\(false\)/g) || []).length >= 4);
// 3) README 计数块唯一且无手写残留
const readme = require('fs').readFileSync(require('path').join(__dirname, '..', 'README.md'), 'utf8');
check('审核: README 计数标记成对且唯一',
  (readme.match(/<!-- counts:auto -->/g) || []).length === 1
  && (readme.match(/<!-- \/counts:auto -->/g) || []).length === 1);
check('审核: README 无重复的计数说明行',
  (readme.match(/项自动化检查），手工编辑无效/g) || []).length === 1);

/* ── v1.5 T4：诚实性补完 ── */
check('v1.5 晚期反转标注（窗口末 vs 终年）', /lateReversal/.test(src)
  && /窗口末年胜者|晚期反转：窗口末年/.test(src)
  && /不是裁决时刻/.test(src));
check('v1.5 社民路径依赖补注（产权≥0.62 失效）', /产权 ≥0\.62 时本路径失效/.test(src));
check('v1.5 引力上限非对称脚注', /引力上限并不相等/.test(src)
  && /社民因「改良空间」折减上限约 0\.70/.test(src));
check('v1.5 晚期反转不新增引擎符号', !/function lateReversal/.test(src)
  && /const lateReversal = React\.useMemo/.test(src));

/* ── v1.6 T1/T5：工具化与模型体检 ── */
check('v1.6 模型体检标签页存在', /\{ id: 'health', label: '模型体检' \}/.test(src)
  && /const healthTab = \(\)/.test(src));
check('v1.6 体检页显示数据来源元信息', /生成于 ' \+ \(d\.generatedAt/.test(src)
  && /种子 ' \+ d\.seed/.test(src) && /d\.commit/.test(src));
check('v1.6 体检页展示契约 §9 质疑', /§9\.1 崩解系数偏高/.test(src)
  && /§9\.2\/9\.3/.test(src) && /§9\.4/.test(src));
check('v1.6 体检数据为构建期内联（非运行时计算）',
  /const HEALTH_DATA = \{/.test(src) && !/HEALTH_DATA[\s\S]{0,200}for \(let k = 0; k < 2000/.test(src));

/* ── v1.7 T-A1/A4：错误边界与恢复默认 ── */
check('v1.7 存在 ErrorBoundary 且实现 getDerivedStateFromError',
  /class SnErrorBoundary extends React\.Component/.test(src)
  && /static getDerivedStateFromError/.test(src)
  && /componentDidCatch/.test(src));
check('v1.7 boundary 只包内容区（标签栏存活）',
  /className: 'sn-body' \},\s*\n\s*h\(SnErrorBoundary/.test(src));
check('v1.7 boundary 用 key={tab} 实现切页自动恢复', /key: tab,[\s\S]{0,80}tabLabel:/.test(src));
check('v1.7 降级 UI 不隐藏错误（含重试与复制）',
  /插件自身的缺陷/.test(src) && /'重试'/.test(src) && /'复制错误详情'/.test(src));
check('v1.7 恢复默认按钮存在且清除政策与剧本',
  /const resetTarget = React\.useCallback/.test(src)
  && /setTarget\(\{\}\)/.test(src) && /setPolicy\(null\)/.test(src)
  && /setScenario\('baseline'\)/.test(src)
  && /onClick: resetTarget/.test(src));

let iconError = null;
let icon = null;
try { icon = sideReg.component({ size: 18, active: false }); } catch (e) { iconError = e; }
check('侧栏图标渲染不抛异常', iconError === null, iconError ? iconError.message : '');
check('图标是 svg', icon && icon.type === 'svg');

/* ── v1.1 R5：无 localStorage 环境下渲染仍然安全 ── */
// 这是真实的浏览器边界：隐私模式、被 CSP 禁用的存储、或非浏览器宿主。
// windowStub 本身没有 localStorage，上面的渲染冒烟已隐式覆盖；
// 这里显式断言「缺少存储时组件不崩、且不写入任何东西」。
let noStoreError = null;
try {
  const savedWindow = windowStub.localStorage;
  delete windowStub.localStorage;
  mainReg.component({});
  if (savedWindow !== undefined) windowStub.localStorage = savedWindow;
} catch (e) { noStoreError = e; }
check('缺少 localStorage 时渲染不抛异常', noStoreError === null,
  noStoreError ? noStoreError.message : '安全回退');

/* ── v1.1 R5：持久化键名与版本一致性 ── */
check('持久化键名已版本化', /singularity:state:v\d+/.test(src),
  (src.match(/singularity:state:v\d+/) || ['未找到'])[0]);
check('持久化版本常量与键名版本一致', (() => {
  const keyMatch = src.match(/STORE_KEY\s*=\s*'singularity:state:v(\d+)'/);
  const verMatch = src.match(/STORE_VERSION\s*=\s*(\d+)/);
  return !!(keyMatch && verMatch && keyMatch[1] === verMatch[1]);
})());

/* ── 清理 ── */
effects.forEach((e) => { if (typeof e.dispose === 'function') e.dispose(); });
check('卸载后样式表被移除', insertedSheets[0]._removed === true);

console.log('\n--- 汇总 ---');
console.log(pass + '/' + (pass + fail) + ' 通过');
console.log('\n注：以上为模块契约与渲染冒烟，非视觉验证。');
process.exit(fail ? 1 : 0);
