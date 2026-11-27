# v2.2 详细方案（阶段 4／8）

> 基于需求细分 + 审核 + 校准。执行分 3 批，每批独立可验证、可回滚。

## 0. 目标

让体检页的 10 条 calibration 文案（8 长文案 + 6 剧本名中的可翻部分）在英文环境显示英文，
**中文环境逐字不变**。引擎零改动。

## 1. 数据结构设计

### 采用平行字段，不用嵌套对象

```jsonc
// calibration.json（改后）
{
  "note": "构建期生成的采样报告。……",
  "noteEn": "A sampling report generated at build time. ……",

  "asymmetries": {
    "collapseGain": {
      "value": 1.8,
      "winRatePct": 12.3,
      "caveat": "该系数是编译期常量……",
      "caveatEn": "The coefficient is a compile-time constant……"
    }
  },

  "anchors": [
    {
      "scenario": "baseline",
      "name": "基准线 · 技术狂奔，制度滞后",
      "nameEn": "Baseline · technology races, institutions lag",
      "outcome": "算力封建制",
      "rent": 0.59,
      "development": 0.363
    }
  ]
}
```

### 为什么不用 `{ zh, en }`

| 方案 | 优点 | 致命问题 |
|---|---|---|
| 平行字段 `caveat` / `caveatEn` | 现有断言 `includes('该系数…')` 继续有效；向后兼容 | 字段数翻倍 |
| 嵌套 `caveat: { zh, en }` | 结构清晰 | **现有断言全部静默失效**（`includes` 对象恒 false）；client 每处读取都要 `.zh` |

**决定：平行字段。** 静默失效的断言比字段翻倍危险得多。

## 2. 分批执行

### B1：数据层（calibrate.cjs + 重新生成）

**改 `scripts/calibrate.cjs`，8 处加 `*En` 字面量 + anchors 6 处加 `nameEn`。**

| 行 | 字段 | 新增 |
|---|---|---|
| 172 | `note` | `noteEn` |
| 196 | `asymmetries.collapseGain.caveat` | `caveatEn` |
| 204 | `asymmetries.socialDemocracy.caveat` | `caveatEn` |
| 210 | `asymmetries.chattering.caveat` | `caveatEn` |
| 221 | `structurallyUnreachable[0].reason` | `reasonEn` |
| 225 | `rareButReachable[0].note` | `noteEn` |
| 234 | `start2024.caveat` | `caveatEn` |
| 241 | `techOnlyBeforeGate.caveat` | `caveatEn` |
| — | `anchors[].name` ×6 | `nameEn` |

**anchors 的来源**：查 `calibrate.cjs` 里 anchors 怎么生成的（可能来自 `SCENARIOS`）。
若来自引擎的 `SCENARIOS`，则需在 calibrate 里加映射表，**不能改引擎**。

**验证**：`node scripts/calibrate.cjs` 后 `calibration.json` 含 14 个 `*En` 字段，全非空无中文。

### B2：注入层（inject-calibration.cjs + 重注入）

**只改 1 行**（校准结论）：

```js
const slim = {
  // ...
  note: report.note,
  noteEn: report.noteEn,   // ← 唯一需要显式加的
  // asymmetries / stageReachability / anchors 是整体引用，自动带 *En
};
```

**验证**：`client.js` 的 `HEALTH_DATA` 里 `noteEn` 存在；`*En` 字段数与 json 一致。

### B3：渲染层（client.js）

#### B3-1：新增 `pick` 辅助（`t` 之后）

```js
const isEn = (() => {
  try { return /^en\b/i.test(activeLocaleId(localeSvc)); } catch (e) { return false; }
})();
const pick = (zh, en) => (isEn && typeof en === 'string' && en ? en : zh);
```

#### B3-2：8 处读取点改为 `pick`

