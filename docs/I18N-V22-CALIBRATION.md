# v2.2 校准报告（阶段 3／8）

> 对需求做可执行性校准：验证假设、测量风险、确认接口。

## 1. 校准项与结果

| # | 待校准假设 | 方法 | 结果 |
|---|---|---|---|
| 1 | `healthTab` 能看见 `t` | 比对定义行号 | ✅ 行 2327 > `t` 行 1576，是闭包 |
| 2 | 8 条 B 类文案的读取点可精确定位 | 逐条搜源码 | ✅ 8/8 定位，行 2361/2414/2421/2426/2442/2452/2460/2464 |
| 3 | 现有代码有无「是否英文」判定 | 搜 `isEn`/`localeId`/`startsWith('en')` | ❌ **全部 0 次**，需新建 |
| 4 | `localeSvc` 在 App 内可见 | 读构造上下文 | ✅ `const localeSvc = props && props.locale ? props.locale : null` |
| 5 | 文案在 calibrate.cjs 是否硬编码 | 逐条查行 | ✅ 8/8 硬编码单字符串，无模板变量 |
| 6 | `slim` 白名单机制 | 读 inject 脚本 | ✅ 显式逐字段映射（非展开），安全但需手工同步 |

## 2. 校准结论：需要新增 `pick` 辅助函数

### 问题

现有代码只有 `t(key)`，它查的是 `locale/*.json` 的**固定键**。
而 calibration 文案是**数据里带着两个版本**（`caveat` + `caveatEn`），
没有对应的 i18n 键。用 `t()` 走不通。

### 校准出的方案

在 `SingularityApp` 内、`t` 之后新增：

```js
// v2.2：calibration 数据自带双语字段，按当前语言选一个，缺失时回退中文。
const isEn = (() => {
  try {
    return /^en\b/i.test(activeLocaleId(localeSvc));
  } catch (e) { return false; }
})();
const pick = (zh, en) => (isEn && typeof en === 'string' && en ? en : zh);
```

### 为什么这样设计（校准依据）

| 设计选择 | 理由 |
|---|---|
| 用 `activeLocaleId` 而非 `navigator.language` | 与 `t()` 走**同一条**语言判定，不会出现「文案英文但标签中文」的错位 |
| `isEn` 用 `try/catch` 包裹 | `activeLocaleId` 内部已兜底，但外层再包一层保证绝不抛 |
| `pick` 三条件：`isEn && typeof en === 'string' && en` | 防三种脏数据：非英文环境、`undefined`、空字符串 |
| 放在 `t` 之后而非模块级 | 同 B2a 的教训——模块级组件看不到闭包变量 |
| 不改 `t()` 的签名 | 零回归风险，`t` 的 305 个调用点全部不动 |

### 中文环境等价性证明

中文环境 `isEn === false` → `pick(zh, en)` 恒返回 `zh` → 与原 `d.caveat` **完全等价**。

这是**结构性保证**，不是靠测试碰运气：`isEn` 为假时 `pick` 的第一分支短路，
`en` 参数根本不被求值。

## 3. 校准发现的额外风险

### 风险 A：`isEn` 在模块加载时求值 vs 每次渲染求值

`activeLocaleId` 读 `locale.getLocale()`，这是**运行时状态**，用户切换语言会变。
若在模块级求值会固化。**必须放在 `SingularityApp` 函数体内**（每次渲染重算）。

我的方案已放在函数体内 ✅。但 `const isEn = (() => ...)()` 是**渲染时求值一次**，
不是每次调用 `pick` 都求值——这是对的，因为同一次渲染内语言不会变。

### 风险 B：`anchors[].name` 是数组元素，需要 map 内 pick

```js
h('td', ..., a.name)  →  h('td', ..., pick(a.name, a.nameEn))
```

`anchors` 是数组，`slim` 映射整个数组，所以 `a.nameEn` 会自动带过来
（因为 `anchors: report.anchors` 是整体引用）。**这个字段不需要改 slim** ✅

但 `note`、`caveat`、`reason` 是**顶层/嵌套字段**，`slim` 必须显式加：
- `note: report.note` → 需加 `noteEn: report.noteEn`
- `asymmetries.collapseGain: report.asymmetries.collapseGain` → **整体引用，自动带过** ✅

### 校准修正：slim 只有 1 处需要改

| 字段 | slim 写法 | 需改？ |
|---|---|---|
| `note` | `note: report.note` | **需加** `noteEn: report.noteEn` |
| `asymmetries.*` | 整体对象引用 | 否，自动带 `*En` |
| `stageReachability` | `stageReachability: report.stageReachability` | 否，自动带 |
| `anchors` | `anchors: report.anchors` | 否，自动带 |

**这推翻了需求审核时的判断**——我当时说「slim 必须逐个字段映射 `*En`」，
实测只有 `note` 一个顶层字段需要显式加。审核的担心方向对，但范围估大了。

## 4. 校准后的工作量修正

| 项 | 需求阶段估计 | 校准后 |
|---|---|---|
| 改 calibrate.cjs | 8 处加 `*En` | 8 处（不变） |
| 改 calibration.json | 自动生成 | 自动（重跑脚本） |
| 改 inject-calibration.cjs | 「逐个字段」 | **仅 1 行**（`noteEn`） |
| 改 client.js | 8 读取点 + pick | 8 读取点 + pick + anchors map |
| 新增测试 | 3-4 条 | 4 条 |

## 5. 校准确认的不变量

执行期间必须始终成立：

1. 引擎区 sha1 = `1dddd7bb64738a29435110bdc76a580d0f5b633d`，len = 33196
2. 渲染片段数 `24/157/86/271/91/100/121`
3. 中文环境 `metrics` 中文字符数 = 607
4. 测试总数 ≥ 396
5. 六剧本基线不变
6. `docs/calibration.json` 与 `client.js` 的 `HEALTH_DATA` 一致
