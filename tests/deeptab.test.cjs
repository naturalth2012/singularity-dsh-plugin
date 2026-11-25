/** 临时探针：用受控 useState 存根把初始 tab 顶到 metrics / theory，做深层渲染冒烟。 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8');

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS  ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};

const documentStub = {
  createElement: () => ({ setAttribute() {}, remove() {}, textContent: '' }),
  head: { appendChild() {} },
  querySelector: () => null,
};
const windowStub = {};
windowStub.__ModuleLoader__ = { load(spec) { windowStub.__spec__ = spec; } };
new Function('window', 'document', src)(windowStub, documentStub);

function renderWithTab(tabValue) {
  const ReactStub = {
    createElement: (type, props, ...children) => ({ __el: true, type, props: props || {}, children }),
    // 第 1 次 useState 调用是 tab —— 顶到指定标签；其余沿用默认语义。
    useState: (v) => { ReactStub._n = (ReactStub._n || 0) + 1; return ReactStub._n === 1 ? [tabValue, () => {}] : [typeof v === 'function' ? v() : v, () => {}]; },
    useMemo: (fn) => fn(),
    useEffect: () => {},
    useRef: () => ({ current: null }),
  };
  const mod = windowStub.__spec__.factory((name) => (name === 'react' ? ReactStub : {}));
  const regs = [];
  mod.apply({
    effect(fn2) { fn2(); return () => {}; },
    slots: { inject(o, cb) { const d = cb(); return () => d && d(); },
      register(o, c) { regs.push({ o, c }); return () => {}; } },
    get() { return undefined; },
  });
  return regs.filter((r) => r.o.name === 'main')[0].c({});
}

// 收集树中全部文本与 svg presence
function walk(node, out) {
  if (Array.isArray(node)) { node.forEach((n) => walk(n, out)); return; }
  if (!node || !node.__el) return;
  if (typeof node.type === 'string') out.tags[node.type] = (out.tags[node.type] || 0) + 1;
  const kids = Array.isArray(node.children) ? node.children : [node.children];
  kids.forEach((c) => {
    if (typeof c === 'string') out.text.push(c);
    else walk(c, out);
  });
}

for (const tab of ['metrics', 'theory']) {
  const err = [];
  let tree = null;
  try { tree = renderWithTab(tab); } catch (e) { err.push(e.message + '\n' + (e.stack || '').split('\n')[1]); }
  check(tab + ' 标签深层渲染不抛异常', err.length === 0, err[0] || '');
  const out = { tags: {}, text: [] };
  walk(tree, out);
  const joined = out.text.join('|');
  if (tab === 'metrics') {
    check('metrics 含租金压力条与预警首年', joined.includes('租金压力') && joined.includes('预警首年'));
    check('metrics 含相图（封建稳态域 + 闸门虚线）', joined.includes('封建稳态域') && joined.includes('闸门 0.68'));
    check('metrics 含热力图（点击格子载入该组合）', joined.includes('点击格子载入该组合'));
    check('metrics 相图/热力图为 svg 元素', (out.tags.svg || 0) >= 2, 'svg × ' + (out.tags.svg || 0));
  } else {
    check('theory 含合取命题与映射表', joined.includes('合取命题 · 两个闸门缺一不可') && joined.includes('cognition / compute / automation'));
    check('theory 含四张反驳卡', ['技术封建化', '生态天花板', '计算问题', '路径依赖'].every((k) => joined.includes(k)));
    check('theory 含页脚声明', joined.includes('不构成任何现实预测'));
  }
}
console.log('\n--- 汇总 ---');
console.log(pass + '/' + (pass + fail) + ' 通过');
process.exit(fail ? 1 : 0);