| 行 | 原 | 改 |
|---|---|---|
| 2361 | `d.note \|\| t('b2a.077')` | `pick(d.note, d.noteEn) \|\| t('b2a.077')` |
| 2414 | `+ d.asymmetries.collapseGain.caveat` | `+ pick(...caveat, ...caveatEn)` |
| 2421 | `+ d.asymmetries.socialDemocracy.caveat` | 同 |
| 2426 | `+ d.asymmetries.chattering.caveat` | 同 |
| 2442 | `u.reason` | `pick(u.reason, u.reasonEn)` |
| 2452 | `r.note` | `pick(r.note, r.noteEn)` |
| 2460 | `d.stageReachability.start2024.caveat` | 同 |
| 2464 | `d.stageReachability.techOnlyBeforeGate.caveat` | 同 |
| 2474 | `a.name` | `pick(a.name, a.nameEn)` |

## 3. 新增测试（4 条，进 contract-check §7p）

```js
/* 7p. v2.2 calibration 双语 */
// 1. calibration.json 的 *En 字段齐全且非空、无中文残留
// 2. HEALTH_DATA 里的 *En 与 calibration.json 一致（防 slim 漏映射）
// 3. client 有 pick 辅助且 8 个读取点都用了 pick
// 4. A 类语义未被翻译（outcomeDistribution[].name 仍是中文，OUT_COLORS 仍能命中）
```

第 4 条最关键——它防的正是「翻译了查找键导致结局色条全灰」。

## 4. 执行顺序与验证门

```
B1 数据层 ──→ 验证门1：json 含 14 个 *En，全非空
    ↓
B2 注入层 ──→ 验证门2：HEALTH_DATA 含 noteEn，*En 数一致
    ↓
B3 渲染层 ──→ 验证门3：英文显示英文 + 中文逐字不变 + 色条 7 色正常
    ↓
测试 4 条 ──→ 验证门4：400 项全绿
```

**每批后必查 6 个不变量**（见校准报告 §5）。

## 5. 风险与应对

| 风险 | 概率 | 应对 |
|---|---|---|
| `anchors` 来自引擎 `SCENARIOS`，改名会动引擎 | 中 | 先查来源；若来自引擎则加**独立映射表**，引擎不动 |
| `slim` 漏字段 → 静默空白 | 中 | 契约断言 2 专门防这个 |
| 误翻 `outcomeDistribution[].name` → 色条全灰 | 中 | 契约断言 4 + 渲染片段数守卫 |
| `pick` 放错位置（模块级） | 低 | 明确要求放 `SingularityApp` 内 `t` 之后 |
| 中文环境意外变化 | 低 | 结构性保证：`isEn` 假时 `pick` 第一分支短路 |

## 6. 非目标

- 不翻 A 类 26 个引擎语义
- 不改 `calibrate.cjs` 的计算逻辑（只加字面量）
- 不改引擎区
- 不做运行时 fetch（保持构建期注入）
- 不加语言切换器
- 不动 `t()` 的签名与 305 个调用点

## 7. 交付物

- `docs/I18N-V22-REQUIREMENTS.md`（需求+审核）
- `docs/I18N-V22-CALIBRATION.md`（校准）
- `docs/I18N-V22-PLAN.md`（本文件）
- 代码改动：3 个文件
- 测试：396 → 400
- CHANGELOG / README / 版本 2.2.0

---

# 阶段 5：方案审核

对上述方案逐条实证，抓到 **1 个方案级缺陷**和 **1 个被低估的复杂度**。

## 缺陷 1（严重）：`anchors[].name` 来自引擎，方案无法直接实施

### 实证

```js
// calibrate.cjs 行 151-160
const anchors = Object.keys(api.SCENARIOS).map((k) => {
  const sim = api.simulate(api.targetOf(k));
  return {
    scenario: k,
    name: api.SCENARIOS[k].name,   // ← 直接来自引擎
    outcome: sim.outcome.name,
    ...
  };
});
```

`api.SCENARIOS[k].name` 是**引擎区的常量**：
```js
SCENARIOS = {
  baseline: { name: '基准线 · 技术狂奔，制度滞后', desc: '…', values: {} },
  ...
}
```

### 方案原写法为什么错

方案说「在 `calibrate.cjs` 的 anchors 加 `nameEn`」。
但 `calibrate.cjs` **不拥有**这个名字，它只是转发引擎值。
在 calibrate 里加 `nameEn` 只有两条路：

| 做法 | 后果 |
|---|---|
| 改引擎 `SCENARIOS` 加 `nameEn` | **违反引擎零漂移硬门**（sha1 会变） |
| 在 calibrate 里建独立映射表 `SCENARIO_NAME_EN = { baseline: '…' }` | ✅ 引擎不动，映射表在 calibrate 内 |

### 修正

采用**映射表**，且必须处理「映射表漏 key」的情况：

```js
// calibrate.cjs 内，anchors 之前
const SCENARIO_NAME_EN = {
  baseline: 'Baseline · technology races, institutions lag',
  social_democracy: 'Social democracy · universal dividend',
  techno_feudalism: 'Compute feudalism · oligarchic capture',
  planned_transition: 'Planned transition · organized passage',
  collapse: 'Collapse · high shock + high confrontation',
  commons: 'Universal commons · post-scarcity communism',
};
// 用 k 查表；缺失时不写 nameEn（client 的 pick 会回退中文）
const nameEn = SCENARIO_NAME_EN[k];
return { scenario: k, name: api.SCENARIOS[k].name, ...(nameEn ? { nameEn } : {}), ... };
```

**关键**：`...(nameEn ? {nameEn} : {})` 而非 `nameEn: SCENARIO_NAME_EN[k]`。
后者在漏 key 时会写 `nameEn: undefined`，JSON 序列化后**该字段消失**，
但契约断言若查「存在 nameEn」会报错——而前者的缺失是**显式的**。

同时新增**契约断言**：映射表的 key 集合必须 === `Object.keys(SCENARIOS)`，
防将来加剧本忘了加英文名。

## 缺陷 2（被低估）：`slim` 的 `note` 不是唯一需要改的顶层字段

校准报告说「slim 只有 1 行需改（noteEn）」。**这是对的，但不完整**：

`anchors: report.anchors` 是整体引用 → `nameEn` 自动带过 ✅
`asymmetries.collapseGain: report.asymmetries.collapseGain` → 自动带 ✅

但 `note` 的映射是 `note: report.note`（**单字段提取**），所以必须加 `noteEn`。
校准的判断正确，此处确认无额外遗漏。

**结论：缺陷 2 不成立**，校准报告正确。记录在此是因为我审核时怀疑过它，
验证后确认原判断对——审核不只要抓错，也要确认对的部分。

## 审核确认成立的部分

| 方案条目 | 审核结果 |
|---|---|
| 平行字段 vs 嵌套 | ✅ 成立。现有断言 `includes('该系数…')` 依赖字符串 |
| `pick` 放 `SingularityApp` 内 `t` 之后 | ✅ 成立（`t` 行 1576，`healthTab` 行 2327） |
| `isEn` 渲染时求值 | ✅ 成立（`activeLocaleId` 读运行时 locale 状态） |
| 中文环境结构性等价 | ✅ 成立（`isEn` 假时 `pick` 第一分支短路，`en` 不被求值） |
| 8 个读取点行号 | ✅ 全部核对：2361/2414/2421/2426/2442/2452/2460/2464 |
| B1/B2/B3 分批 | ✅ 成立 |

## 方案修正后的执行清单

| 批 | 文件 | 改动 |
|---|---|---|
| B1 | `scripts/calibrate.cjs` | 8 处加 `*En` + `SCENARIO_NAME_EN` 映射表（6 条）+ anchors 内条件展开 |
| B2 | `scripts/inject-calibration.cjs` | 1 行：`noteEn: report.noteEn` |
| B3 | `client.js` | `pick` 辅助 + 9 处读取点（含 `a.name`） |
| B4 | `scripts/contract-check.cjs` | 5 条断言（含映射表 key 集合校验） |

**测试目标：396 → 401**

